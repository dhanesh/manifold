/**
 * Constraint Solver Module — Barrel Re-export
 * Satisfies: T6 (backward compatible imports)
 *
 * This file re-exports everything from ./solver/ submodules so that
 * existing imports like `import { ConstraintSolver } from '../lib/solver'`
 * continue to work without changes.
 */
export * from './solver/index.js';
