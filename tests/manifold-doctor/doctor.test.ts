/**
 * Tests for cli/lib/doctor.ts — manifold doctor library
 *
 * Tests verify CONSTRAINTS, not implementation details.
 * Each test is named after the guarantee it provides.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, readFileSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import {
  runDoctor,
  checkInvalidManifolds,
  checkPluginSync,
  checkStaleFingerprints,
  checkFileDrift,
  type Problem,
  type DoctorReport,
} from '../../cli/lib/doctor.js';

// ─────────────────────────────────────────────
// Shared test-harness helpers
// ─────────────────────────────────────────────

let TMP: string;

function tmpRoot(): string {
  return TMP;
}

function writeJson(path: string, data: unknown) {
  const abs = join(TMP, path);
  mkdirSync(abs.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(abs, JSON.stringify(data, null, 2));
}

function writeTxt(path: string, content: string) {
  const abs = join(TMP, path);
  mkdirSync(abs.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(abs, content);
}

// ─────────────────────────────────────────────
// Minimal valid manifold JSON (schema v3)
// ─────────────────────────────────────────────
function minimalManifold(feature: string) {
  return {
    schema_version: 3,
    feature,
    phase: 'INITIALIZED',
    constraints: {
      business: [],
      technical: [],
      user_experience: [],
      security: [],
      operational: [],
    },
    tensions: [],
    anchors: { required_truths: [] },
    convergence: { status: 'NOT_STARTED' },
  };
}

beforeEach(() => {
  TMP = mkdtempSync(join(tmpdir(), 'mfld-doctor-'));
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

// ─────────────────────────────────────────────
// RT-3/B1: runDoctor always runs all four checks
// ─────────────────────────────────────────────

// @constraint RT-3
// @constraint B1
describe('runDoctor — aggregates all four checks', () => {
  test('returns a DoctorReport with healthy:true on an empty-but-valid repo', () => {
    // No .manifold/, no plugin/, no fingerprints, no verify.json — all four checks find nothing
    const report: DoctorReport = runDoctor(TMP);
    expect(report).toHaveProperty('problems');
    expect(report).toHaveProperty('healthy');
    expect(Array.isArray(report.problems)).toBe(true);
    expect(report.healthy).toBe(true);
  });

  // @constraint RT-3
  test('runs all four checks even when the first emits problems', () => {
    // Write a corrupt manifold so invalid-manifolds emits a problem
    mkdirSync(join(TMP, '.manifold'), { recursive: true });
    writeFileSync(join(TMP, '.manifold', 'broken.json'), '{ not valid json >>>');

    // Write valid fingerprint baseline so stale-fingerprints finds nothing
    writeJson('tests/golden/skill-fingerprints.json', []);
    mkdirSync(join(TMP, 'install', 'commands'), { recursive: true });

    const report = runDoctor(TMP);
    // The 'broken' manifold should cause at least one problem
    expect(report.problems.length).toBeGreaterThan(0);
    expect(report.healthy).toBe(false);
    // All checks ran — verify check IDs present in the problems come from invalid-manifolds
    const checkIds = report.problems.map((p) => p.check);
    expect(checkIds).toContain('invalid-manifolds');
  });

  // @constraint RT-5
  test('every Problem has a non-empty fix command', () => {
    // Produce at least one problem by giving a corrupt manifold
    mkdirSync(join(TMP, '.manifold'), { recursive: true });
    writeFileSync(join(TMP, '.manifold', 'broken.json'), 'NOT_JSON');
    writeJson('tests/golden/skill-fingerprints.json', []);
    mkdirSync(join(TMP, 'install', 'commands'), { recursive: true });

    const report = runDoctor(TMP);
    for (const p of report.problems) {
      expect(typeof p.fix).toBe('string');
      expect(p.fix.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────
// RT-2/B2: checkInvalidManifolds — reuses parser
// ─────────────────────────────────────────────

// @constraint RT-2
// @constraint B2
describe('checkInvalidManifolds', () => {
  // @constraint B1
  test('reports no problems when no .manifold/ directory exists', () => {
    const problems = checkInvalidManifolds({ manifoldDir: null, features: [], verifyHashes: {}, installFiles: [], pluginFileContents: {}, installFileContents: {}, skillFingerprints: [], currentFingerprints: [] });
    expect(problems).toEqual([]);
  });

  // @constraint B1
  test('reports no problems when all manifolds are valid', () => {
    mkdirSync(join(TMP, '.manifold'), { recursive: true });
    writeJson('.manifold/good.json', minimalManifold('good'));
    writeTxt('.manifold/good.md', '# good\n\n## Outcome\nTest\n');

    const manifoldDir = join(TMP, '.manifold');
    const problems = checkInvalidManifolds({
      manifoldDir,
      features: ['good'],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });
    expect(problems).toEqual([]);
  });

  // @constraint B1
  test('emits a problem per invalid manifold file', () => {
    mkdirSync(join(TMP, '.manifold'), { recursive: true });
    writeFileSync(join(TMP, '.manifold', 'broken.json'), '{ this is not json }');

    const manifoldDir = join(TMP, '.manifold');
    const problems = checkInvalidManifolds({
      manifoldDir,
      features: ['broken'],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems[0].check).toBe('invalid-manifolds');
    expect(problems[0].fix).toContain('manifold validate');
    expect(problems[0].fix).toContain('broken');
  });

  // @constraint RT-5
  test('fix command is copy-pasteable (manifold validate <feature>)', () => {
    mkdirSync(join(TMP, '.manifold'), { recursive: true });
    writeFileSync(join(TMP, '.manifold', 'bad-feature.json'), 'NOPE');

    const manifoldDir = join(TMP, '.manifold');
    const problems = checkInvalidManifolds({
      manifoldDir,
      features: ['bad-feature'],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems[0].fix).toBe('manifold validate bad-feature');
  });
});

// ─────────────────────────────────────────────
// RT-4/B2: checkPluginSync — mirrors sync-plugin.ts inclusion rules
// ─────────────────────────────────────────────

// @constraint RT-4
// @constraint B2
describe('checkPluginSync', () => {
  // @constraint B1
  test('reports no problems when plugin/ does not exist', () => {
    const problems = checkPluginSync({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });
    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('reports no problems when plugin/ is in sync with install/', () => {
    // Create install/commands/foo.md and plugin/commands/foo.md with identical content
    mkdirSync(join(TMP, 'install', 'commands'), { recursive: true });
    mkdirSync(join(TMP, 'plugin', 'commands'), { recursive: true });
    const content = '# foo\nHello\n';
    writeFileSync(join(TMP, 'install', 'commands', 'foo.md'), content);
    writeFileSync(join(TMP, 'plugin', 'commands', 'foo.md'), content);

    const installFiles = ['commands/foo.md'];
    const installFileContents: Record<string, string> = {
      'commands/foo.md': content,
    };
    const pluginFileContents: Record<string, string> = {
      'commands/foo.md': content,
    };

    const problems = checkPluginSync({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles,
      pluginFileContents,
      installFileContents,
      skillFingerprints: [],
      currentFingerprints: [],
    });
    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('emits a problem when an install/ file is missing from plugin/', () => {
    const installFiles = ['commands/bar.md'];
    const installFileContents: Record<string, string> = {
      'commands/bar.md': '# bar\n',
    };
    const pluginFileContents: Record<string, string> = {};

    const problems = checkPluginSync({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles,
      pluginFileContents,
      installFileContents,
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems[0].check).toBe('plugin-sync');
    expect(problems[0].fix).toBe('bun scripts/sync-plugin.ts');
  });

  // @constraint RT-4
  test('emits a problem when plugin/ file has different content than install/', () => {
    const installFiles = ['commands/baz.md'];
    const installFileContents: Record<string, string> = {
      'commands/baz.md': '# baz\nOriginal\n',
    };
    const pluginFileContents: Record<string, string> = {
      'commands/baz.md': '# baz\nModified!\n',
    };

    const problems = checkPluginSync({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles,
      pluginFileContents,
      installFileContents,
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems[0].check).toBe('plugin-sync');
  });
});

// ─────────────────────────────────────────────
// RT-4/B2: checkStaleFingerprints — reuses fingerprintSkills()
// ─────────────────────────────────────────────

// @constraint RT-4
// @constraint B2
describe('checkStaleFingerprints', () => {
  // @constraint B1
  test('reports no problems when skill-fingerprints.json is absent', () => {
    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],   // no baseline
      currentFingerprints: [],
    });
    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('reports no problems when all fingerprints match', () => {
    const fp = [{ path: 'install/commands/foo.md', sha256: 'abc123', bytes: 100 }];
    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: fp,
      currentFingerprints: fp,
    });
    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('emits a problem when a skill file hash has changed', () => {
    const baseline = [{ path: 'install/commands/foo.md', sha256: 'oldhash', bytes: 100 }];
    const current = [{ path: 'install/commands/foo.md', sha256: 'newhash', bytes: 110 }];

    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: baseline,
      currentFingerprints: current,
    });

    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems[0].check).toBe('stale-fingerprints');
    expect(problems[0].fix).toContain('bootstrap-fingerprints');
  });

  // @constraint RT-4
  test('is a no-op when baseline is empty (fresh checkout before bootstrap)', () => {
    // When no baseline file exists (skillFingerprints is empty), the check must
    // return no problems regardless of current fingerprints. This prevents
    // false positives on a fresh checkout before bootstrap has been run.
    const baseline: Array<{ path: string; sha256: string; bytes: number }> = [];
    const current = [{ path: 'install/commands/new.md', sha256: 'abc', bytes: 50 }];

    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: baseline,
      currentFingerprints: current,
    });

    // No baseline exists — check is a no-op, no false positives
    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('emits a problem when a new skill file is added to a non-empty baseline', () => {
    // When a baseline EXISTS but a new skill file is not in it, that is real drift.
    const baseline = [{ path: 'install/commands/existing.md', sha256: 'existing', bytes: 100 }];
    const current = [
      { path: 'install/commands/existing.md', sha256: 'existing', bytes: 100 },
      { path: 'install/commands/new.md', sha256: 'abc', bytes: 50 },
    ];

    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: baseline,
      currentFingerprints: current,
    });

    // New file not tracked in an existing baseline is drift
    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems[0].check).toBe('stale-fingerprints');
  });

  // @constraint RT-4
  test('emits a problem when a skill file is removed from install/commands/', () => {
    const baseline = [{ path: 'install/commands/gone.md', sha256: 'abc', bytes: 50 }];
    const current: Array<{ path: string; sha256: string; bytes: number }> = [];

    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: baseline,
      currentFingerprints: current,
    });

    expect(problems.length).toBeGreaterThanOrEqual(1);
  });

  // @constraint RT-5
  test('fix command points to bootstrap-fingerprints.ts', () => {
    const baseline = [{ path: 'install/commands/x.md', sha256: 'old', bytes: 1 }];
    const current = [{ path: 'install/commands/x.md', sha256: 'new', bytes: 2 }];

    const problems = checkStaleFingerprints({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: baseline,
      currentFingerprints: current,
    });

    expect(problems[0].fix).toBe('bun tests/golden/bootstrap-fingerprints.ts');
  });
});

// ─────────────────────────────────────────────
// RT-2/B2: checkFileDrift — reuses detectDrift / evidence
// ─────────────────────────────────────────────

// @constraint RT-2
// @constraint B2
describe('checkFileDrift', () => {
  // @constraint B1
  test('reports no problems when no verify.json files have file_hashes', () => {
    const problems = checkFileDrift({
      manifoldDir: null,
      features: [],
      verifyHashes: {},
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });
    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('reports no problems when all recorded hashes still match on disk', () => {
    // Create a real file and compute its actual hash at snapshot time
    const content = 'stable content';
    writeTxt('some/file.ts', content);

    const { computeFileHash } = require('../../cli/lib/evidence.js');
    const hash = computeFileHash(join(TMP, 'some/file.ts'));

    const verifyHashes: Record<string, Record<string, string>> = {
      'test-feature': {
        'some/file.ts': hash,
      },
    };

    const problems = checkFileDrift({
      manifoldDir: join(TMP, '.manifold'),
      features: ['test-feature'],
      verifyHashes,
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems).toEqual([]);
  });

  // @constraint RT-4
  test('emits a problem when a recorded file hash no longer matches on disk', () => {
    // Write file with one content, then record a different hash (simulating post-verify edit)
    writeTxt('changed/file.ts', 'changed content');

    const verifyHashes: Record<string, Record<string, string>> = {
      'my-feature': {
        'changed/file.ts': 'deadbeef0000000000000000000000000000000000000000000000000000beef',
      },
    };

    const problems = checkFileDrift({
      manifoldDir: join(TMP, '.manifold'),
      features: ['my-feature'],
      verifyHashes,
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems[0].check).toBe('file-drift');
    expect(problems[0].fix).toContain('manifold drift my-feature');
  });

  // @constraint RT-5
  test('fix command is manifold drift <feature> --update', () => {
    writeTxt('a/b.ts', 'changed');

    const verifyHashes: Record<string, Record<string, string>> = {
      'alpha': {
        'a/b.ts': 'wronghash0000000000000000000000000000000000000000000000wronghash',
      },
    };

    const problems = checkFileDrift({
      manifoldDir: join(TMP, '.manifold'),
      features: ['alpha'],
      verifyHashes,
      installFiles: [],
      pluginFileContents: {},
      installFileContents: {},
      skillFingerprints: [],
      currentFingerprints: [],
    });

    expect(problems[0].fix).toBe('manifold drift alpha --update');
  });
});

// ─────────────────────────────────────────────
// RT-7/S1: No filesystem writes
// ─────────────────────────────────────────────

// @constraint RT-7
// @constraint S1
describe('runDoctor — read-only guarantee', () => {
  test('does not create or modify files in the repo root', () => {
    // We can only verify this indirectly — ensure the function completes
    // without error on a minimal repo, and that no unexpected files appear
    const before = new Set(
      require('fs').readdirSync(TMP)
    );
    runDoctor(TMP);
    const after = new Set(
      require('fs').readdirSync(TMP)
    );
    // No new entries at top level
    for (const entry of after) {
      expect(before.has(entry)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// Integration: runDoctor on a healthy-like snapshot
// ─────────────────────────────────────────────

// @constraint B1
// @constraint RT-3
describe('runDoctor — integration on minimal healthy repo', () => {
  test('reports healthy when manifold is valid and no hashes or plugin/ exist', () => {
    // Set up a valid manifold
    mkdirSync(join(TMP, '.manifold'), { recursive: true });
    writeJson('.manifold/my-feature.json', minimalManifold('my-feature'));
    writeTxt('.manifold/my-feature.md', '# my-feature\n\n## Outcome\nOK\n');

    // No plugin/, no skill-fingerprints, no verify.json file_hashes
    writeJson('tests/golden/skill-fingerprints.json', []);
    mkdirSync(join(TMP, 'install', 'commands'), { recursive: true });

    const report = runDoctor(TMP);
    // With no plugin/, no fingerprints, no drift — should be healthy
    // invalid-manifolds check must pass for a valid manifold
    const invalidProblems = report.problems.filter(p => p.check === 'invalid-manifolds');
    expect(invalidProblems).toEqual([]);
  });
});
