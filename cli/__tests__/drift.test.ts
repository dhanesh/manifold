/**
 * Tests for Drift Detection Command
 * Satisfies: T7 (drift detection), T3 (Unix exit codes), RT-7
 *
 * G3: Covers drift command exit codes, output formats, hash management
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { computeFileHash, detectDrift } from '../lib/evidence.js';

// ============================================================
// Test Setup
// ============================================================

const TEST_DIR = join(import.meta.dir, '__drift_test_tmp__');
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
// Drift Detection Core Logic Tests
// ============================================================

describe('drift detection logic', () => {
  test('exit code 0: no drift when all hashes match', () => {
    const file = join(TEST_DIR, 'stable.ts');
    writeFileSync(file, 'export const x = 1;');
    const hash = computeFileHash(file)!;

    const report = detectDrift(
      [{ path: 'stable.ts', file_hash: hash, satisfies: ['B1'] }],
      TEST_DIR
    );

    // Exit code 0 = clean (no drift)
    expect(report.drifted).toHaveLength(0);
    expect(report.clean).toBe(1);
  });

  test('exit code 2: drift detected when file modified', () => {
    const file = join(TEST_DIR, 'modified.ts');
    writeFileSync(file, 'original');
    const hash = computeFileHash(file)!;
    writeFileSync(file, 'changed');

    const report = detectDrift(
      [{ path: 'modified.ts', file_hash: hash, satisfies: ['T1'] }],
      TEST_DIR
    );

    // Exit code 2 = drift detected
    const exitCode = report.drifted.length > 0 ? 2 : 0;
    expect(exitCode).toBe(2);
    expect(report.drifted).toHaveLength(1);
  });

  test('reports affected constraint IDs', () => {
    const file = join(TEST_DIR, 'tracked.ts');
    writeFileSync(file, 'v1');
    const hash = computeFileHash(file)!;
    writeFileSync(file, 'v2');

    const report = detectDrift(
      [{ path: 'tracked.ts', file_hash: hash, satisfies: ['B1', 'T2', 'S1'] }],
      TEST_DIR
    );

    expect(report.drifted[0].constraint_ids).toEqual(['B1', 'T2', 'S1']);
  });
});

// ============================================================
// JSON Output Format Tests
// ============================================================

describe('drift JSON output', () => {
  test('drift report has required fields', () => {
    const report = detectDrift([], TEST_DIR);

    expect(report).toHaveProperty('drifted');
    expect(report).toHaveProperty('clean');
    expect(report).toHaveProperty('timestamp');
    expect(Array.isArray(report.drifted)).toBe(true);
    expect(typeof report.clean).toBe('number');
  });

  test('drift entry has required fields', () => {
    const file = join(TEST_DIR, 'entry.ts');
    writeFileSync(file, 'v1');
    const hash = computeFileHash(file)!;
    writeFileSync(file, 'v2');

    const report = detectDrift(
      [{ path: 'entry.ts', file_hash: hash, satisfies: ['B1'] }],
      TEST_DIR
    );

    const entry = report.drifted[0];
    expect(entry).toHaveProperty('path');
    expect(entry).toHaveProperty('constraint_ids');
    expect(entry).toHaveProperty('old_hash');
    expect(entry).toHaveProperty('new_hash');
    expect(entry.path).toBe('entry.ts');
    expect(entry.old_hash).toBe(hash);
    expect(entry.new_hash).not.toBe(hash);
  });
});

// ============================================================
// Hash Update Tests (--update flag behavior)
// ============================================================

describe('hash update behavior', () => {
  test('computeFileHash produces stable hashes', () => {
    const file = join(TEST_DIR, 'stable.ts');
    writeFileSync(file, 'stable content');

    const hash1 = computeFileHash(file);
    const hash2 = computeFileHash(file);
    expect(hash1).toBe(hash2);
  });

  test('hash changes when file content changes', () => {
    const file = join(TEST_DIR, 'changing.ts');
    writeFileSync(file, 'version 1');
    const hash1 = computeFileHash(file)!;

    writeFileSync(file, 'version 2');
    const hash2 = computeFileHash(file)!;

    expect(hash1).not.toBe(hash2);
  });

  test('verify.json can store and load file hashes', () => {
    const file = join(TEST_DIR, 'artifact.ts');
    writeFileSync(file, 'content');
    const hash = computeFileHash(file)!;

    // Simulate --update storing hashes in verify.json
    const verifyPath = join(MANIFOLD_DIR, 'test-feature.verify.json');
    const verifyData = {
      file_hashes: { 'artifact.ts': hash },
      hashes_updated_at: new Date().toISOString(),
    };
    writeFileSync(verifyPath, JSON.stringify(verifyData));

    // Read back and verify
    const loaded = JSON.parse(readFileSync(verifyPath, 'utf-8'));
    expect(loaded.file_hashes['artifact.ts']).toBe(hash);
    expect(loaded.hashes_updated_at).toBeTruthy();
  });
});

// ============================================================
// Edge Cases
// ============================================================

describe('drift edge cases', () => {
  test('handles empty artifact list', () => {
    const report = detectDrift([], TEST_DIR);
    expect(report.drifted).toHaveLength(0);
    expect(report.clean).toBe(0);
  });

  test('handles artifacts without satisfies array', () => {
    const file = join(TEST_DIR, 'no-satisfies.ts');
    writeFileSync(file, 'v1');
    const hash = computeFileHash(file)!;
    writeFileSync(file, 'v2');

    const report = detectDrift(
      [{ path: 'no-satisfies.ts', file_hash: hash }],
      TEST_DIR
    );

    expect(report.drifted).toHaveLength(1);
    expect(report.drifted[0].constraint_ids).toEqual([]);
  });

  test('deleted file shows <deleted> as new hash', () => {
    const report = detectDrift(
      [{ path: 'gone.ts', file_hash: 'abc123def456', satisfies: ['B1'] }],
      TEST_DIR
    );

    expect(report.drifted).toHaveLength(1);
    expect(report.drifted[0].new_hash).toBe('<deleted>');
  });

  test('binary files produce valid hashes', () => {
    const file = join(TEST_DIR, 'binary.bin');
    writeFileSync(file, Buffer.from([0x00, 0x01, 0x02, 0xff]));

    const hash = computeFileHash(file);
    expect(hash).not.toBeNull();
    expect(hash).toHaveLength(64);
  });
});
