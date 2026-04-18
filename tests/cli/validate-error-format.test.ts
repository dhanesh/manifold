/**
 * Validate-error format test: CLI surfaces field path + required pattern so non-software mistakes
 * are self-diagnosable.
 *
 * Satisfies: RT-9 (validate errors actionable), U1 (user can fix schema failures without reading source).
 *
 * A user who writes the wrong category keys should see:
 *   constraints: Invalid discriminator value. Expected 'software' | 'non-software' (on domain)
 *   OR
 *   constraints.business: Unrecognized key (when domain=non-software)
 */
import { describe, test, expect } from 'bun:test';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TMP = join(tmpdir(), `manifold-valerr-${Date.now()}`);
const MANIFOLD_DIR = join(TMP, '.manifold');
// Run via `bun cli/index.ts` so the test doesn't depend on a locally compiled
// binary (which fails on macOS Sequoia gatekeeper without codesigning). End
// users get signed binaries from GitHub releases.
const CLI = `bun ${join(process.cwd(), 'cli', 'index.ts')}`;

const badCrossover = {
  $schema:
    'https://raw.githubusercontent.com/dhanesh/manifold/main/install/manifold-structure.schema.json',
  schema_version: 3,
  feature: 'bad-crossover',
  phase: 'INITIALIZED',
  domain: 'non-software',
  created: '2026-04-18T00:00:00Z',
  // mixing software keys into a non-software manifold — must fail with a useful message
  constraints: {
    business: [{ id: 'B1', type: 'invariant' }],
    technical: [],
    user_experience: [],
    security: [],
    operational: [],
  },
  tensions: [],
  anchors: { required_truths: [] },
  iterations: [],
  convergence: { status: 'NOT_STARTED' },
};

const mdStub = `# bad-crossover\n\n## Outcome\nx\n`;

describe('cli validate error messages', () => {
  test('non-software manifold with software keys produces an actionable error', () => {
    mkdirSync(MANIFOLD_DIR, { recursive: true });
    writeFileSync(
      join(MANIFOLD_DIR, 'bad-crossover.json'),
      JSON.stringify(badCrossover, null, 2),
    );
    writeFileSync(join(MANIFOLD_DIR, 'bad-crossover.md'), mdStub);

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    try {
      stdout = execSync(`${CLI} validate bad-crossover`, {
        cwd: TMP,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e: any) {
      exitCode = e.status ?? 1;
      stdout = e.stdout?.toString?.() ?? '';
      stderr = e.stderr?.toString?.() ?? '';
    }

    const combined = stdout + stderr;
    expect(exitCode).toBeGreaterThan(0);
    // Must mention the offending field path or key
    expect(combined).toMatch(/constraints|domain|obligations|business/i);

    rmSync(TMP, { recursive: true, force: true });
  });
});
