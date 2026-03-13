/**
 * Tests for Evidence Verification Module (new functions)
 * Satisfies: T5 (extensible evidence), T6 (satisfaction levels), RT-2, RT-3, RT-5
 *
 * G2: Covers computeFileHash, detectDrift, parseTestAnnotations,
 *     buildTraceabilityMatrix, aggregateSatisfactionLevel
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  computeFileHash,
  detectDrift,
  parseTestAnnotations,
  buildTraceabilityMatrix,
  aggregateSatisfactionLevel,
  type DriftReport,
  type TraceabilityMatrix,
} from '../lib/evidence.js';
import type { Evidence } from '../lib/parser.js';

// ============================================================
// Test Setup
// ============================================================

const TEST_DIR = join(import.meta.dir, '__evidence_test_tmp__');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

// ============================================================
// computeFileHash Tests
// ============================================================

describe('computeFileHash', () => {
  test('returns SHA-256 hex hash for existing file', () => {
    const filePath = join(TEST_DIR, 'test.txt');
    writeFileSync(filePath, 'hello world');

    const hash = computeFileHash(filePath);
    expect(hash).not.toBeNull();
    expect(hash).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('returns null for non-existent file', () => {
    const hash = computeFileHash(join(TEST_DIR, 'nonexistent.txt'));
    expect(hash).toBeNull();
  });

  test('produces consistent hashes for same content', () => {
    const file1 = join(TEST_DIR, 'a.txt');
    const file2 = join(TEST_DIR, 'b.txt');
    writeFileSync(file1, 'same content');
    writeFileSync(file2, 'same content');

    expect(computeFileHash(file1)).toBe(computeFileHash(file2));
  });

  test('produces different hashes for different content', () => {
    const file1 = join(TEST_DIR, 'a.txt');
    const file2 = join(TEST_DIR, 'b.txt');
    writeFileSync(file1, 'content A');
    writeFileSync(file2, 'content B');

    expect(computeFileHash(file1)).not.toBe(computeFileHash(file2));
  });

  test('handles empty files', () => {
    const filePath = join(TEST_DIR, 'empty.txt');
    writeFileSync(filePath, '');

    const hash = computeFileHash(filePath);
    expect(hash).not.toBeNull();
    expect(hash).toHaveLength(64);
  });
});

// ============================================================
// detectDrift Tests
// ============================================================

describe('detectDrift', () => {
  test('reports clean when hashes match', () => {
    const filePath = join(TEST_DIR, 'clean.ts');
    writeFileSync(filePath, 'export const x = 1;');
    const hash = computeFileHash(filePath)!;

    const report = detectDrift(
      [{ path: 'clean.ts', file_hash: hash, satisfies: ['B1'] }],
      TEST_DIR
    );

    expect(report.drifted).toHaveLength(0);
    expect(report.clean).toBe(1);
  });

  test('reports drift when file content changed', () => {
    const filePath = join(TEST_DIR, 'drifted.ts');
    writeFileSync(filePath, 'original content');
    const originalHash = computeFileHash(filePath)!;

    // Modify the file
    writeFileSync(filePath, 'modified content');

    const report = detectDrift(
      [{ path: 'drifted.ts', file_hash: originalHash, satisfies: ['T1', 'T2'] }],
      TEST_DIR
    );

    expect(report.drifted).toHaveLength(1);
    expect(report.drifted[0].path).toBe('drifted.ts');
    expect(report.drifted[0].constraint_ids).toEqual(['T1', 'T2']);
    expect(report.drifted[0].old_hash).toBe(originalHash);
    expect(report.drifted[0].new_hash).not.toBe(originalHash);
    expect(report.clean).toBe(0);
  });

  test('reports drift when file is deleted', () => {
    const report = detectDrift(
      [{ path: 'deleted.ts', file_hash: 'abc123', satisfies: ['S1'] }],
      TEST_DIR
    );

    expect(report.drifted).toHaveLength(1);
    expect(report.drifted[0].new_hash).toBe('<deleted>');
  });

  test('skips artifacts without file_hash', () => {
    const report = detectDrift(
      [{ path: 'no-hash.ts', satisfies: ['B1'] }],
      TEST_DIR
    );

    expect(report.drifted).toHaveLength(0);
    expect(report.clean).toBe(0);
  });

  test('handles mix of clean, drifted, and missing files', () => {
    const cleanFile = join(TEST_DIR, 'clean.ts');
    writeFileSync(cleanFile, 'clean');
    const cleanHash = computeFileHash(cleanFile)!;

    const driftFile = join(TEST_DIR, 'drift.ts');
    writeFileSync(driftFile, 'original');
    const driftHash = computeFileHash(driftFile)!;
    writeFileSync(driftFile, 'changed');

    const report = detectDrift(
      [
        { path: 'clean.ts', file_hash: cleanHash, satisfies: ['B1'] },
        { path: 'drift.ts', file_hash: driftHash, satisfies: ['T1'] },
        { path: 'missing.ts', file_hash: 'xyz', satisfies: ['S1'] },
      ],
      TEST_DIR
    );

    expect(report.clean).toBe(1);
    expect(report.drifted).toHaveLength(2);
  });

  test('includes timestamp in report', () => {
    const report = detectDrift([], TEST_DIR);
    expect(report.timestamp).toBeTruthy();
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });
});

// ============================================================
// parseTestAnnotations Tests
// ============================================================

describe('parseTestAnnotations', () => {
  test('parses @constraint annotations', () => {
    const filePath = join(TEST_DIR, 'annotated.test.ts');
    writeFileSync(filePath, `
// @constraint B1
test('prevents duplicates', () => {
  expect(true).toBe(true);
});
`);

    const annotations = parseTestAnnotations(filePath);
    expect(annotations.get('prevents duplicates')).toEqual(['B1']);
  });

  test('parses // Satisfies: annotations', () => {
    const filePath = join(TEST_DIR, 'satisfies.test.ts');
    writeFileSync(filePath, `
// Satisfies: B1, T2
it('validates input', () => {
  expect(true).toBe(true);
});
`);

    const annotations = parseTestAnnotations(filePath);
    expect(annotations.get('validates input')).toContain('B1');
    expect(annotations.get('validates input')).toContain('T2');
  });

  test('parses * Satisfies: annotations (JSDoc style)', () => {
    const filePath = join(TEST_DIR, 'jsdoc.test.ts');
    writeFileSync(filePath, `
/**
 * Satisfies: RT-1, RT-2
 */
describe('error classification', () => {
  test('classifies transient errors', () => {});
});
`);

    const annotations = parseTestAnnotations(filePath);
    expect(annotations.get('error classification')).toContain('RT-1');
    expect(annotations.get('error classification')).toContain('RT-2');
  });

  test('handles multiple tests with different constraints', () => {
    const filePath = join(TEST_DIR, 'multi.test.ts');
    writeFileSync(filePath, `
// @constraint B1
test('no duplicates', () => {});

// @constraint T1, T2
test('response time', () => {});
`);

    const annotations = parseTestAnnotations(filePath);
    expect(annotations.get('no duplicates')).toEqual(['B1']);
    expect(annotations.get('response time')).toContain('T1');
    expect(annotations.get('response time')).toContain('T2');
  });

  test('returns empty map for non-existent file', () => {
    const annotations = parseTestAnnotations(join(TEST_DIR, 'nope.ts'));
    expect(annotations.size).toBe(0);
  });

  test('returns empty map for file with no annotations', () => {
    const filePath = join(TEST_DIR, 'plain.test.ts');
    writeFileSync(filePath, `
test('no annotations here', () => {
  expect(1 + 1).toBe(2);
});
`);

    const annotations = parseTestAnnotations(filePath);
    expect(annotations.size).toBe(0);
  });

  test('filters out invalid constraint IDs', () => {
    const filePath = join(TEST_DIR, 'mixed.test.ts');
    writeFileSync(filePath, `
// @constraint B1, invalid, T2, also-bad
test('mixed ids', () => {});
`);

    const annotations = parseTestAnnotations(filePath);
    const ids = annotations.get('mixed ids');
    expect(ids).toContain('B1');
    expect(ids).toContain('T2');
    expect(ids).not.toContain('invalid');
    expect(ids).not.toContain('also-bad');
  });

  test('handles TN-prefixed constraint IDs', () => {
    const filePath = join(TEST_DIR, 'tension.test.ts');
    writeFileSync(filePath, `
// Satisfies: TN1, TN2
test('tension resolution test', () => {});
`);

    const annotations = parseTestAnnotations(filePath);
    expect(annotations.get('tension resolution test')).toContain('TN1');
    expect(annotations.get('tension resolution test')).toContain('TN2');
  });
});

// ============================================================
// buildTraceabilityMatrix Tests
// ============================================================

describe('buildTraceabilityMatrix', () => {
  test('builds matrix from annotated test files', () => {
    const testFile = join(TEST_DIR, 'traced.test.ts');
    writeFileSync(testFile, `
// @constraint B1
test('no duplicates', () => {});

// @constraint B1, T1
test('idempotent retry', () => {});
`);

    const matrix = buildTraceabilityMatrix(['traced.test.ts'], TEST_DIR);

    expect(matrix['B1']).toHaveLength(2);
    expect(matrix['B1'][0].test_function).toBe('no duplicates');
    expect(matrix['B1'][1].test_function).toBe('idempotent retry');
    expect(matrix['T1']).toHaveLength(1);
    expect(matrix['T1'][0].test_function).toBe('idempotent retry');
  });

  test('handles multiple test files', () => {
    writeFileSync(join(TEST_DIR, 'a.test.ts'), `
// @constraint B1
test('test A', () => {});
`);
    writeFileSync(join(TEST_DIR, 'b.test.ts'), `
// @constraint B1
test('test B', () => {});
`);

    const matrix = buildTraceabilityMatrix(['a.test.ts', 'b.test.ts'], TEST_DIR);
    expect(matrix['B1']).toHaveLength(2);
    expect(matrix['B1'].map(e => e.test_file)).toContain('a.test.ts');
    expect(matrix['B1'].map(e => e.test_file)).toContain('b.test.ts');
  });

  test('returns empty matrix for files with no annotations', () => {
    writeFileSync(join(TEST_DIR, 'plain.test.ts'), `
test('no constraints here', () => {});
`);

    const matrix = buildTraceabilityMatrix(['plain.test.ts'], TEST_DIR);
    expect(Object.keys(matrix)).toHaveLength(0);
  });

  test('returns empty matrix for non-existent files', () => {
    const matrix = buildTraceabilityMatrix(['nope.test.ts'], TEST_DIR);
    expect(Object.keys(matrix)).toHaveLength(0);
  });
});

// ============================================================
// aggregateSatisfactionLevel Tests
// ============================================================

describe('aggregateSatisfactionLevel', () => {
  test('returns DOCUMENTED for empty evidence', () => {
    expect(aggregateSatisfactionLevel([])).toBe('DOCUMENTED');
  });

  test('returns VERIFIED for test_passes with VERIFIED status', () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'test.ts', status: 'VERIFIED' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('VERIFIED');
  });

  test('returns IMPLEMENTED for test_passes with PENDING status', () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'test.ts', status: 'PENDING' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('IMPLEMENTED');
  });

  test('returns TESTED for test_passes with STALE status', () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'test.ts', status: 'STALE' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('TESTED');
  });

  test('returns IMPLEMENTED for file_exists evidence', () => {
    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'impl.ts', status: 'VERIFIED' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('IMPLEMENTED');
  });

  test('returns IMPLEMENTED for content_match evidence', () => {
    const evidence: Evidence[] = [
      { type: 'content_match', path: 'impl.ts', pattern: 'export', status: 'VERIFIED' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('IMPLEMENTED');
  });

  test('returns DOCUMENTED for manual_review only', () => {
    const evidence: Evidence[] = [
      { type: 'manual_review', path: 'review.md', status: 'PENDING' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('DOCUMENTED');
  });

  test('highest level wins with mixed evidence', () => {
    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'impl.ts', status: 'VERIFIED' },
      { type: 'test_passes', path: 'test.ts', status: 'VERIFIED' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('VERIFIED');
  });

  test('PENDING test_passes with file_exists stays IMPLEMENTED', () => {
    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'impl.ts', status: 'VERIFIED' },
      { type: 'test_passes', path: 'test.ts', status: 'PENDING' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('IMPLEMENTED');
  });

  test('TESTED beats IMPLEMENTED when test actually passed', () => {
    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'impl.ts', status: 'VERIFIED' },
      { type: 'test_passes', path: 'test.ts', status: 'STALE' },
    ];
    expect(aggregateSatisfactionLevel(evidence)).toBe('TESTED');
  });
});
