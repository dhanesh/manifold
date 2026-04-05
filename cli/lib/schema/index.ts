/**
 * Schema Validation Barrel Export
 * Satisfies: T3 (< 500 lines), T6 (all public exports preserved)
 *
 * Re-exports all public types and functions from submodules so that
 * external consumers importing from '../lib/schema.js' continue to work
 * without any import path changes.
 */

// Types and interfaces
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EvidenceVerificationResult,
  EvidenceVerificationSummary,
} from './types.js';

// Core validation functions
export {
  validateManifold,
  countConstraints,
  countConstraintsByType,
} from './validation.js';

// Evidence and graph validation functions
export {
  sanitizePath,
  verifyEvidenceParallel,
  formatEvidenceVerification,
} from './evidence.js';
