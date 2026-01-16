/**
 * Progress Reporter
 * Satisfies: U2 (clear progress indication), U4 (understand why parallelized), O3 (monitorable)
 * Required Truths: RT-6 (User has visibility and control over parallelization)
 */

import { EventEmitter } from 'events';
import { ExecutionTask, ProgressEvent } from './parallel-executor';
import { SafeGroup } from './overlap-detector';
import { MergeOrchestratorResult } from './merge-orchestrator';

export interface ProgressUpdate {
  timestamp: Date;
  phase: 'analysis' | 'execution' | 'merge' | 'cleanup';
  message: string;
  details?: Record<string, unknown>;
}

export interface ProgressState {
  phase: 'idle' | 'analyzing' | 'executing' | 'merging' | 'complete' | 'failed';
  startTime?: Date;
  endTime?: Date;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  currentGroups: SafeGroup[];
  updates: ProgressUpdate[];
}

export interface ReporterConfig {
  verbose?: boolean;
  showProgress?: boolean;
  progressInterval?: number;
  outputCallback?: (message: string) => void;
}

const DEFAULT_CONFIG: ReporterConfig = {
  verbose: false,
  showProgress: true,
  progressInterval: 1000,
};

/**
 * Reports progress of parallel execution
 * Satisfies: U2 (Clear progress indication for parallel operations)
 */
export class ProgressReporter extends EventEmitter {
  private config: Required<ReporterConfig>;
  private state: ProgressState;
  private progressIntervalId?: NodeJS.Timeout;

  constructor(config: ReporterConfig = {}) {
    super();

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      outputCallback: config.outputCallback || console.log,
    } as Required<ReporterConfig>;

    this.state = {
      phase: 'idle',
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      runningTasks: 0,
      currentGroups: [],
      updates: [],
    };
  }

  /**
   * Start reporting for a new execution
   * Satisfies: RT-6 (User has visibility and control)
   */
  start(groups: SafeGroup[]): void {
    this.state = {
      phase: 'analyzing',
      startTime: new Date(),
      totalTasks: groups.reduce((sum, g) => sum + g.taskIds.length, 0),
      completedTasks: 0,
      failedTasks: 0,
      runningTasks: 0,
      currentGroups: groups,
      updates: [],
    };

    this.addUpdate('analysis', `Starting parallel execution of ${this.state.totalTasks} tasks`);
    this.output(this.formatHeader());

    if (this.config.showProgress) {
      this.startProgressInterval();
    }
  }

  /**
   * Report task started
   */
  taskStarted(taskId: string): void {
    this.state.runningTasks++;
    this.addUpdate('execution', `Task ${taskId} started`, { taskId });

    if (this.config.verbose) {
      this.output(`  → Starting: ${taskId}`);
    }
  }

  /**
   * Report task completed
   */
  taskCompleted(taskId: string, output?: string): void {
    this.state.runningTasks--;
    this.state.completedTasks++;
    this.addUpdate('execution', `Task ${taskId} completed`, { taskId, output });

    this.output(`  ✓ Completed: ${taskId}`);
  }

  /**
   * Report task failed
   * Satisfies: O4 (visibility into failures)
   */
  taskFailed(taskId: string, error: string): void {
    this.state.runningTasks--;
    this.state.failedTasks++;
    this.addUpdate('execution', `Task ${taskId} failed: ${error}`, { taskId, error });

    this.output(`  ✗ Failed: ${taskId} - ${error}`);
  }

  /**
   * Handle progress events from executor
   */
  handleProgressEvent(event: ProgressEvent): void {
    switch (event.type) {
      case 'started':
        this.taskStarted(event.taskId);
        break;
      case 'completed':
        this.taskCompleted(event.taskId, event.message);
        break;
      case 'failed':
        this.taskFailed(event.taskId, event.message || 'Unknown error');
        break;
      case 'cancelled':
        this.state.runningTasks--;
        this.addUpdate('execution', `Task ${event.taskId} cancelled`);
        this.output(`  ○ Cancelled: ${event.taskId}`);
        break;
      case 'output':
        if (this.config.verbose && event.message) {
          this.output(`    [${event.taskId}] ${event.message.trim()}`);
        }
        break;
    }
  }

  /**
   * Report merge phase
   */
  reportMergeStart(): void {
    this.state.phase = 'merging';
    this.addUpdate('merge', 'Starting merge of completed tasks');
    this.output('\nMerging results...');
  }

  /**
   * Report merge results
   */
  reportMergeComplete(result: MergeOrchestratorResult): void {
    this.addUpdate('merge', 'Merge completed', {
      merged: result.merged.length,
      failed: result.failed.length,
      commits: result.totalCommits,
    });

    this.output(`  Merged: ${result.merged.length} tasks`);
    if (result.failed.length > 0) {
      this.output(`  Failed: ${result.failed.length} tasks`);
    }
    this.output(`  Commits: ${result.totalCommits}`);
    this.output(`  Files: ${result.totalFilesChanged.length}`);
  }

  /**
   * Report cleanup phase
   */
  reportCleanup(): void {
    this.state.phase = 'cleanup';
    this.addUpdate('cleanup', 'Cleaning up worktrees');
    if (this.config.verbose) {
      this.output('\nCleaning up worktrees...');
    }
  }

  /**
   * Complete the report
   */
  complete(success: boolean): void {
    this.stopProgressInterval();
    this.state.phase = success ? 'complete' : 'failed';
    this.state.endTime = new Date();

    const duration = this.state.endTime.getTime() - (this.state.startTime?.getTime() || 0);
    const durationStr = this.formatDuration(duration);

    this.addUpdate(
      success ? 'cleanup' : 'execution',
      success ? 'Parallel execution completed' : 'Parallel execution failed'
    );

    this.output(this.formatSummary(durationStr));
  }

  /**
   * Get current state
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Get all updates
   */
  getUpdates(): ProgressUpdate[] {
    return [...this.state.updates];
  }

  /**
   * Generate analysis explanation
   * Satisfies: U4 (Easy to understand why tasks were/weren't parallelized)
   */
  explainParallelization(
    groups: SafeGroup[],
    sequentialTasks: string[]
  ): string {
    const lines = [
      '\n## Parallelization Analysis',
      '',
    ];

    const totalParallel = groups.reduce((sum, g) => sum + g.taskIds.length, 0);
    lines.push(`Tasks parallelizable: ${totalParallel}`);
    lines.push(`Tasks sequential: ${sequentialTasks.length}`);
    lines.push('');

    if (groups.length > 0) {
      lines.push('### Parallel Groups');
      lines.push('');
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        lines.push(`**Group ${i + 1}** (${group.taskIds.length} tasks)`);
        for (const taskId of group.taskIds) {
          lines.push(`  - ${taskId}`);
        }
        if (group.predictedFiles.length > 0) {
          lines.push(`  Files: ${group.predictedFiles.slice(0, 3).join(', ')}${group.predictedFiles.length > 3 ? '...' : ''}`);
        }
        lines.push('');
      }
    }

    if (sequentialTasks.length > 0) {
      lines.push('### Sequential Tasks (have dependencies)');
      lines.push('');
      for (const taskId of sequentialTasks) {
        lines.push(`  - ${taskId}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format header for output
   */
  private formatHeader(): string {
    const groupCount = this.state.currentGroups.length;
    const maxParallel = Math.max(
      1,
      ...this.state.currentGroups.map(g => g.taskIds.length)
    );

    return [
      '\n╔════════════════════════════════════════════════╗',
      '║           PARALLEL EXECUTION STARTED           ║',
      '╚════════════════════════════════════════════════╝',
      '',
      `Total tasks: ${this.state.totalTasks}`,
      `Parallel groups: ${groupCount}`,
      `Max parallelism: ${maxParallel}`,
      '',
      'Progress:',
    ].join('\n');
  }

  /**
   * Format summary for output
   */
  private formatSummary(duration: string): string {
    const success = this.state.failedTasks === 0;
    const icon = success ? '✅' : '❌';
    const status = success ? 'SUCCESS' : 'FAILED';

    return [
      '',
      '╔════════════════════════════════════════════════╗',
      `║           PARALLEL EXECUTION ${status}${' '.repeat(15 - status.length)}║`,
      '╚════════════════════════════════════════════════╝',
      '',
      `${icon} Result: ${status}`,
      `   Duration: ${duration}`,
      `   Completed: ${this.state.completedTasks}/${this.state.totalTasks}`,
      this.state.failedTasks > 0 ? `   Failed: ${this.state.failedTasks}` : '',
    ].filter(Boolean).join('\n');
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Add update to history
   */
  private addUpdate(
    phase: ProgressUpdate['phase'],
    message: string,
    details?: Record<string, unknown>
  ): void {
    this.state.updates.push({
      timestamp: new Date(),
      phase,
      message,
      details,
    });

    this.emit('update', { phase, message, details });
  }

  /**
   * Output message
   */
  private output(message: string): void {
    this.config.outputCallback(message);
    this.emit('output', message);
  }

  /**
   * Start progress interval
   */
  private startProgressInterval(): void {
    if (this.progressIntervalId) return;

    this.progressIntervalId = setInterval(() => {
      const progress = this.calculateProgress();
      this.emit('progress', progress);

      // Optional: print progress bar
      if (this.config.verbose) {
        this.output(this.formatProgressBar(progress));
      }
    }, this.config.progressInterval);
  }

  /**
   * Stop progress interval
   */
  private stopProgressInterval(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = undefined;
    }
  }

  /**
   * Calculate current progress percentage
   */
  private calculateProgress(): number {
    if (this.state.totalTasks === 0) return 100;
    return Math.round(
      ((this.state.completedTasks + this.state.failedTasks) / this.state.totalTasks) * 100
    );
  }

  /**
   * Format progress bar
   */
  private formatProgressBar(progress: number): string {
    const width = 30;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return `  [${bar}] ${progress}% (${this.state.runningTasks} running)`;
  }
}

export default ProgressReporter;
