/**
 * Tests for structure-schema.ts
 * Validates: JSON structure parsing for JSON+Markdown hybrid format
 */

import { describe, test, expect } from 'bun:test';
import {
  ManifoldStructureSchema,
  parseManifoldStructure,
  validateManifoldStructure,
  collectStructureIds,
  validateTensionReferences,
  validateRequiredTruthReferences,
  PhaseSchema,
  ConstraintTypeSchema,
  TensionTypeSchema,
  TensionStatusSchema,
  RequiredTruthStatusSchema,
} from '../lib/structure-schema.js';

describe('PhaseSchema', () => {
  test('accepts all valid phases', () => {
    const validPhases = ['INITIALIZED', 'CONSTRAINED', 'TENSIONED', 'ANCHORED', 'GENERATED', 'VERIFIED'];
    for (const phase of validPhases) {
      const result = PhaseSchema.safeParse(phase);
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid phases', () => {
    const invalidPhases = ['INVALID', 'initialized', 'Constrained', '', null];
    for (const phase of invalidPhases) {
      const result = PhaseSchema.safeParse(phase);
      expect(result.success).toBe(false);
    }
  });
});

describe('ConstraintTypeSchema', () => {
  test('accepts valid constraint types', () => {
    const validTypes = ['invariant', 'goal', 'boundary'];
    for (const type of validTypes) {
      const result = ConstraintTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid constraint types', () => {
    const invalidTypes = ['INVARIANT', 'requirement', '', null];
    for (const type of invalidTypes) {
      const result = ConstraintTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    }
  });
});

describe('TensionTypeSchema', () => {
  test('accepts valid tension types', () => {
    const validTypes = ['trade_off', 'resource_tension', 'hidden_dependency'];
    for (const type of validTypes) {
      const result = TensionTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid tension types', () => {
    const invalidTypes = ['tradeoff', 'conflict', '', null];
    for (const type of invalidTypes) {
      const result = TensionTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    }
  });
});

describe('ManifoldStructureSchema', () => {
  test('parses minimal valid structure', () => {
    const structure = {
      feature: 'test-feature',
      phase: 'INITIALIZED',
    };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feature).toBe('test-feature');
      expect(result.data.phase).toBe('INITIALIZED');
      expect(result.data.schema_version).toBe(3); // default
    }
  });

  test('parses full structure with constraints', () => {
    const structure = {
      schema_version: 3,
      feature: 'payment-retry',
      phase: 'CONSTRAINED',
      constraints: {
        business: [
          { id: 'B1', type: 'invariant' },
          { id: 'B2', type: 'goal' },
        ],
        technical: [
          { id: 'T1', type: 'boundary' },
        ],
      },
    };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints?.business).toHaveLength(2);
      expect(result.data.constraints?.technical).toHaveLength(1);
    }
  });

  test('parses structure with tensions', () => {
    const structure = {
      feature: 'test',
      phase: 'TENSIONED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
      },
      tensions: [
        {
          id: 'TN1',
          type: 'trade_off',
          between: ['B1', 'T1'],
          status: 'resolved',
        },
      ],
    };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tensions).toHaveLength(1);
      expect(result.data.tensions?.[0].between).toEqual(['B1', 'T1']);
    }
  });

  test('parses structure with required truths', () => {
    const structure = {
      feature: 'test',
      phase: 'ANCHORED',
      anchors: {
        required_truths: [
          { id: 'RT-1', status: 'NOT_SATISFIED' },
          { id: 'RT-2', status: 'SATISFIED', maps_to: ['B1'] },
        ],
      },
    };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anchors?.required_truths).toHaveLength(2);
    }
  });

  test('rejects structure without feature', () => {
    const structure = { phase: 'INITIALIZED' };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(false);
  });

  test('rejects structure with invalid constraint ID', () => {
    const structure = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'invalid', type: 'invariant' }],
      },
    };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(false);
  });

  test('rejects tension with less than 2 between refs', () => {
    const structure = {
      feature: 'test',
      phase: 'TENSIONED',
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1'], status: 'resolved' },
      ],
    };
    const result = ManifoldStructureSchema.safeParse(structure);
    expect(result.success).toBe(false);
  });
});

describe('parseManifoldStructure', () => {
  test('parses valid object', () => {
    const obj = {
      feature: 'test',
      phase: 'INITIALIZED',
    };
    const result = parseManifoldStructure(obj);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feature).toBe('test');
    }
  });

  test('returns error for missing required fields', () => {
    const obj = { phase: 'INITIALIZED' }; // Missing feature
    const result = parseManifoldStructure(obj);
    expect(result.success).toBe(false);
  });

  test('returns error for schema violation', () => {
    const obj = { feature: 'test', phase: 'INVALID' };
    const result = parseManifoldStructure(obj);
    expect(result.success).toBe(false);
  });
});

describe('validateManifoldStructure', () => {
  test('validates correct structure', () => {
    const structure = {
      feature: 'test',
      phase: 'INITIALIZED',
    };
    const result = validateManifoldStructure(structure);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns errors for invalid structure', () => {
    const structure = {
      feature: '',
      phase: 'INVALID',
    };
    const result = validateManifoldStructure(structure);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('collectStructureIds', () => {
  test('collects all constraint IDs', () => {
    const structure = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }, { id: 'T2', type: 'goal' }],
        security: [{ id: 'S1', type: 'invariant' }],
      },
    };
    const parsed = ManifoldStructureSchema.parse(structure);
    const ids = collectStructureIds(parsed);
    expect(ids.has('B1')).toBe(true);
    expect(ids.has('T1')).toBe(true);
    expect(ids.has('T2')).toBe(true);
    expect(ids.has('S1')).toBe(true);
    expect(ids.size).toBe(4);
  });

  test('collects tension IDs', () => {
    const structure = {
      feature: 'test',
      phase: 'TENSIONED',
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
        { id: 'TN2', type: 'resource_tension', between: ['T1', 'T2'], status: 'unresolved' },
      ],
    };
    const parsed = ManifoldStructureSchema.parse(structure);
    const ids = collectStructureIds(parsed);
    expect(ids.has('TN1')).toBe(true);
    expect(ids.has('TN2')).toBe(true);
  });

  test('collects required truth IDs', () => {
    const structure = {
      feature: 'test',
      phase: 'ANCHORED',
      anchors: {
        required_truths: [
          { id: 'RT-1', status: 'SATISFIED' },
          { id: 'RT-2', status: 'NOT_SATISFIED' },
        ],
      },
    };
    const parsed = ManifoldStructureSchema.parse(structure);
    const ids = collectStructureIds(parsed);
    expect(ids.has('RT-1')).toBe(true);
    expect(ids.has('RT-2')).toBe(true);
  });
});

describe('validateTensionReferences', () => {
  test('returns empty array when all references exist', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'TENSIONED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
      ],
    });
    const errors = validateTensionReferences(structure);
    expect(errors).toHaveLength(0);
  });

  test('returns errors for missing references', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'TENSIONED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
      ],
    });
    const errors = validateTensionReferences(structure);
    expect(errors).toHaveLength(1);
    expect(errors[0].tensionId).toBe('TN1');
    expect(errors[0].missingRef).toBe('T1');
  });
});

describe('validateRequiredTruthReferences', () => {
  test('returns empty array when all maps_to references exist', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'ANCHORED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
      ],
      anchors: {
        required_truths: [
          { id: 'RT-1', status: 'SATISFIED', maps_to: ['B1', 'TN1'] },
        ],
      },
    });
    const errors = validateRequiredTruthReferences(structure);
    expect(errors).toHaveLength(0);
  });

  test('returns errors for missing maps_to references', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'ANCHORED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
      },
      anchors: {
        required_truths: [
          { id: 'RT-1', status: 'SATISFIED', maps_to: ['B1', 'B99'] },
        ],
      },
    });
    const errors = validateRequiredTruthReferences(structure);
    expect(errors).toHaveLength(1);
    expect(errors[0].truthId).toBe('RT-1');
    expect(errors[0].missingRef).toBe('B99');
  });
});
