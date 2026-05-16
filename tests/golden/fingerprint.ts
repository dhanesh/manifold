/**
 * Skill-text fingerprinting — catches unintended edits to skill prompts.
 *
 * Phase 1 signatures detect structural drift in generated manifolds; fingerprints
 * detect drift in the skills THEMSELVES. If a skill file changes and its hash
 * no longer matches the stored fingerprint, the author must either revert the
 * change or regenerate fingerprints via `bun tests/golden/bootstrap-fingerprints.ts`.
 *
 * Covers: install/commands/*.md (canonical skill source). Plugin/ is a sync'd
 * copy — verified separately by the diff-guard CI workflow.
 */

import { readdirSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { join, resolve } from "path";

export interface SkillFingerprint {
  path: string; // relative to repo root
  sha256: string;
  bytes: number;
}

const defaultRepoRoot = resolve(import.meta.dir, "../..");

/**
 * List the skill files whose content should be tracked. Returns relative paths
 * sorted deterministically so fingerprint output is stable across machines.
 */
export function listSkillFiles(repoRoot: string = defaultRepoRoot): string[] {
  const commandsDir = join(repoRoot, "install/commands");
  return readdirSync(commandsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

export function fingerprintSkills(repoRoot: string = defaultRepoRoot): SkillFingerprint[] {
  const commandsDir = join(repoRoot, "install/commands");
  return listSkillFiles(repoRoot).map((file) => {
    const abs = join(commandsDir, file);
    const content = readFileSync(abs);
    const sha256 = createHash("sha256").update(content).digest("hex");
    return {
      path: `install/commands/${file}`,
      sha256,
      bytes: content.length,
    };
  });
}
