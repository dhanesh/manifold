/**
 * Tests for schema.ts
 * Validates: T2 (Parse both schema v1 and v2 correctly)
 */

import { describe, test, expect } from 'bun:test';
import {
  validateManifold,
  countConstraints,
  countConstraintsByType,
  sanitizePath
} from '../lib/schema.js';
import type { Manifold } from '../lib/parser.js';

describe('validateManifold', () => {
  test('validates minimal valid manifold', () => {
    const manifold = {
      feature: 'test',
      phase: 'INITIALIZED'
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('fails on missing feature', () => {
    const manifold = { phase: 'INITIALIZED' };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'feature')).toBe(true);
  });

  test('fails on missing phase', () => {
    const manifold = { feature: 'test' };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'phase')).toBe(true);
  });

  test('fails on invalid phase', () => {
    const manifold = { feature: 'test', phase: 'INVALID' };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'phase')).toBe(true);
  });

  test('validates all valid phases', () => {
    const phases = ['INITIALIZED', 'CONSTRAINED', 'TENSIONED', 'ANCHORED', 'GENERATED', 'VERIFIED'];
    for (const phase of phases) {
      const manifold = { feature: 'test', phase };
      const result = validateManifold(manifold);
      expect(result.valid).toBe(true);
    }
  });

  test('validates constraints structure', () => {
    const manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [
          { id: 'B1', type: 'goal', statement: 'Test goal' }
        ]
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
  });

  test('fails on invalid constraint type', () => {
    const manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [
          { id: 'B1', type: 'invalid', statement: 'Test' }
        ]
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('type'))).toBe(true);
  });

  test('validates tensions structure', () => {
    const manifold = {
      feature: 'test',
      phase: 'TENSIONED',
      tensions: [
        {
          id: 'TN1',
          type: 'trade_off',
          between: ['A', 'B'],
          description: 'Test tension',
          status: 'resolved',
          resolution: 'Resolved by X'
        }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
  });

  test('detects schema v2 from iterations', () => {
    const manifold = {
      feature: 'test',
      phase: 'INITIALIZED',
      iterations: [
        { number: 1, phase: 'init', timestamp: '2024-01-01', result: 'ok' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.schemaVersion).toBe(2);
  });

  test('warns on deprecated ux field', () => {
    const manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        ux: [{ id: 'U1', type: 'goal', statement: 'Test' }]
      }
    };
    const result = validateManifold(manifold);
    expect(result.warnings.some(w => w.field === 'constraints.ux')).toBe(true);
  });
});

describe('countConstraints', () => {
  test('counts all constraint categories', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'goal', statement: '' }],
        technical: [{ id: 'T1', type: 'invariant', statement: '' }, { id: 'T2', type: 'boundary', statement: '' }],
        user_experience: [{ id: 'U1', type: 'goal', statement: '' }],
        security: [],
        operational: [{ id: 'O1', type: 'goal', statement: '' }]
      }
    };
    const counts = countConstraints(manifold);
    expect(counts.business).toBe(1);
    expect(counts.technical).toBe(2);
    expect(counts.user_experience).toBe(1);
    expect(counts.security).toBe(0);
    expect(counts.operational).toBe(1);
    expect(counts.total).toBe(5);
  });

  test('combines ux and user_experience counts', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        ux: [{ id: 'U1', type: 'goal', statement: '' }],
        user_experience: [{ id: 'U2', type: 'goal', statement: '' }]
      }
    };
    const counts = countConstraints(manifold);
    expect(counts.user_experience).toBe(2);
  });
});

describe('countConstraintsByType', () => {
  test('counts by type across categories', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'goal', statement: '' }],
        technical: [
          { id: 'T1', type: 'invariant', statement: '' },
          { id: 'T2', type: 'boundary', statement: '' }
        ]
      }
    };
    const counts = countConstraintsByType(manifold);
    expect(counts.goal).toBe(1);
    expect(counts.invariant).toBe(1);
    expect(counts.boundary).toBe(1);
  });
});

// ============================================================
// v3: Evidence Validation Tests
// Satisfies: T1, RT-2
// ============================================================

describe('v3: evidence validation', () => {
  test('detects schema v3 from evidence array', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      evidence: [
        { type: 'file_exists', path: 'src/test.ts', status: 'VERIFIED' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.schemaVersion).toBe(3);
  });

  test('validates valid evidence types', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'file_exists', path: 'src/test.ts', status: 'VERIFIED' },
        { type: 'content_match', path: 'src/test.ts', pattern: 'export class', status: 'VERIFIED' },
        { type: 'test_passes', path: 'tests/test.test.ts', test_name: 'should work', status: 'PENDING' },
        { type: 'metric_value', metric_name: 'latency', threshold: 200, status: 'VERIFIED' },
        { type: 'manual_review', verified_by: 'John Doe', status: 'VERIFIED' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('fails on invalid evidence type', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'invalid_type', path: 'src/test.ts' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('type'))).toBe(true);
  });

  test('fails on invalid evidence status', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'file_exists', path: 'src/test.ts', status: 'INVALID_STATUS' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('status'))).toBe(true);
  });

  test('fails on missing required path for file_exists', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'file_exists', status: 'VERIFIED' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('path'))).toBe(true);
  });

  test('fails on missing pattern for content_match', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'content_match', path: 'src/test.ts', status: 'VERIFIED' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('pattern'))).toBe(true);
  });

  test('fails on missing metric_name for metric_value', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'metric_value', threshold: 200, status: 'VERIFIED' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('metric_name'))).toBe(true);
  });
});

// ============================================================
// v3: Path Sanitization Tests (S2, RT-8)
// ============================================================

describe('v3: path sanitization', () => {
  test('rejects path traversal with ../', () => {
    const result = sanitizePath('../../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('traversal');
  });

  test('rejects path traversal with ..\\', () => {
    const result = sanitizePath('..\\..\\windows\\system32');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('traversal');
  });

  test('rejects absolute paths without project root', () => {
    const result = sanitizePath('/etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Absolute');
  });

  test('allows absolute paths within project root', () => {
    const result = sanitizePath('/project/src/test.ts', '/project');
    expect(result.valid).toBe(true);
  });

  test('rejects absolute paths outside project root', () => {
    const result = sanitizePath('/etc/passwd', '/project');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('outside');
  });

  test('rejects paths with null bytes', () => {
    const result = sanitizePath('src/test.ts\0/etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('null');
  });

  test('allows valid relative paths', () => {
    const result = sanitizePath('src/components/Button.tsx');
    expect(result.valid).toBe(true);
  });

  test('validates evidence paths for traversal', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'VERIFIED',
      evidence: [
        { type: 'file_exists', path: '../../../etc/passwd', status: 'VERIFIED' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('traversal'))).toBe(true);
  });
});

// ============================================================
// v3: Constraint Graph Validation Tests
// ============================================================

describe('v3: constraint_graph validation', () => {
  test('detects schema v3 from constraint_graph', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        feature: 'test',
        nodes: {},
        edges: { dependencies: [], conflicts: [], satisfies: [] }
      }
    };
    const result = validateManifold(manifold);
    expect(result.schemaVersion).toBe(3);
  });

  test('validates constraint_graph node types', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        feature: 'test',
        nodes: {
          B1: { id: 'B1', type: 'constraint', label: 'Test', depends_on: [], blocks: [], conflicts_with: [], status: 'REQUIRED' },
          TN1: { id: 'TN1', type: 'tension', label: 'Test', depends_on: [], blocks: [], conflicts_with: [], status: 'CONFLICTED' },
          'RT-1': { id: 'RT-1', type: 'required_truth', label: 'Test', depends_on: [], blocks: [], conflicts_with: [], status: 'SATISFIED' }
        },
        edges: { dependencies: [], conflicts: [], satisfies: [] }
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
  });

  test('fails on invalid node type', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        feature: 'test',
        nodes: {
          B1: { id: 'B1', type: 'invalid_type', label: 'Test' }
        },
        edges: { dependencies: [], conflicts: [], satisfies: [] }
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('type'))).toBe(true);
  });

  test('fails on invalid node status', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        feature: 'test',
        nodes: {
          B1: { id: 'B1', type: 'constraint', label: 'Test', status: 'INVALID_STATUS' }
        },
        edges: { dependencies: [], conflicts: [], satisfies: [] }
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('status'))).toBe(true);
  });

  test('validates edge array structure', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        feature: 'test',
        nodes: {
          B1: { id: 'B1', type: 'constraint' },
          B2: { id: 'B2', type: 'constraint' }
        },
        edges: {
          dependencies: [['B2', 'B1']],  // B2 depends on B1
          conflicts: [],
          satisfies: []
        }
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
  });

  test('fails on malformed edge array', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        feature: 'test',
        nodes: {},
        edges: {
          dependencies: [['single_element']],  // Edge needs at least 2 elements
          conflicts: [],
          satisfies: []
        }
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('dependencies'))).toBe(true);
  });
});

// ============================================================
// v3: Reference Validation Tests (T3, RT-3)
// ============================================================

describe('v3: reference validation', () => {
  test('fails on dangling tension.between reference', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'TENSIONED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant', statement: 'Test' }]
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'B99'], description: 'Test', status: 'resolved' }
      ]
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('B99'))).toBe(true);
  });

  test('warns on dangling maps_to_constraints reference', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'ANCHORED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant', statement: 'Test' }]
      },
      anchors: {
        required_truths: [
          { id: 'RT-1', statement: 'Test', status: 'NOT_SATISFIED', maps_to_constraints: ['B1', 'B99'] }
        ]
      }
    };
    const result = validateManifold(manifold);
    // This is a warning, not an error
    expect(result.warnings.some(w => w.message.includes('B99'))).toBe(true);
  });

  test('passes when all references are valid', () => {
    const manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'ANCHORED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant', statement: 'Test' }],
        technical: [{ id: 'T1', type: 'boundary', statement: 'Test' }]
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], description: 'Test', status: 'resolved' }
      ],
      anchors: {
        required_truths: [
          { id: 'RT-1', statement: 'Test', status: 'NOT_SATISFIED', maps_to_constraints: ['B1', 'T1'] }
        ]
      }
    };
    const result = validateManifold(manifold);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
