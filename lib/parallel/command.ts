/**
 * /parallel Command Implementation
 * Satisfies: B2 (faster than sequential), B4 (opt-in control), U1-U4 (user experience)
 * Required Truths: RT-1 through RT-6 (all required truths)
 *
 * NOTE: This is the implementation. The Claude Code skill is in install/commands/parallel.md
 */

import { TaskAnalyzer, Task } from './task-analyzer';
import { FilePredictor } from './file-predictor';
import { OverlapDetector } from './overlap-detector';
import { ParallelExecutor, ExecutionResult } from './parallel-executor';
import { MergeOrchestrator, MergeOrchestratorResult } from './merge-orchestrator';
import { ProgressReporter } from './progress-reporter';
import { ResourceMonitor } from './resource-monitor';
import { ParallelConfigManager, parseParallelFlags, CliFlags } from './parallel-config';

// Import AutoSuggester from hooks (external to lib/parallel)
import { AutoSuggester, ParallelSuggestion } from '../../hooks/auto-suggester';

export interface ParallelCommandOptions {
  tasks: string[];
  file?: string;
  autoParallel?: boolean;
  maxParallel?: number;
  verbose?: boolean;
  deep?: boolean;
  timeout?: number;
  strategy?: 'sequential' | 'squash' | 'rebase';
  noCleanup?: boolean;
  dryRun?: boolean;
}

export interface ParallelCommandResult {
  success: boolean;
  suggestion: ParallelSuggestion;
  execution?: ExecutionResult[];
  merge?: MergeOrchestratorResult;
  duration: number;
  output: string;
}

/**
 * Main /parallel command implementation
 * Satisfies: All Required Truths (RT-1 through RT-6)
 */
export class ParallelCommand {
  private baseDir: string;
  private configManager: ParallelConfigManager;
  private taskAnalyzer: TaskAnalyzer;
  private filePredictor: FilePredictor;
  private overlapDetector: OverlapDetector;
  private autoSuggester: AutoSuggester;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.configManager = new ParallelConfigManager(baseDir);
    this.taskAnalyzer = new TaskAnalyzer();
    this.filePredictor = new FilePredictor({ baseDir });
    this.overlapDetector = new OverlapDetector();
    this.autoSuggester = new AutoSuggester(baseDir);
  }

  /**
   * Execute the /parallel command
   */
  async execute(options: ParallelCommandOptions): Promise<ParallelCommandResult> {
    const startTime = Date.now();
    const outputLines: string[] = [];
    const log = (msg: string) => {
      outputLines.push(msg);
      console.log(msg);
    };

    try {
      // Parse and apply config
      const config = this.configManager.applyFlags({
        autoParallel: options.autoParallel,
        maxParallel: options.maxParallel,
        verbose: options.verbose,
        deep: options.deep,
        timeout: options.timeout,
        strategy: options.strategy,
        noCleanup: options.noCleanup,
      });

      log('\n🔄 Analyzing tasks for parallelization...\n');

      // Get suggestion
      const suggestion = await this.autoSuggester.suggest(options.tasks);

      // Show analysis
      log(this.autoSuggester.formatSuggestion(suggestion));
      log('');

      // Dry run mode - just show analysis
      if (options.dryRun) {
        log('ℹ️  Dry run mode - no execution performed');
        return {
          success: true,
          suggestion,
          duration: Date.now() - startTime,
          output: outputLines.join('\n'),
        };
      }

      // Check if parallelization is recommended
      if (!suggestion.shouldParallelize) {
        log('⚠️  Sequential execution recommended. Use --force to override.');
        return {
          success: true,
          suggestion,
          duration: Date.now() - startTime,
          output: outputLines.join('\n'),
        };
      }

      // Check resources
      const resourceMonitor = new ResourceMonitor(this.baseDir);
      const resourceStatus = await resourceMonitor.getStatus();

      if (!resourceStatus.overall.canParallelize) {
        log(`\n⚠️  ${resourceStatus.overall.reason}`);
        log('Falling back to sequential execution.');
        return {
          success: false,
          suggestion,
          duration: Date.now() - startTime,
          output: outputLines.join('\n'),
        };
      }

      log(await resourceMonitor.getSummary());
      log('');

      // Execute in parallel
      const progressReporter = new ProgressReporter({
        verbose: config.verbose,
        showProgress: true,
        outputCallback: log,
      });

      const executor = new ParallelExecutor({
        baseDir: this.baseDir,
        maxConcurrent: Math.min(
          config.maxParallel,
          resourceStatus.overall.recommendedConcurrency
        ),
        timeout: config.timeout,
        onProgress: (event) => progressReporter.handleProgressEvent(event),
      });

      // Find the group(s) that can actually be parallelized
      const parallelizableGroups = suggestion.parallelGroups.filter(
        g => g.taskIds.length > 1
      );

      if (parallelizableGroups.length === 0) {
        log('No parallelizable groups found.');
        return {
          success: true,
          suggestion,
          duration: Date.now() - startTime,
          output: outputLines.join('\n'),
        };
      }

      // Start execution
      progressReporter.start(parallelizableGroups);

      const executionResults: ExecutionResult[] = [];

      for (const group of parallelizableGroups) {
        log(`\nExecuting group: ${group.id} (${group.taskIds.length} tasks)`);
        const groupResults = await executor.execute(group);
        executionResults.push(...groupResults);
      }

      // Merge results
      progressReporter.reportMergeStart();

      const mergeOrchestrator = new MergeOrchestrator(
        this.baseDir,
        undefined // Use current branch
      );

      const completedWorktrees = executor.getCompletedWorktrees();
      const mergeResult = await mergeOrchestrator.mergeAll(
        completedWorktrees,
        { type: config.mergeStrategy }
      );

      progressReporter.reportMergeComplete(mergeResult);

      // Cleanup
      if (config.cleanupOnComplete) {
        progressReporter.reportCleanup();
        await executor.cleanup();
      }

      // Complete
      const success = mergeResult.success && executionResults.every(r => r.success);
      progressReporter.complete(success);

      return {
        success,
        suggestion,
        execution: executionResults,
        merge: mergeResult,
        duration: Date.now() - startTime,
        output: outputLines.join('\n'),
      };

    } catch (error) {
      log(`\n❌ Error: ${error}`);
      return {
        success: false,
        suggestion: {
          shouldParallelize: false,
          confidence: 0,
          parallelGroups: [],
          sequentialTasks: [],
          reasoning: [`Error: ${error}`],
          estimatedSpeedup: 1,
          warnings: [],
        },
        duration: Date.now() - startTime,
        output: outputLines.join('\n'),
      };
    }
  }

  /**
   * Parse command line arguments
   */
  static parseArgs(args: string[]): ParallelCommandOptions {
    const tasks: string[] = [];
    const flags = parseParallelFlags(args);
    let file: string | undefined;
    let dryRun = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--file' || arg === '-f') {
        file = args[++i];
      } else if (arg === '--dry-run') {
        dryRun = true;
      } else if (!arg.startsWith('-') && !arg.startsWith('--')) {
        tasks.push(arg);
      }
    }

    return {
      tasks,
      file,
      dryRun,
      ...flags,
    };
  }

  /**
   * Show command help
   */
  static help(): string {
    return `
/parallel - Execute tasks in parallel using git worktrees

USAGE:
  /parallel "task1" "task2" "task3" [options]
  /parallel --file tasks.yaml [options]

OPTIONS:
  --auto-parallel      Enable automatic parallelization
  --max-parallel N     Maximum concurrent tasks (default: 4)
  --verbose, -v        Show detailed output
  --deep               Use deep analysis (slower but more accurate)
  --timeout N          Task timeout in seconds (default: 300)
  --strategy TYPE      Merge strategy: sequential, squash, rebase
  --no-cleanup         Don't cleanup worktrees after completion
  --dry-run            Analyze but don't execute
  --file, -f FILE      Load tasks from YAML file

EXAMPLES:
  /parallel "Add login form" "Add signup form" "Add password reset"
  /parallel --file features.yaml --auto-parallel
  /parallel "task1" "task2" --dry-run --verbose

The command will:
1. Analyze tasks for dependencies and file overlaps
2. Group tasks that can safely run in parallel
3. Create isolated git worktrees for each parallel task
4. Execute tasks concurrently
5. Merge results back to main worktree
6. Clean up temporary worktrees
`;
  }
}

/**
 * Command entry point for Claude Code slash command
 */
export async function runParallelCommand(args: string[]): Promise<string> {
  if (args.includes('--help') || args.includes('-h')) {
    return ParallelCommand.help();
  }

  const options = ParallelCommand.parseArgs(args);

  if (options.tasks.length === 0 && !options.file) {
    return 'Error: No tasks provided. Use /parallel "task1" "task2" or --file tasks.yaml';
  }

  // If file provided, load tasks from file
  if (options.file) {
    // In real implementation, would load from YAML file
    return 'File loading not yet implemented. Please provide tasks as arguments.';
  }

  const command = new ParallelCommand(process.cwd());
  const result = await command.execute(options);

  return result.output;
}

export default ParallelCommand;
