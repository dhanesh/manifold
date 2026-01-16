/**
 * Parallel Config
 * Satisfies: B4 (opt-in/disable), U1 (transparent), U4 (understand reasoning)
 * Required Truths: RT-6 (User has visibility and control over parallelization)
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

export interface ParallelConfig {
  // Core settings
  enabled: boolean;
  autoSuggest: boolean;
  autoParallel: boolean;

  // Resource limits
  maxParallel: number;
  maxDiskUsagePercent: number;
  maxMemoryUsagePercent: number;
  maxCpuLoadPercent: number;

  // Execution settings
  timeout: number;
  cleanupOnComplete: boolean;
  cleanupOnFail: boolean;

  // Merge settings
  mergeStrategy: 'sequential' | 'squash' | 'rebase';
  autoPush: boolean;

  // Analysis settings
  useGitHistory: boolean;
  deepAnalysis: boolean;
  includeTests: boolean;

  // UI settings
  verbose: boolean;
  showProgress: boolean;
  progressInterval: number;
}

export const DEFAULT_CONFIG: ParallelConfig = {
  // Core settings
  enabled: true,
  autoSuggest: true,
  autoParallel: false, // Requires explicit flag

  // Resource limits
  maxParallel: 4,
  maxDiskUsagePercent: 90,
  maxMemoryUsagePercent: 85,
  maxCpuLoadPercent: 80,

  // Execution settings
  timeout: 300000, // 5 minutes
  cleanupOnComplete: true,
  cleanupOnFail: true,

  // Merge settings
  mergeStrategy: 'sequential',
  autoPush: false,

  // Analysis settings
  useGitHistory: true,
  deepAnalysis: false,
  includeTests: true,

  // UI settings
  verbose: false,
  showProgress: true,
  progressInterval: 1000,
};

const CONFIG_FILENAME = '.parallel.yaml';

/**
 * Manages parallel execution configuration
 * Satisfies: B4 (Parallelization must be opt-in or easily disabled)
 */
export class ParallelConfigManager {
  private config: ParallelConfig;
  private configPath: string;
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.configPath = join(baseDir, CONFIG_FILENAME);
    this.config = this.load();
  }

  /**
   * Load configuration from file or use defaults
   */
  private load(): ParallelConfig {
    if (!existsSync(this.configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const loaded = yaml.parse(content) as Partial<ParallelConfig>;
      return { ...DEFAULT_CONFIG, ...loaded };
    } catch (error) {
      console.warn(`Failed to load parallel config: ${error}`);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save current configuration to file
   */
  save(): void {
    try {
      const content = yaml.stringify(this.config, {
        indent: 2,
        lineWidth: 80,
      });

      const header = [
        '# Parallel Agents Configuration',
        '# See docs/parallel-agents/README.md for details',
        '',
      ].join('\n');

      writeFileSync(this.configPath, header + content, 'utf-8');
    } catch (error) {
      console.error(`Failed to save parallel config: ${error}`);
    }
  }

  /**
   * Get current configuration
   */
  get(): ParallelConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  set(updates: Partial<ParallelConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Apply CLI flags to configuration
   * Satisfies: RT-6 (User has control over parallelization)
   */
  applyFlags(flags: CliFlags): ParallelConfig {
    const config = { ...this.config };

    if (flags.autoParallel !== undefined) {
      config.autoParallel = flags.autoParallel;
    }

    if (flags.maxParallel !== undefined) {
      config.maxParallel = flags.maxParallel;
    }

    if (flags.verbose !== undefined) {
      config.verbose = flags.verbose;
    }

    if (flags.deep !== undefined) {
      config.deepAnalysis = flags.deep;
    }

    if (flags.timeout !== undefined) {
      config.timeout = flags.timeout;
    }

    if (flags.strategy !== undefined) {
      config.mergeStrategy = flags.strategy;
    }

    if (flags.noCleanup) {
      config.cleanupOnComplete = false;
      config.cleanupOnFail = false;
    }

    return config;
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.maxParallel < 1 || this.config.maxParallel > 10) {
      errors.push('maxParallel must be between 1 and 10');
    }

    if (this.config.maxDiskUsagePercent < 50 || this.config.maxDiskUsagePercent > 95) {
      errors.push('maxDiskUsagePercent must be between 50 and 95');
    }

    if (this.config.maxMemoryUsagePercent < 50 || this.config.maxMemoryUsagePercent > 95) {
      errors.push('maxMemoryUsagePercent must be between 50 and 95');
    }

    if (this.config.maxCpuLoadPercent < 50 || this.config.maxCpuLoadPercent > 95) {
      errors.push('maxCpuLoadPercent must be between 50 and 95');
    }

    if (this.config.timeout < 10000 || this.config.timeout > 3600000) {
      errors.push('timeout must be between 10 seconds and 1 hour');
    }

    if (!['sequential', 'squash', 'rebase'].includes(this.config.mergeStrategy)) {
      errors.push('mergeStrategy must be sequential, squash, or rebase');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration as formatted string
   */
  toString(): string {
    return yaml.stringify(this.config, { indent: 2 });
  }

  /**
   * Check if parallelization is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if auto-parallel mode is enabled
   */
  isAutoParallel(): boolean {
    return this.config.enabled && this.config.autoParallel;
  }

  /**
   * Check if auto-suggest is enabled
   */
  isAutoSuggest(): boolean {
    return this.config.enabled && this.config.autoSuggest;
  }
}

export interface CliFlags {
  autoParallel?: boolean;
  maxParallel?: number;
  verbose?: boolean;
  deep?: boolean;
  timeout?: number;
  strategy?: 'sequential' | 'squash' | 'rebase';
  noCleanup?: boolean;
}

/**
 * Parse CLI arguments for parallel configuration
 */
export function parseParallelFlags(args: string[]): CliFlags {
  const flags: CliFlags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--auto-parallel':
        flags.autoParallel = true;
        break;

      case '--no-parallel':
        flags.autoParallel = false;
        break;

      case '--max-parallel':
        const maxVal = parseInt(args[++i], 10);
        if (!isNaN(maxVal)) {
          flags.maxParallel = maxVal;
        }
        break;

      case '-v':
      case '--verbose':
        flags.verbose = true;
        break;

      case '--deep':
        flags.deep = true;
        break;

      case '--timeout':
        const timeoutVal = parseInt(args[++i], 10);
        if (!isNaN(timeoutVal)) {
          flags.timeout = timeoutVal * 1000; // Convert to ms
        }
        break;

      case '--strategy':
        const strategy = args[++i];
        if (['sequential', 'squash', 'rebase'].includes(strategy)) {
          flags.strategy = strategy as 'sequential' | 'squash' | 'rebase';
        }
        break;

      case '--no-cleanup':
        flags.noCleanup = true;
        break;
    }
  }

  return flags;
}

export default ParallelConfigManager;
