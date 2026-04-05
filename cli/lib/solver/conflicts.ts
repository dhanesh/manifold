/**
 * Semantic Conflict Detection (Single Feature)
 * Satisfies: T3, T6, RT-4
 *
 * Detects contradictory invariants, resource conflicts, temporal
 * conflicts, and scope conflicts within a single manifold.
 */

import type { Manifold, Constraint } from '../parser';

/**
 * Result of semantic conflict detection
 */
export interface SemanticConflict {
  id: string;
  type: 'contradictory_invariants' | 'resource_conflict' | 'temporal_conflict' | 'scope_conflict';
  constraints: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  suggestion?: string;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: SemanticConflict[];
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

/**
 * Detect semantic conflicts within a manifold
 * Satisfies: B2 (conflict detection before GENERATED), RT-4, U4 (explanatory)
 *
 * This function analyzes constraints for semantic conflicts that go beyond
 * the explicit tensions already documented in the manifold.
 */
export function detectSemanticConflicts(manifold: Manifold): ConflictDetectionResult {
  const conflicts: SemanticConflict[] = [];
  let conflictId = 0;

  // Get all constraints
  const allConstraints = getAllConstraints(manifold);

  // 1. Detect contradictory invariants
  detectContradictoryInvariants(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // 2. Detect resource conflicts (goals competing for same resource)
  detectResourceConflicts(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // 3. Detect temporal conflicts (timing-related contradictions)
  detectTemporalConflicts(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // 4. Detect scope conflicts (contradictory scope requirements)
  detectScopeConflicts(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // Build summary
  const summary = {
    total: conflicts.length,
    bySeverity: {
      critical: conflicts.filter(c => c.severity === 'critical').length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length,
    },
    byType: {
      contradictory_invariants: conflicts.filter(c => c.type === 'contradictory_invariants').length,
      resource_conflict: conflicts.filter(c => c.type === 'resource_conflict').length,
      temporal_conflict: conflicts.filter(c => c.type === 'temporal_conflict').length,
      scope_conflict: conflicts.filter(c => c.type === 'scope_conflict').length,
    }
  };

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    summary
  };
}

/**
 * Get all constraints from a manifold as a flat array with category info
 */
interface ConstraintWithCategory extends Constraint {
  category: string;
}

function getAllConstraints(manifold: Manifold): ConstraintWithCategory[] {
  const result: ConstraintWithCategory[] = [];

  const categories = ['business', 'technical', 'user_experience', 'security', 'operational'] as const;

  for (const category of categories) {
    const constraints = manifold.constraints?.[category] ?? [];
    for (const c of constraints) {
      result.push({ ...c, category });
    }
  }

  // Also include ux for backward compatibility
  const uxConstraints = manifold.constraints?.ux ?? [];
  for (const c of uxConstraints) {
    result.push({ ...c, category: 'user_experience' });
  }

  return result;
}

/**
 * Detect contradictory invariants (two invariants that cannot both be true)
 * Severity: critical
 */
function detectContradictoryInvariants(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  const invariants = constraints.filter(c => c.type === 'invariant');

  // Keywords that indicate opposite requirements
  const contradictionPairs = [
    ['must', 'must not'],
    ['always', 'never'],
    ['all', 'none'],
    ['enable', 'disable'],
    ['allow', 'block'],
    ['require', 'prohibit'],
    ['maximum', 'minimum'],
    ['synchronous', 'asynchronous'],
  ];

  for (let i = 0; i < invariants.length; i++) {
    for (let j = i + 1; j < invariants.length; j++) {
      const c1 = invariants[i];
      const c2 = invariants[j];

      const statement1 = c1.statement.toLowerCase();
      const statement2 = c2.statement.toLowerCase();

      // Check for contradiction keywords
      for (const [positive, negative] of contradictionPairs) {
        const s1HasPositive = statement1.includes(positive);
        const s1HasNegative = statement1.includes(negative);
        const s2HasPositive = statement2.includes(positive);
        const s2HasNegative = statement2.includes(negative);

        // Check if they're about similar subjects and have opposing keywords
        if ((s1HasPositive && s2HasNegative) || (s1HasNegative && s2HasPositive)) {
          // Check for subject overlap using common nouns
          const s1Words = new Set(statement1.split(/\s+/).filter(w => w.length > 3));
          const s2Words = new Set(statement2.split(/\s+/).filter(w => w.length > 3));
          const overlap = [...s1Words].filter(w => s2Words.has(w));

          if (overlap.length >= 2) {
            conflicts.push({
              id: nextId(),
              type: 'contradictory_invariants',
              constraints: [c1.id, c2.id],
              severity: 'critical',
              explanation: `Invariant ${c1.id} "${truncate(c1.statement, 40)}" may contradict ${c2.id} "${truncate(c2.statement, 40)}" - both are invariants with opposing requirements about: ${overlap.slice(0, 3).join(', ')}`,
              suggestion: 'Review these invariants and either merge them, add explicit precedence, or convert one to a trade_off tension.'
            });
          }
        }
      }
    }
  }
}

/**
 * Detect resource conflicts (multiple goals/boundaries competing for same limited resource)
 * Severity: high
 */
function detectResourceConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Resource-related keywords
  const resourceKeywords = [
    'memory', 'cpu', 'disk', 'bandwidth', 'storage',
    'time', 'latency', 'timeout', 'duration',
    'budget', 'cost', 'price',
    'connections', 'threads', 'workers', 'instances',
    'tokens', 'limit', 'quota', 'capacity'
  ];

  // Find constraints mentioning resources
  const resourceConstraints = constraints.filter(c => {
    const statement = c.statement.toLowerCase();
    return resourceKeywords.some(kw => statement.includes(kw));
  });

  // Group by resource type
  const byResource = new Map<string, ConstraintWithCategory[]>();

  for (const c of resourceConstraints) {
    const statement = c.statement.toLowerCase();
    for (const resource of resourceKeywords) {
      if (statement.includes(resource)) {
        const group = byResource.get(resource) ?? [];
        group.push(c);
        byResource.set(resource, group);
      }
    }
  }

  // Check for conflicts within resource groups
  for (const [resource, group] of byResource) {
    if (group.length < 2) continue;

    // Look for competing numeric requirements
    const numericRequirements = group.filter(c => {
      const match = c.statement.match(/(\d+)\s*(ms|seconds?|minutes?|mb|gb|%)/i);
      return match !== null;
    });

    if (numericRequirements.length >= 2) {
      // Multiple numeric requirements for same resource
      const ids = numericRequirements.map(c => c.id);
      conflicts.push({
        id: nextId(),
        type: 'resource_conflict',
        constraints: ids,
        severity: 'high',
        explanation: `Multiple constraints define limits for "${resource}": ${ids.join(', ')}. These may compete for the same resource and require trade-off analysis.`,
        suggestion: `Document as a resource_tension in the tensions section and specify priority order.`
      });
    }
  }
}

/**
 * Detect temporal conflicts (timing-related contradictions)
 * Severity: medium
 */
function detectTemporalConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Temporal keywords
  const beforeKeywords = ['before', 'prior', 'first', 'initial', 'start'];
  const afterKeywords = ['after', 'following', 'then', 'subsequent', 'end', 'final'];
  const simultaneousKeywords = ['simultaneous', 'concurrent', 'parallel', 'same time'];
  const sequentialKeywords = ['sequential', 'serial', 'one at a time', 'in order'];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const c1 = constraints[i];
      const c2 = constraints[j];

      const s1 = c1.statement.toLowerCase();
      const s2 = c2.statement.toLowerCase();

      // Check for simultaneous vs sequential conflict
      const s1Simultaneous = simultaneousKeywords.some(kw => s1.includes(kw));
      const s2Sequential = sequentialKeywords.some(kw => s2.includes(kw));
      const s1Sequential = sequentialKeywords.some(kw => s1.includes(kw));
      const s2Simultaneous = simultaneousKeywords.some(kw => s2.includes(kw));

      if ((s1Simultaneous && s2Sequential) || (s1Sequential && s2Simultaneous)) {
        // Check if they're about similar operations
        const s1Words = new Set(s1.split(/\s+/).filter(w => w.length > 4));
        const s2Words = new Set(s2.split(/\s+/).filter(w => w.length > 4));
        const overlap = [...s1Words].filter(w => s2Words.has(w));

        if (overlap.length >= 1) {
          conflicts.push({
            id: nextId(),
            type: 'temporal_conflict',
            constraints: [c1.id, c2.id],
            severity: 'medium',
            explanation: `${c1.id} requires ${s1Simultaneous ? 'concurrent' : 'sequential'} execution while ${c2.id} requires ${s2Simultaneous ? 'concurrent' : 'sequential'} execution for operations involving: ${overlap.slice(0, 3).join(', ')}`,
            suggestion: 'Clarify execution order requirements or document as a hidden_dependency tension.'
          });
        }
      }
    }
  }
}

/**
 * Detect scope conflicts (contradictory scope requirements)
 * Severity: low-medium
 */
function detectScopeConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Scope keywords
  const globalKeywords = ['all', 'every', 'any', 'global', 'system-wide', 'always'];
  const localKeywords = ['specific', 'only', 'certain', 'some', 'limited', 'conditional'];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const c1 = constraints[i];
      const c2 = constraints[j];

      // Skip if same category (likely intentional refinement)
      if (c1.category === c2.category) continue;

      const s1 = c1.statement.toLowerCase();
      const s2 = c2.statement.toLowerCase();

      const s1Global = globalKeywords.some(kw => s1.includes(kw));
      const s2Local = localKeywords.some(kw => s2.includes(kw));
      const s1Local = localKeywords.some(kw => s1.includes(kw));
      const s2Global = globalKeywords.some(kw => s2.includes(kw));

      // Check for global vs local scope conflict
      if ((s1Global && s2Local) || (s1Local && s2Global)) {
        // Check if they're about similar subjects
        const s1Words = new Set(s1.split(/\s+/).filter(w => w.length > 4));
        const s2Words = new Set(s2.split(/\s+/).filter(w => w.length > 4));
        const overlap = [...s1Words].filter(w => s2Words.has(w));

        if (overlap.length >= 1) {
          conflicts.push({
            id: nextId(),
            type: 'scope_conflict',
            constraints: [c1.id, c2.id],
            severity: 'low',
            explanation: `${c1.id} (${c1.category}) has ${s1Global ? 'global' : 'local'} scope while ${c2.id} (${c2.category}) has ${s2Global ? 'global' : 'local'} scope for: ${overlap.slice(0, 3).join(', ')}`,
            suggestion: 'Consider whether the local constraint is an exception to the global one, or if they need explicit scoping rules.'
          });
        }
      }
    }
  }
}

/**
 * Format conflict detection results for display
 */
export function formatConflictResults(result: ConflictDetectionResult): string {
  const lines: string[] = [];

  lines.push('SEMANTIC CONFLICT ANALYSIS');
  lines.push('══════════════════════════');
  lines.push('');

  if (!result.hasConflicts) {
    lines.push('✓ No semantic conflicts detected');
    return lines.join('\n');
  }

  lines.push(`Found ${result.summary.total} potential conflict${result.summary.total > 1 ? 's' : ''}:`);
  lines.push('');

  // Group by severity
  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;

  for (const severity of severityOrder) {
    const severityConflicts = result.conflicts.filter(c => c.severity === severity);
    if (severityConflicts.length === 0) continue;

    const icon = severity === 'critical' ? '🚨' :
                 severity === 'high' ? '⚠️' :
                 severity === 'medium' ? '📊' : 'ℹ️';

    lines.push(`${icon} ${severity.toUpperCase()} (${severityConflicts.length}):`);
    lines.push('');

    for (const conflict of severityConflicts) {
      lines.push(`  [${conflict.id}] ${conflict.type}`);
      lines.push(`    Constraints: ${conflict.constraints.join(', ')}`);
      lines.push(`    ${conflict.explanation}`);
      if (conflict.suggestion) {
        lines.push(`    💡 ${conflict.suggestion}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// Helper function
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
