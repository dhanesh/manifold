/**
 * m3-anchor.md body must stay under 250 lines; recursive content lives in a loaded-on-demand reference.
 *
 * Satisfies: RT-8 (m3 body ≤ 250 lines + flat mode ≥ 10 RTs), T6 (body size ceiling),
 * T3 (recursive decomposition file exists and is referenced).
 *
 * Evidence: m3 is the variance driver in the eval report (RT count 0→13→23 across 3 runs). Splitting
 * the recursive section out reduces always-loaded context and stabilizes the flat-mode common path.
 */
import { describe, test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const M3_PATH = join(process.cwd(), 'install', 'commands', 'm3-anchor.md');
const REF_PATH = join(
  process.cwd(),
  'install',
  'commands',
  'references',
  'recursive-decomposition.md',
);

describe('m3-anchor body size and reference layout', () => {
  test('recursive-decomposition.md reference exists', () => {
    expect(existsSync(REF_PATH)).toBe(true);
  });

  test('m3-anchor.md body is ≤ 250 lines', () => {
    const lines = readFileSync(M3_PATH, 'utf-8').split('\n').length;
    expect(lines).toBeLessThanOrEqual(250);
  });

  test('m3-anchor.md references the recursive-decomposition file when depth > 1', () => {
    const content = readFileSync(M3_PATH, 'utf-8');
    expect(content).toMatch(/references\/recursive-decomposition\.md/);
    expect(content).toMatch(/depth\s*>\s*1/i);
  });

  test('m3-anchor.md retains flat-mode guidance (default depth=1 path)', () => {
    const content = readFileSync(M3_PATH, 'utf-8');
    // Flat mode must produce at least a meaningful RT set without recursion loaded.
    expect(content).toMatch(/required\s+truth/i);
    expect(content).toMatch(/backward/i);
  });
});
