/**
 * Manifold Configuration Module
 * Satisfies: RT-3 (configurable test runner), RT-6 (extensible config)
 *
 * Loads project-level configuration from .manifold/config.json.
 * Returns empty defaults when config file is missing (backward compatible).
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// ============================================================
// Configuration Types
// ============================================================

export interface TestTierPatterns {
  unit?: string[];          // e.g., ["*.test.ts", "*.spec.ts"]
  integration?: string[];   // e.g., ["*.integration.ts"]
  e2e?: string[];           // e.g., ["*.e2e.ts"]
}

export interface ModelRoutingConfig {
  context_window?: number;          // user's context window size in tokens (default: 200000)
  overrides?: Record<string, 'haiku' | 'sonnet' | 'opus'>; // per-phase model override
}

export interface ManifoldConfig {
  test_runner?: string;           // e.g., "bun test", "pytest", "jest"
  test_args?: string[];           // additional args passed to runner
  test_tier_patterns?: TestTierPatterns;
  drift_hooks?: {
    on_drift?: string;            // command to run when drift detected
  };
  models?: ModelRoutingConfig;    // model routing configuration
}

// ============================================================
// Default Configuration
// ============================================================

// ============================================================
// Zod Schema for Runtime Validation
// Satisfies: Commandment 8 (Respect Data Consistency — validate external data)
// ============================================================

const ManifoldConfigSchema = z.object({
  test_runner: z.string().optional(),
  test_args: z.array(z.string()).optional(),
  test_tier_patterns: z.object({
    unit: z.array(z.string()).optional(),
    integration: z.array(z.string()).optional(),
    e2e: z.array(z.string()).optional(),
  }).optional(),
  drift_hooks: z.object({
    on_drift: z.string().optional(),
  }).optional(),
  models: z.object({
    context_window: z.number().optional(),
    overrides: z.record(z.enum(['haiku', 'sonnet', 'opus'])).optional(),
  }).optional(),
}).passthrough();

const DEFAULT_CONFIG: ManifoldConfig = {};

const DEFAULT_TIER_PATTERNS: TestTierPatterns = {
  unit: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js', 'test_*.py'],
  integration: ['*.integration.ts', '*.integration.js', '*_integration_test.py'],
  e2e: ['*.e2e.ts', '*.e2e.js', '*_e2e_test.py'],
};

// ============================================================
// Configuration Loader
// ============================================================

/**
 * Load configuration from .manifold/config.json
 * Returns empty config if file doesn't exist (backward compatible)
 */
export function loadConfig(basePath: string): ManifoldConfig {
  const configPath = join(basePath, '.manifold', 'config.json');

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const json = JSON.parse(raw);
    const result = ManifoldConfigSchema.safeParse(json);
    if (!result.success) {
      // Malformed config — return defaults silently
      return { ...DEFAULT_CONFIG };
    }
    return result.data as ManifoldConfig;
  } catch {
    // Invalid JSON or unreadable file — return defaults silently
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Get test tier patterns with defaults merged
 */
export function getTierPatterns(config: ManifoldConfig): TestTierPatterns {
  return {
    unit: config.test_tier_patterns?.unit ?? DEFAULT_TIER_PATTERNS.unit,
    integration: config.test_tier_patterns?.integration ?? DEFAULT_TIER_PATTERNS.integration,
    e2e: config.test_tier_patterns?.e2e ?? DEFAULT_TIER_PATTERNS.e2e,
  };
}

/**
 * Infer test tier from file path using tier patterns
 */
export function inferTestTier(
  filePath: string,
  patterns: TestTierPatterns
): 'unit' | 'integration' | 'e2e' | undefined {
  const fileName = filePath.split('/').pop() || '';

  for (const tier of ['e2e', 'integration', 'unit'] as const) {
    const tierPatterns = patterns[tier] || [];
    for (const pattern of tierPatterns) {
      // Convert glob pattern to regex
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      );
      if (regex.test(fileName)) {
        return tier;
      }
    }
  }

  return undefined;
}
