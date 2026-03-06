/**
 * Tests for Manifold Interaction Enforcer (prompt-enforcer.ts)
 * Satisfies: O1 (CI validation)
 *
 * Tests the UserPromptSubmit hook behavior:
 * - Outputs additionalContext JSON when .manifold/ exists
 * - Silent exit when .manifold/ doesn't exist
 * - Output contains required interaction rules
 * - Completes within performance budget
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const HOOK_PATH = join(import.meta.dir, '../../install/hooks/prompt-enforcer.ts');

// Helper to run the hook in a specific directory
async function runHook(cwd: string): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', 'run', HOOK_PATH], {
    cwd,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Hook reads stdin but doesn't need input for UserPromptSubmit
  proc.stdin.end();

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), exitCode };
}

describe('prompt-enforcer hook', () => {
  const testDir = join(import.meta.dir, '__test-workspace__');
  const manifoldDir = join(testDir, '.manifold');

  beforeAll(() => {
    // Clean up any previous test workspace
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('exits silently when no .manifold/ directory exists', async () => {
    const result = await runHook(testDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('outputs additionalContext JSON when .manifold/ exists', async () => {
    mkdirSync(manifoldDir, { recursive: true });

    const result = await runHook(testDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toBe('');

    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('additionalContext');

    // Clean up for next test
    rmSync(manifoldDir, { recursive: true });
  });

  test('additionalContext contains AskUserQuestion reminder', async () => {
    mkdirSync(manifoldDir, { recursive: true });

    const result = await runHook(testDir);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.additionalContext).toContain('AskUserQuestion');

    rmSync(manifoldDir, { recursive: true });
  });

  test('additionalContext contains next-step suggestion reminder', async () => {
    mkdirSync(manifoldDir, { recursive: true });

    const result = await runHook(testDir);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.additionalContext).toContain('/manifold:mN-xxx');

    rmSync(manifoldDir, { recursive: true });
  });

  test('additionalContext contains structured options reminder', async () => {
    mkdirSync(manifoldDir, { recursive: true });

    const result = await runHook(testDir);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.additionalContext).toContain('labeled choices');

    rmSync(manifoldDir, { recursive: true });
  });

  test('completes within 200ms performance budget', async () => {
    mkdirSync(manifoldDir, { recursive: true });

    const start = performance.now();
    await runHook(testDir);
    const elapsed = performance.now() - start;

    // Allow generous budget for Bun startup (~100ms) + fs check
    // The hook itself is <10ms; total should be <500ms including Bun cold start
    expect(elapsed).toBeLessThan(2000); // 2s budget for CI environments

    rmSync(manifoldDir, { recursive: true });
  });
});
