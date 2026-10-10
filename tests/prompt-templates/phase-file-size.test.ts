/**
 * Every phase skill file (m0-init.md .. m6-integrate.md) must stay at or under 400 lines.
 *
 * Satisfies: reduce-context-rot T2 (phase skill file ≤ 400 lines).
 *
 * Why this test exists: T2 was verified SATISFIED at a max of 318 lines and then silently
 * breached — m4-generate.md reached 404 lines through incremental edits, and nothing failed.
 * The only size gate in the suite was m3-size.test.ts, which covers m3-anchor.md alone.
 * A boundary constraint with no automated gate is a boundary that drifts.
 */
import { describe, test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const CEILING = 400;

const PHASE_FILES = [
  'm0-init.md',
  'm1-constrain.md',
  'm2-tension.md',
  'm3-anchor.md',
  'm4-generate.md',
  'm5-verify.md',
  'm6-integrate.md',
];

const commandsDir = join(process.cwd(), 'install', 'commands');

describe('phase skill file size ceiling (T2)', () => {
  for (const file of PHASE_FILES) {
    test(`${file} exists`, () => {
      expect(existsSync(join(commandsDir, file))).toBe(true);
    });

    test(`${file} is ≤ ${CEILING} lines`, () => {
      const lines = readFileSync(join(commandsDir, file), 'utf-8').split('\n').length;
      expect(lines).toBeLessThanOrEqual(CEILING);
    });
  }
});
