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
      critical: conflicts.filter((c) => c.severity === 'critical').length,
      high: conflicts.filter((c) => c.severity === 'high').length,
      medium: conflicts.filter((c) => c.severity === 'medium').length,
      low: conflicts.filter((c) => c.severity === 'low').length,
    },
    byType: {
      contradictory_invariants: conflicts.filter((c) => c.type === 'contradictory_invariants')
        .length,
      resource_conflict: conflicts.filter((c) => c.type === 'resource_conflict').length,
      temporal_conflict: conflicts.filter((c) => c.type === 'temporal_conflict').length,
      scope_conflict: conflicts.filter((c) => c.type === 'scope_conflict').length,
    },
  };

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    summary,
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

  const categories = [
    'business',
    'technical',
    'user_experience',
    'security',
    'operational',
  ] as const;

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
  const invariants = constraints.filter((c) => c.type === 'invariant');

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
          const s1Words = new Set(statement1.split(/\s+/).filter((w) => w.length > 3));
          const s2Words = new Set(statement2.split(/\s+/).filter((w) => w.length > 3));
          const overlap = [...s1Words].filter((w) => s2Words.has(w));

          if (overlap.length >= 2) {
            conflicts.push({
              id: nextId(),
              type: 'contradictory_invariants',
              constraints: [c1.id, c2.id],
              severity: 'critical',
              explanation: `Invariant ${c1.id} "${truncate(c1.statement, 40)}" may contradict ${c2.id} "${truncate(c2.statement, 40)}" - both are invariants with opposing requirements about: ${overlap.slice(0, 3).join(', ')}`,
              suggestion:
                'Review these invariants and either merge them, add explicit precedence, or convert one to a trade_off tension.',
            });
          }
        }
      }
    }
  }
}

/**
 * Resource families: words that name the same underlying budget.
 *
 * Grouping by family rather than by literal keyword keeps synonyms together —
 * "1000 concurrent logins" and "10 failed attempts" both constrain login
 * throughput, so they belong in one group even though they share no word.
 * Entries are matched on word boundaries with an optional plural, so "time"
 * does not fire on "timestamp" and "login" does fire on "login attempts".
 */
const RESOURCE_FAMILIES: Record<string, string[]> = {
  latency: ['latency', 'timeout', 'duration', 'response time', 'round trip', 'delay', 'time'],
  throughput: [
    'concurrent',
    'concurrency',
    'connection',
    'thread',
    'worker',
    'request',
    'login',
    'attempt',
    'throughput',
    'rate',
    'rps',
    'qps',
  ],
  memory: ['memory', 'heap', 'buffer', 'cache'],
  storage: ['disk', 'storage', 'volume'],
  bandwidth: ['bandwidth', 'payload'],
  compute: ['cpu', 'instance', 'replica', 'container'],
  cost: ['budget', 'cost', 'price', 'spend'],
  tokens: ['token'],
  quota: ['quota', 'capacity', 'limit'],
};

/** Units that make a number unambiguously a magnitude rather than a version. */
const UNIT_PATTERN =
  '(?:ms|milliseconds?|s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?|kb|mb|gb|tb|%|rps|qps)';

/**
 * Words that mark a bare number as a *limit* rather than incidental prose.
 * "handle 1000 concurrent logins" is a limit; "TLS 1.2" and "argon2" are not.
 */
const LIMIT_CONTEXT =
  /(?:[<>]=?|≤|≥|max|maximum|min|minimum|at most|at least|no more than|up to|exceed|exceeds|limit|cap|handle|support|serve|after|per|under|over|within|below|above|between)/i;

/**
 * Strip `[CUSTOMIZE: n]` placeholders, keeping the value.
 *
 * The shipped templates write limits as `<[CUSTOMIZE: 500]ms`, which puts a
 * bracket between the digits and the unit. Without this, every constraint in
 * an uncustomized manifold is invisible to the numeric matcher.
 */
function stripPlaceholders(statement: string): string {
  return statement.replace(/\[\s*CUSTOMIZE\s*:\s*([^\]]*)\]/gi, '$1');
}

interface NumericLimit {
  /** True when the number carries a unit (500ms, 100MB, 50%). */
  united: boolean;
}

/**
 * Find the numeric limit in a statement, if any.
 *
 * A number with a unit is always a limit. A bare number counts only when a
 * limit word sits near it, and never when it looks like a version or an
 * identifier (`TLS 1.2`, `WCAG 2.1`, `argon2`, `p95`).
 */
function findNumericLimit(statement: string): NumericLimit | null {
  const text = stripPlaceholders(statement);

  if (new RegExp(`(?<![a-z0-9.])\\d+(?:\\.\\d+)?\\s*${UNIT_PATTERN}\\b`, 'i').test(text)) {
    return { united: true };
  }

  const bare = /(?<![a-z0-9.])\d+(?![.\d])/gi;
  for (const match of text.matchAll(bare)) {
    const start = match.index ?? 0;
    const before = text.slice(Math.max(0, start - 24), start);
    const after = text.slice(start + match[0].length, start + match[0].length + 24);
    if (LIMIT_CONTEXT.test(before) || LIMIT_CONTEXT.test(after)) {
      return { united: false };
    }
  }

  return null;
}

/** Match a family word on a word boundary, tolerating a trailing plural. */
function mentionsResource(statement: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(?:s|es)?\\b`, 'i').test(statement);
}

/**
 * Detect resource conflicts (multiple goals/boundaries competing for same limited resource)
 * Severity: high when every limit carries a unit, medium when any is unitless
 */
function detectResourceConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Group constraints by the resource family they name
  const byFamily = new Map<string, ConstraintWithCategory[]>();

  for (const c of constraints) {
    const statement = stripPlaceholders(c.statement);
    for (const [family, words] of Object.entries(RESOURCE_FAMILIES)) {
      if (words.some((w) => mentionsResource(statement, w))) {
        const group = byFamily.get(family) ?? [];
        group.push(c);
        byFamily.set(family, group);
      }
    }
  }

  // One conflict per distinct constraint set — a pair that lands in two
  // families (e.g. "timeout" and "limit") is one finding, not two.
  const reported = new Set<string>();

  for (const [family, group] of byFamily) {
    if (group.length < 2) continue;

    // Look for competing numeric requirements
    const numericRequirements: Array<{ c: ConstraintWithCategory; limit: NumericLimit }> = [];
    for (const c of group) {
      const limit = findNumericLimit(c.statement);
      if (limit) numericRequirements.push({ c, limit });
    }

    if (numericRequirements.length < 2) continue;

    const ids = numericRequirements.map((n) => n.c.id);
    const key = [...ids].sort().join('|');
    if (reported.has(key)) continue;
    reported.add(key);

    // Unitless limits are weaker evidence — "10 failed attempts" is a limit,
    // but the matcher cannot tell what it is a limit *on*.
    const allUnited = numericRequirements.every((n) => n.limit.united);
    const qualifier = allUnited ? '' : ' (some limits are unitless, so this is a weaker signal)';

    conflicts.push({
      id: nextId(),
      type: 'resource_conflict',
      constraints: ids,
      severity: allUnited ? 'high' : 'medium',
      explanation: `Multiple constraints define limits for "${family}": ${ids.join(', ')}. These may compete for the same resource and require trade-off analysis${qualifier}.`,
      suggestion: `Document as a resource_tension in the tensions section and specify priority order.`,
    });
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
  const _beforeKeywords = ['before', 'prior', 'first', 'initial', 'start'];
  const _afterKeywords = ['after', 'following', 'then', 'subsequent', 'end', 'final'];
  const simultaneousKeywords = ['simultaneous', 'concurrent', 'parallel', 'same time'];
  const sequentialKeywords = ['sequential', 'serial', 'one at a time', 'in order'];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const c1 = constraints[i];
      const c2 = constraints[j];

      const s1 = c1.statement.toLowerCase();
      const s2 = c2.statement.toLowerCase();

      // Check for simultaneous vs sequential conflict
      const s1Simultaneous = simultaneousKeywords.some((kw) => s1.includes(kw));
      const s2Sequential = sequentialKeywords.some((kw) => s2.includes(kw));
      const s1Sequential = sequentialKeywords.some((kw) => s1.includes(kw));
      const s2Simultaneous = simultaneousKeywords.some((kw) => s2.includes(kw));

      if ((s1Simultaneous && s2Sequential) || (s1Sequential && s2Simultaneous)) {
        // Check if they're about similar operations
        const s1Words = new Set(s1.split(/\s+/).filter((w) => w.length > 4));
        const s2Words = new Set(s2.split(/\s+/).filter((w) => w.length > 4));
        const overlap = [...s1Words].filter((w) => s2Words.has(w));

        if (overlap.length >= 1) {
          conflicts.push({
            id: nextId(),
            type: 'temporal_conflict',
            constraints: [c1.id, c2.id],
            severity: 'medium',
            explanation: `${c1.id} requires ${s1Simultaneous ? 'concurrent' : 'sequential'} execution while ${c2.id} requires ${s2Simultaneous ? 'concurrent' : 'sequential'} execution for operations involving: ${overlap.slice(0, 3).join(', ')}`,
            suggestion:
              'Clarify execution order requirements or document as a hidden_dependency tension.',
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

      const s1Global = globalKeywords.some((kw) => s1.includes(kw));
      const s2Local = localKeywords.some((kw) => s2.includes(kw));
      const s1Local = localKeywords.some((kw) => s1.includes(kw));
      const s2Global = globalKeywords.some((kw) => s2.includes(kw));

      // Check for global vs local scope conflict
      if ((s1Global && s2Local) || (s1Local && s2Global)) {
        // Check if they're about similar subjects
        const s1Words = new Set(s1.split(/\s+/).filter((w) => w.length > 4));
        const s2Words = new Set(s2.split(/\s+/).filter((w) => w.length > 4));
        const overlap = [...s1Words].filter((w) => s2Words.has(w));

        if (overlap.length >= 1) {
          conflicts.push({
            id: nextId(),
            type: 'scope_conflict',
            constraints: [c1.id, c2.id],
            severity: 'low',
            explanation: `${c1.id} (${c1.category}) has ${s1Global ? 'global' : 'local'} scope while ${c2.id} (${c2.category}) has ${s2Global ? 'global' : 'local'} scope for: ${overlap.slice(0, 3).join(', ')}`,
            suggestion:
              'Consider whether the local constraint is an exception to the global one, or if they need explicit scoping rules.',
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

  lines.push(
    `Found ${result.summary.total} potential conflict${result.summary.total > 1 ? 's' : ''}:`
  );
  lines.push('');

  // Group by severity
  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;

  for (const severity of severityOrder) {
    const severityConflicts = result.conflicts.filter((c) => c.severity === severity);
    if (severityConflicts.length === 0) continue;

    const icon =
      severity === 'critical'
        ? '🚨'
        : severity === 'high'
          ? '⚠️'
          : severity === 'medium'
            ? '📊'
            : 'ℹ️';

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
  return `${str.substring(0, maxLen - 3)}...`;
}
