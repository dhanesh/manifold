/**
 * m0-init non-software branch content audit.
 *
 * Satisfies: RT-4 (m0-init has effective non-software branch), B1 (non-software validates),
 * O1 (prompt templates carry non-software guidance).
 *
 * The eval report (tests/golden/prompt-eval-report.md, P0 "non-software domain branch") observed that
 * the model keeps software category keys and only renames IDs. This test asserts m0-init.md
 * explicitly instructs the model to use the non-software category keys in JSON.
 */
import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const M0 = readFileSync(
  join(process.cwd(), 'install', 'commands', 'm0-init.md'),
  'utf-8',
);

describe('m0-init.md non-software branch', () => {
  test('mentions non-software domain flag', () => {
    expect(M0).toContain('--domain=non-software');
  });

  test('mentions all five universal categories', () => {
    for (const key of ['obligations', 'desires', 'resources', 'risks', 'dependencies']) {
      expect(M0.toLowerCase()).toContain(key);
    }
  });

  test('instructs to use non-software category keys in JSON (not just IDs)', () => {
    // This is the key fix: current prompt suggests ID mapping, which produced hybrid broken state.
    // After EDIT, m0-init must say non-software manifolds use {obligations,desires,resources,risks,dependencies}
    // as the literal JSON keys under `constraints`, not {business,technical,...}.
    const hasJsonKeyGuidance =
      /non-software[\s\S]{0,500}(constraints\s*:\s*\{[\s\S]{0,200}(obligations|desires|resources|risks|dependencies))/i.test(
        M0,
      );
    expect(hasJsonKeyGuidance).toBe(true);
  });

  test('non-software ID prefixes are specified (OB/D/R/RK/DP)', () => {
    const idPrefixes = ['OB1', 'D1', 'R1', 'RK1', 'DP1'];
    for (const p of idPrefixes) {
      expect(M0).toContain(p);
    }
  });
});
