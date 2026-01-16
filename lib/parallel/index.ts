/**
 * Parallel Agents Module
 * Main entry point for the parallel execution system
 *
 * Satisfies all constraints and required truths for parallel-agents feature
 */

// Phase 1: Foundation
export { WorktreeManager, WorktreeInfo, WorktreeCreateOptions } from './worktree-manager';
export { ResourceMonitor, ResourceStatus, ResourceThresholds } from './resource-monitor';

// Phase 2: Analysis
export { TaskAnalyzer, Task, TaskGraph, AnalysisResult, ParallelGroup } from './task-analyzer';
export { FilePredictor, FilePrediction, PredictionMethod } from './file-predictor';
export { OverlapDetector, OverlapResult, TaskOverlapPair, SafeGroup } from './overlap-detector';

// Phase 3: Orchestration
export { ParallelExecutor, ExecutionTask, ExecutionResult, ProgressEvent } from './parallel-executor';
export { MergeOrchestrator, MergeResult, MergeOrchestratorResult, MergeStrategy } from './merge-orchestrator';
export { ProgressReporter, ProgressUpdate, ProgressState } from './progress-reporter';

// Phase 4: Integration
export {
  ParallelConfigManager,
  ParallelConfig,
  CliFlags,
  parseParallelFlags,
  DEFAULT_CONFIG,
} from './parallel-config';

// Command Implementation
export {
  ParallelCommand,
  ParallelCommandOptions,
  ParallelCommandResult,
  runParallelCommand,
} from './command';

/**
 * Quick-start function for parallel execution
 *
 * Usage:
 *   import { runParallel } from './lib/parallel';
 *   const result = await runParallel(process.cwd(), ['task1', 'task2', 'task3']);
 */
export async function runParallel(
  baseDir: string,
  taskDescriptions: string[],
  options: {
    maxParallel?: number;
    verbose?: boolean;
    autoMerge?: boolean;
  } = {}
): Promise<{
  success: boolean;
  parallelized: boolean;
  results: Array<{ taskId: string; success: boolean; output?: string; error?: string }>;
}> {
  const { TaskAnalyzer } = await import('./task-analyzer');
  const { FilePredictor } = await import('./file-predictor');
  const { OverlapDetector } = await import('./overlap-detector');
  const { ParallelExecutor } = await import('./parallel-executor');
  const { MergeOrchestrator } = await import('./merge-orchestrator');
  const { ResourceMonitor } = await import('./resource-monitor');

  // Quick analysis
  const analyzer = new TaskAnalyzer();
  const tasks = analyzer.parseTaskDescriptions(taskDescriptions);
  const analysisResult = analyzer.analyze(tasks);

  // Predict files
  const predictor = new FilePredictor({ baseDir });
  const predictions = predictor.predictAll(
    tasks.map(t => ({ id: t.id, description: t.description }))
  );

  // Check overlaps
  const detector = new OverlapDetector();
  const overlaps = detector.detect(predictions);

  // Find parallelizable groups
  const parallelGroups = overlaps.safeGroups.filter(g => g.taskIds.length > 1);

  if (parallelGroups.length === 0) {
    return {
      success: true,
      parallelized: false,
      results: [],
    };
  }

  // Check resources
  const resourceMonitor = new ResourceMonitor(baseDir);
  const status = await resourceMonitor.getStatus();

  if (!status.overall.canParallelize) {
    return {
      success: false,
      parallelized: false,
      results: [{
        taskId: 'resource-check',
        success: false,
        error: status.overall.reason,
      }],
    };
  }

  // Execute
  const executor = new ParallelExecutor({
    baseDir,
    maxConcurrent: options.maxParallel ?? status.overall.recommendedConcurrency,
  });

  const results: Array<{ taskId: string; success: boolean; output?: string; error?: string }> = [];

  for (const group of parallelGroups) {
    const groupResults = await executor.execute(group);
    results.push(...groupResults.map(r => ({
      taskId: r.taskId,
      success: r.success,
      output: r.output,
      error: r.error,
    })));
  }

  // Merge if requested
  if (options.autoMerge !== false) {
    const orchestrator = new MergeOrchestrator(baseDir);
    const completedWorktrees = executor.getCompletedWorktrees();
    await orchestrator.mergeAll(completedWorktrees);
  }

  // Cleanup
  await executor.cleanup();

  return {
    success: results.every(r => r.success),
    parallelized: true,
    results,
  };
}
