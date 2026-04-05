/**
 * Constraint Solver Module -- Barrel Re-exports
 * Satisfies: T6 (all public symbols re-exported from original path)
 *
 * This file re-exports all public symbols so that existing imports
 * like `import { ConstraintSolver } from './solver'` continue to work.
 */

export {
  type CachedGraph,
  getCachedGraph,
  cacheGraph,
  clearGraphCache,
  getGraphCacheStats,
  graphCache,
  generateManifestHash,
} from './cache';

export {
  ConstraintSolver,
} from './graph';

export type {
  ConstraintGraph,
  ConstraintNode,
  ExecutionPlan,
  Wave,
  ParallelTask,
} from './graph';

export {
  type SemanticConflict,
  type ConflictDetectionResult,
  detectSemanticConflicts,
  formatConflictResults,
} from './conflicts';

export {
  type CrossFeatureSemanticConflict,
  type CrossFeatureConflictResult,
  detectCrossFeatureConflicts,
} from './cross-feature';

export {
  exportGraphDot,
  formatCrossFeatureResults,
} from './visualization';
