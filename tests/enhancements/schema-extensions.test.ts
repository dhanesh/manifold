/**
 * Tests for manifold-enhancements schema extensions
 * Satisfies: O2 (test coverage for new schema fields), RT-14
 *
 * Validates all new optional fields added by enhancements 1-8:
 * - source, challenger (Enhancement 2: constraint genealogy)
 * - threshold (Enhancement 6: probabilistic bounds)
 * - triz_principles, propagation_effects (Enhancement 3, 8)
 * - depth, children (Enhancement 7: recursive chaining)
 * - binding_constraint (Enhancement 5: ToC bottleneck)
 * - reversibility_log (Enhancement 4)
 * - domain (non-software support)
 */

import { describe, test, expect } from 'bun:test';
import {
  parseManifoldStructure,
  ConstraintRefSchema,
  ConstraintSourceSchema,
  ConstraintChallengerSchema,
  ConstraintThresholdSchema,
  ThresholdKindSchema,
  TensionRefSchema,
  PropagationEffectSchema,
  PropagationEntrySchema,
  RequiredTruthRefSchema,
  BindingConstraintSchema,
  AnchorsSchema,
  ManifoldStructureSchema,
} from '../../cli/lib/structure-schema.js';

// ============================================================
// Enhancement 2: Constraint Genealogy (source + challenger)
// ============================================================

describe('Enhancement 2: Constraint genealogy', () => {
  test('accepts constraint without source or challenger (backward compat)', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'B1',
      type: 'invariant',
    });
    expect(result.success).toBe(true);
  });

  test('accepts constraint with source: interview', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'B1',
      type: 'invariant',
      source: 'interview',
    });
    expect(result.success).toBe(true);
  });

  test('accepts constraint with source: pre-mortem', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'T1',
      type: 'boundary',
      source: 'pre-mortem',
    });
    expect(result.success).toBe(true);
  });

  test('accepts constraint with source: assumption', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'U1',
      type: 'goal',
      source: 'assumption',
    });
    expect(result.success).toBe(true);
  });

  test('rejects invalid source value', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'B1',
      type: 'invariant',
      source: 'guessed',
    });
    expect(result.success).toBe(false);
  });

  test('accepts all valid challenger values', () => {
    const challengers = ['regulation', 'stakeholder', 'technical-reality', 'assumption'] as const;
    for (const challenger of challengers) {
      const result = ConstraintRefSchema.safeParse({
        id: 'B1',
        type: 'invariant',
        challenger,
      });
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid challenger value', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'B1',
      type: 'invariant',
      challenger: 'opinion',
    });
    expect(result.success).toBe(false);
  });

  test('accepts constraint with both source and challenger', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'S1',
      type: 'invariant',
      source: 'interview',
      challenger: 'regulation',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('interview');
      expect(result.data.challenger).toBe('regulation');
    }
  });

  test('ConstraintSourceSchema has exactly 3 values', () => {
    expect(ConstraintSourceSchema.options).toEqual(['interview', 'pre-mortem', 'assumption']);
  });

  test('ConstraintChallengerSchema has exactly 4 values', () => {
    expect(ConstraintChallengerSchema.options).toEqual([
      'regulation', 'stakeholder', 'technical-reality', 'assumption',
    ]);
  });
});

// ============================================================
// Enhancement 6: Probabilistic Constraint Bounds (threshold)
// ============================================================

describe('Enhancement 6: Probabilistic bounds', () => {
  test('accepts constraint without threshold (backward compat)', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'T1',
      type: 'boundary',
    });
    expect(result.success).toBe(true);
  });

  test('accepts deterministic threshold', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'T1',
      type: 'boundary',
      threshold: { kind: 'deterministic', ceiling: '500ms' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold.kind).toBe('deterministic');
      expect(result.data.threshold.ceiling).toBe('500ms');
    }
  });

  test('accepts statistical threshold with p99/p50', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'T1',
      type: 'boundary',
      threshold: { kind: 'statistical', p99: '200ms', p50: '80ms' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold.kind).toBe('statistical');
      expect(result.data.threshold.p99).toBe('200ms');
      expect(result.data.threshold.p50).toBe('80ms');
    }
  });

  test('accepts statistical threshold with failure_rate and window', () => {
    const result = ConstraintRefSchema.safeParse({
      id: 'O1',
      type: 'goal',
      threshold: { kind: 'statistical', failure_rate: '< 0.1%', window: '24h' },
    });
    expect(result.success).toBe(true);
  });

  test('rejects threshold with invalid kind', () => {
    const result = ConstraintThresholdSchema.safeParse({
      kind: 'probabilistic',
    });
    expect(result.success).toBe(false);
  });

  test('ThresholdKindSchema has exactly 2 values', () => {
    expect(ThresholdKindSchema.options).toEqual(['deterministic', 'statistical']);
  });

  test('threshold passthrough allows extra fields', () => {
    const result = ConstraintThresholdSchema.safeParse({
      kind: 'statistical',
      p99: '200ms',
      custom_metric: 'throughput',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Enhancement 3 + 8: TRIZ Principles + Propagation Effects
// ============================================================

describe('Enhancement 3: TRIZ principles on tensions', () => {
  test('accepts tension without triz_principles (backward compat)', () => {
    const result = TensionRefSchema.safeParse({
      id: 'TN1',
      type: 'trade_off',
      between: ['B1', 'T1'],
      status: 'resolved',
    });
    expect(result.success).toBe(true);
  });

  test('accepts tension with triz_principles array', () => {
    const result = TensionRefSchema.safeParse({
      id: 'TN1',
      type: 'trade_off',
      between: ['B1', 'T1'],
      status: 'resolved',
      triz_principles: ['P10', 'P24', 'P35'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triz_principles).toEqual(['P10', 'P24', 'P35']);
    }
  });

  test('accepts empty triz_principles array', () => {
    const result = TensionRefSchema.safeParse({
      id: 'TN1',
      type: 'trade_off',
      between: ['B1', 'T1'],
      status: 'unresolved',
      triz_principles: [],
    });
    expect(result.success).toBe(true);
  });
});

describe('Enhancement 8: Propagation effects on tensions', () => {
  test('accepts tension without propagation_effects (backward compat)', () => {
    const result = TensionRefSchema.safeParse({
      id: 'TN1',
      type: 'trade_off',
      between: ['B1', 'T1'],
      status: 'resolved',
    });
    expect(result.success).toBe(true);
  });

  test('accepts tension with propagation_effects', () => {
    const result = TensionRefSchema.safeParse({
      id: 'TN1',
      type: 'trade_off',
      between: ['B1', 'T1'],
      status: 'resolved',
      propagation_effects: [
        { constraint_id: 'T3', effect: 'TIGHTENED', note: 'Cache adds 50ms' },
        { constraint_id: 'U1', effect: 'LOOSENED' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.propagation_effects).toHaveLength(2);
      expect(result.data.propagation_effects![0].effect).toBe('TIGHTENED');
    }
  });

  test('PropagationEffectSchema has exactly 3 values', () => {
    expect(PropagationEffectSchema.options).toEqual(['TIGHTENED', 'LOOSENED', 'VIOLATED']);
  });

  test('rejects invalid propagation effect', () => {
    const result = PropagationEntrySchema.safeParse({
      constraint_id: 'T3',
      effect: 'REMOVED',
    });
    expect(result.success).toBe(false);
  });

  test('propagation entry note is optional', () => {
    const result = PropagationEntrySchema.safeParse({
      constraint_id: 'T3',
      effect: 'VIOLATED',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Enhancement 7: Recursive Backward Chaining (depth + children)
// ============================================================

describe('Enhancement 7: Recursive backward chaining', () => {
  test('accepts RT without depth or children (backward compat)', () => {
    const result = RequiredTruthRefSchema.safeParse({
      id: 'RT-1',
      status: 'NOT_SATISFIED',
    });
    expect(result.success).toBe(true);
  });

  test('accepts RT with depth field', () => {
    const result = RequiredTruthRefSchema.safeParse({
      id: 'RT-1',
      status: 'NOT_SATISFIED',
      depth: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depth).toBe(0);
    }
  });

  test('accepts RT with children array', () => {
    const result = RequiredTruthRefSchema.safeParse({
      id: 'RT-1',
      status: 'NOT_SATISFIED',
      depth: 0,
      children: [
        { id: 'RT-1.1', status: 'NOT_SATISFIED', depth: 1 },
        { id: 'RT-1.2', status: 'SATISFIED', depth: 1 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.children).toHaveLength(2);
    }
  });

  test('accepts nested children (recursive)', () => {
    const result = RequiredTruthRefSchema.safeParse({
      id: 'RT-1',
      status: 'NOT_SATISFIED',
      depth: 0,
      children: [
        {
          id: 'RT-1.1',
          status: 'NOT_SATISFIED',
          depth: 1,
          children: [
            { id: 'RT-1.1.1', status: 'SATISFIED', depth: 2 },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('accepts dotted ID notation for sub-truths', () => {
    const valid = ['RT-1', 'RT-1.1', 'RT-1.1.2', 'RT-2.3.4.5'];
    for (const id of valid) {
      const result = RequiredTruthRefSchema.safeParse({
        id,
        status: 'NOT_SATISFIED',
      });
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid RT ID format', () => {
    const invalid = ['RT', 'RT-', 'RT-abc', 'B1', ''];
    for (const id of invalid) {
      const result = RequiredTruthRefSchema.safeParse({
        id,
        status: 'NOT_SATISFIED',
      });
      expect(result.success).toBe(false);
    }
  });
});

// ============================================================
// Enhancement 5: Theory of Constraints (binding_constraint)
// ============================================================

describe('Enhancement 5: Binding constraint', () => {
  test('accepts anchors without binding_constraint (backward compat)', () => {
    const result = AnchorsSchema.safeParse({
      required_truths: [],
    });
    expect(result.success).toBe(true);
  });

  test('accepts anchors with binding_constraint', () => {
    const result = AnchorsSchema.safeParse({
      required_truths: [
        { id: 'RT-1', status: 'NOT_SATISFIED' },
      ],
      binding_constraint: {
        required_truth_id: 'RT-1',
        reason: 'Hardest to close',
        dependency_chain: ['RT-2', 'RT-3'],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.binding_constraint?.required_truth_id).toBe('RT-1');
    }
  });

  test('binding_constraint reason and dependency_chain are optional', () => {
    const result = BindingConstraintSchema.safeParse({
      required_truth_id: 'RT-1',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Enhancement 4: Reversibility Log
// ============================================================

describe('Enhancement 4: Reversibility log', () => {
  test('accepts manifold without reversibility_log (backward compat)', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'GENERATED',
      tensions: [],
    });
    expect(result.success).toBe(true);
  });

  test('accepts manifold with reversibility_log', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'GENERATED',
      tensions: [],
      reversibility_log: [
        {
          action_step: 1,
          description: 'Migrate database schema',
          reversibility: 'ONE_WAY',
          one_way_consequence: 'Old schema unreadable',
        },
        {
          action_step: 2,
          description: 'Deploy new API',
          reversibility: 'TWO_WAY',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reversibility_log).toHaveLength(2);
      expect(result.data.reversibility_log![0].reversibility).toBe('ONE_WAY');
    }
  });

  test('accepts all reversibility values', () => {
    const values = ['TWO_WAY', 'REVERSIBLE_WITH_COST', 'ONE_WAY'] as const;
    for (const reversibility of values) {
      const result = parseManifoldStructure({
        schema_version: 3,
        feature: 'test',
        phase: 'GENERATED',
        tensions: [],
        reversibility_log: [
          { action_step: 1, description: 'test', reversibility },
        ],
      });
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid reversibility value', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'GENERATED',
      tensions: [],
      reversibility_log: [
        { action_step: 1, description: 'test', reversibility: 'MAYBE' },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('one_way_consequence is optional', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'GENERATED',
      tensions: [],
      reversibility_log: [
        { action_step: 1, description: 'test', reversibility: 'ONE_WAY' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Non-software domain support
// ============================================================

describe('Non-software domain', () => {
  test('accepts manifold without domain field (backward compat)', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      tensions: [],
    });
    expect(result.success).toBe(true);
  });

  test('accepts domain: software', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      tensions: [],
      domain: 'software',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('software');
    }
  });

  test('accepts domain: non-software', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      tensions: [],
      domain: 'non-software',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('non-software');
    }
  });

  test('rejects invalid domain value', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      tensions: [],
      domain: 'hybrid',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Backward Compatibility: Full manifold with all new fields
// ============================================================

describe('Full manifold with all enhancement fields', () => {
  test('accepts a complete manifold using every new field', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'full-test',
      phase: 'VERIFIED',
      domain: 'software',
      tensions: [
        {
          id: 'TN1',
          type: 'trade_off',
          between: ['B1', 'T1'],
          status: 'resolved',
          triz_principles: ['P10', 'P24'],
          propagation_effects: [
            { constraint_id: 'T2', effect: 'TIGHTENED', note: 'Adds latency' },
          ],
        },
      ],
      constraints: {
        business: [
          {
            id: 'B1',
            type: 'invariant',
            source: 'interview',
            challenger: 'regulation',
          },
        ],
        technical: [
          {
            id: 'T1',
            type: 'boundary',
            source: 'pre-mortem',
            challenger: 'technical-reality',
            threshold: { kind: 'statistical', p99: '200ms', p50: '80ms' },
          },
          { id: 'T2', type: 'goal' },
        ],
        user_experience: [],
        security: [],
        operational: [],
      },
      anchors: {
        required_truths: [
          {
            id: 'RT-1',
            status: 'SATISFIED',
            maps_to: ['B1'],
            depth: 0,
            children: [
              {
                id: 'RT-1.1',
                status: 'SATISFIED',
                depth: 1,
                children: [],
              },
            ],
          },
        ],
        binding_constraint: {
          required_truth_id: 'RT-1',
          reason: 'Regulatory compliance is non-negotiable',
          dependency_chain: ['RT-1.1'],
        },
      },
      reversibility_log: [
        {
          action_step: 1,
          description: 'Accept regulatory framework',
          reversibility: 'ONE_WAY',
          one_way_consequence: 'Locked into compliance regime',
        },
        {
          action_step: 2,
          description: 'Select architecture pattern',
          reversibility: 'REVERSIBLE_WITH_COST',
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('software');
      expect(result.data.constraints?.business[0].source).toBe('interview');
      expect(result.data.constraints?.business[0].challenger).toBe('regulation');
      expect(result.data.constraints?.technical[0].threshold?.kind).toBe('statistical');
      expect(result.data.tensions[0].triz_principles).toEqual(['P10', 'P24']);
      expect(result.data.tensions[0].propagation_effects).toHaveLength(1);
      expect(result.data.anchors?.required_truths[0].children).toHaveLength(1);
      expect(result.data.anchors?.binding_constraint?.required_truth_id).toBe('RT-1');
      expect(result.data.reversibility_log).toHaveLength(2);
    }
  });

  test('accepts manifold with NO new fields (pure backward compat)', () => {
    const result = parseManifoldStructure({
      schema_version: 3,
      feature: 'legacy-test',
      phase: 'INITIALIZED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [],
        user_experience: [],
        security: [],
        operational: [],
      },
      tensions: [],
      anchors: { required_truths: [] },
      convergence: { status: 'NOT_STARTED' },
    });
    expect(result.success).toBe(true);
  });
});
