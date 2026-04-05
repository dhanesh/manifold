/**
 * Core Schema Validation for Manifold CLI
 * Satisfies: T2 (Parse both schema v1 and v2 correctly), T3 (< 500 lines), T6, RT-5
 */

import type {
  Manifold,
  ManifoldPhase,
  Constraint,
  SchemaVersion,
} from '../parser.js';
import {
  VALID_PHASES,
  VALID_CONSTRAINT_TYPES,
  VALID_TENSION_TYPES,
  VALID_TENSION_STATUSES,
} from '../structure-schema.js';
import type { ValidationResult, ValidationError, ValidationWarning } from './types.js';
import { validateEvidence } from './evidence.js';
import {
  validateConstraintGraph,
  collectConstraintIds,
  validateReferences,
} from './graph.js';
import {
  validateTensionSummary,
  validateIterations,
  validateConvergence,
  validateAnchors,
} from './helpers.js';

/**
 * Validate a manifold against schema rules
 * Supports both v1 and v2 schemas
 */
export function validateManifold(manifold: unknown, strict: boolean = false): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Type guard for manifold object
  if (!manifold || typeof manifold !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Manifold must be an object' }],
      warnings: [],
      schemaVersion: 1
    };
  }

  const m = manifold as Record<string, unknown>;

  // Detect schema version
  const schemaVersion = detectVersion(m);

  // Required fields
  if (!m.feature || typeof m.feature !== 'string') {
    errors.push({ field: 'feature', message: 'Required field "feature" must be a non-empty string' });
  }

  // Phase validation
  if (m.phase) {
    const phase = String(m.phase).toUpperCase();
    if (!VALID_PHASES.includes(phase as ManifoldPhase)) {
      errors.push({
        field: 'phase',
        message: `Invalid phase "${m.phase}". Must be one of: ${VALID_PHASES.join(', ')}`,
        value: m.phase
      });
    }
  } else {
    errors.push({ field: 'phase', message: 'Required field "phase" is missing' });
  }

  // Outcome validation (optional but recommended)
  if (strict && !m.outcome) {
    warnings.push({
      field: 'outcome',
      message: 'No outcome specified',
      suggestion: 'Add an outcome statement describing the desired result'
    });
  }

  // Constraints validation
  if (m.constraints) {
    validateConstraints(m.constraints as Record<string, unknown>, errors, warnings);
  }

  // Tensions validation
  if (m.tensions) {
    validateTensions(m.tensions, errors, warnings);
  }

  // Tension summary validation
  if (m.tension_summary && m.tensions) {
    validateTensionSummary(
      m.tension_summary as Record<string, unknown>,
      m.tensions as unknown[],
      errors,
      warnings
    );
  }

  // Schema v2+ specific validations
  if (schemaVersion >= 2) {
    // Iterations validation
    if (m.iterations) {
      validateIterations(m.iterations, errors, warnings);
    }

    // Convergence validation
    if (m.convergence) {
      validateConvergence(m.convergence as Record<string, unknown>, errors, warnings);
    }
  }

  // Schema v3 specific validations
  // Satisfies: T1 (v3 support), RT-2
  if (schemaVersion === 3) {
    // Evidence validation
    if (m.evidence) {
      validateEvidence(m.evidence, errors, warnings);
    }

    // Constraint graph validation
    if (m.constraint_graph) {
      validateConstraintGraph(m.constraint_graph as Record<string, unknown>, errors, warnings);
    }

    // Collect all constraint IDs for reference validation
    const constraintIds = collectConstraintIds(m);

    // Validate references across the manifold
    // Satisfies: T3 (dangling reference detection), RT-3
    validateReferences(m, constraintIds, errors, warnings);
  }

  // Anchors validation
  if (m.anchors) {
    validateAnchors(m.anchors as Record<string, unknown>, errors, warnings, strict);
  }

  // v1 deprecation warning for 'ux' field
  const constraints = m.constraints as Record<string, unknown> | undefined;
  if (constraints?.ux && !constraints?.user_experience) {
    warnings.push({
      field: 'constraints.ux',
      message: 'Field "ux" is deprecated in schema v2',
      suggestion: 'Rename "ux" to "user_experience" for v2 compliance'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaVersion
  };
}

/**
 * Detect schema version from manifold data
 * Satisfies: T1 (v3 support), B4 (version migration path)
 */
function detectVersion(m: Record<string, unknown>): SchemaVersion {
  // Explicit version takes precedence
  if (m.schema_version === 3) return 3;
  if (m.schema_version === 2) return 2;
  if (m.schema_version === 1) return 1;

  // Implicit v3 detection (evidence[] or constraint_graph)
  if (Array.isArray(m.evidence) && m.evidence.length > 0) return 3;
  if (m.constraint_graph && typeof m.constraint_graph === 'object') return 3;

  // Implicit v2 detection
  if (Array.isArray(m.iterations) && m.iterations.length > 0) return 2;
  if (m.convergence && typeof m.convergence === 'object') return 2;

  // Default to v1
  return 1;
}

/**
 * Validate constraints section
 */
function validateConstraints(
  constraints: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const validCategories = ['business', 'technical', 'user_experience', 'ux', 'security', 'operational'];

  for (const [category, list] of Object.entries(constraints)) {
    if (!validCategories.includes(category)) {
      warnings.push({
        field: `constraints.${category}`,
        message: `Unknown constraint category "${category}"`,
        suggestion: `Valid categories: ${validCategories.join(', ')}`
      });
      continue;
    }

    if (!Array.isArray(list)) {
      errors.push({
        field: `constraints.${category}`,
        message: `Constraint category "${category}" must be an array`
      });
      continue;
    }

    // Validate each constraint
    for (let i = 0; i < list.length; i++) {
      const constraint = list[i] as Record<string, unknown>;
      const fieldPrefix = `constraints.${category}[${i}]`;

      // ID required
      if (!constraint.id || typeof constraint.id !== 'string') {
        errors.push({ field: `${fieldPrefix}.id`, message: 'Constraint must have a string "id"' });
      }

      // Type validation
      if (!constraint.type) {
        errors.push({ field: `${fieldPrefix}.type`, message: 'Constraint must have a "type"' });
      } else if (!VALID_CONSTRAINT_TYPES.includes(constraint.type as any)) {
        errors.push({
          field: `${fieldPrefix}.type`,
          message: `Invalid constraint type "${constraint.type}". Must be: ${VALID_CONSTRAINT_TYPES.join(', ')}`,
          value: constraint.type
        });
      }

      // Statement required
      if (!constraint.statement || typeof constraint.statement !== 'string') {
        errors.push({ field: `${fieldPrefix}.statement`, message: 'Constraint must have a string "statement"' });
      }
    }
  }
}

/**
 * Validate tensions section
 */
function validateTensions(
  tensions: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(tensions)) {
    errors.push({ field: 'tensions', message: 'Tensions must be an array' });
    return;
  }

  for (let i = 0; i < tensions.length; i++) {
    const tension = tensions[i] as Record<string, unknown>;
    const fieldPrefix = `tensions[${i}]`;

    // ID required
    if (!tension.id || typeof tension.id !== 'string') {
      errors.push({ field: `${fieldPrefix}.id`, message: 'Tension must have a string "id"' });
    }

    // Type validation
    if (!tension.type) {
      errors.push({ field: `${fieldPrefix}.type`, message: 'Tension must have a "type"' });
    } else if (!VALID_TENSION_TYPES.includes(tension.type as any)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Invalid tension type "${tension.type}". Must be: ${VALID_TENSION_TYPES.join(', ')}`,
        value: tension.type
      });
    }

    // Between required
    if (!Array.isArray(tension.between) || tension.between.length < 2) {
      errors.push({ field: `${fieldPrefix}.between`, message: 'Tension must have "between" array with at least 2 elements' });
    }

    // Status validation
    if (!tension.status) {
      errors.push({ field: `${fieldPrefix}.status`, message: 'Tension must have a "status"' });
    } else if (!VALID_TENSION_STATUSES.includes(tension.status as any)) {
      errors.push({
        field: `${fieldPrefix}.status`,
        message: `Invalid tension status "${tension.status}". Must be: ${VALID_TENSION_STATUSES.join(', ')}`,
        value: tension.status
      });
    }

    // Description required
    // Satisfies: Schema enforcement - tensions use 'description', not 'statement'
    if (!tension.description || typeof tension.description !== 'string') {
      errors.push({ field: `${fieldPrefix}.description`, message: 'Tension must have a string "description"' });
    }

    // Resolution required if resolved
    if (tension.status === 'resolved' && !tension.resolution) {
      warnings.push({
        field: `${fieldPrefix}.resolution`,
        message: 'Resolved tension should have a "resolution" explaining how it was resolved'
      });
    }
  }
}

/**
 * Count constraints by category
 */
export function countConstraints(manifold: Manifold): Record<string, number> {
  const counts: Record<string, number> = {
    business: 0,
    technical: 0,
    user_experience: 0,
    security: 0,
    operational: 0,
    total: 0
  };

  if (!manifold.constraints) return counts;

  counts.business = manifold.constraints.business?.length ?? 0;
  counts.technical = manifold.constraints.technical?.length ?? 0;
  counts.user_experience = (manifold.constraints.user_experience?.length ?? 0) +
                           (manifold.constraints.ux?.length ?? 0);
  counts.security = manifold.constraints.security?.length ?? 0;
  counts.operational = manifold.constraints.operational?.length ?? 0;
  counts.total = counts.business + counts.technical + counts.user_experience +
                 counts.security + counts.operational;

  return counts;
}

/**
 * Count constraints by type
 */
export function countConstraintsByType(manifold: Manifold): Record<string, number> {
  const counts: Record<string, number> = {
    invariant: 0,
    goal: 0,
    boundary: 0
  };

  if (!manifold.constraints) return counts;

  const allConstraints: Constraint[] = [
    ...(manifold.constraints.business ?? []),
    ...(manifold.constraints.technical ?? []),
    ...(manifold.constraints.user_experience ?? []),
    ...(manifold.constraints.ux ?? []),
    ...(manifold.constraints.security ?? []),
    ...(manifold.constraints.operational ?? [])
  ];

  for (const c of allConstraints) {
    if (c.type && counts[c.type] !== undefined) {
      counts[c.type]++;
    }
  }

  return counts;
}
