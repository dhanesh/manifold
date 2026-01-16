/**
 * Parallel Executor
 * Satisfies: T2 (isolated execution), T7 (main worktree consistency), O4 (failure isolation)
 * Required Truths: RT-3 (isolated execution environments), RT-4 (results can be merged)
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { WorktreeManager, WorktreeInfo } from './worktree-manager';
import { ResourceMonitor } from './resource-monitor';
import { Task } from './task-analyzer';
import { SafeGroup } from './overlap-detector';

export interface ExecutionTask {
  task: Task;
  worktree?: WorktreeInfo;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface ExecutionResult {
  taskId: string;
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  worktreePath: string;
}

export interface ExecutorConfig {
  baseDir: string;
  maxConcurrent?: number;
  timeout?: number;
  agentCommand?: string;
  onProgress?: (event: ProgressEvent) => void;
}

export interface ProgressEvent {
  type: 'started' | 'completed' | 'failed' | 'cancelled' | 'output';
  taskId: string;
  message?: string;
  progress?: number;
}

const DEFAULT_CONFIG: Omit<ExecutorConfig, 'baseDir'> = {
  maxConcurrent: 4,
  timeout: 300000, // 5 minutes
  agentCommand: 'npx claude-code',
};

/**
 * Executes tasks in parallel using isolated worktrees
 * Satisfies: RT-3 (Isolated execution environments can be created)
 */
export class ParallelExecutor extends EventEmitter {
  private config: Required<ExecutorConfig>;
  private worktreeManager: WorktreeManager;
  private resourceMonitor: ResourceMonitor;
  private executionTasks: Map<string, ExecutionTask> = new Map();
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private cancelled = false;

  constructor(config: ExecutorConfig) {
    super();

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<ExecutorConfig>;

    this.worktreeManager = new WorktreeManager({
      baseDir: config.baseDir,
      maxWorktrees: this.config.maxConcurrent,
    });

    this.resourceMonitor = new ResourceMonitor(config.baseDir);
  }

  /**
   * Execute a group of tasks in parallel
   * Satisfies: B2 (Parallel execution should be faster than sequential)
   */
  async execute(group: SafeGroup): Promise<ExecutionResult[]> {
    this.cancelled = false;
    const results: ExecutionResult[] = [];

    // Check resources before starting
    const resourceStatus = await this.resourceMonitor.getStatus();
    if (!resourceStatus.overall.canParallelize) {
      throw new Error(
        `Cannot parallelize: ${resourceStatus.overall.reason}`
      );
    }

    const maxConcurrent = Math.min(
      this.config.maxConcurrent,
      resourceStatus.overall.recommendedConcurrency,
      group.taskIds.length
    );

    // Initialize execution tasks
    for (const taskId of group.taskIds) {
      this.executionTasks.set(taskId, {
        task: { id: taskId, description: '', type: 'feature' },
        status: 'pending',
      });
    }

    // Execute in batches respecting concurrency limits
    const taskQueue = [...group.taskIds];
    const running: Promise<ExecutionResult>[] = [];

    while (taskQueue.length > 0 || running.length > 0) {
      if (this.cancelled) {
        await this.cancelAll();
        break;
      }

      // Start new tasks up to concurrency limit
      while (taskQueue.length > 0 && running.length < maxConcurrent) {
        const taskId = taskQueue.shift()!;
        const promise = this.executeTask(taskId);
        running.push(promise);
      }

      // Wait for at least one task to complete
      if (running.length > 0) {
        const completedIndex = await Promise.race(
          running.map((p, i) => p.then(() => i))
        );
        const result = await running[completedIndex];
        results.push(result);
        running.splice(completedIndex, 1);
      }
    }

    return results;
  }

  /**
   * Execute a single task in an isolated worktree
   * Satisfies: T2 (Each parallel agent operates in isolated worktree)
   */
  private async executeTask(taskId: string): Promise<ExecutionResult> {
    const execTask = this.executionTasks.get(taskId)!;
    execTask.status = 'running';
    execTask.startTime = new Date();

    this.emitProgress({
      type: 'started',
      taskId,
      message: `Starting task ${taskId}`,
    });

    let worktree: WorktreeInfo | undefined;

    try {
      // Create isolated worktree
      worktree = await this.worktreeManager.create({ taskId });
      execTask.worktree = worktree;

      // Execute the task in the worktree
      const result = await this.runAgentInWorktree(taskId, worktree);

      execTask.status = result.success ? 'completed' : 'failed';
      execTask.endTime = new Date();
      execTask.output = result.output;
      execTask.exitCode = result.exitCode;

      if (result.success) {
        this.worktreeManager.markCompleted(taskId);
        this.emitProgress({
          type: 'completed',
          taskId,
          message: `Task ${taskId} completed successfully`,
        });
      } else {
        this.worktreeManager.markFailed(taskId);
        execTask.error = result.error;
        this.emitProgress({
          type: 'failed',
          taskId,
          message: `Task ${taskId} failed: ${result.error}`,
        });
      }

      return result;
    } catch (error) {
      execTask.status = 'failed';
      execTask.endTime = new Date();
      execTask.error = String(error);

      if (worktree) {
        this.worktreeManager.markFailed(taskId);
      }

      this.emitProgress({
        type: 'failed',
        taskId,
        message: `Task ${taskId} failed: ${error}`,
      });

      return {
        taskId,
        success: false,
        output: '',
        error: String(error),
        exitCode: 1,
        duration: execTask.startTime
          ? Date.now() - execTask.startTime.getTime()
          : 0,
        worktreePath: worktree?.path ?? '',
      };
    }
  }

  /**
   * Run an agent in a worktree
   * Satisfies: T7 (Main worktree state must remain consistent during parallel execution)
   */
  private async runAgentInWorktree(
    taskId: string,
    worktree: WorktreeInfo
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = '';
      let error = '';

      const execTask = this.executionTasks.get(taskId)!;
      const taskDescription = execTask.task.description || `Execute task ${taskId}`;

      // Spawn the agent process
      const process = spawn(
        this.config.agentCommand,
        ['--print', '--no-tty', taskDescription],
        {
          cwd: worktree.path,
          shell: true,
          env: {
            ...process.env,
            PARALLEL_TASK_ID: taskId,
            PARALLEL_WORKTREE: worktree.path,
          },
        }
      );

      this.runningProcesses.set(taskId, process);

      // Handle stdout
      process.stdout?.on('data', (data) => {
        output += data.toString();
        this.emitProgress({
          type: 'output',
          taskId,
          message: data.toString(),
        });
      });

      // Handle stderr
      process.stderr?.on('data', (data) => {
        error += data.toString();
      });

      // Handle process completion
      process.on('close', (exitCode) => {
        this.runningProcesses.delete(taskId);

        resolve({
          taskId,
          success: exitCode === 0,
          output,
          error: error || undefined,
          exitCode: exitCode ?? 1,
          duration: Date.now() - startTime,
          worktreePath: worktree.path,
        });
      });

      // Handle process error
      process.on('error', (err) => {
        this.runningProcesses.delete(taskId);

        resolve({
          taskId,
          success: false,
          output,
          error: err.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          worktreePath: worktree.path,
        });
      });

      // Handle timeout
      setTimeout(() => {
        if (this.runningProcesses.has(taskId)) {
          process.kill('SIGTERM');
          error = 'Task timed out';
        }
      }, this.config.timeout);
    });
  }

  /**
   * Cancel all running tasks
   * Satisfies: O5 (Support cancellation of parallel operations)
   */
  async cancel(): Promise<void> {
    this.cancelled = true;
    await this.cancelAll();
  }

  private async cancelAll(): Promise<void> {
    for (const [taskId, process] of this.runningProcesses) {
      try {
        process.kill('SIGTERM');
        const execTask = this.executionTasks.get(taskId);
        if (execTask) {
          execTask.status = 'cancelled';
          execTask.endTime = new Date();
        }
        this.emitProgress({
          type: 'cancelled',
          taskId,
          message: `Task ${taskId} cancelled`,
        });
      } catch {
        // Process may have already exited
      }
    }

    this.runningProcesses.clear();
  }

  /**
   * Get current execution status
   */
  getStatus(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    pending: number;
  } {
    let running = 0;
    let completed = 0;
    let failed = 0;
    let pending = 0;

    for (const task of this.executionTasks.values()) {
      switch (task.status) {
        case 'running':
          running++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'pending':
          pending++;
          break;
      }
    }

    return {
      total: this.executionTasks.size,
      running,
      completed,
      failed,
      pending,
    };
  }

  /**
   * Get completed worktrees for merging
   */
  getCompletedWorktrees(): WorktreeInfo[] {
    return this.worktreeManager.getCompleted();
  }

  /**
   * Get failed worktrees for cleanup
   */
  getFailedWorktrees(): WorktreeInfo[] {
    return this.worktreeManager.getFailed();
  }

  /**
   * Get the worktree manager for merging
   */
  getWorktreeManager(): WorktreeManager {
    return this.worktreeManager;
  }

  /**
   * Cleanup all worktrees
   * Satisfies: T5 (Worktrees must be cleaned up after task completion)
   */
  async cleanup(): Promise<void> {
    await this.worktreeManager.cleanupAll();
    this.executionTasks.clear();
  }

  /**
   * Emit progress event
   */
  private emitProgress(event: ProgressEvent): void {
    this.emit('progress', event);
    if (this.config.onProgress) {
      this.config.onProgress(event);
    }
  }
}

export default ParallelExecutor;
