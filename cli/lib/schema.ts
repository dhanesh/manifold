/**
 * Barrel re-export for backward compatibility
 * Satisfies: T6 (all import paths preserved)
 *
 * All implementation has been split into cli/lib/schema/ submodules:
 *   - types.ts      — Interfaces and type definitions
 *   - validation.ts  — Core validation logic and constraint counting
 *   - evidence.ts    — Evidence, graph, and reference validation + verification
 */
export * from './schema/index.js';
