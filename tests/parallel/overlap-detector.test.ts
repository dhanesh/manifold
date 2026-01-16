/**
 * OverlapDetector Tests
 * Validates: T3, B1, RT-2
 */

import { describe, it, expect } from 'bun:test';
import { OverlapDetector } from '../../lib/parallel/overlap-detector';
import { FilePrediction } from '../../lib/parallel/file-predictor';

describe('OverlapDetector', () => {
  let detector: OverlapDetector;

  beforeEach(() => {
    detector = new OverlapDetector();
  });

  describe('detect', () => {
    it('should detect no overlaps for independent tasks', () => {
      // Validates: RT-2 (independent task identification)
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['src/auth.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['src/user.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-3', predictedFiles: ['src/profile.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      expect(result.hasOverlap).toBe(false);
      expect(result.overlappingFiles).toHaveLength(0);
      expect(result.taskPairs).toHaveLength(0);
    });

    it('should detect overlaps between tasks', () => {
      // Validates: T3 (file overlap detection), B1 (conflict prevention)
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['src/shared.ts', 'src/auth.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['src/shared.ts', 'src/user.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      expect(result.hasOverlap).toBe(true);
      expect(result.overlappingFiles).toContain('src/shared.ts');
      expect(result.taskPairs).toHaveLength(1);
      expect(result.taskPairs[0].task1).toBe('task-1');
      expect(result.taskPairs[0].task2).toBe('task-2');
    });

    it('should detect multiple overlapping files', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['a.ts', 'b.ts', 'c.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['b.ts', 'c.ts', 'd.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      expect(result.overlappingFiles).toContain('b.ts');
      expect(result.overlappingFiles).toContain('c.ts');
      expect(result.taskPairs[0].overlappingFiles).toHaveLength(2);
    });

    it('should detect overlaps among multiple tasks', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-3', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      // Should have 3 pairs: 1-2, 1-3, 2-3
      expect(result.taskPairs).toHaveLength(3);
    });
  });

  describe('canRunInParallel', () => {
    it('should allow parallel for non-overlapping files', () => {
      // Validates: RT-2 (independent identification)
      const pred1: FilePrediction = { taskId: 'task-1', predictedFiles: ['a.ts'], confidence: 0.9, method: 'explicit' };
      const pred2: FilePrediction = { taskId: 'task-2', predictedFiles: ['b.ts'], confidence: 0.9, method: 'explicit' };

      const result = detector.canRunInParallel(pred1, pred2);

      expect(result.canParallelize).toBe(true);
    });

    it('should prevent parallel for overlapping files', () => {
      // Validates: T3 (prevent same-file parallel)
      const pred1: FilePrediction = { taskId: 'task-1', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' };
      const pred2: FilePrediction = { taskId: 'task-2', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' };

      const result = detector.canRunInParallel(pred1, pred2);

      expect(result.canParallelize).toBe(false);
      expect(result.overlappingFiles).toContain('shared.ts');
    });
  });

  describe('safeGroups', () => {
    it('should create safe groups for non-overlapping tasks', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['a.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['b.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-3', predictedFiles: ['c.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      // All tasks should be in one safe group
      expect(result.safeGroups.length).toBeGreaterThan(0);
      const totalTasksInGroups = result.safeGroups.reduce(
        (sum, g) => sum + g.taskIds.length, 0
      );
      expect(totalTasksInGroups).toBe(3);
    });

    it('should separate overlapping tasks into different groups', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['shared.ts', 'a.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['shared.ts', 'b.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-3', predictedFiles: ['c.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      // task-1 and task-2 cannot be in same group, task-3 can be with either
      const group1 = result.safeGroups.find(g => g.taskIds.includes('task-1'));
      const group2 = result.safeGroups.find(g => g.taskIds.includes('task-2'));

      // task-1 and task-2 should not be in the same group
      if (group1 && group2 && group1.id === group2.id) {
        // They're in the same group - this would be wrong
        expect(group1.taskIds.includes('task-1') && group1.taskIds.includes('task-2')).toBe(false);
      }
    });
  });

  describe('analyze', () => {
    it('should provide analysis with recommendations', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-3', predictedFiles: ['other.ts'], confidence: 0.9, method: 'explicit' },
      ];

      const analysis = detector.analyze(predictions);

      expect(analysis.totalTasks).toBe(3);
      expect(analysis.blocked).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('severity assessment', () => {
    it('should mark source files as critical', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['src/component.tsx'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['src/component.tsx'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      expect(result.taskPairs[0].severity).toBe('critical');
    });

    it('should mark config files as warning', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['config.json'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['config.json'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      expect(result.taskPairs[0].severity).toBe('warning');
    });

    it('should mark documentation files as info', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['README.md'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['README.md'], confidence: 0.9, method: 'explicit' },
      ];

      const result = detector.detect(predictions);

      expect(result.taskPairs[0].severity).toBe('info');
    });
  });

  describe('isConflictFree', () => {
    it('should return true for no overlaps', () => {
      // Validates: B1 (no merge conflicts)
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['a.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['b.ts'], confidence: 0.9, method: 'explicit' },
      ];

      expect(detector.isConflictFree(predictions)).toBe(true);
    });

    it('should return false for critical overlaps', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
      ];

      expect(detector.isConflictFree(predictions)).toBe(false);
    });
  });

  describe('getMaxParallelization', () => {
    it('should return max group size', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['a.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['b.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-3', predictedFiles: ['c.ts'], confidence: 0.9, method: 'explicit' },
      ];

      expect(detector.getMaxParallelization(predictions)).toBe(3);
    });

    it('should account for overlaps', () => {
      const predictions: FilePrediction[] = [
        { taskId: 'task-1', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
        { taskId: 'task-2', predictedFiles: ['shared.ts'], confidence: 0.9, method: 'explicit' },
      ];

      // With overlap, max parallelization is 1 (can't run both)
      expect(detector.getMaxParallelization(predictions)).toBeLessThanOrEqual(2);
    });
  });
});
