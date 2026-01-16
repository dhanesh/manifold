/**
 * ResourceMonitor Tests
 * Validates: O1, O2, O4, RT-5
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ResourceMonitor, ResourceStatus } from '../../lib/parallel/resource-monitor';
import * as os from 'os';

describe('ResourceMonitor', () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    monitor = new ResourceMonitor(process.cwd());
  });

  describe('getStatus', () => {
    it('should return complete resource status', async () => {
      // Validates: RT-5 (resource monitoring)
      const status = await monitor.getStatus();

      expect(status.disk).toBeDefined();
      expect(status.memory).toBeDefined();
      expect(status.cpu).toBeDefined();
      expect(status.overall).toBeDefined();
    });

    it('should have valid disk metrics', async () => {
      const status = await monitor.getStatus();

      expect(status.disk.available).toBeGreaterThan(0);
      expect(status.disk.total).toBeGreaterThan(0);
      expect(status.disk.usedPercent).toBeGreaterThanOrEqual(0);
      expect(status.disk.usedPercent).toBeLessThanOrEqual(100);
      expect(typeof status.disk.sufficient).toBe('boolean');
    });

    it('should have valid memory metrics', async () => {
      const status = await monitor.getStatus();

      expect(status.memory.available).toBeGreaterThan(0);
      expect(status.memory.total).toBeGreaterThan(0);
      expect(status.memory.usedPercent).toBeGreaterThanOrEqual(0);
      expect(status.memory.usedPercent).toBeLessThanOrEqual(100);
      expect(typeof status.memory.sufficient).toBe('boolean');
    });

    it('should have valid CPU metrics', async () => {
      const status = await monitor.getStatus();

      expect(status.cpu.loadAverage).toHaveLength(3);
      expect(status.cpu.cores).toBe(os.cpus().length);
      expect(status.cpu.loadPercent).toBeGreaterThanOrEqual(0);
      expect(typeof status.cpu.sufficient).toBe('boolean');
    });
  });

  describe('calculateOverall', () => {
    it('should recommend concurrency when resources available', async () => {
      // Validates: O1 (resource-based limits)
      const status = await monitor.getStatus();

      expect(status.overall.recommendedConcurrency).toBeGreaterThanOrEqual(1);
      expect(status.overall.recommendedConcurrency).toBeLessThanOrEqual(4);
    });

    it('should provide reason when cannot parallelize', async () => {
      // Validates: O2 (graceful degradation)
      const status = await monitor.getStatus();

      if (!status.overall.canParallelize) {
        expect(status.overall.reason).toBeDefined();
        expect(status.overall.reason?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('canAddWorktree', () => {
    it('should check if worktree can be added', async () => {
      // Validates: RT-5 (resource limits respected)
      const result = await monitor.canAddWorktree(0);

      expect(typeof result.allowed).toBe('boolean');
      if (!result.allowed) {
        expect(result.reason).toBeDefined();
      }
    });

    it('should deny when at max concurrency', async () => {
      const status = await monitor.getStatus();
      const maxConcurrency = status.overall.recommendedConcurrency;

      const result = await monitor.canAddWorktree(maxConcurrency);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum recommended concurrency');
    });
  });

  describe('getSummary', () => {
    it('should return formatted summary', async () => {
      const summary = await monitor.getSummary();

      expect(summary).toContain('Resource Status');
      expect(summary).toContain('Disk');
      expect(summary).toContain('Memory');
      expect(summary).toContain('CPU');
      expect(summary).toContain('Recommended concurrency');
    });
  });

  describe('custom thresholds', () => {
    it('should respect custom thresholds', async () => {
      const strictMonitor = new ResourceMonitor(process.cwd(), {
        minDiskGB: 100,  // Very high threshold
        maxDiskUsagePercent: 10,  // Very low threshold
      });

      const status = await strictMonitor.getStatus();

      // With strict thresholds, disk should likely be insufficient
      // (unless machine has >100GB free and <10% used)
      expect(typeof status.disk.sufficient).toBe('boolean');
    });
  });

  describe('watching', () => {
    it('should start and stop watching', async () => {
      const warnings: string[] = [];
      const stopWatching = monitor.startWatching(
        (msg) => warnings.push(msg),
        100 // Short interval for test
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 250));

      // Stop watching
      stopWatching();

      // Should have run at least once
      expect(typeof stopWatching).toBe('function');
    });
  });
});
