import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..');
const SELECTOR = join(REPO_ROOT, 'scripts', 'select-manifolds.sh');

function select(dir: string): { names: string[]; exitCode: number } {
  const proc = Bun.spawnSync([SELECTOR, dir], { cwd: REPO_ROOT });
  const stdout = proc.stdout.toString().trim();
  return {
    names: stdout === '' ? [] : stdout.split('\n'),
    exitCode: proc.exitCode ?? 1,
  };
}

function fixture(files: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'manifold-select-'));
  for (const name of files) {
    writeFileSync(join(dir, name), '');
  }
  return dir;
}

describe('select-manifolds', () => {
  test('selects JSON+Markdown manifests, not just YAML', () => {
    const dir = fixture(['alpha.json', 'alpha.md', 'beta.yaml']);
    try {
      expect(select(dir).names).toEqual(['alpha', 'beta']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('excludes anchor, verify and integrate sidecars', () => {
    const dir = fixture([
      'alpha.json',
      'alpha.verify.json',
      'alpha.anchor.yaml',
      'alpha.integrate.yaml',
    ]);
    try {
      expect(select(dir).names).toEqual(['alpha']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('ignores .backup files and deduplicates dual-format features', () => {
    const dir = fixture(['alpha.json', 'alpha.yaml', 'alpha.yaml.backup']);
    try {
      expect(select(dir).names).toEqual(['alpha']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('emits nothing for a directory with no feature manifests', () => {
    // The workflow turns this into a hard failure. A verification step that
    // finds nothing to verify must not report success.
    const dir = fixture(['only.anchor.yaml', 'notes.md']);
    try {
      expect(select(dir).names).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('fails when the manifold directory does not exist', () => {
    expect(select(join(tmpdir(), 'manifold-select-does-not-exist')).exitCode).not.toBe(0);
  });

  test("selects every feature in this repo's .manifold directory", () => {
    // Regression pin for DHA-27: the workflow globbed `.manifold/*.yaml` and
    // selected exactly one name (schema-enforcement.integrate) out of 22.
    const { names } = select(join(REPO_ROOT, '.manifold'));

    expect(names.length).toBeGreaterThanOrEqual(22);
    expect(names).toContain('manifold-cli');
    expect(names).toContain('v2-release');
    expect(names).not.toContain('schema-enforcement.integrate');
    expect(names.filter((n) => /\.(anchor|verify|integrate)$/.test(n))).toEqual([]);
  });
});
