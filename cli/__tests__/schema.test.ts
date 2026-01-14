/**
 * Tests for schema.ts
 * Validates: T2 (Parse both schema v1 and v2 correctly)
 */

import { describe, test, expect } from 'bun:test';
import {
  validateManifold,
  countConstraints,
  countConstraintsByType
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
