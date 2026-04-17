#!/usr/bin/env bun
/**
 * Re-bootstrap golden from a sandbox manifold directory using current fixture
 * keywords. Used after updating must_have_keywords to avoid a fresh full
 * harness run.
 *
 * Usage:
 *   bun tests/golden/rebootstrap.ts <feature> <sandbox-manifold-dir>
 */
import { writeFileSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { extractSignature } from "./signature";

const [, , feature, manifoldDir] = process.argv;
if (!feature || !manifoldDir) {
  console.error("usage: bun tests/golden/rebootstrap.ts <feature> <sandbox-manifold-dir>");
  process.exit(1);
}

const fixture = parseYaml(readFileSync(`tests/golden/fixtures/${feature}.yaml`, "utf-8")) as {
  must_have_keywords?: string[];
};

const sig = extractSignature(manifoldDir, feature, fixture.must_have_keywords ?? []);
const outPath = `tests/golden/goldens/${feature}.json`;
writeFileSync(outPath, JSON.stringify(sig, null, 2) + "\n");
console.log(`Wrote golden to ${outPath}`);
console.log(`  phase: ${sig.phase}`);
console.log(`  constraints: ${sig.constraints.total}`);
console.log(`  tensions: ${sig.tensions.total}`);
console.log(`  RTs: ${sig.anchors.required_truths_total}`);
console.log(`  artifacts: ${sig.generation.artifacts_total}`);
console.log(`  keywords: ${JSON.stringify(sig.markdown.must_have_keywords_hit)}`);
