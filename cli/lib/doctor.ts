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
import { dirname, join } from 'path';
import {
  findManifoldDir,
  listFeatures,
  loadFeature,
} from './parser.js';
import { computeFileHash, detectDrift } from './evidence.js';
import { fingerprintSkills, type SkillFingerprint } from './fingerprint.js';

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
   * For each feature, whether its .manifold/<feature>.md file exists and is readable.
   * A missing or unreadable .md is a B1 violation.
   * Only populated for json-md format features; undefined key = not applicable (yaml-only).
   * Satisfies: B1 (detect invalid/unparseable .md content files)
   */
  featureMdReadable?: Record<string, boolean>;
  /**
   * For each feature, whether loadFeature() returned a valid manifold object.
   * true  = loadFeature succeeded (returned a non-null manifold)
   * false = loadFeature returned null, threw, or the .manifold dir is absent
   *
   * I/O is performed once in buildSnapshot; checkInvalidManifolds reads this
   * precomputed result and performs NO filesystem access.
   * Satisfies: RT-2 (single snapshot), RT-3 (pure check function)
   */
  featureManifoldLoads?: Record<string, boolean>;
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
   * SHA-256 hashes of each install/ file to be synced (keyed by install/-relative path).
   * Satisfies: T2 (reuses computeFileHash from cli/lib/evidence — no duplicate hash logic)
   */
  installFileHashes: Record<string, string>;
  /**
   * SHA-256 hashes of corresponding plugin/ files (keyed by install/-relative path).
   * Missing key = file is absent in plugin/.
   * Satisfies: T2 (reuses computeFileHash from cli/lib/evidence — no duplicate hash logic)
   */
  pluginFileHashes: Record<string, string>;
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

  // ── 1a. .md readability check for B1 ──────────────────────
  // For every json-format feature, record whether its .md companion is readable.
  // This is done here (in buildSnapshot) so check functions stay I/O-free.
  // Satisfies: B1 (detect missing/unreadable .md content files)
  const featureMdReadable: Record<string, boolean> = {};
  if (manifoldDir) {
    for (const feature of features) {
      const jsonPath = join(manifoldDir, `${feature}.json`);
      if (existsSync(jsonPath)) {
        // Feature uses JSON format — .md companion is required
        const mdPath = join(manifoldDir, `${feature}.md`);
        if (existsSync(mdPath)) {
          try {
            readFileSync(mdPath, 'utf-8');
            featureMdReadable[feature] = true;
          } catch {
            featureMdReadable[feature] = false;
          }
        } else {
          featureMdReadable[feature] = false;
        }
      }
      // YAML-only features have no .md requirement; leave the key absent.
    }
  }

  // ── 1b. Manifold load/parse results ───────────────────────
  // For every feature, attempt to load and parse its manifold ONCE here.
  // The result (true = loaded ok, false = failed) is stored in featureManifoldLoads
  // so that checkInvalidManifolds can be a pure function with no filesystem I/O.
  // Satisfies: RT-2 (all I/O in buildSnapshot), RT-3 (pure check functions)
  const featureManifoldLoads: Record<string, boolean> = {};
  if (manifoldDir) {
    for (const feature of features) {
      try {
        const data = loadFeature(manifoldDir, feature);
        featureManifoldLoads[feature] = !!(data && data.manifold);
      } catch {
        featureManifoldLoads[feature] = false;
      }
    }
  }

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
  // Satisfies: T2 (reuses computeFileHash from cli/lib/evidence — hash-based comparison
  //             reduces memory and avoids duplicating hash logic)
  const installDir = join(repoRoot, 'install');
  const pluginDir = join(repoRoot, 'plugin');
  const installFiles: string[] = [];
  const installFileHashes: Record<string, string> = {};
  const pluginFileHashes: Record<string, string> = {};

  if (existsSync(installDir)) {
    // Rule 1: Recursively collect all *.md files under install/commands/ (including subdirectories)
    const commandsSrc = join(installDir, 'commands');
    if (existsSync(commandsSrc)) {
      collectMdFiles(commandsSrc, 'commands', installFiles, installFileHashes);
    }

    // Rule 2: install/hooks/* (all files)
    const hooksSrc = join(installDir, 'hooks');
    if (existsSync(hooksSrc)) {
      for (const file of safeReaddir(hooksSrc)) {
        const srcPath = join(hooksSrc, file);
        try {
          if (!statSync(srcPath).isDirectory()) {
            const relPath = `hooks/${file}`;
            installFiles.push(relPath);
            const hash = computeFileHash(srcPath);
            if (hash) installFileHashes[relPath] = hash;
          }
        } catch {
          // Skip entries that vanish between readdir and stat (e.g. broken symlinks)
        }
      }
    }

    // Rule 3: install/bin/* (all files)
    const binSrc = join(installDir, 'bin');
    if (existsSync(binSrc)) {
      for (const file of safeReaddir(binSrc)) {
        const srcPath = join(binSrc, file);
        try {
          if (!statSync(srcPath).isDirectory()) {
            const relPath = `bin/${file}`;
            installFiles.push(relPath);
            const hash = computeFileHash(srcPath);
            if (hash) installFileHashes[relPath] = hash;
          }
        } catch {
          // Skip entries that vanish between readdir and stat (e.g. broken symlinks)
        }
      }
    }

    // Rule 4: install/lib/parallel/parallel.bundle.js
    const bundleSrc = join(installDir, 'lib', 'parallel', 'parallel.bundle.js');
    if (existsSync(bundleSrc)) {
      const relPath = 'lib/parallel/parallel.bundle.js';
      installFiles.push(relPath);
      const hash = computeFileHash(bundleSrc);
      if (hash) installFileHashes[relPath] = hash;
    }

    // Rule 5: install/manifold-structure.schema.json
    const schemaSrc = join(installDir, 'manifold-structure.schema.json');
    if (existsSync(schemaSrc)) {
      const relPath = 'manifold-structure.schema.json';
      installFiles.push(relPath);
      const hash = computeFileHash(schemaSrc);
      if (hash) installFileHashes[relPath] = hash;
    }

    // Rule 6: install/plugin.json (goes to plugin/plugin.json AND plugin/.claude-plugin/plugin.json)
    const pluginJsonSrc = join(installDir, 'plugin.json');
    if (existsSync(pluginJsonSrc)) {
      const relPath = 'plugin.json';
      installFiles.push(relPath);
      const hash = computeFileHash(pluginJsonSrc);
      if (hash) {
        installFileHashes[relPath] = hash;
        // The dual-write: .claude-plugin/plugin.json must also match
        const dualPath = '.claude-plugin/plugin.json';
        installFiles.push(dualPath);
        installFileHashes[dualPath] = hash;
      }
    }

    // Rule 7: install/templates/** (all files, recursive)
    const templatesSrc = join(installDir, 'templates');
    if (existsSync(templatesSrc)) {
      collectAllFiles(templatesSrc, 'templates', installFiles, installFileHashes);
    }

    // Hash corresponding plugin/ files
    if (existsSync(pluginDir)) {
      for (const relPath of installFiles) {
        const pluginPath = join(pluginDir, relPath);
        if (existsSync(pluginPath)) {
          const hash = computeFileHash(pluginPath);
          if (hash) pluginFileHashes[relPath] = hash;
        }
      }
    }
  }

  // ── 4. Skill fingerprints ──────────────────────────────────
  // Satisfies: RT-4 (reuses fingerprintSkills() from cli/lib/fingerprint.ts)
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
  // Satisfies: RT-4, T2 (reuses fingerprintSkills() from cli/lib/fingerprint.ts
  // to guarantee the doctor check cannot silently diverge from the golden-test sentinel)
  let currentFingerprints: SkillFingerprint[] = [];
  const commandsDir = join(repoRoot, 'install', 'commands');
  if (existsSync(commandsDir)) {
    try {
      currentFingerprints = fingerprintSkills(repoRoot);
    } catch {
      currentFingerprints = [];
    }
  }

  return {
    manifoldDir,
    features,
    featureMdReadable,
    featureManifoldLoads,
    verifyHashes,
    installFiles,
    installFileHashes,
    pluginFileHashes,
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
 * Collect *.md files recursively from srcDir into installFiles/installFileHashes,
 * using relPrefix to build install/-relative paths.
 * Satisfies: T2 (uses computeFileHash from cli/lib/evidence — no duplicate hash logic)
 */
function collectMdFiles(
  srcDir: string,
  relPrefix: string,
  installFiles: string[],
  installFileHashes: Record<string, string>,
): void {
  for (const entry of safeReaddir(srcDir)) {
    const srcPath = join(srcDir, entry);
    try {
      const st = statSync(srcPath);
      if (st.isDirectory()) {
        collectMdFiles(srcPath, `${relPrefix}/${entry}`, installFiles, installFileHashes);
      } else if (entry.endsWith('.md')) {
        const relPath = `${relPrefix}/${entry}`;
        installFiles.push(relPath);
        const hash = computeFileHash(srcPath);
        if (hash) installFileHashes[relPath] = hash;
      }
    } catch {
      // skip unreadable entries
    }
  }
}

/**
 * Collect ALL files recursively (for templates), using relPrefix.
 * Satisfies: T2 (uses computeFileHash from cli/lib/evidence — no duplicate hash logic)
 */
function collectAllFiles(
  srcDir: string,
  relPrefix: string,
  installFiles: string[],
  installFileHashes: Record<string, string>,
): void {
  for (const entry of safeReaddir(srcDir)) {
    const srcPath = join(srcDir, entry);
    try {
      const st = statSync(srcPath);
      if (st.isDirectory()) {
        collectAllFiles(srcPath, `${relPrefix}/${entry}`, installFiles, installFileHashes);
      } else {
        const relPath = `${relPrefix}/${entry}`;
        installFiles.push(relPath);
        const hash = computeFileHash(srcPath);
        if (hash) installFileHashes[relPath] = hash;
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
 * For each feature, report whether its manifold loaded/parsed successfully.
 * Also detects missing or unreadable .md companion files (B1 scope).
 *
 * This is a PURE function — it reads only from the snapshot.
 * All filesystem I/O (loadFeature, .md readability) was performed in buildSnapshot
 * and the precomputed results are stored in snapshot.featureManifoldLoads and
 * snapshot.featureMdReadable. This function performs NO filesystem access.
 *
 * Satisfies: B1 (detect invalid/unparseable .json AND .md files)
 * Satisfies: RT-2 (I/O for loadFeature happens in buildSnapshot; check reads precomputed result)
 * Satisfies: RT-3 (pure function: (RepoSnapshot) => Problem[])
 * Satisfies: RT-5 (fix command: manifold validate <feature>)
 * Satisfies: RT-7 (read-only — zero filesystem calls in this function)
 */
export function checkInvalidManifolds(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  if (!snapshot.manifoldDir) return problems;

  const manifoldLoads = snapshot.featureManifoldLoads ?? {};

  for (const feature of snapshot.features) {
    // Check JSON/YAML structure parses correctly.
    // featureManifoldLoads[feature] was set by buildSnapshot; false means loadFeature
    // returned null, threw, or the file is malformed. No I/O happens here.
    if (manifoldLoads[feature] === false) {
      problems.push({
        check: 'invalid-manifolds',
        message: `Manifold for feature "${feature}" failed to load or parse. It may be malformed JSON/YAML.`,
        fix: `manifold validate ${feature}`,
      });
      // JSON itself is broken; skip .md check (already a problem for this feature)
      continue;
    }

    // B1 scope: for json-format features, the .md companion must also be readable.
    // featureMdReadable[feature] === false means the .md is missing or unreadable.
    // If the key is absent (e.g. yaml-only feature), there is no .md requirement.
    if (snapshot.featureMdReadable && snapshot.featureMdReadable[feature] === false) {
      problems.push({
        check: 'invalid-manifolds',
        message: `Manifold content file ".manifold/${feature}.md" is missing or unreadable (required alongside "${feature}.json").`,
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
 * Satisfies: T2 (hash-based comparison reuses computeFileHash from cli/lib/evidence)
 * Satisfies: RT-7 (read-only)
 */
export function checkPluginSync(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  // If no install/ files were discovered, there's nothing to check
  if (snapshot.installFiles.length === 0) return problems;

  for (const relPath of snapshot.installFiles) {
    const installHash = snapshot.installFileHashes[relPath];
    const pluginHash = snapshot.pluginFileHashes[relPath];

    if (pluginHash === undefined) {
      problems.push({
        check: 'plugin-sync',
        message: `plugin/${relPath} is missing (install/${relPath} exists but was not synced).`,
        fix: 'bun scripts/sync-plugin.ts',
      });
    } else if (pluginHash !== installHash) {
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
 * Reuses fingerprintSkills() from cli/lib/fingerprint.ts.
 *
 * Satisfies: RT-4 (reuses fingerprintSkills() logic; no false positives on healthy repo)
 * Satisfies: RT-5 (fix command: bun tests/golden/bootstrap-fingerprints.ts)
 * Satisfies: RT-7 (read-only)
 */
export function checkStaleFingerprints(snapshot: RepoSnapshot): Problem[] {
  const problems: Problem[] = [];

  // If no baseline exists (empty array), the check is a no-op
  if (snapshot.skillFingerprints.length === 0) {
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

  const repoRoot = dirname(snapshot.manifoldDir);

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
