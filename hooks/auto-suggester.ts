/**
 * Auto Suggester Hook
 * Satisfies: B3 (auto-identify opportunities), B4 (opt-in), U1 (transparent), U4 (explain reasoning)
 * Required Truths: RT-1 (task analysis), RT-2 (independent tasks), RT-6 (user visibility)
 */

import { TaskAnalyzer, Task, AnalysisResult } from '../lib/parallel/task-analyzer';
import { FilePredictor, FilePrediction } from '../lib/parallel/file-predictor';
import { OverlapDetector, OverlapResult, SafeGroup } from '../lib/parallel/overlap-detector';
import { ParallelConfigManager } from '../lib/parallel/parallel-config';

export interface ParallelSuggestion {
  shouldParallelize: boolean;
  confidence: number;
  parallelGroups: SafeGroup[];
  sequentialTasks: string[];
  reasoning: string[];
  estimatedSpeedup: number;
  warnings: string[];
}

export interface SuggesterOptions {
  minTasks?: number;
  minSpeedup?: number;
  minConfidence?: number;
  forceCheck?: boolean;
}

const DEFAULT_OPTIONS: Required<SuggesterOptions> = {
  minTasks: 2,
  minSpeedup: 1.3,
  minConfidence: 0.6,
  forceCheck: false,
};

/**
 * Automatically analyzes tasks and suggests parallelization
 * Satisfies: B3 (Framework should automatically identify parallelization opportunities)
 */
export class AutoSuggester {
  private taskAnalyzer: TaskAnalyzer;
  private filePredictor: FilePredictor;
  private overlapDetector: OverlapDetector;
  private configManager: ParallelConfigManager;
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.taskAnalyzer = new TaskAnalyzer();
    this.filePredictor = new FilePredictor({ baseDir });
    this.overlapDetector = new OverlapDetector();
    this.configManager = new ParallelConfigManager(baseDir);
  }

  /**
   * Check if tasks should be parallelized
   * Satisfies: RT-1 (Task graph can be analyzed for parallelization opportunities)
   */
  async suggest(
    tasks: Task[] | string[],
    options: SuggesterOptions = {}
  ): Promise<ParallelSuggestion> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const config = this.configManager.get();

    // Check if parallelization is enabled
    if (!config.enabled && !opts.forceCheck) {
      return this.createNegativeSuggestion('Parallelization is disabled in config');
    }

    // Convert string descriptions to tasks if needed
    const parsedTasks: Task[] = typeof tasks[0] === 'string'
      ? this.taskAnalyzer.parseTaskDescriptions(tasks as string[])
      : tasks as Task[];

    // Check minimum task count
    if (parsedTasks.length < opts.minTasks) {
      return this.createNegativeSuggestion(
        `Only ${parsedTasks.length} task(s) - minimum ${opts.minTasks} required for parallelization`
      );
    }

    // Analyze task dependencies
    const analysisResult = this.taskAnalyzer.analyze(parsedTasks);

    // Predict files for each task
    const predictions = this.filePredictor.predictAll(
      parsedTasks.map(t => ({ id: t.id, description: t.description }))
    );

    // Detect overlaps
    const overlapResult = this.overlapDetector.detect(predictions);

    // Build suggestion
    return this.buildSuggestion(
      analysisResult,
      predictions,
      overlapResult,
      opts
    );
  }

  /**
   * Build parallelization suggestion
   * Satisfies: U4 (Easy to understand why tasks were/weren't parallelized)
   */
  private buildSuggestion(
    analysis: AnalysisResult,
    predictions: FilePrediction[],
    overlaps: OverlapResult,
    options: Required<SuggesterOptions>
  ): ParallelSuggestion {
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Calculate overall confidence
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    // Check if speedup is worth it
    if (analysis.analysis.estimatedSpeedup < options.minSpeedup) {
      reasoning.push(
        `Estimated speedup (${analysis.analysis.estimatedSpeedup.toFixed(2)}x) ` +
        `is below threshold (${options.minSpeedup}x)`
      );
    }

    // Check confidence
    if (avgConfidence < options.minConfidence) {
      reasoning.push(
        `File prediction confidence (${(avgConfidence * 100).toFixed(0)}%) ` +
        `is below threshold (${(options.minConfidence * 100).toFixed(0)}%)`
      );
      warnings.push('Low confidence in file predictions - manual verification recommended');
    }

    // Check overlaps
    if (overlaps.hasOverlap) {
      const criticalOverlaps = overlaps.taskPairs.filter(p => p.severity === 'critical');
      if (criticalOverlaps.length > 0) {
        reasoning.push(
          `${criticalOverlaps.length} task pair(s) have file overlaps that prevent parallelization`
        );
        for (const pair of criticalOverlaps.slice(0, 3)) {
          warnings.push(
            `Tasks ${pair.task1} and ${pair.task2} modify common files: ${pair.overlappingFiles.slice(0, 3).join(', ')}`
          );
        }
      }
    }

    // Add positive reasoning
    if (overlaps.safeGroups.length > 0) {
      const maxGroupSize = Math.max(...overlaps.safeGroups.map(g => g.taskIds.length));
      reasoning.push(`Found ${overlaps.safeGroups.length} safe parallel group(s)`);
      reasoning.push(`Maximum parallelism: ${maxGroupSize} concurrent tasks`);
    }

    if (analysis.analysis.parallelizableTasks > 0) {
      reasoning.push(
        `${analysis.analysis.parallelizableTasks} of ${analysis.analysis.totalTasks} tasks can be parallelized`
      );
    }

    // Determine if we should parallelize
    const shouldParallelize =
      overlaps.safeGroups.some(g => g.taskIds.length > 1) &&
      analysis.analysis.estimatedSpeedup >= options.minSpeedup &&
      avgConfidence >= options.minConfidence;

    return {
      shouldParallelize,
      confidence: avgConfidence,
      parallelGroups: overlaps.safeGroups,
      sequentialTasks: analysis.graph.sequential,
      reasoning,
      estimatedSpeedup: analysis.analysis.estimatedSpeedup,
      warnings,
    };
  }

  /**
   * Create a negative suggestion with reason
   */
  private createNegativeSuggestion(reason: string): ParallelSuggestion {
    return {
      shouldParallelize: false,
      confidence: 0,
      parallelGroups: [],
      sequentialTasks: [],
      reasoning: [reason],
      estimatedSpeedup: 1,
      warnings: [],
    };
  }

  /**
   * Format suggestion for display
   * Satisfies: U1 (Parallelization should be transparent to the user)
   */
  formatSuggestion(suggestion: ParallelSuggestion): string {
    const lines: string[] = [];

    if (suggestion.shouldParallelize) {
      lines.push('✅ **Parallelization Recommended**');
      lines.push('');
      lines.push(`Estimated speedup: ${suggestion.estimatedSpeedup.toFixed(2)}x`);
      lines.push(`Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
      lines.push('');

      lines.push('### Parallel Groups');
      for (const group of suggestion.parallelGroups) {
        if (group.taskIds.length > 1) {
          lines.push(`- **${group.id}**: ${group.taskIds.join(', ')}`);
        }
      }
    } else {
      lines.push('⚠️ **Sequential Execution Recommended**');
    }

    lines.push('');
    lines.push('### Reasoning');
    for (const reason of suggestion.reasoning) {
      lines.push(`- ${reason}`);
    }

    if (suggestion.warnings.length > 0) {
      lines.push('');
      lines.push('### Warnings');
      for (const warning of suggestion.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Quick check if parallelization is worth considering
   * Used for auto-suggest without full analysis
   */
  quickCheck(taskCount: number): boolean {
    const config = this.configManager.get();
    return config.enabled && config.autoSuggest && taskCount >= 2;
  }

  /**
   * Hook into task creation to suggest parallelization
   * Satisfies: B3 (Framework should automatically identify parallelization opportunities)
   */
  async hookTaskCreation(tasks: string[]): Promise<{
    suggest: boolean;
    message?: string;
  }> {
    const config = this.configManager.get();

    if (!config.enabled || !config.autoSuggest) {
      return { suggest: false };
    }

    if (tasks.length < 2) {
      return { suggest: false };
    }

    try {
      const suggestion = await this.suggest(tasks);

      if (suggestion.shouldParallelize) {
        const groupsWithMultiple = suggestion.parallelGroups.filter(g => g.taskIds.length > 1);
        if (groupsWithMultiple.length > 0) {
          return {
            suggest: true,
            message:
              `💡 ${groupsWithMultiple.length} task(s) can be parallelized ` +
              `(${suggestion.estimatedSpeedup.toFixed(1)}x estimated speedup). ` +
              `Run with --auto-parallel or use /parallel command.`,
          };
        }
      }

      return { suggest: false };
    } catch (error) {
      // Don't fail task creation if suggestion fails
      console.warn('Auto-suggest failed:', error);
      return { suggest: false };
    }
  }
}

export default AutoSuggester;
