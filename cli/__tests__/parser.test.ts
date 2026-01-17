/**
 * Tests for parser.ts
 * Validates: RT-1 (Fast/safe YAML parsing), T2 (Schema v1/v2/v3 detection)
 */

import { describe, test, expect } from 'bun:test';
import {
  parseYamlSafe,
  detectSchemaVersion,
  type Manifold
} from '../lib/parser.js';

describe('parseYamlSafe', () => {
  test('parses valid YAML', () => {
    const yaml = `
feature: test
phase: INITIALIZED
`;
    const result = parseYamlSafe(yaml);
    expect(result).toEqual({ feature: 'test', phase: 'INITIALIZED' });
  });

  test('returns null for invalid YAML', () => {
    const invalid = `
feature: test
nested:
  - item: value
  bad: [unclosed
`;
    const result = parseYamlSafe(invalid);
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = parseYamlSafe('');
    expect(result).toBeNull();
  });

  test('handles complex nested structures', () => {
    const yaml = `
feature: test
constraints:
  business:
    - id: B1
      type: goal
      statement: "Test"
`;
    const result = parseYamlSafe<Manifold>(yaml);
    expect(result?.constraints?.business?.[0]?.id).toBe('B1');
  });
});

describe('detectSchemaVersion', () => {
  test('returns 2 for explicit schema_version: 2', () => {
    const manifold: Manifold = {
      schema_version: 2,
      feature: 'test',
      phase: 'INITIALIZED'
    };
    expect(detectSchemaVersion(manifold)).toBe(2);
  });

  test('returns 1 for explicit schema_version: 1', () => {
    const manifold: Manifold = {
      schema_version: 1,
      feature: 'test',
      phase: 'INITIALIZED'
    };
    expect(detectSchemaVersion(manifold)).toBe(1);
  });

  test('returns 2 when iterations[] present', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'INITIALIZED',
      iterations: [{ number: 1, phase: 'init', timestamp: '', result: 'ok' }]
    };
    expect(detectSchemaVersion(manifold)).toBe(2);
  });

  test('returns 2 when convergence{} present', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'INITIALIZED',
      convergence: { status: 'IN_PROGRESS' }
    };
    expect(detectSchemaVersion(manifold)).toBe(2);
  });

  test('returns 1 for v1 manifold without version markers', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: { business: [] }
    };
    expect(detectSchemaVersion(manifold)).toBe(1);
  });

  test('returns 3 for explicit schema_version: 3', () => {
    const manifold: Manifold = {
      schema_version: 3,
      feature: 'test',
      phase: 'INITIALIZED'
    };
    expect(detectSchemaVersion(manifold)).toBe(3);
  });

  test('returns 3 when constraint_graph present', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'INITIALIZED',
      constraint_graph: {
        version: 1,
        nodes: {},
        edges: { dependencies: [], conflicts: [], satisfies: [] }
      }
    };
    expect(detectSchemaVersion(manifold)).toBe(3);
  });

  test('returns 3 when evidence[] present (auto-detection)', () => {
    const manifold: Manifold = {
      feature: 'test',
      phase: 'INITIALIZED',
      evidence: [{ type: 'file_exists', path: 'test.ts', status: 'VERIFIED' }]
    };
    expect(detectSchemaVersion(manifold)).toBe(3);
  });
});
