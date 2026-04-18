/**
 * Tests for Manifold Phase-Commons Hook
 * Satisfies: RT-1 (context injection), T1 (disk reads), T5 (smart delta)
 *
 * Tests the UserPromptSubmit hook:
 * - Detects /manifold:m* commands and injects context
 * - Smart delta: different content per phase
 * - Silent for non-manifold prompts
 * - Handles missing manifold files gracefully
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(import.meta.dir, '../../cli/index.ts');

async function runHook(
  cwd: string,
  prompt: string,
): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', 'run', CLI_PATH, 'hook', 'phase-commons'], {
    cwd,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  proc.stdin.write(JSON.stringify({ prompt }));
  proc.stdin.end();

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
}

function parseOutput(stdout: string): any | null {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

describe('phase-commons hook', () => {
  const testDir = join(import.meta.dir, '__test-phase-commons__');
  const manifoldDir = join(testDir, '.manifold');

  const sampleJson = {
    $schema: 'https://raw.githubusercontent.com/dhanesh/manifold/main/install/manifold-structure.schema.json',
    schema_version: 3,
    feature: 'test-feature',
    phase: 'CONSTRAINED',
    domain: 'software',
    constraints: {
      business: [{ id: 'B1', type: 'invariant' }],
      technical: [{ id: 'T1', type: 'boundary' }, { id: 'T2', type: 'goal' }],
      user_experience: [],
      security: [],
      operational: [],
    },
    tensions: [],
    anchors: { required_truths: [] },
    iterations: [],
    convergence: { status: 'NOT_STARTED' },
  };

  beforeAll(() => {
    mkdirSync(manifoldDir, { recursive: true });
    writeFileSync(join(manifoldDir, 'test-feature.json'), JSON.stringify(sampleJson, null, 2));
    writeFileSync(join(manifoldDir, 'test-feature.md'), '# test-feature\n\n## Outcome\nTest outcome\n');
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('exits 0 always', async () => {
    const { exitCode } = await runHook(testDir, '/manifold:m2-tension test-feature');
    expect(exitCode).toBe(0);
  });

  test('emits additionalContext for manifold phase commands', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m2-tension test-feature');
    const output = parseOutput(stdout);
    expect(output).not.toBeNull();
    expect(output.additionalContext).toBeDefined();
    expect(output.additionalContext).toContain('MANIFOLD PHASE CONTEXT');
  });

  test('includes feature name and phase', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m2-tension test-feature');
    const output = parseOutput(stdout);
    expect(output.additionalContext).toContain('test-feature');
    expect(output.additionalContext).toContain('CONSTRAINED');
  });

  test('includes constraint summary', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m2-tension test-feature');
    const ctx = parseOutput(stdout).additionalContext;
    expect(ctx).toContain('B:1');
    expect(ctx).toContain('T:2');
    expect(ctx).toContain('3 total');
  });

  test('includes shared directives', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m2-tension test-feature');
    const ctx = parseOutput(stdout).additionalContext;
    expect(ctx).toContain('DIRECTIVES');
    expect(ctx).toContain('manifold validate');
    expect(ctx).toContain('AskUserQuestion');
  });

  test('smart delta: m2 references Constraints section from MD', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m2-tension test-feature');
    const ctx = parseOutput(stdout).additionalContext;
    expect(ctx).toContain('## Constraints');
    expect(ctx).not.toContain('## Required Truths');
  });

  test('smart delta: m4 references Required Truths and Solution Space', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m4-generate test-feature');
    const ctx = parseOutput(stdout).additionalContext;
    expect(ctx).toContain('Required Truths');
    expect(ctx).toContain('Solution Space');
  });

  test('silent for non-manifold prompts', async () => {
    const { stdout, exitCode } = await runHook(testDir, 'just a regular question');
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('silent for m0-init (creates new, no existing state)', async () => {
    const { stdout, exitCode } = await runHook(testDir, '/manifold:m0-init new-feature');
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('silent when manifold file does not exist', async () => {
    const { stdout, exitCode } = await runHook(testDir, '/manifold:m2-tension nonexistent');
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
  });

  test('handles m-status without feature (all features)', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m-status');
    const output = parseOutput(stdout);
    expect(output.additionalContext).toContain('Active manifolds');
    expect(output.additionalContext).toContain('test-feature');
  });

  test('handles flags after feature name', async () => {
    const { stdout } = await runHook(testDir, '/manifold:m4-generate test-feature --option=A');
    const output = parseOutput(stdout);
    expect(output.additionalContext).toContain('test-feature');
  });

  test('completes within 5 seconds', async () => {
    const start = Date.now();
    await runHook(testDir, '/manifold:m2-tension test-feature');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
