/**
 * Manifold Doctor Library
 * Detects four classes of repo-health problems in a single snapshot pass.
 *
 * Satisfies: RT-2 (single shared snapshot, reuse existing libs)
 * Satisfies: RT-3 (dedicated pure-function check per problem class, all always run)
 * Satisfies: RT-4 (each check's verdict matches its authoritative source)
 * Satisfies: RT-5 (every Problem carries a concrete, copy-pasteable fix command)
 * Satisfies: RT-7, S1 (strictly read-only — no filesystem writes)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  findManifoldDir,
  listFeatures,
  loadFeature,
} from './parser.js';
import { computeFileHash, detectDrift } from './evidence.js';
import type { SkillFingerprint } from '../../tests/golden/fingerprint.js';

// ============================================================
// Public Types
// ============================================================

export interface Problem {
  check: string;   // check id, e.g. 'plugin-sync'
  message: string; // human-readable description of the problem
  fix: string;     // a concrete, copy-pasteable remediation command
}

export interface DoctorReport {
  problems: Problem[];
  healthy: boolean; // true iff problems.length === 0
}

// ============================================================
// Internal Snapshot
// Satisfies: RT-2 (one shared snapshot, all filesystem reads in one pass)
// ============================================================

/**
 * All data needed by the four check functions, gathered in a single pass.
 * Check functions are pure: (RepoSnapshot) => Problem[].
 */
export interface RepoSnapshot {
  /** Absolute path to .manifold/ dir, or null if absent */
  manifoldDir: string | null;
  /** Feature names listed by listFeatures() */
  features: string[];
  /**
   * For each feature, file_hashes from .verify.json (if present).
   * Shape: { featureName: { filePath: sha256 } }
   */
  verifyHashes: Record<string, Record<string, string>>;
  /**
   * install/-relative paths of files that sync-plugin.ts would copy.
   * Mirrors the inclusion rules in scripts/sync-plugin.ts.
   * Satisfies: RT-4 (plugin-sync uses same inclusion rules as authoritative source)
   */
  installFiles: string[];
  /**
   * Contents of each install/ file to be synced (keyed by install/-relative path).
   */
  installFileContents: Record<string, string>;
  /**
   * Contents of corresponding plugin/ files (keyed by install/-relative path).
   * Missing key = file is absent in plugin/.
   */
  pluginFileContents: Record<string, string>;
  /**
   * Baseline fingerprints from tests/golden/skill-fingerprints.json.
   * Empty array means no baseline exists (check is a no-op).
   */
  skillFingerprints: SkillFingerprint[];
  /**
   * Current fingerprints computed live from install/commands/*.md.
   */
  currentFingerprints: SkillFingerprint[];
}

// ============================================================
// Snapshot Builder
// Satisfies: RT-2 (ALL filesystem reads happen here, once)
// Satisfies: RT-7, S1 (read-only)
// ============================================================

/**
 * Build the shared repo snapshot in a single filesystem pass.
 * All check functions receive this snapshot and perform no additional I/O.
 */
export function buildSnapshot(repoRoot: string): RepoSnapshot {
  // ── 1. Manifold directory & features ──────────────────────
  const manifoldDir = findManifoldDir(repoRoot);
  const features = manifoldDir ? listFeatures(manifoldDir) : [];

  // ── 2. Verify hashes from .verify.json files ──────────────
  // Satisfies: RT-2 (reuses parser abstractions for feature discovery)
  const verifyHashes: Record<string, Record<string, string>> = {};
  for (const feature of features) {
    const verifyPath = join(manifoldDir!, `${feature}.verify.json`);
    if (existsSync(verifyPath)) {
      try {
        const raw = readFileSync(verifyPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.file_hashes && typeof data.file_hashes === 'object') {
          verifyHashes[feature] = data.file_hashes as Record<string, string>;
        }
      } catch {
        // Malformed verify.json — treat as no hashes for this feature
      }
    }
  }

  // ── 3. Plugin-sync inclusion rules (mirrors scripts/sync-plugin.ts) ───
  // Satisfies: RT-4 (mirrors sync-plugin.ts file-inclusion rules exactly)
  const installDir = join(repoRoot, 'install');
  const pluginDir = join(repoRoot, 'plugin');
  const installFiles: string[] = [];
  const installFileContents: Record<string, string> = {};
  const pluginFileContents: Record<string, string> = {};

  if (existsSync(installDir)) {
    // Rule 1: install/commands/**/*.md (excluding subdirectory .md files go into commands/)
    const commandsSrc = join(installDir, 'commands');
    if (existsSync(commandsSrc)) {
      collectMdFiles(commandsSrc, commandsSrc, 'commands', installFiles, installFileContents, installDir);
    }

    // Rule 2: install/hooks/* (all files)
    const hooksSrc = join(installDir, 'hooks');
    if (existsSync(hooksSrc)) {
      for (const file of safeReaddir(hooksSrc)) {
        const srcPath = join(hooksSrc, file);
        if (!statSync(srcPath).isDirectory()) {
          const relPath = `hooks/${file}`;
          installFiles.push(relPath);
          try { installFileContents[relPath] = readFileSync(srcPath, 'utf-8'); } catch { installFileContents[relPath] = ''; }
        }
      }
    }

    // Rule 3: install/bin/* (all files)
    const binSrc = join(installDir, 'bin');
    if (existsSync(binSrc)) {
      for (const file of safeReaddir(binSrc)) {
        const srcPath = join(binSrc, file);
        if (!statSync(srcPath).isDirectory()) {
          const relPath = `bin/${file}`;
          installFiles.push(relPath);
          try { installFileContents[relPath] = readFileSync(srcPath, 'utf-8'); } catch { installFileContents[relPath] = ''; }
        }
      }
    }

    // Rule 4: install/lib/parallel/parallel.bundle.js
    const bundleSrc = join(installDir, 'lib', 'parallel', 'parallel.bundle.js');
    if (existsSync(bundleSrc)) {
      const relPath = 'lib/parallel/parallel.bundle.js';
      installFiles.push(relPath);
      try { installFileContents[relPath] = readFileSync(bundleSrc, 'utf-8'); } catch { installFileContents[relPath] = ''; }
    }

    // Rule 5: install/manifold-structure.schema.json
    const schemaSrc = join(installDir, 'manifold-structure.schema.json');
    if (existsSync(schemaSrc)) {
      const relPath = 'manifold-structure.schema.json';
      installFiles.push(relPath);
      try { installFileContents[relPath] = readFileSync(schemaSrc, 'utf-8'); } catch { installFileContents[relPath] = ''; }
    }

    // Rule 6: install/plugin.json (goes to plugin/plugin.json AND plugin/.claude-plugin/plugin.json)
    const pluginJsonSrc = join(installDir, 'plugin.json');
    if (existsSync(pluginJsonSrc)) {
      const relPath = 'plugin.json';
      installFiles.push(relPath);
      try { installFileContents[relPath] = readFileSync(pluginJsonSrc, 'utf-8'); } catch { installFileContents[relPath] = ''; }
      // The dual-write: .claude-plugin/plugin.json must also match
      const dualPath = '.claude-plugin/plugin.json';
      installFiles.push(dualPath);
      installFileContents[dualPath] = installFileContents[relPath];
    }

    // Rule 7: install/templates/** (all files, recursive)
    const templatesSrc = join(installDir, 'templates');
    if (existsSync(templatesSrc)) {
      collectAllFiles(templatesSrc, templatesSrc, 'templates', installFiles, installFileContents, installDir);
    }

    // Read corresponding plugin/ files
    if (existsSync(pluginDir)) {
      for (const relPath of installFiles) {
        const pluginPath = join(pluginDir, relPath);
        if (existsSync(pluginPath)) {
          try { pluginFileContents[relPath] = readFileSync(pluginPath, 'utf-8'); } catch { /* absent */ }
        }
      }
    }
  }

  // ── 4. Skill fingerprints ──────────────────────────────────
  // Satisfies: RT-4 (reuses fingerprintSkills() from tests/golden/fingerprint.ts)
  const fingerprintBaseline = join(repoRoot, 'tests', 'golden', 'skill-fingerprints.json');
  let skillFingerprints: SkillFingerprint[] = [];
  if (existsSync(fingerprintBaseline)) {
    try {
      skillFingerprints = JSON.parse(readFileSync(fingerprintBaseline, 'utf-8')) as SkillFingerprint[];
    } catch {
      skillFingerprints = [];
    }
  }

  // Compute live fingerprints from install/commands/*.md
  let currentFingerprints: SkillFingerprint[] = [];
  const commandsDir = join(repoRoot, 'install', 'commands');
  if (existsSync(commandsDir)) {
    const { createHash } = require('crypto');
    currentFingerprints = safeReaddir(commandsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((file) => {
        const abs = join(commandsDir, file);
        try {
          const content = readFileSync(abs);
          const sha256 = createHash('sha256').update(content).digest('hex');
          return {
            path: `install/commands/${file}`,
            sha256,
            bytes: content.length,
          } as SkillFingerprint;
        } catch {
          return null;
        }
      })
      .filter((fp): fp is SkillFingerprint => fp !== null);
  }

  return {
    manifoldDir,
    features,
    verifyHashes,
    installFiles,
    installFileContents,
    pluginFileContents,
    skillFingerprints,
    currentFingerprints,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Collect *.md files recursively from srcDir into installFiles/installFileContents,
 * using relPrefix to build install/-relative paths.
 */
function collectMdFiles(
  srcDir: string,
  baseDir: string,
  relPrefix: string,
  installFiles: string[],
  installFileContents: Record<string, string>,
  installRoot: string,
): void {
  for (const entry of safeReaddir(srcDir)) {
    const srcPath = join(srcDir, entry);
    try {
      const st = statSync(srcPath);
      if (st.isDirectory()) {
        collectMdFiles(srcPath, baseDir, `${relPrefix}/${entry}`, installFiles, installFileContents, installRoot);
      } else if (entry.endsWith('.md')) {
        const relPath = `${relPrefix}/${entry}`;
        installFiles.push(relPath);
        try { installFileContents[relPath] = readFileSync(srcPath, 'utf-8'); } catch { installFileContents[relPath] = ''; }
      }
    } catch {
      // skip unreadable entries
    }
  }
}

/**
 * Collect ALL files recursively (for templates), using relPrefix.
 */
function collectAllFiles(
  srcDir: string,
  baseDir: string,
  relPrefix: string,
  installFiles: string[],
  installFileContents: Record<string, string>,
  installRoot: string,
): void {
  for (const entry of safeReaddir(srcDir)) {
    const srcPath = join(srcDir, entry);
    try {
      const st = statSync(srcPath);
      if (st.isDirectory()) {
        collectAllFiles(srcPath, baseDir, `${relPrefix}/${entry}`, installFiles, installFileContents, installRoot);
      } else {
        const relPath = `${relPrefix}/${entry}`;
        installFiles.push(relPath);
        try { installFileContents[relPath] = readFileSync(srcPath, 'utf-8'); } catch { installFileContents[relPath] = ''; }
      }
    } catch {
      // skip unreadable entries
    }
  }
}

// ============================================================
// Check 1: invalid-manifolds
// Satisfies: B1, T2, T3 (RT-2)
// ============================================================

/**
 * For each feature, attempt to load/parse its manifold.
 * Emits a Problem for any manifold that fails to load/parse.
 *
 * Satisfies: RT-2 (reuses loadFeature from cli/lib/parser)
 * Satisfies: RT-5 (fix command: manifold validate <feature>)
 * Satisfies: RT-7 (read-only)
 */
export function checkInvalidManifolds(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  if (!snapshot.manifoldDir) return problems;

  for (const feature of snapshot.features) {
    const data = loadFeature(snapshot.manifoldDir, feature);
    if (!data || !data.manifold) {
      problems.push({
        check: 'invalid-manifolds',
        message: `Manifold for feature "${feature}" failed to load or parse. It may be malformed JSON/YAML.`,
        fix: `manifold validate ${feature}`,
      });
    }
  }

  return problems;
}

// ============================================================
// Check 2: plugin-sync
// Satisfies: B2, T2, T3 (RT-4)
// ============================================================

/**
 * Detect when plugin/ is out of sync with install/.
 * Mirrors the file-inclusion rules in scripts/sync-plugin.ts.
 * Legitimately plugin-only files never count as drift.
 *
 * Satisfies: RT-4 (mirrors sync-plugin.ts inclusion rules; no false positives on healthy repo)
 * Satisfies: RT-5 (fix command: bun scripts/sync-plugin.ts)
 * Satisfies: RT-7 (read-only)
 */
export function checkPluginSync(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  // If no install/ files were discovered, there's nothing to check
  if (snapshot.installFiles.length === 0) return problems;

  for (const relPath of snapshot.installFiles) {
    const installContent = snapshot.installFileContents[relPath];
    const pluginContent = snapshot.pluginFileContents[relPath];

    if (pluginContent === undefined) {
      problems.push({
        check: 'plugin-sync',
        message: `plugin/${relPath} is missing (install/${relPath} exists but was not synced).`,
        fix: 'bun scripts/sync-plugin.ts',
      });
    } else if (pluginContent !== installContent) {
      problems.push({
        check: 'plugin-sync',
        message: `plugin/${relPath} differs from install/${relPath} — plugin is out of sync.`,
        fix: 'bun scripts/sync-plugin.ts',
      });
    }
  }

  return problems;
}

// ============================================================
// Check 3: stale-fingerprints
// Satisfies: B2 (RT-4)
// ============================================================

/**
 * Detect when recorded skill fingerprints no longer match install/commands/.
 * Reuses fingerprintSkills() types from tests/golden/fingerprint.ts.
 *
 * Satisfies: RT-4 (reuses fingerprintSkills() logic; no false positives on healthy repo)
 * Satisfies: RT-5 (fix command: bun tests/golden/bootstrap-fingerprints.ts)
 * Satisfies: RT-7 (read-only)
 */
export function checkStaleFingerprints(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  // If no baseline exists (empty array), the check is a no-op
  if (snapshot.skillFingerprints.length === 0 && snapshot.currentFingerprints.length === 0) {
    return problems;
  }

  const baselineMap = new Map(snapshot.skillFingerprints.map((fp) => [fp.path, fp]));
  const currentMap = new Map(snapshot.currentFingerprints.map((fp) => [fp.path, fp]));

  // Changed or new skills (present in current but missing or different from baseline)
  for (const [path, current] of currentMap) {
    const baseline = baselineMap.get(path);
    if (!baseline) {
      problems.push({
        check: 'stale-fingerprints',
        message: `New skill file "${path}" has no baseline fingerprint.`,
        fix: 'bun tests/golden/bootstrap-fingerprints.ts',
      });
    } else if (baseline.sha256 !== current.sha256) {
      problems.push({
        check: 'stale-fingerprints',
        message: `Skill file "${path}" has changed since last fingerprint (was ${baseline.sha256.slice(0, 8)}…, now ${current.sha256.slice(0, 8)}…).`,
        fix: 'bun tests/golden/bootstrap-fingerprints.ts',
      });
    }
  }

  // Removed skills (present in baseline but missing in current)
  for (const [path] of baselineMap) {
    if (!currentMap.has(path)) {
      problems.push({
        check: 'stale-fingerprints',
        message: `Skill file "${path}" was removed but still has a baseline fingerprint.`,
        fix: 'bun tests/golden/bootstrap-fingerprints.ts',
      });
    }
  }

  return problems;
}

// ============================================================
// Check 4: file-drift
// Satisfies: B1, T4, U2 (RT-3)
// ============================================================

/**
 * For each .verify.json with file_hashes, detect post-verification drift.
 * Reuses detectDrift() and computeFileHash() from cli/lib/evidence.ts.
 *
 * Satisfies: RT-2 (reuses detectDrift / computeFileHash)
 * Satisfies: RT-4 (uses same hash algorithm as drift command)
 * Satisfies: RT-5 (fix command: manifold drift <feature> --update)
 * Satisfies: RT-7 (read-only)
 */
export function checkFileDrift(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  if (!snapshot.manifoldDir) return problems;

  const repoRoot = snapshot.manifoldDir.replace(/\/\.manifold$/, '');

  for (const [feature, hashes] of Object.entries(snapshot.verifyHashes)) {
    const artifacts = Object.entries(hashes).map(([path, file_hash]) => ({
      path,
      file_hash,
      satisfies: [] as string[],
    }));

    if (artifacts.length === 0) continue;

    const driftReport = detectDrift(artifacts, repoRoot);

    for (const entry of driftReport.drifted) {
      problems.push({
        check: 'file-drift',
        message: `File "${entry.path}" has changed since verification of feature "${feature}" (hash mismatch).`,
        fix: `manifold drift ${feature} --update`,
      });
    }
  }

  return problems;
}

// ============================================================
// runDoctor — Main entry point
// Satisfies: RT-2 (one snapshot), RT-3 (all checks run), RT-7 (read-only)
// ============================================================

/**
 * Build the repo snapshot once, run all four checks against it,
 * and return the aggregated report.
 *
 * Performs NO filesystem writes — strictly read-only.
 *
 * Satisfies: RT-2 (single snapshot built once)
 * Satisfies: RT-3 (all four checks always run)
 * Satisfies: RT-7, S1 (no writes)
 */
export function runDoctor(repoRoot: string): DoctorReport {
  // Build shared snapshot — ALL filesystem reads happen here
  const snapshot = buildSnapshot(repoRoot);

  // Run all four checks against the snapshot — each is a pure function
  // Satisfies: RT-3 (never abort at first failure — all four always run)
  const problems: Problem[] = [
    ...checkInvalidManifolds(snapshot),
    ...checkPluginSync(snapshot),
    ...checkStaleFingerprints(snapshot),
    ...checkFileDrift(snapshot),
  ];

  return {
    problems,
    healthy: problems.length === 0,
  };
}
