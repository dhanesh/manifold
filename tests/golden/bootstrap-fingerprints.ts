#!/usr/bin/env bun
/**
 * Snapshot current skill fingerprints. Run this after INTENTIONAL edits to
 * skills in install/commands/ — the snapshot becomes the new expected baseline.
 *
 * Usage:
 *   bun tests/golden/bootstrap-fingerprints.ts
 *
 * Always review the diff on skill-fingerprints.json before committing. A file
 * that changed without you meaning to change it is exactly what this sentinel
 * is designed to catch.
 */

import { writeFileSync } from "fs";
import { join, resolve } from "path";
import { fingerprintSkills } from "./fingerprint";

const outPath = join(resolve(import.meta.dir, "../.."), "tests/golden/skill-fingerprints.json");
const fingerprints = fingerprintSkills();

writeFileSync(outPath, JSON.stringify(fingerprints, null, 2) + "\n");

console.log(`Wrote ${fingerprints.length} fingerprints to tests/golden/skill-fingerprints.json`);
for (const f of fingerprints) {
  console.log(`  ${f.sha256.slice(0, 12)}  ${f.bytes.toString().padStart(6)}B  ${f.path}`);
}
