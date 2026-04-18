#!/usr/bin/env bun
/**
 * Regenerate a fixture's golden signature from the current .manifold/ files.
 *
 * Usage:
 *   bun tests/golden/bootstrap.ts <feature>
 *
 * The generated signature is written to tests/golden/goldens/<feature>.json.
 * Run this when:
 *   - A fixture is first added (initial baseline)
 *   - The baseline has been intentionally moved (e.g. model upgrade accepted as new standard)
 *
 * Do NOT run to "fix" a failing test — that defeats the point. Investigate the
 * drift first.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYaml } from "yaml";
import { extractSignature } from "./signature";

const root = resolve(import.meta.dir, "../..");
const feature = process.argv[2];

if (!feature) {
  console.error("Usage: bun tests/golden/bootstrap.ts <feature>");
  process.exit(1);
}

const fixturePath = join(root, "tests/golden/fixtures", `${feature}.yaml`);
if (!existsSync(fixturePath)) {
  console.error(`Fixture not found: ${fixturePath}`);
  process.exit(1);
}

const fixture = parseYaml(readFileSync(fixturePath, "utf-8")) as {
  feature: string;
  must_have_keywords?: string[];
};

const sig = extractSignature(
  join(root, ".manifold"),
  fixture.feature,
  fixture.must_have_keywords ?? []
);

const goldenDir = join(root, "tests/golden/goldens");
mkdirSync(goldenDir, { recursive: true });
const goldenPath = join(goldenDir, `${feature}.json`);

writeFileSync(goldenPath, JSON.stringify(sig, null, 2) + "\n");

console.log(`Wrote golden: ${goldenPath}`);
console.log(`  constraints: ${sig.constraints.total} (${Object.entries(sig.constraints.by_type).map(([k, v]) => `${k}=${v}`).join(", ")})`);
console.log(`  tensions: ${sig.tensions.total} resolved=${sig.tensions.resolved}`);
console.log(`  required truths: ${sig.anchors.required_truths_total} (${sig.anchors.required_truths_root} root)`);
console.log(`  artifacts: ${sig.generation.artifacts_total} coverage=${sig.generation.coverage_pct}%`);
console.log(`  evidence: ${sig.evidence.total} (VERIFIED=${sig.evidence.by_status.VERIFIED ?? 0})`);
console.log(`  phase: ${sig.phase} convergence: ${sig.convergence_status}`);
