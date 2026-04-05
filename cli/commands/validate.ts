/**
 * Barrel re-export for backward compatibility
 * Satisfies: T6 (no import path changes required)
 *
 * The validate command implementation has been split into submodules
 * under cli/commands/validate/ for maintainability (T3: < 500 lines each).
 * This file preserves the original import path.
 */
export * from './validate/index.js';
