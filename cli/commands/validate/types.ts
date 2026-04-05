/**
 * Shared types for the Validate Command submodule
 * Satisfies: T3 (< 500 lines), T6 (backward-compatible exports), RT-4
 */

import type { ValidationResult } from '../../lib/schema.js';
import type { Manifold, Evidence } from '../../lib/parser.js';
import type { LinkingResult } from '../../lib/manifold-linker.js';

export interface ValidateOptions {
  json?: boolean;
  strict?: boolean;
  all?: boolean;  // Show all errors instead of truncating at 20 (TN4 resolution)
  conflicts?: boolean;  // Run semantic conflict detection (INT-1, B2, RT-4)
  crossFeature?: boolean;  // Run cross-feature conflict detection (T4)
  metrics?: boolean;  // Show validation metrics summary (GAP-4)
  evidence?: boolean;  // Run evidence integrity validation
}

export interface FeatureValidationResult {
  valid: boolean;
  json: Record<string, unknown>;
  result?: ValidationResult;
  parseError?: string;
  manifold?: Manifold;  // For conflict detection (INT-1)
  format?: 'yaml' | 'json' | 'json-md';  // Format of the manifold
  linkingResult?: LinkingResult;  // For JSON+MD format
}

/**
 * Evidence validation result entry.
 * Represents a single finding from evidence integrity checking.
 */
export interface EvidenceResult {
  level: 'error' | 'warning' | 'info';
  message: string;
  /** The constraint or RT ID this result relates to */
  target?: string;
}

/**
 * Validation metrics for tracking error patterns
 * Satisfies: GAP-4 (error metrics tracking)
 */
export interface ValidationMetrics {
  startTime: number;
  endTime?: number;
  totalFeatures: number;
  validFeatures: number;
  invalidFeatures: number;
  schemaVersions: Map<number, number>;  // version -> count
  errorsByCategory: Map<string, number>;  // field category -> count
  warningsByCategory: Map<string, number>;
  totalErrors: number;
  totalWarnings: number;
  parseErrors: number;
  fileNotFound: number;
}

// Re-export types that consumers may need from dependencies
export type { ValidationResult } from '../../lib/schema.js';
export type { Manifold, Evidence } from '../../lib/parser.js';
export type { LinkingResult } from '../../lib/manifold-linker.js';
