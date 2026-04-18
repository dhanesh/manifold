/**
 * Audit: m5-verify.md mandates unconditional `.verify.json` emission.
 *
 * Satisfies: RT-5 (m5 always writes .verify.json), B5 (verify artifact exists whenever m5 runs).
 *
 * Eval-report evidence: ai-workshop-showcase has phase=VERIFIED but no .verify.json — m5 gated the
 * write on a conditional path the non-software flow didn't trip. After EDIT, m5 must emit unconditionally.
 */
import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const M5 = readFileSync(
  join(process.cwd(), 'install', 'commands', 'm5-verify.md'),
  'utf-8',
);

describe('m5-verify.md always-emit .verify.json', () => {
  test('contains explicit always-emit language', () => {
    // Accepts any of: "always write", "always emit", "unconditionally", "regardless of"
    const hasAlwaysLanguage =
      /always\s+(write|emit|produce|output)[\s\S]{0,80}\.verify\.json/i.test(M5) ||
      /unconditional/i.test(M5) ||
      /regardless of[\s\S]{0,80}\.verify\.json/i.test(M5);
    expect(hasAlwaysLanguage).toBe(true);
  });

  test('clarifies that blockers do not suppress the artifact', () => {
    // After EDIT, the skill must say blockers keep phase at GENERATED while still writing the file.
    const hasBlockerDistinction =
      /blocker[\s\S]{0,200}(GENERATED|still\s+writ|artifact\s+presence)/i.test(M5);
    expect(hasBlockerDistinction).toBe(true);
  });
});
