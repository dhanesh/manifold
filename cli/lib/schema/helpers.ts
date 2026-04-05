/**
 * Validation Helpers for Manifold CLI
 * Tension summary, iterations, and convergence validators.
 * Satisfies: T3 (< 500 lines), T6, RT-5
 */

import {
  VALID_CONVERGENCE_STATUSES,
  VALID_REQUIRED_TRUTH_STATUSES,
} from '../structure-schema.js';
import type { ValidationError, ValidationWarning } from './types.js';

/**
 * Validate tension summary matches actual tensions
 */
export function validateTensionSummary(
  summary: Record<string, unknown>,
  tensions: unknown[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Count actual tensions by type
  const counts = {
    trade_offs: 0,
    resource_tensions: 0,
    hidden_dependencies: 0,
    resolved: 0,
    unresolved: 0
  };

  for (const t of tensions) {
    const tension = t as Record<string, unknown>;
    switch (tension.type) {
      case 'trade_off': counts.trade_offs++; break;
      case 'resource_tension': counts.resource_tensions++; break;
      case 'hidden_dependency': counts.hidden_dependencies++; break;
    }
    if (tension.status === 'resolved') counts.resolved++;
    else counts.unresolved++;
  }

  // Validate counts match
  if (summary.trade_offs !== counts.trade_offs) {
    warnings.push({
      field: 'tension_summary.trade_offs',
      message: `trade_offs count (${summary.trade_offs}) doesn't match actual (${counts.trade_offs})`
    });
  }

  if (summary.resource_tensions !== counts.resource_tensions) {
    warnings.push({
      field: 'tension_summary.resource_tensions',
      message: `resource_tensions count (${summary.resource_tensions}) doesn't match actual (${counts.resource_tensions})`
    });
  }

  if (summary.hidden_dependencies !== counts.hidden_dependencies) {
    warnings.push({
      field: 'tension_summary.hidden_dependencies',
      message: `hidden_dependencies count (${summary.hidden_dependencies}) doesn't match actual (${counts.hidden_dependencies})`
    });
  }

  if (summary.resolved !== counts.resolved) {
    warnings.push({
      field: 'tension_summary.resolved',
      message: `resolved count (${summary.resolved}) doesn't match actual (${counts.resolved})`
    });
  }

  if (summary.unresolved !== counts.unresolved) {
    warnings.push({
      field: 'tension_summary.unresolved',
      message: `unresolved count (${summary.unresolved}) doesn't match actual (${counts.unresolved})`
    });
  }
}

/**
 * Validate iterations section (v2 only)
 */
export function validateIterations(
  iterations: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(iterations)) {
    errors.push({ field: 'iterations', message: 'Iterations must be an array' });
    return;
  }

  const seenNumbers = new Set<number>();

  for (let i = 0; i < iterations.length; i++) {
    const iteration = iterations[i] as Record<string, unknown>;
    const fieldPrefix = `iterations[${i}]`;

    // Number required
    if (typeof iteration.number !== 'number') {
      errors.push({ field: `${fieldPrefix}.number`, message: 'Iteration must have a numeric "number"' });
    } else {
      if (seenNumbers.has(iteration.number)) {
        errors.push({
          field: `${fieldPrefix}.number`,
          message: `Duplicate iteration number ${iteration.number}`
        });
      }
      seenNumbers.add(iteration.number);
    }

    // Phase required
    if (!iteration.phase || typeof iteration.phase !== 'string') {
      errors.push({ field: `${fieldPrefix}.phase`, message: 'Iteration must have a string "phase"' });
    }

    // Timestamp required
    if (!iteration.timestamp || typeof iteration.timestamp !== 'string') {
      errors.push({ field: `${fieldPrefix}.timestamp`, message: 'Iteration must have a string "timestamp"' });
    }

    // Result required
    if (!iteration.result || typeof iteration.result !== 'string') {
      errors.push({ field: `${fieldPrefix}.result`, message: 'Iteration must have a string "result"' });
    }
  }
}

/**
 * Validate convergence section (v2 only)
 */
export function validateConvergence(
  convergence: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Status required
  if (!convergence.status) {
    errors.push({ field: 'convergence.status', message: 'Convergence must have a "status"' });
  } else if (!VALID_CONVERGENCE_STATUSES.includes(convergence.status as any)) {
    errors.push({
      field: 'convergence.status',
      message: `Invalid convergence status "${convergence.status}". Must be: ${VALID_CONVERGENCE_STATUSES.join(', ')}`,
      value: convergence.status
    });
  }

  // If CONVERGED, should have criteria
  if (convergence.status === 'CONVERGED') {
    if (!convergence.criteria) {
      warnings.push({
        field: 'convergence.criteria',
        message: 'Converged manifold should have "criteria" documenting convergence conditions'
      });
    }
  }
}

/**
 * Validate anchors section
 */
export function validateAnchors(
  anchors: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  strict: boolean
): void {
  // Required truths validation
  if (anchors.required_truths) {
    if (!Array.isArray(anchors.required_truths)) {
      errors.push({ field: 'anchors.required_truths', message: 'required_truths must be an array' });
    } else {
      for (let i = 0; i < anchors.required_truths.length; i++) {
        const rt = anchors.required_truths[i] as Record<string, unknown>;
        const fieldPrefix = `anchors.required_truths[${i}]`;

        if (!rt.id || typeof rt.id !== 'string') {
          errors.push({ field: `${fieldPrefix}.id`, message: 'Required truth must have a string "id"' });
        }

        if (!rt.statement || typeof rt.statement !== 'string') {
          errors.push({ field: `${fieldPrefix}.statement`, message: 'Required truth must have a string "statement"' });
        }

        if (rt.status && !VALID_REQUIRED_TRUTH_STATUSES.includes(rt.status as any)) {
          errors.push({
            field: `${fieldPrefix}.status`,
            message: `Invalid required truth status "${rt.status}". Must be: ${VALID_REQUIRED_TRUTH_STATUSES.join(', ')}`,
            value: rt.status
          });
        }
      }
    }
  }

  // Strict mode checks
  if (strict) {
    if (!anchors.recommended_option) {
      warnings.push({
        field: 'anchors.recommended_option',
        message: 'No recommended option specified',
        suggestion: 'Add a recommended_option after evaluating solution options'
      });
    }
  }
}
