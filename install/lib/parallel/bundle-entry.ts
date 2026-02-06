/**
 * Bundle entry point for Node.js-compatible parallel library
 * Satisfies: RT-8 (parallel library portability), T7 (parallel library portability)
 *
 * This file excludes command.ts (which imports auto-suggester with Bun-specific
 * dynamic imports) since the CLI command runner only executes under Bun on
 * Claude Code/AMP. All library classes and runParallel() are available.
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

/**
 * Quick-start function for parallel execution (bundled version)
 * Uses static imports only — no dynamic import() calls.
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
  const analyzer = new TaskAnalyzer();
  const tasks = analyzer.parseTaskDescriptions(taskDescriptions);
  const analysisResult = analyzer.analyze(tasks);

  const predictor = new FilePredictor({ baseDir });
  const predictions = predictor.predictAll(
    tasks.map(t => ({ id: t.id, description: t.description }))
  );

  const detector = new OverlapDetector();
  const overlaps = detector.detect(predictions);
  const parallelGroups = overlaps.safeGroups.filter(g => g.taskIds.length > 1);

  if (parallelGroups.length === 0) {
    return { success: true, parallelized: false, results: [] };
  }

  const resourceMonitor = new ResourceMonitor(baseDir);
  const status = await resourceMonitor.getStatus();

  if (!status.overall.canParallelize) {
    return {
      success: false,
      parallelized: false,
      results: [{ taskId: 'resource-check', success: false, error: status.overall.reason }],
    };
  }

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

  if (options.autoMerge !== false) {
    const orchestrator = new MergeOrchestrator(baseDir);
    const completedWorktrees = executor.getCompletedWorktrees();
    await orchestrator.mergeAll(completedWorktrees);
  }

  await executor.cleanup();

  return {
    success: results.every(r => r.success),
    parallelized: true,
    results,
  };
}
