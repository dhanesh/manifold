/**
 * Worktree Manager
 * Satisfies: T1 (clean branch state), T2 (isolated worktrees), T5 (cleanup), T7 (main worktree consistency)
 * Required Truths: RT-3 (isolated execution environments)
 */

import { execSync, exec } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  taskId: string;
  createdAt: Date;
  status: 'active' | 'completed' | 'failed' | 'cleaning';
}

export interface WorktreeCreateOptions {
  taskId: string;
  baseBranch?: string;
  branchPrefix?: string;
}

export interface WorktreeManagerConfig {
  baseDir: string;
  worktreeDir?: string;
  maxWorktrees?: number;
  cleanupOnExit?: boolean;
}

/**
 * Manages git worktrees for parallel agent execution
 * Satisfies: T2 (Each parallel agent operates in isolated worktree)
 */
export class WorktreeManager {
  private config: Required<WorktreeManagerConfig>;
  private activeWorktrees: Map<string, WorktreeInfo> = new Map();

  constructor(config: WorktreeManagerConfig) {
    this.config = {
      baseDir: config.baseDir,
      worktreeDir: config.worktreeDir ?? join(config.baseDir, '.parallel-worktrees'),
      maxWorktrees: config.maxWorktrees ?? 4,
      cleanupOnExit: config.cleanupOnExit ?? true,
    };

    // Ensure worktree directory exists
    if (!existsSync(this.config.worktreeDir)) {
      mkdirSync(this.config.worktreeDir, { recursive: true });
    }

    // Register cleanup on process exit
    if (this.config.cleanupOnExit) {
      process.on('exit', () => this.cleanupAll());
      process.on('SIGINT', () => {
        this.cleanupAll();
        process.exit(130);
      });
      process.on('SIGTERM', () => {
        this.cleanupAll();
        process.exit(143);
      });
    }
  }

  /**
   * Check if the repository is in a clean state
   * Satisfies: T1 (Git worktrees must be created from clean branch state)
   */
  async isCleanState(): Promise<{ clean: boolean; reason?: string }> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.config.baseDir,
      });

      if (stdout.trim()) {
        return {
          clean: false,
          reason: 'Uncommitted changes detected. Please commit or stash before creating worktrees.',
        };
      }

      return { clean: true };
    } catch (error) {
      return {
        clean: false,
        reason: `Failed to check git status: ${error}`,
      };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const { stdout } = await execAsync('git branch --show-current', {
      cwd: this.config.baseDir,
    });
    return stdout.trim();
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(): Promise<string> {
    const { stdout } = await execAsync('git rev-parse HEAD', {
      cwd: this.config.baseDir,
    });
    return stdout.trim();
  }

  /**
   * Create a new worktree for a task
   * Satisfies: T2 (isolated worktree), RT-3 (isolated execution environments)
   */
  async create(options: WorktreeCreateOptions): Promise<WorktreeInfo> {
    const { taskId, baseBranch, branchPrefix = 'parallel' } = options;

    // Check clean state first (T1)
    const cleanCheck = await this.isCleanState();
    if (!cleanCheck.clean) {
      throw new Error(`Cannot create worktree: ${cleanCheck.reason}`);
    }

    // Check worktree limit (O1)
    if (this.activeWorktrees.size >= this.config.maxWorktrees) {
      throw new Error(
        `Maximum worktrees (${this.config.maxWorktrees}) reached. ` +
        `Complete or remove existing worktrees first.`
      );
    }

    const branchName = `${branchPrefix}/${taskId}`;
    const worktreePath = join(this.config.worktreeDir, taskId);

    // Get base branch or use current
    const base = baseBranch ?? await this.getCurrentBranch();
    const commit = await this.getCurrentCommit();

    try {
      // Create the worktree with a new branch
      await execAsync(
        `git worktree add -b "${branchName}" "${worktreePath}" "${base}"`,
        { cwd: this.config.baseDir }
      );

      const info: WorktreeInfo = {
        path: worktreePath,
        branch: branchName,
        commit,
        taskId,
        createdAt: new Date(),
        status: 'active',
      };

      this.activeWorktrees.set(taskId, info);
      return info;
    } catch (error) {
      // Cleanup partial state if creation failed
      await this.forceRemove(taskId).catch(() => {});
      throw new Error(`Failed to create worktree: ${error}`);
    }
  }

  /**
   * Remove a worktree
   * Satisfies: T5 (Worktrees must be cleaned up after task completion)
   */
  async remove(taskId: string): Promise<void> {
    const info = this.activeWorktrees.get(taskId);
    if (!info) {
      throw new Error(`Worktree not found: ${taskId}`);
    }

    info.status = 'cleaning';

    try {
      // Remove worktree
      await execAsync(`git worktree remove "${info.path}" --force`, {
        cwd: this.config.baseDir,
      });

      // Delete the branch
      await execAsync(`git branch -D "${info.branch}"`, {
        cwd: this.config.baseDir,
      }).catch(() => {
        // Branch might already be deleted, ignore
      });

      this.activeWorktrees.delete(taskId);
    } catch (error) {
      // Force remove if normal remove fails
      await this.forceRemove(taskId);
    }
  }

  /**
   * Force remove a worktree (for error recovery)
   * Satisfies: T5, S2 (cleanup should remove sensitive data)
   */
  async forceRemove(taskId: string): Promise<void> {
    const info = this.activeWorktrees.get(taskId);
    const worktreePath = info?.path ?? join(this.config.worktreeDir, taskId);
    const branchName = info?.branch ?? `parallel/${taskId}`;

    // Force remove from git worktree list
    await execAsync(`git worktree remove "${worktreePath}" --force`, {
      cwd: this.config.baseDir,
    }).catch(() => {});

    // Prune stale worktree references
    await execAsync('git worktree prune', {
      cwd: this.config.baseDir,
    }).catch(() => {});

    // Remove directory if it still exists
    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }

    // Delete branch
    await execAsync(`git branch -D "${branchName}"`, {
      cwd: this.config.baseDir,
    }).catch(() => {});

    this.activeWorktrees.delete(taskId);
  }

  /**
   * List all active worktrees
   */
  list(): WorktreeInfo[] {
    return Array.from(this.activeWorktrees.values());
  }

  /**
   * Get worktree info by task ID
   */
  get(taskId: string): WorktreeInfo | undefined {
    return this.activeWorktrees.get(taskId);
  }

  /**
   * Check if a worktree exists for a task
   */
  has(taskId: string): boolean {
    return this.activeWorktrees.has(taskId);
  }

  /**
   * Get count of active worktrees
   */
  count(): number {
    return this.activeWorktrees.size;
  }

  /**
   * Check if more worktrees can be created
   * Satisfies: O1 (Maximum concurrent worktrees limited by resources)
   */
  canCreate(): boolean {
    return this.activeWorktrees.size < this.config.maxWorktrees;
  }

  /**
   * Get remaining capacity
   */
  remainingCapacity(): number {
    return this.config.maxWorktrees - this.activeWorktrees.size;
  }

  /**
   * Mark a worktree as completed (ready for merge)
   */
  markCompleted(taskId: string): void {
    const info = this.activeWorktrees.get(taskId);
    if (info) {
      info.status = 'completed';
    }
  }

  /**
   * Mark a worktree as failed
   * Satisfies: O4 (Failed parallel task must not corrupt main worktree)
   */
  markFailed(taskId: string): void {
    const info = this.activeWorktrees.get(taskId);
    if (info) {
      info.status = 'failed';
    }
  }

  /**
   * Get all completed worktrees
   */
  getCompleted(): WorktreeInfo[] {
    return Array.from(this.activeWorktrees.values())
      .filter(w => w.status === 'completed');
  }

  /**
   * Get all failed worktrees
   */
  getFailed(): WorktreeInfo[] {
    return Array.from(this.activeWorktrees.values())
      .filter(w => w.status === 'failed');
  }

  /**
   * Cleanup all worktrees
   * Satisfies: T5 (cleanup), S2 (remove sensitive data)
   */
  async cleanupAll(): Promise<void> {
    const taskIds = Array.from(this.activeWorktrees.keys());

    for (const taskId of taskIds) {
      await this.forceRemove(taskId).catch(error => {
        console.error(`Failed to cleanup worktree ${taskId}:`, error);
      });
    }
  }

  /**
   * Sync worktrees with git (discovers existing worktrees)
   */
  async sync(): Promise<void> {
    try {
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: this.config.baseDir,
      });

      const lines = stdout.split('\n');
      let currentPath = '';
      let currentBranch = '';
      let currentCommit = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentPath = line.slice(9);
        } else if (line.startsWith('HEAD ')) {
          currentCommit = line.slice(5);
        } else if (line.startsWith('branch ')) {
          currentBranch = line.slice(7);

          // Check if this is one of our parallel worktrees
          if (currentPath.startsWith(this.config.worktreeDir)) {
            const taskId = currentPath.split('/').pop() || '';
            if (taskId && !this.activeWorktrees.has(taskId)) {
              this.activeWorktrees.set(taskId, {
                path: currentPath,
                branch: currentBranch.replace('refs/heads/', ''),
                commit: currentCommit,
                taskId,
                createdAt: new Date(),
                status: 'active',
              });
            }
          }

          // Reset for next worktree
          currentPath = '';
          currentBranch = '';
          currentCommit = '';
        }
      }
    } catch (error) {
      console.error('Failed to sync worktrees:', error);
    }
  }
}

export default WorktreeManager;
