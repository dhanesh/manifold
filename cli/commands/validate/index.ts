/**
 * Validate Command — barrel re-exports
 * Satisfies: T3 (< 500 lines), T6 (all public exports preserved)
 *
 * This barrel file ensures all public exports from the original validate.ts
 * remain accessible at the same import path (cli/commands/validate.js).
 */

// Public API: command registration
export { registerValidateCommand } from './command.js';

// Public API: evidence validation
export { validateEvidenceIntegrity } from './runner.js';

// Public API: types
export type { EvidenceResult, ValidateOptions, FeatureValidationResult, ValidationMetrics } from './types.js';

// Internal but re-exported for completeness: formatting utilities
export { printValidationOutput, printEvidenceResults, createMetrics, updateMetrics, formatMetrics, MAX_ERRORS_DISPLAY } from './formatter.js';

// Internal but re-exported for completeness: runner
export { validateFeature } from './runner.js';
