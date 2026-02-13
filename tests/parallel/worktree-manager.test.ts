/**
 * WorktreeManager Tests
 * Validates: T1, T2, T5, T7, O1, O4, RT-3
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { WorktreeManager, WorktreeInfo } from '../../lib/parallel/worktree-manager';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Test directory setup
const TEST_DIR = '/tmp/manifold-worktree-test';
const WORKTREE_DIR = join(TEST_DIR, '.parallel-worktrees');

describe('WorktreeManager', () => {
  let manager: WorktreeManager;

  beforeEach(() => {
    // Create test git repo
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    execSync('git init', { cwd: TEST_DIR });
    execSync('git config user.email "test@test.com"', { cwd: TEST_DIR });
    execSync('git config user.name "Test"', { cwd: TEST_DIR });
    // Disable commit signing for test repo (global config may enforce it)
    execSync('git config commit.gpgsign false', { cwd: TEST_DIR });
    // Add .parallel-worktrees to gitignore so worktree creation doesn't cause "dirty" state
    execSync('echo ".parallel-worktrees" > .gitignore', { cwd: TEST_DIR });
    execSync('touch README.md && git add . && git commit -m "init"', { cwd: TEST_DIR });

    manager = new WorktreeManager({
      baseDir: TEST_DIR,
      maxWorktrees: 4,
      cleanupOnExit: false, // Don't register cleanup handlers in tests
    });
  });

  afterEach(async () => {
    // Cleanup
    await manager.cleanupAll();
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('isCleanState', () => {
    it('should return clean for empty repo', async () => {
      // Validates: T1 (clean branch state required)
      const result = await manager.isCleanState();
      expect(result.clean).toBe(true);
    });

    it('should return not clean for uncommitted changes', async () => {
      // Validates: T1 (dirty state detection)
      execSync('echo "change" >> README.md', { cwd: TEST_DIR });

      const result = await manager.isCleanState();
      expect(result.clean).toBe(false);
      expect(result.reason).toContain('Uncommitted changes');
    });
  });

  describe('create', () => {
    it('should create worktree successfully', async () => {
      // Validates: T2 (isolated worktree creation), RT-3
      const info = await manager.create({ taskId: 'task-1' });

      expect(info.taskId).toBe('task-1');
      expect(info.status).toBe('active');
      expect(existsSync(info.path)).toBe(true);
      expect(manager.has('task-1')).toBe(true);
    });

    it('should fail when not clean', async () => {
      // Validates: T1 (clean state required)
      execSync('echo "change" >> README.md', { cwd: TEST_DIR });

      await expect(manager.create({ taskId: 'task-1' }))
        .rejects.toThrow('Cannot create worktree');
    });

    it('should respect max worktrees limit', async () => {
      // Validates: O1 (resource limits)
      // Create max worktrees
      for (let i = 0; i < 4; i++) {
        await manager.create({ taskId: `task-${i}` });
      }

      await expect(manager.create({ taskId: 'task-5' }))
        .rejects.toThrow('Maximum worktrees');
    });

    it('should use custom branch prefix', async () => {
      const info = await manager.create({
        taskId: 'my-task',
        branchPrefix: 'custom',
      });

      expect(info.branch).toBe('custom/my-task');
    });
  });

  describe('remove', () => {
    it('should remove worktree successfully', async () => {
      // Validates: T5 (cleanup after completion)
      const info = await manager.create({ taskId: 'task-1' });
      expect(existsSync(info.path)).toBe(true);

      await manager.remove('task-1');

      expect(existsSync(info.path)).toBe(false);
      expect(manager.has('task-1')).toBe(false);
    });

    it('should throw for non-existent worktree', async () => {
      await expect(manager.remove('nonexistent'))
        .rejects.toThrow('Worktree not found');
    });
  });

  describe('list and count', () => {
    it('should list all active worktrees', async () => {
      await manager.create({ taskId: 'task-1' });
      await manager.create({ taskId: 'task-2' });

      const list = manager.list();
      expect(list).toHaveLength(2);
      expect(list.map(w => w.taskId)).toContain('task-1');
      expect(list.map(w => w.taskId)).toContain('task-2');
    });

    it('should count worktrees correctly', async () => {
      expect(manager.count()).toBe(0);

      await manager.create({ taskId: 'task-1' });
      expect(manager.count()).toBe(1);

      await manager.create({ taskId: 'task-2' });
      expect(manager.count()).toBe(2);
    });
  });

  describe('canCreate and remainingCapacity', () => {
    it('should report capacity correctly', async () => {
      // Validates: O1 (resource awareness)
      expect(manager.canCreate()).toBe(true);
      expect(manager.remainingCapacity()).toBe(4);

      await manager.create({ taskId: 'task-1' });
      expect(manager.remainingCapacity()).toBe(3);

      await manager.create({ taskId: 'task-2' });
      await manager.create({ taskId: 'task-3' });
      await manager.create({ taskId: 'task-4' });

      expect(manager.canCreate()).toBe(false);
      expect(manager.remainingCapacity()).toBe(0);
    });
  });

  describe('status tracking', () => {
    it('should track completed status', async () => {
      // Validates: tracking for merge
      await manager.create({ taskId: 'task-1' });
      manager.markCompleted('task-1');

      const completed = manager.getCompleted();
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('completed');
    });

    it('should track failed status', async () => {
      // Validates: O4 (failure isolation)
      await manager.create({ taskId: 'task-1' });
      manager.markFailed('task-1');

      const failed = manager.getFailed();
      expect(failed).toHaveLength(1);
      expect(failed[0].status).toBe('failed');
    });
  });

  describe('cleanupAll', () => {
    it('should cleanup all worktrees', async () => {
      // Validates: T5, S2 (complete cleanup)
      await manager.create({ taskId: 'task-1' });
      await manager.create({ taskId: 'task-2' });

      expect(manager.count()).toBe(2);

      await manager.cleanupAll();

      expect(manager.count()).toBe(0);
      expect(existsSync(WORKTREE_DIR)).toBe(true); // Dir exists but empty
    });
  });
});
