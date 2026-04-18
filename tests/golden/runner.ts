#!/usr/bin/env bun
/**
 * Golden-file regression runner.
 *
 * Phase 1 (current): compares the signature of the CURRENT .manifold/<feature>.*
 * files against the recorded golden. Useful to validate that hand edits to a
 * verified manifold didn't regress its structural properties, and as a smoke
 * test before Phase 2's harness runs.
 *
 * Phase 2 (planned): will invoke `claude -p` subprocess-per-phase to regenerate
 * the manifold from scratch and compare that output against golden. Pilot: 3
 * runs to calibrate tolerance bands.
 *
 * Usage:
 *   bun tests/golden/runner.ts               # compares all fixtures
 *   bun tests/golden/runner.ts <feature>     # compares one fixture
 *
 * Exit 0 = all pass; 1 = one or more diffs detected.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYaml } from "yaml";
import { extractSignature, type Signature } from "./signature";
import { compareSignatures, type Diff, type ToleranceMap } from "./compare";

const root = resolve(import.meta.dir, "../..");
const fixturesDir = join(root, "tests/golden/fixtures");
const goldenDir = join(root, "tests/golden/goldens");
const manifoldDir = join(root, ".manifold");

interface FixtureSpec {
  feature: string;
  outcome: string;
  must_have_keywords?: string[];
  tolerance?: ToleranceMap;
}

function loadFixture(feature: string): FixtureSpec {
  const path = join(fixturesDir, `${feature}.yaml`);
  if (!existsSync(path)) throw new Error(`Fixture not found: ${path}`);
  return parseYaml(readFileSync(path, "utf-8")) as FixtureSpec;
}

function loadGolden(feature: string): Signature {
  const path = join(goldenDir, `${feature}.json`);
  if (!existsSync(path)) {
    throw new Error(`Golden not found: ${path}\n  Run: bun tests/golden/bootstrap.ts ${feature}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as Signature;
}

function formatDiff(d: Diff): string {
  return `  × ${d.path}\n      rule:   ${d.rule}\n      reason: ${d.reason}\n      golden: ${JSON.stringify(d.golden)}\n      actual: ${JSON.stringify(d.actual)}`;
}

function runOne(feature: string): { passed: boolean; diffs: Diff[] } {
  const fixture = loadFixture(feature);
  const golden = loadGolden(feature);
  const actual = extractSignature(manifoldDir, fixture.feature, fixture.must_have_keywords ?? []);
  const diffs = compareSignatures(golden, actual, fixture.tolerance ?? {});
  return { passed: diffs.length === 0, diffs };
}

function discoverFixtures(): string[] {
  if (!existsSync(fixturesDir)) return [];
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));
}

const requested = process.argv[2];
const fixtures = requested ? [requested] : discoverFixtures();

if (fixtures.length === 0) {
  console.error("No fixtures found in tests/golden/fixtures/");
  process.exit(1);
}

let allPassed = true;
for (const feature of fixtures) {
  process.stdout.write(`golden:${feature} ... `);
  try {
    const { passed, diffs } = runOne(feature);
    if (passed) {
      console.log("ok");
    } else {
      allPassed = false;
      console.log(`FAIL (${diffs.length} diff${diffs.length === 1 ? "" : "s"})`);
      for (const d of diffs) console.log(formatDiff(d));
    }
  } catch (err) {
    allPassed = false;
    console.log(`ERROR: ${(err as Error).message}`);
  }
}

process.exit(allPassed ? 0 : 1);
