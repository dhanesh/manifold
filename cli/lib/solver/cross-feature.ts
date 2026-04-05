/**
 * Cross-Feature Semantic Conflict Detection
 * Satisfies: T3, T6, RT-4
 *
 * Detects conflicts between constraints across different manifold features:
 * logical contradictions, resource tensions, and scope conflicts.
 */

import type { Manifold, Constraint } from '../parser';

/**
 * Constraint with metadata for cross-feature analysis
 */
interface CrossFeatureConstraint {
  feature: string;
  id: string;
  category: string;
  type: 'invariant' | 'goal' | 'boundary';
  statement: string;
}

/**
 * Semantic conflict between constraints in different features
 */
export interface CrossFeatureSemanticConflict {
  id: string;
  type: 'logical_contradiction' | 'resource_tension' | 'scope_conflict';
  severity: 'blocking' | 'requires_acceptance' | 'review_needed';

  constraintA: {
    feature: string;
    id: string;
    category: string;
    type: 'invariant' | 'goal' | 'boundary';
    statement: string;
  };

  constraintB: {
    feature: string;
    id: string;
    category: string;
    type: 'invariant' | 'goal' | 'boundary';
    statement: string;
  };

  // Why this is a conflict
  conflictReason: string;
  sharedDomain: string[];

  // What AI/user should do
  resolution: {
    options: string[];
    requiresUserAcceptance: boolean;
  };
}

/**
 * Cross-feature detection result
 */
export interface CrossFeatureConflictResult {
  hasConflicts: boolean;
  conflicts: CrossFeatureSemanticConflict[];
  summary: {
    total: number;
    featuresAnalyzed: number;
    constraintsAnalyzed: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

/**
 * Extract all constraints from manifolds with full metadata
 */
function extractAllCrossFeatureConstraints(manifolds: Manifold[]): CrossFeatureConstraint[] {
  const result: CrossFeatureConstraint[] = [];
  const categories = ['business', 'technical', 'user_experience', 'security', 'operational'] as const;

  for (const manifold of manifolds) {
    for (const cat of categories) {
      const constraints = manifold.constraints?.[cat] ||
                         (cat === 'user_experience' ? (manifold.constraints as any)?.ux : undefined);
      if (!constraints) continue;

      for (const c of constraints) {
        result.push({
          feature: manifold.feature,
          id: c.id,
          category: cat,
          type: c.type as 'invariant' | 'goal' | 'boundary',
          statement: c.statement
        });
      }
    }
  }

  return result;
}

/**
 * Extract domain keywords from a statement
 * Used to identify if two constraints are about the same topic
 */
function extractDomainKeywords(statement: string): string[] {
  const s = statement.toLowerCase();

  // Remove common stop words and short words
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for',
    'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
    'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
    'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
    'about', 'who', 'get', 'which', 'go', 'me', 'must', 'should', 'shall',
    'may', 'can', 'could', 'would', 'might', 'need', 'want', 'only', 'just',
    'also', 'any', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'than', 'too', 'very', 'same', 'different', 'able', 'back',
    'being', 'been', 'case', 'come', 'does', 'done', 'else', 'even', 'going',
    'good', 'keep', 'know', 'last', 'long', 'made', 'make', 'much', 'never',
    'over', 'part', 'take', 'them', 'then', 'these', 'time', 'upon', 'used',
    'well', 'were', 'when', 'where', 'while', 'work', 'year', 'your'
  ]);

  const words = s.split(/\W+/).filter(w =>
    w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w)
  );

  return [...new Set(words)];
}

/**
 * Detect logical contradiction between two invariants
 * Returns conflict details if found, null otherwise
 *
 * Key insight: For two invariants to truly contradict, they must:
 * 1. Be about the SAME specific property/attribute
 * 2. Have INCOMPATIBLE requirements for that property
 *
 * Example contradictions:
 * - "API responses must use JSON format" vs "API responses must use XML format"
 * - "All operations must be synchronous" vs "All operations must be asynchronous"
 *
 * NOT contradictions (different properties):
 * - "All YAML files must use consistent schema" vs "Schema must be YAML-compatible"
 *   (one is about consistency, other is about compatibility)
 */
function detectCrossFeatureContradiction(
  c1: CrossFeatureConstraint,
  c2: CrossFeatureConstraint
): { sharedDomain: string[]; conflictReason: string } | null {
  const s1 = c1.statement.toLowerCase();
  const s2 = c2.statement.toLowerCase();

  // Extract domain keywords
  const domain1 = extractDomainKeywords(s1);
  const domain2 = extractDomainKeywords(s2);

  // Check domain overlap - need at least 2 shared keywords to be about the same topic
  const sharedDomain = domain1.filter(d => domain2.includes(d));
  if (sharedDomain.length < 2) return null;

  // 1. Check for explicit negation patterns (highest confidence)
  // "must X" vs "must not X" or "must never X"
  const mustPattern = /must\s+(\w+)/g;
  const mustNotPattern = /must\s+(?:not|never)\s+(\w+)/g;

  const mustMatches1 = [...s1.matchAll(mustPattern)].map(m => m[1]);
  const mustNotMatches1 = [...s1.matchAll(mustNotPattern)].map(m => m[1]);
  const mustMatches2 = [...s2.matchAll(mustPattern)].map(m => m[1]);
  const mustNotMatches2 = [...s2.matchAll(mustNotPattern)].map(m => m[1]);

  // Check if s1 says "must X" and s2 says "must not X" (or vice versa)
  for (const verb of mustMatches1) {
    if (mustNotMatches2.includes(verb)) {
      return {
        sharedDomain,
        conflictReason: `One requires "${verb}" while the other prohibits it`
      };
    }
  }
  for (const verb of mustMatches2) {
    if (mustNotMatches1.includes(verb)) {
      return {
        sharedDomain,
        conflictReason: `One requires "${verb}" while the other prohibits it`
      };
    }
  }

  // 2. Check for mutually exclusive format/type specifications
  // Only trigger when BOTH statements specify a format AND the formats differ
  const formatPatterns = [
    /(?:must|should|shall)\s+(?:use|be|return|output)\s+(json|xml|csv|yaml|html|text|binary)\s*(?:format)?/,
    /(?:format|type)\s+(?:must|should|shall)\s+be\s+(json|xml|csv|yaml|html|text|binary)/,
    /(?:response|output|data)\s+(?:must|should|shall)\s+be\s+(?:in\s+)?(json|xml|csv|yaml|html|text|binary)/,
  ];

  for (const pattern of formatPatterns) {
    const format1 = s1.match(pattern);
    const format2 = s2.match(pattern);
    if (format1 && format2 && format1[1] !== format2[1]) {
      return {
        sharedDomain: [...sharedDomain, 'format'],
        conflictReason: `Incompatible format requirements: "${format1[1]}" vs "${format2[1]}"`
      };
    }
  }

  // 3. Check for boolean opposites with high-confidence patterns
  const booleanOpposites = [
    { positive: /\bsynchronous\b/, negative: /\basynchronous\b/, desc: 'sync vs async' },
    { positive: /\benabled?\b/, negative: /\bdisabled?\b/, desc: 'enabled vs disabled' },
    { positive: /\ballowed?\b/, negative: /\b(?:disallowed?|forbidden|prohibited)\b/, desc: 'allowed vs forbidden' },
    { positive: /\brequired\b/, negative: /\b(?:prohibited|forbidden)\b/, desc: 'required vs prohibited' },
    { positive: /\bpublic\b/, negative: /\bprivate\b/, desc: 'public vs private' },
    { positive: /\bencrypted\b/, negative: /\bunencrypted\b/, desc: 'encrypted vs unencrypted' },
    { positive: /\bmutable\b/, negative: /\bimmutable\b/, desc: 'mutable vs immutable' },
    { positive: /\bstateful\b/, negative: /\bstateless\b/, desc: 'stateful vs stateless' },
  ];

  for (const { positive, negative, desc } of booleanOpposites) {
    const s1Positive = positive.test(s1);
    const s1Negative = negative.test(s1);
    const s2Positive = positive.test(s2);
    const s2Negative = negative.test(s2);

    if ((s1Positive && s2Negative) || (s1Negative && s2Positive)) {
      return {
        sharedDomain,
        conflictReason: `Mutually exclusive requirements: ${desc}`
      };
    }
  }

  // 4. Check "always" vs "never" with same verb
  const alwaysMatch = s1.match(/\balways\s+(\w+)/) || s2.match(/\balways\s+(\w+)/);
  const neverMatch = s1.match(/\bnever\s+(\w+)/) || s2.match(/\bnever\s+(\w+)/);

  if (alwaysMatch && neverMatch && alwaysMatch[1] === neverMatch[1]) {
    return {
      sharedDomain,
      conflictReason: `One says "always ${alwaysMatch[1]}" while the other says "never ${neverMatch[1]}"`
    };
  }

  return null;
}

/**
 * Normalize time values to milliseconds for comparison
 */
function normalizeTimeToMs(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('ms')) return value;
  if (u.startsWith('s')) return value * 1000;
  if (u.startsWith('m')) return value * 60000;
  return value;
}

/**
 * Detect resource tension between a boundary and a goal
 * A boundary in one feature may constrain a goal in another
 */
function detectCrossFeatureResourceTension(
  c1: CrossFeatureConstraint,
  c2: CrossFeatureConstraint
): { sharedDomain: string[]; conflictReason: string } | null {
  // One must be boundary, one must be goal
  if (!((c1.type === 'boundary' && c2.type === 'goal') ||
        (c1.type === 'goal' && c2.type === 'boundary'))) {
    return null;
  }

  const boundary = c1.type === 'boundary' ? c1 : c2;
  const goal = c1.type === 'goal' ? c1 : c2;

  const s1 = boundary.statement.toLowerCase();
  const s2 = goal.statement.toLowerCase();

  // Extract domain keywords
  const domain1 = extractDomainKeywords(s1);
  const domain2 = extractDomainKeywords(s2);
  const sharedDomain = domain1.filter(d => domain2.includes(d));

  // Need some overlap to be related
  if (sharedDomain.length < 1) return null;

  // Resource keywords that indicate potential tension
  const resourceKeywords = [
    'memory', 'cpu', 'disk', 'bandwidth', 'storage',
    'time', 'latency', 'timeout', 'duration', 'performance',
    'budget', 'cost', 'price', 'token', 'tokens',
    'connections', 'threads', 'workers', 'instances',
    'limit', 'quota', 'capacity', 'throughput', 'rate',
    'size', 'length', 'count', 'complexity'
  ];

  const s1HasResource = resourceKeywords.some(kw => s1.includes(kw));
  const s2HasResource = resourceKeywords.some(kw => s2.includes(kw));

  // Tension keywords that indicate competing requirements
  const boundaryIndicators = ['must', 'limit', 'maximum', 'minimum', 'within', 'under', 'below', 'above', '<', '>', '≤', '≥'];
  const goalIndicators = ['unlimited', 'flexible', 'support', 'enable', 'allow', 'maximize', 'optimize'];

  const boundaryHasLimit = boundaryIndicators.some(kw => s1.includes(kw));
  const goalHasFlexibility = goalIndicators.some(kw => s2.includes(kw));

  if (s1HasResource && s2HasResource && boundaryHasLimit && goalHasFlexibility) {
    const resourceMentioned = resourceKeywords.find(kw => s1.includes(kw) || s2.includes(kw)) || 'resources';
    return {
      sharedDomain: [resourceMentioned, ...sharedDomain.filter(d => d !== resourceMentioned)].slice(0, 4),
      conflictReason: `Boundary "${boundary.id}" limits ${resourceMentioned} which may constrain goal "${goal.id}"`
    };
  }

  return null;
}

/**
 * Detect scope conflict where constraints apply to overlapping domains with different rules
 */
function detectCrossFeatureScopeConflict(
  c1: CrossFeatureConstraint,
  c2: CrossFeatureConstraint
): { sharedDomain: string[]; conflictReason: string } | null {
  const s1 = c1.statement.toLowerCase();
  const s2 = c2.statement.toLowerCase();

  // Extract domain keywords
  const domain1 = extractDomainKeywords(s1);
  const domain2 = extractDomainKeywords(s2);
  const sharedDomain = domain1.filter(d => domain2.includes(d));

  // Need significant overlap
  if (sharedDomain.length < 2) return null;

  // Scope indicators
  const globalScope = ['all', 'every', 'any', 'global', 'system-wide', 'always', 'everywhere'];
  const localScope = ['specific', 'only', 'certain', 'some', 'limited', 'conditional', 'except', 'unless'];

  const s1Global = globalScope.some(kw => s1.includes(kw));
  const s2Global = globalScope.some(kw => s2.includes(kw));
  const s1Local = localScope.some(kw => s1.includes(kw));
  const s2Local = localScope.some(kw => s2.includes(kw));

  // Check for global vs local scope mismatch
  if ((s1Global && s2Local) || (s1Local && s2Global)) {
    const globalConstraint = s1Global ? c1 : c2;
    const localConstraint = s1Local ? c1 : c2;
    return {
      sharedDomain,
      conflictReason: `"${globalConstraint.id}" has global scope while "${localConstraint.id}" has local scope for overlapping domain: ${sharedDomain.slice(0, 3).join(', ')}`
    };
  }

  return null;
}

/**
 * Detect semantic conflicts across multiple features
 * Satisfies: T4 (semantic conflict detection across features)
 *
 * Key insight: ID reuse (e.g., B1 in feature A and B1 in feature B) is NOT a conflict.
 * Features are independent namespaces. The real question: Can constraint X in feature A
 * coexist with constraint Y in feature B?
 *
 * Detects three types of semantic conflicts:
 * 1. Logical contradictions (BLOCKING) - Two invariants that cannot both be true
 * 2. Resource tensions (REQUIRES ACCEPTANCE) - A boundary constrains a goal
 * 3. Scope conflicts (REVIEW NEEDED) - Overlapping domains with different rules
 */
export function detectCrossFeatureConflicts(manifolds: Manifold[]): CrossFeatureConflictResult {
  const conflicts: CrossFeatureSemanticConflict[] = [];
  let conflictId = 0;

  // Extract all constraints with metadata
  const allConstraints = extractAllCrossFeatureConstraints(manifolds);

  // Compare each pair of constraints from DIFFERENT features
  for (let i = 0; i < allConstraints.length; i++) {
    for (let j = i + 1; j < allConstraints.length; j++) {
      const c1 = allConstraints[i];
      const c2 = allConstraints[j];

      // Skip same-feature comparisons - those are handled by single-feature detection
      if (c1.feature === c2.feature) continue;

      // 1. Check for logical contradiction (invariant vs invariant)
      if (c1.type === 'invariant' && c2.type === 'invariant') {
        const contradiction = detectCrossFeatureContradiction(c1, c2);
        if (contradiction) {
          conflicts.push({
            id: `CONFLICT-${++conflictId}`,
            type: 'logical_contradiction',
            severity: 'blocking',
            constraintA: c1,
            constraintB: c2,
            sharedDomain: contradiction.sharedDomain,
            conflictReason: contradiction.conflictReason,
            resolution: {
              options: [
                `Scope ${c1.feature}/${c1.id} to exclude ${c2.feature}'s domain`,
                `Scope ${c2.feature}/${c2.id} to exclude ${c1.feature}'s domain`,
                `Relax one constraint from invariant to goal`,
                `Remove one constraint entirely`
              ],
              requiresUserAcceptance: true
            }
          });
        }
      }

      // 2. Check for resource tension (boundary vs goal)
      if ((c1.type === 'boundary' && c2.type === 'goal') ||
          (c1.type === 'goal' && c2.type === 'boundary')) {
        const tension = detectCrossFeatureResourceTension(c1, c2);
        if (tension) {
          const boundary = c1.type === 'boundary' ? c1 : c2;
          const goal = c1.type === 'goal' ? c1 : c2;
          conflicts.push({
            id: `TENSION-${++conflictId}`,
            type: 'resource_tension',
            severity: 'requires_acceptance',
            constraintA: boundary,
            constraintB: goal,
            sharedDomain: tension.sharedDomain,
            conflictReason: tension.conflictReason,
            resolution: {
              options: [
                `Accept this tension and document in both features' tensions section`,
                `Relax the boundary constraint ${boundary.id}`,
                `Constrain the goal ${goal.id} to work within the boundary`
              ],
              requiresUserAcceptance: true
            }
          });
        }
      }

      // 3. Check for scope conflicts
      const scopeConflict = detectCrossFeatureScopeConflict(c1, c2);
      if (scopeConflict) {
        conflicts.push({
          id: `REVIEW-${++conflictId}`,
          type: 'scope_conflict',
          severity: 'review_needed',
          constraintA: c1,
          constraintB: c2,
          sharedDomain: scopeConflict.sharedDomain,
          conflictReason: scopeConflict.conflictReason,
          resolution: {
            options: [
              `Clarify if the local constraint is an exception to the global one`,
              `Add explicit scoping rules to both constraints`,
              `Document as an accepted tension if intentional`
            ],
            requiresUserAcceptance: false
          }
        });
      }
    }
  }

  // Build summary
  const summary = {
    total: conflicts.length,
    featuresAnalyzed: manifolds.length,
    constraintsAnalyzed: allConstraints.length,
    bySeverity: {
      blocking: conflicts.filter(c => c.severity === 'blocking').length,
      requires_acceptance: conflicts.filter(c => c.severity === 'requires_acceptance').length,
      review_needed: conflicts.filter(c => c.severity === 'review_needed').length,
    },
    byType: {
      logical_contradiction: conflicts.filter(c => c.type === 'logical_contradiction').length,
      resource_tension: conflicts.filter(c => c.type === 'resource_tension').length,
      scope_conflict: conflicts.filter(c => c.type === 'scope_conflict').length,
    }
  };

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    summary
  };
}

