/**
 * Merge Orchestrator
 * Satisfies: B1 (no merge conflicts), U3 (automatic merge), O4 (failure isolation)
 * Required Truths: RT-4 (Results from parallel agents can be merged automatically)
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { WorktreeInfo, WorktreeManager } from './worktree-manager';

const execAsync = promisify(exec);

export interface MergeResult {
  taskId: string;
  success: boolean;
  branch: string;
  commits: number;
  filesChanged: string[];
  error?: string;
}

export interface MergeOrchestratorResult {
  success: boolean;
  merged: MergeResult[];
  failed: MergeResult[];
  skipped: string[];
  totalCommits: number;
  totalFilesChanged: string[];
}

export interface MergeStrategy {
  type: 'sequential' | 'squash' | 'rebase';
  message?: string;
}

/**
 * Orchestrates merging of parallel work back to main worktree
 * Satisfies: RT-4 (Results from parallel agents can be merged automatically)
 */
export class MergeOrchestrator {
  private baseDir: string;
  private targetBranch: string;

  constructor(baseDir: string, targetBranch?: string) {
    this.baseDir = baseDir;
    this.targetBranch = targetBranch || this.getCurrentBranch();
  }

  /**
   * Merge all completed worktrees back to main
   * Satisfies: U3 (Results from parallel agents must be merged automatically)
   */
  async mergeAll(
    worktrees: WorktreeInfo[],
    strategy: MergeStrategy = { type: 'sequential' }
  ): Promise<MergeOrchestratorResult> {
    const merged: MergeResult[] = [];
    const failed: MergeResult[] = [];
    const skipped: string[] = [];
    let totalCommits = 0;
    const allFilesChanged = new Set<string>();

    // Filter to only completed worktrees
    const completedWorktrees = worktrees.filter(w => w.status === 'completed');
    const failedWorktrees = worktrees.filter(w => w.status === 'failed');

    // Skip failed worktrees
    for (const worktree of failedWorktrees) {
      skipped.push(worktree.taskId);
    }

    // Pre-check for potential conflicts
    for (const worktree of completedWorktrees) {
      const canMerge = await this.canMergeSafely(worktree);
      if (!canMerge.safe) {
        failed.push({
          taskId: worktree.taskId,
          success: false,
          branch: worktree.branch,
          commits: 0,
          filesChanged: [],
          error: canMerge.reason,
        });
        continue;
      }

      try {
        const result = await this.mergeBranch(worktree, strategy);
        if (result.success) {
          merged.push(result);
          totalCommits += result.commits;
          result.filesChanged.forEach(f => allFilesChanged.add(f));
        } else {
          failed.push(result);
        }
      } catch (error) {
        failed.push({
          taskId: worktree.taskId,
          success: false,
          branch: worktree.branch,
          commits: 0,
          filesChanged: [],
          error: String(error),
        });
      }
    }

    return {
      success: failed.length === 0,
      merged,
      failed,
      skipped,
      totalCommits,
      totalFilesChanged: Array.from(allFilesChanged),
    };
  }

  /**
   * Merge a single branch from worktree
   */
  async mergeBranch(
    worktree: WorktreeInfo,
    strategy: MergeStrategy
  ): Promise<MergeResult> {
    const { branch, taskId } = worktree;

    try {
      // Get commit count and files changed
      const commitInfo = await this.getCommitInfo(branch);

      if (commitInfo.commits === 0) {
        return {
          taskId,
          success: true,
          branch,
          commits: 0,
          filesChanged: [],
        };
      }

      // Perform merge based on strategy
      switch (strategy.type) {
        case 'squash':
          await this.squashMerge(branch, strategy.message || `Merge parallel task: ${taskId}`);
          break;

        case 'rebase':
          await this.rebaseMerge(branch);
          break;

        case 'sequential':
        default:
          await this.sequentialMerge(branch);
          break;
      }

      return {
        taskId,
        success: true,
        branch,
        commits: commitInfo.commits,
        filesChanged: commitInfo.filesChanged,
      };
    } catch (error) {
      // Attempt to abort merge if it failed
      await this.abortMerge().catch(() => {});

      return {
        taskId,
        success: false,
        branch,
        commits: 0,
        filesChanged: [],
        error: String(error),
      };
    }
  }

  /**
   * Check if a branch can be merged safely
   * Satisfies: B1 (Parallel work must not introduce merge conflicts)
   */
  async canMergeSafely(worktree: WorktreeInfo): Promise<{ safe: boolean; reason?: string }> {
    try {
      // Try a dry-run merge
      await execAsync(
        `git merge --no-commit --no-ff "${worktree.branch}"`,
        { cwd: this.baseDir }
      );

      // Abort the test merge
      await execAsync('git merge --abort', { cwd: this.baseDir });

      return { safe: true };
    } catch (error) {
      // Abort any partial merge
      await execAsync('git merge --abort', { cwd: this.baseDir }).catch(() => {});

      const errorMsg = String(error);
      if (errorMsg.includes('CONFLICT')) {
        return {
          safe: false,
          reason: 'Merge would result in conflicts. File overlap detection may have missed some files.',
        };
      }

      return {
        safe: false,
        reason: `Merge check failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Sequential merge (preserve commit history)
   */
  private async sequentialMerge(branch: string): Promise<void> {
    await execAsync(
      `git merge --no-ff "${branch}" -m "Merge parallel task: ${branch}"`,
      { cwd: this.baseDir }
    );
  }

  /**
   * Squash merge (combine all commits)
   */
  private async squashMerge(branch: string, message: string): Promise<void> {
    await execAsync(`git merge --squash "${branch}"`, { cwd: this.baseDir });
    await execAsync(`git commit -m "${message}"`, { cwd: this.baseDir });
  }

  /**
   * Rebase merge (linear history)
   */
  private async rebaseMerge(branch: string): Promise<void> {
    await execAsync(`git rebase "${branch}"`, { cwd: this.baseDir });
  }

  /**
   * Abort an in-progress merge
   */
  private async abortMerge(): Promise<void> {
    await execAsync('git merge --abort', { cwd: this.baseDir });
  }

  /**
   * Get commit info for a branch
   */
  private async getCommitInfo(branch: string): Promise<{
    commits: number;
    filesChanged: string[];
  }> {
    try {
      // Count commits not in target branch
      const { stdout: countOutput } = await execAsync(
        `git rev-list --count "${this.targetBranch}..${branch}"`,
        { cwd: this.baseDir }
      );
      const commits = parseInt(countOutput.trim(), 10);

      // Get changed files
      const { stdout: filesOutput } = await execAsync(
        `git diff --name-only "${this.targetBranch}...${branch}"`,
        { cwd: this.baseDir }
      );
      const filesChanged = filesOutput.trim().split('\n').filter(Boolean);

      return { commits, filesChanged };
    } catch {
      return { commits: 0, filesChanged: [] };
    }
  }

  /**
   * Get current branch name
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git branch --show-current', {
        cwd: this.baseDir,
        encoding: 'utf-8',
      }).trim();
    } catch {
      return 'main';
    }
  }

  /**
   * Rollback a merge if needed
   * Satisfies: O4 (Failed parallel task must not corrupt main worktree)
   */
  async rollback(commits: number = 1): Promise<void> {
    await execAsync(
      `git reset --hard HEAD~${commits}`,
      { cwd: this.baseDir }
    );
  }

  /**
   * Generate merge summary
   */
  generateSummary(result: MergeOrchestratorResult): string {
    const lines = [
      '## Merge Summary',
      '',
      `Status: ${result.success ? '✅ Success' : '❌ Failed'}`,
      `Total commits merged: ${result.totalCommits}`,
      `Files changed: ${result.totalFilesChanged.length}`,
      '',
    ];

    if (result.merged.length > 0) {
      lines.push('### Successfully Merged');
      for (const m of result.merged) {
        lines.push(`- ${m.taskId}: ${m.commits} commits, ${m.filesChanged.length} files`);
      }
      lines.push('');
    }

    if (result.failed.length > 0) {
      lines.push('### Failed to Merge');
      for (const f of result.failed) {
        lines.push(`- ${f.taskId}: ${f.error}`);
      }
      lines.push('');
    }

    if (result.skipped.length > 0) {
      lines.push('### Skipped (Failed Tasks)');
      for (const s of result.skipped) {
        lines.push(`- ${s}`);
      }
      lines.push('');
    }

    if (result.totalFilesChanged.length > 0) {
      lines.push('### Files Changed');
      for (const f of result.totalFilesChanged.slice(0, 20)) {
        lines.push(`- ${f}`);
      }
      if (result.totalFilesChanged.length > 20) {
        lines.push(`... and ${result.totalFilesChanged.length - 20} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Cleanup branches after successful merge
   */
  async cleanupBranches(
    worktreeManager: WorktreeManager,
    results: MergeResult[]
  ): Promise<void> {
    for (const result of results) {
      if (result.success) {
        await worktreeManager.remove(result.taskId).catch(error => {
          console.error(`Failed to cleanup worktree for ${result.taskId}:`, error);
        });
      }
    }
  }
}

export default MergeOrchestrator;
