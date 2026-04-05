/**
 * Schema Type Definitions for Manifold CLI
 * Satisfies: T3 (< 500 lines), T6 (public exports preserved), RT-4
 */

import type { SchemaVersion } from '../parser.js';

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  schemaVersion: SchemaVersion;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Evidence verification result
 */
export interface EvidenceVerificationResult {
  id: string;
  type: string;
  path?: string;
  pattern?: string;
  verified: boolean;
  error?: string;
  matches?: number;
  testOutput?: string;
}

/**
 * Overall evidence verification summary
 */
export interface EvidenceVerificationSummary {
  total: number;
  verified: number;
  failed: number;
  skipped: number;
  results: EvidenceVerificationResult[];
}
