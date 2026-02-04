/**
 * Resource Monitor
 * Satisfies: O1 (resource limits), O2 (graceful degradation), O4 (failure isolation)
 * Required Truths: RT-5 (Resource limits are monitored and respected)
 */

import { execSync } from 'child_process';
import { statSync } from 'fs';
import * as os from 'os';

export interface ResourceStatus {
  disk: DiskStatus;
  memory: MemoryStatus;
  cpu: CpuStatus;
  overall: OverallStatus;
}

export interface DiskStatus {
  available: number;      // bytes
  total: number;          // bytes
  usedPercent: number;    // 0-100
  sufficient: boolean;
}

export interface MemoryStatus {
  available: number;      // bytes
  total: number;          // bytes
  usedPercent: number;    // 0-100
  sufficient: boolean;
}

export interface CpuStatus {
  loadAverage: number[];  // 1, 5, 15 minute averages
  cores: number;
  loadPercent: number;    // relative to cores
  sufficient: boolean;
}

export interface OverallStatus {
  canParallelize: boolean;
  recommendedConcurrency: number;
  reason?: string;
}

export interface ResourceThresholds {
  minDiskGB: number;
  maxDiskUsagePercent: number;
  minMemoryGB: number;
  maxMemoryUsagePercent: number;
  maxCpuLoadPercent: number;
  worktreeSizeEstimateMB: number;
}

const DEFAULT_THRESHOLDS: ResourceThresholds = {
  minDiskGB: 2,                    // Minimum 2GB free disk
  maxDiskUsagePercent: 90,         // Max 90% disk usage
  minMemoryGB: 1,                  // Minimum 1GB free memory
  maxMemoryUsagePercent: 85,       // Max 85% memory usage
  maxCpuLoadPercent: 80,           // Max 80% CPU load
  worktreeSizeEstimateMB: 500,     // Estimate 500MB per worktree
};

/**
 * Monitors system resources for parallel execution
 * Satisfies: RT-5 (Resource limits are monitored and respected)
 */
export class ResourceMonitor {
  private thresholds: ResourceThresholds;
  private baseDir: string;

  constructor(baseDir: string, thresholds: Partial<ResourceThresholds> = {}) {
    this.baseDir = baseDir;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Get comprehensive resource status
   * Satisfies: O1 (Maximum concurrent worktrees limited by available resources)
   */
  async getStatus(): Promise<ResourceStatus> {
    const disk = await this.getDiskStatus();
    const memory = this.getMemoryStatus();
    const cpu = this.getCpuStatus();
    const overall = this.calculateOverall(disk, memory, cpu);

    return { disk, memory, cpu, overall };
  }

  /**
   * Get disk usage status
   */
  async getDiskStatus(): Promise<DiskStatus> {
    try {
      // Use df command for cross-platform disk info
      const output = execSync(`df -k "${this.baseDir}"`, { encoding: 'utf-8' });
      const lines = output.trim().split('\n');

      if (lines.length < 2) {
        throw new Error('Unexpected df output');
      }

      // Parse df output (skip header)
      const parts = lines[1].split(/\s+/);
      const totalKB = parseInt(parts[1], 10);
      const usedKB = parseInt(parts[2], 10);
      const availableKB = parseInt(parts[3], 10);

      const total = totalKB * 1024;
      const available = availableKB * 1024;
      const usedPercent = (usedKB / totalKB) * 100;

      const minRequired = this.thresholds.minDiskGB * 1024 * 1024 * 1024;
      const sufficient =
        available >= minRequired &&
        usedPercent <= this.thresholds.maxDiskUsagePercent;

      return { available, total, usedPercent, sufficient };
    } catch (error) {
      // Fallback: assume sufficient if we can't check
      console.warn('Failed to check disk status:', error);
      return {
        available: 10 * 1024 * 1024 * 1024, // Assume 10GB
        total: 100 * 1024 * 1024 * 1024,
        usedPercent: 50,
        sufficient: true,
      };
    }
  }

  /**
   * Get memory usage status
   */
  getMemoryStatus(): MemoryStatus {
    const total = os.totalmem();
    const free = os.freemem();
    const available = free; // Simplified; on Linux could use /proc/meminfo for actual available
    const usedPercent = ((total - free) / total) * 100;

    const minRequired = this.thresholds.minMemoryGB * 1024 * 1024 * 1024;
    const sufficient =
      available >= minRequired &&
      usedPercent <= this.thresholds.maxMemoryUsagePercent;

    return { available, total, usedPercent, sufficient };
  }

  /**
   * Get CPU usage status
   */
  getCpuStatus(): CpuStatus {
    const loadAverage = os.loadavg();
    const cores = os.cpus().length;

    // Use 1-minute load average, normalized to cores
    const loadPercent = (loadAverage[0] / cores) * 100;
    const sufficient = loadPercent <= this.thresholds.maxCpuLoadPercent;

    return { loadAverage, cores, loadPercent, sufficient };
  }

  /**
   * Calculate recommended concurrency based on resources
   * Satisfies: O2 (Graceful degradation when resources are constrained)
   */
  calculateOverall(disk: DiskStatus, memory: MemoryStatus, cpu: CpuStatus): OverallStatus {
    // If any resource is critically low, don't parallelize
    if (!disk.sufficient || !memory.sufficient || !cpu.sufficient) {
      const reasons: string[] = [];
      if (!disk.sufficient) reasons.push('insufficient disk space');
      if (!memory.sufficient) reasons.push('insufficient memory');
      if (!cpu.sufficient) reasons.push('high CPU load');

      return {
        canParallelize: false,
        recommendedConcurrency: 1,
        reason: `Resource constraints: ${reasons.join(', ')}`,
      };
    }

    // Calculate how many worktrees we can support based on disk
    const worktreeSizeBytes = this.thresholds.worktreeSizeEstimateMB * 1024 * 1024;
    const diskBasedConcurrency = Math.floor(disk.available / worktreeSizeBytes);

    // Calculate based on memory (assume ~200MB per agent process)
    const memoryPerAgent = 200 * 1024 * 1024;
    const memoryBasedConcurrency = Math.floor(memory.available / memoryPerAgent);

    // Calculate based on CPU (leave some headroom)
    const availableCpuPercent = this.thresholds.maxCpuLoadPercent - cpu.loadPercent;
    const cpuBasedConcurrency = Math.max(1, Math.floor((availableCpuPercent / 100) * cpu.cores));

    // Take the minimum of all constraints
    const recommended = Math.min(
      diskBasedConcurrency,
      memoryBasedConcurrency,
      cpuBasedConcurrency,
      4 // Hard cap at 4 for safety
    );

    // If recommended is 1 or less, provide a reason
    if (recommended <= 1) {
      const bottleneck =
        diskBasedConcurrency <= 1 ? 'disk space' :
        memoryBasedConcurrency <= 1 ? 'memory' :
        cpuBasedConcurrency <= 1 ? 'CPU capacity' : 'resource limits';

      return {
        canParallelize: false,
        recommendedConcurrency: 1,
        reason: `Insufficient ${bottleneck} for parallel execution`,
      };
    }

    return {
      canParallelize: true,
      recommendedConcurrency: recommended,
    };
  }

  /**
   * Check if we can add another worktree
   * Satisfies: RT-5 (Resource limits are monitored and respected)
   */
  async canAddWorktree(currentCount: number): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getStatus();

    if (!status.overall.canParallelize) {
      return {
        allowed: false,
        reason: status.overall.reason || 'Resources insufficient for parallelization'
      };
    }

    if (currentCount >= status.overall.recommendedConcurrency) {
      return {
        allowed: false,
        reason: `Maximum recommended concurrency (${status.overall.recommendedConcurrency}) reached`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get a formatted summary of resource status
   */
  async getSummary(): Promise<string> {
    const status = await this.getStatus();

    const formatBytes = (bytes: number): string => {
      const gb = bytes / (1024 * 1024 * 1024);
      return `${gb.toFixed(1)}GB`;
    };

    const lines = [
      'Resource Status:',
      `  Disk: ${formatBytes(status.disk.available)} available (${status.disk.usedPercent.toFixed(1)}% used) ${status.disk.sufficient ? '✓' : '✗'}`,
      `  Memory: ${formatBytes(status.memory.available)} available (${status.memory.usedPercent.toFixed(1)}% used) ${status.memory.sufficient ? '✓' : '✗'}`,
      `  CPU: ${status.cpu.loadPercent.toFixed(1)}% load (${status.cpu.cores} cores) ${status.cpu.sufficient ? '✓' : '✗'}`,
      `  Recommended concurrency: ${status.overall.recommendedConcurrency}`,
    ];

    if (status.overall.reason) {
      lines.push(`  Note: ${status.overall.reason}`);
    }

    return lines.join('\n');
  }

  /**
   * Watch resources and emit warnings
   * Returns cleanup function
   */
  startWatching(
    onWarning: (message: string) => void,
    intervalMs: number = 30000
  ): () => void {
    let lastStatus: ResourceStatus | null = null;

    const check = async () => {
      const status = await this.getStatus();

      // Warn on transitions from sufficient to insufficient
      if (lastStatus) {
        if (lastStatus.disk.sufficient && !status.disk.sufficient) {
          onWarning('Disk space running low - consider reducing parallelism');
        }
        if (lastStatus.memory.sufficient && !status.memory.sufficient) {
          onWarning('Memory running low - consider reducing parallelism');
        }
        if (lastStatus.cpu.sufficient && !status.cpu.sufficient) {
          onWarning('CPU load high - consider reducing parallelism');
        }
      }

      lastStatus = status;
    };

    const intervalId = setInterval(check, intervalMs);
    check(); // Initial check

    return () => clearInterval(intervalId);
  }
}

export default ResourceMonitor;
