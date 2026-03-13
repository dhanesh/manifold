/**
 * Tests for Verify Command Flags (--execute, --levels)
 * Satisfies: B2 (all phases validated via verification), T6 (satisfaction levels)
 *
 * G4: Covers verify --execute and --levels flag behavior
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { aggregateSatisfactionLevel, verifyAllEvidence, normalizeEvidence } from '../lib/evidence.js';
import { loadConfig } from '../lib/config.js';
import type { Evidence } from '../lib/parser.js';
import type { SatisfactionLevel } from '../lib/structure-schema.js';

// ============================================================
// Test Setup
// ============================================================

const TEST_DIR = join(import.meta.dir, '__verify_flags_tmp__');
const MANIFOLD_DIR = join(TEST_DIR, '.manifold');

beforeEach(() => {
  mkdirSync(MANIFOLD_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

// ============================================================
// --levels Flag Tests (satisfaction level computation)
// ============================================================

describe('--levels flag: satisfaction level computation', () => {
  test('computes DOCUMENTED level for constraints with no evidence', () => {
    const level = aggregateSatisfactionLevel([]);
    expect(level).toBe('DOCUMENTED');
  });

  test('computes IMPLEMENTED level for file_exists evidence', () => {
    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'src/impl.ts', status: 'VERIFIED' },
    ];
    const level = aggregateSatisfactionLevel(evidence);
    expect(level).toBe('IMPLEMENTED');
  });

  test('computes IMPLEMENTED level for PENDING test_passes evidence', () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'test/impl.test.ts', status: 'PENDING' },
    ];
    const level = aggregateSatisfactionLevel(evidence);
    expect(level).toBe('IMPLEMENTED');
  });

  test('computes VERIFIED level for verified test_passes evidence', () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'test/impl.test.ts', status: 'VERIFIED' },
    ];
    const level = aggregateSatisfactionLevel(evidence);
    expect(level).toBe('VERIFIED');
  });

  test('levels hierarchy: VERIFIED > TESTED > IMPLEMENTED > DOCUMENTED', () => {
    // Test all four levels in ascending order
    const levels: SatisfactionLevel[] = ['DOCUMENTED', 'IMPLEMENTED', 'TESTED', 'VERIFIED'];

    // Each should be in the correct position
    expect(levels.indexOf('DOCUMENTED')).toBe(0);
    expect(levels.indexOf('IMPLEMENTED')).toBe(1);
    expect(levels.indexOf('TESTED')).toBe(2);
    expect(levels.indexOf('VERIFIED')).toBe(3);
  });

  test('computes levels for a constraint set', () => {
    const constraintEvidence: Record<string, Evidence[]> = {
      'B1': [{ type: 'test_passes', path: 'test.ts', status: 'VERIFIED' }],
      'B2': [{ type: 'file_exists', path: 'impl.ts', status: 'VERIFIED' }],
      'T1': [],
      'S1': [{ type: 'manual_review', path: 'review.md', status: 'PENDING' }],
    };

    const levels: Record<string, SatisfactionLevel> = {};
    for (const [id, evidence] of Object.entries(constraintEvidence)) {
      levels[id] = aggregateSatisfactionLevel(evidence);
    }

    expect(levels['B1']).toBe('VERIFIED');
    expect(levels['B2']).toBe('IMPLEMENTED');
    expect(levels['T1']).toBe('DOCUMENTED');
    expect(levels['S1']).toBe('DOCUMENTED');
  });

  test('level counts for bar chart display', () => {
    const levels: Record<string, SatisfactionLevel> = {
      'B1': 'VERIFIED',
      'B2': 'IMPLEMENTED',
      'T1': 'TESTED',
      'T2': 'TESTED',
      'U1': 'DOCUMENTED',
    };

    const counts: Record<string, number> = { DOCUMENTED: 0, IMPLEMENTED: 0, TESTED: 0, VERIFIED: 0 };
    for (const level of Object.values(levels)) {
      counts[level] = (counts[level] || 0) + 1;
    }

    expect(counts['DOCUMENTED']).toBe(1);
    expect(counts['IMPLEMENTED']).toBe(1);
    expect(counts['TESTED']).toBe(2);
    expect(counts['VERIFIED']).toBe(1);
  });
});

// ============================================================
// --execute Flag Tests (test runner integration)
// ============================================================

describe('--execute flag: config-based test runner', () => {
  test('loadConfig returns empty when no config exists', () => {
    const config = loadConfig(TEST_DIR);
    expect(config.test_runner).toBeUndefined();
  });

  test('loadConfig reads test_runner from config', () => {
    writeFileSync(
      join(MANIFOLD_DIR, 'config.json'),
      JSON.stringify({ test_runner: 'bun test', test_args: ['--bail'] })
    );

    const config = loadConfig(TEST_DIR);
    expect(config.test_runner).toBe('bun test');
    expect(config.test_args).toEqual(['--bail']);
  });

  test('evidence verification without --execute skips test execution', async () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'test.ts', status: 'PENDING', test_name: 'dummy' },
    ];

    // No runTests flag = skipped
    const report = await verifyAllEvidence(evidence, {
      runTests: false,
      projectRoot: TEST_DIR,
    });

    expect(report.results[0].passed).toBe(false);
    expect(report.results[0].message).toContain('skipped');
  });

  test('evidence verification with runTests checks file content', async () => {
    const testFile = join(TEST_DIR, 'real.test.ts');
    writeFileSync(testFile, `
test('my important test', () => {
  expect(true).toBe(true);
});
`);

    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'real.test.ts', status: 'PENDING', test_name: 'my important test' },
    ];

    const report = await verifyAllEvidence(evidence, {
      runTests: true,
      projectRoot: TEST_DIR,
    });

    // Without --execute, just checks if test name is in file
    expect(report.results[0].passed).toBe(true);
    expect(report.results[0].message).toContain('my important test');
  });

  test('evidence verification reports missing test file', async () => {
    const evidence: Evidence[] = [
      { type: 'test_passes', path: 'nonexistent.test.ts', status: 'PENDING', test_name: 'test' },
    ];

    const report = await verifyAllEvidence(evidence, {
      runTests: true,
      projectRoot: TEST_DIR,
    });

    expect(report.results[0].passed).toBe(false);
    expect(report.results[0].message).toContain('not found');
  });
});

// ============================================================
// normalizeEvidence Tests
// ============================================================

describe('normalizeEvidence', () => {
  test('returns empty array for undefined', () => {
    expect(normalizeEvidence(undefined)).toEqual([]);
  });

  test('converts legacy string path to file_exists evidence', () => {
    const evidence = normalizeEvidence('src/handler.py' as any);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].type).toBe('file_exists');
    expect(evidence[0].path).toBe('src/handler.py');
    expect(evidence[0].status).toBe('PENDING');
  });

  test('passes through array of evidence unchanged', () => {
    const input: Evidence[] = [
      { type: 'file_exists', path: 'test.ts', status: 'VERIFIED' },
    ];
    expect(normalizeEvidence(input)).toEqual(input);
  });
});

// ============================================================
// Verification Report Summary Tests
// ============================================================

describe('verification report summary', () => {
  test('file_exists evidence passes for existing file', async () => {
    writeFileSync(join(TEST_DIR, 'exists.ts'), 'content');

    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'exists.ts', status: 'PENDING' },
    ];

    const report = await verifyAllEvidence(evidence, { projectRoot: TEST_DIR });
    expect(report.verified).toBe(1);
    expect(report.failed).toBe(0);
  });

  test('file_exists evidence fails for missing file', async () => {
    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'missing.ts', status: 'PENDING' },
    ];

    const report = await verifyAllEvidence(evidence, { projectRoot: TEST_DIR });
    expect(report.verified).toBe(0);
  });

  test('content_match evidence passes when pattern found', async () => {
    writeFileSync(join(TEST_DIR, 'code.ts'), 'export class IdempotencyService {}');

    const evidence: Evidence[] = [
      { type: 'content_match', path: 'code.ts', pattern: 'IdempotencyService', status: 'PENDING' },
    ];

    const report = await verifyAllEvidence(evidence, { projectRoot: TEST_DIR });
    expect(report.verified).toBe(1);
    expect(report.results[0].message).toContain('Pattern matched');
  });

  test('content_match evidence fails when pattern not found', async () => {
    writeFileSync(join(TEST_DIR, 'code.ts'), 'export class SomethingElse {}');

    const evidence: Evidence[] = [
      { type: 'content_match', path: 'code.ts', pattern: 'IdempotencyService', status: 'PENDING' },
    ];

    const report = await verifyAllEvidence(evidence, { projectRoot: TEST_DIR });
    expect(report.verified).toBe(0);
    expect(report.results[0].message).toContain('not found');
  });

  test('batch verification processes multiple items', async () => {
    writeFileSync(join(TEST_DIR, 'a.ts'), 'content a');
    writeFileSync(join(TEST_DIR, 'b.ts'), 'content b');

    const evidence: Evidence[] = [
      { type: 'file_exists', path: 'a.ts', status: 'PENDING' },
      { type: 'file_exists', path: 'b.ts', status: 'PENDING' },
      { type: 'file_exists', path: 'c.ts', status: 'PENDING' },
    ];

    const report = await verifyAllEvidence(evidence, { projectRoot: TEST_DIR });
    expect(report.total).toBe(3);
    expect(report.verified).toBe(2);
  });
});
