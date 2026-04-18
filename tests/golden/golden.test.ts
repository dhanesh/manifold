/**
 * Bun test wrapper around the golden-file regression runner.
 *
 * One test per fixture. Each loads the recorded golden signature and compares
 * against the current .manifold/<feature>.* files. A failure means either:
 *   - The manifold was hand-edited in a way that regressed its structural shape
 *   - The fixture's tolerance bands were too tight
 *
 * To add a new fixture:
 *   1. Create tests/golden/fixtures/<feature>.yaml
 *   2. Run: bun tests/golden/bootstrap.ts <feature>
 *   3. Commit both the fixture and the generated golden
 */

import { describe, test, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYaml } from "yaml";
import { extractSignature, type Signature } from "./signature";
import { compareSignatures, type ToleranceMap } from "./compare";

const root = resolve(import.meta.dir, "../..");
const fixturesDir = join(root, "tests/golden/fixtures");
const goldenDir = join(root, "tests/golden/goldens");
const manifoldDir = join(root, ".manifold");

interface FixtureSpec {
  feature: string;
  must_have_keywords?: string[];
  tolerance?: ToleranceMap;
}

const fixtures = existsSync(fixturesDir)
  ? readdirSync(fixturesDir)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.replace(/\.yaml$/, ""))
  : [];

describe("golden regression", () => {
  if (fixtures.length === 0) {
    test.skip("no fixtures declared", () => {});
    return;
  }

  for (const feature of fixtures) {
    test(feature, () => {
      const fixture = parseYaml(readFileSync(join(fixturesDir, `${feature}.yaml`), "utf-8")) as FixtureSpec;
      const goldenPath = join(goldenDir, `${feature}.json`);
      if (!existsSync(goldenPath)) {
        throw new Error(
          `Golden missing for ${feature}. Run: bun tests/golden/bootstrap.ts ${feature}`
        );
      }
      const golden = JSON.parse(readFileSync(goldenPath, "utf-8")) as Signature;
      const actual = extractSignature(manifoldDir, fixture.feature, fixture.must_have_keywords ?? []);
      const diffs = compareSignatures(golden, actual, fixture.tolerance ?? {});

      if (diffs.length > 0) {
        const report = diffs
          .map((d) => `  ${d.path} — ${d.reason} [rule: ${d.rule}]`)
          .join("\n");
        throw new Error(`${diffs.length} signature drift(s):\n${report}`);
      }

      expect(diffs.length).toBe(0);
    });
  }
});
