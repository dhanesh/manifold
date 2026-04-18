/**
 * Skill-text fingerprint sentinel.
 *
 * If this test fails, a file in install/commands/ changed without the expected
 * fingerprint being updated. Either revert the change or run:
 *
 *   bun tests/golden/bootstrap-fingerprints.ts
 *
 * The regeneration step forces human review of the diff — the whole point of
 * the sentinel is that accidental edits surface loudly.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fingerprintSkills, type SkillFingerprint } from "./fingerprint";

const expectedPath = join(resolve(import.meta.dir, "../.."), "tests/golden/skill-fingerprints.json");

describe("skill fingerprints", () => {
  if (!existsSync(expectedPath)) {
    test.skip("no fingerprint baseline — run bootstrap-fingerprints.ts", () => {});
    return;
  }

  const expected = JSON.parse(readFileSync(expectedPath, "utf-8")) as SkillFingerprint[];
  const expectedByPath = new Map(expected.map((f) => [f.path, f]));
  const actual = fingerprintSkills();
  const actualByPath = new Map(actual.map((f) => [f.path, f]));

  test("no skill was added without fingerprinting", () => {
    const unexpected = actual.filter((f) => !expectedByPath.has(f.path));
    expect(unexpected.map((f) => f.path)).toEqual([]);
  });

  test("no skill was removed without updating fingerprints", () => {
    const missing = expected.filter((f) => !actualByPath.has(f.path));
    expect(missing.map((f) => f.path)).toEqual([]);
  });

  test("each skill's content matches its recorded fingerprint", () => {
    const drift: string[] = [];
    for (const exp of expected) {
      const act = actualByPath.get(exp.path);
      if (!act) continue; // covered by separate test
      if (act.sha256 !== exp.sha256) {
        drift.push(`${exp.path}  expected ${exp.sha256.slice(0, 12)}  got ${act.sha256.slice(0, 12)}`);
      }
    }
    expect(drift).toEqual([]);
  });
});
