/**
 * Drift Detection Command for Manifold CLI
 * Satisfies: RT-7 (post-verification drift detection — GAP-07)
 *
 * Compares file hashes recorded at verify time against current state.
 * Detects when verified artifacts have been modified after verification.
 */

import type { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import {
  findManifoldDir,
  loadFeature,
  listFeatures,
} from '../lib/parser.js';
import {
  detectDrift,
  computeFileHash,
  type DriftReport,
} from '../lib/evidence.js';
import {
  println,
  printError,
  formatHeader,
  formatKeyValue,
  style,
  toJSON,
} from '../lib/output.js';

interface DriftOptions {
  json?: boolean;
  update?: boolean;
}

/**
 * Register the drift command
 */
export function registerDriftCommand(program: Command): void {
  program
    .command('drift [feature]')
    .description('Detect post-verification file changes that may affect constraint satisfaction')
    .option('--json', 'Output as JSON')
    .option('--update', 'Recompute and store current file hashes')
    .action(async (feature: string | undefined, options: DriftOptions) => {
      const exitCode = await driftCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute drift command
 * Returns exit code: 0 = clean, 1 = error, 2 = drift detected
 */
async function driftCommand(feature: string | undefined, options: DriftOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  const projectRoot = dirname(manifoldDir);

  // Check all features if none specified
  if (!feature) {
    const features = listFeatures(manifoldDir);
    if (features.length === 0) {
      if (options.json) {
        println(toJSON({ features: [], message: 'No manifolds found' }));
      } else {
        printError('No manifolds found');
      }
      return 1;
    }

    let hasDrift = false;
    const allReports: Record<string, DriftReport> = {};

    for (const f of features) {
      const report = await checkFeatureDrift(manifoldDir, f, projectRoot, options);
      if (report) {
        allReports[f] = report;
        if (report.drifted.length > 0) hasDrift = true;
      }
    }

    if (options.json) {
      println(toJSON({ result: hasDrift ? 'DRIFT' : 'CLEAN', features: allReports }));
    }

    return hasDrift ? 2 : 0;
  }

  // Check specific feature
  const report = await checkFeatureDrift(manifoldDir, feature, projectRoot, options);

  if (!report) {
    if (options.json) {
      println(toJSON({ error: `Feature "${feature}" not found or has no verification data` }));
    } else {
      printError(`Feature "${feature}" not found or has no verification data`);
    }
    return 1;
  }

  if (options.json) {
    println(toJSON({ result: report.drifted.length > 0 ? 'DRIFT' : 'CLEAN', report }));
  }

  return report.drifted.length > 0 ? 2 : 0;
}

/**
 * Check drift for a single feature
 */
async function checkFeatureDrift(
  manifoldDir: string,
  feature: string,
  projectRoot: string,
  options: DriftOptions
): Promise<DriftReport | null> {
  const data = loadFeature(manifoldDir, feature);
  if (!data?.manifold) return null;

  const manifold = data.manifold;

  // Collect artifacts with hashes from generation and verify data
  const artifacts: Array<{ path: string; file_hash?: string; satisfies?: string[] }> = [];

  // From generation artifacts
  if (manifold.generation?.artifacts) {
    for (const artifact of manifold.generation.artifacts) {
      artifacts.push({
        path: artifact.path,
        file_hash: artifact.file_hash,
        satisfies: artifact.satisfies,
      });
    }
  }

  // From verify.json if exists — merge hashes into existing artifacts or add new entries
  const verifyPath = join(manifoldDir, `${feature}.verify.json`);
  if (existsSync(verifyPath)) {
    try {
      const verifyData = JSON.parse(readFileSync(verifyPath, 'utf-8'));
      if (verifyData.file_hashes) {
        for (const [path, hash] of Object.entries(verifyData.file_hashes)) {
          const existing = artifacts.find(a => a.path === path);
          if (existing) {
            // Merge hash into existing artifact (generation artifacts may lack file_hash)
            existing.file_hash = hash as string;
          } else {
            artifacts.push({ path, file_hash: hash as string, satisfies: [] });
          }
        }
      }
    } catch {
      // Invalid verify.json — skip
    }
  }

  // Filter to only artifacts with hashes
  const hashableArtifacts = artifacts.filter(a => a.file_hash);

  if (hashableArtifacts.length === 0) {
    // If --update, capture initial hashes even when none exist yet
    if (options.update && artifacts.length > 0) {
      await updateHashes(manifoldDir, feature, artifacts, projectRoot);
      if (!options.json) {
        println(formatHeader(`Drift: ${style.feature(feature)}`));
        println(formatKeyValue('Status', style.success('Initial file hashes recorded')));
        println(formatKeyValue('Files tracked', `${artifacts.length}`));
      }
      return { drifted: [], clean: artifacts.length, timestamp: new Date().toISOString() };
    }

    if (!options.json) {
      println(formatHeader(`Drift: ${style.feature(feature)}`));
      println(formatKeyValue('Status', style.dim('No file hashes recorded — run drift --update first')));
    }
    return { drifted: [], clean: 0, timestamp: new Date().toISOString() };
  }

  const report = detectDrift(hashableArtifacts, projectRoot);

  if (!options.json) {
    printDriftOutput(feature, report);
  }

  // If --update, recompute hashes and store in verify.json
  if (options.update) {
    await updateHashes(manifoldDir, feature, artifacts, projectRoot);
  }

  return report;
}

/**
 * Print drift report to console
 */
function printDriftOutput(feature: string, report: DriftReport): void {
  const hasDrift = report.drifted.length > 0;
  const status = hasDrift
    ? style.warning(`DRIFT DETECTED (${report.drifted.length} file(s))`)
    : style.success('CLEAN');

  println(formatHeader(`Drift: ${style.feature(feature)} → ${status}`));
  println(formatKeyValue('Files checked', `${report.drifted.length + report.clean}`));
  println(formatKeyValue('Clean', `${report.clean}`));
  println(formatKeyValue('Drifted', `${report.drifted.length}`));

  if (hasDrift) {
    println();
    println(`  ${style.warning('Changed files:')}`);
    for (const entry of report.drifted) {
      const constraints = entry.constraint_ids.length > 0
        ? ` (affects: ${entry.constraint_ids.join(', ')})`
        : '';
      println(`    ${style.cross()} ${entry.path}${constraints}`);
    }
    println();
    println(`  ${style.dim('Run manifold verify <feature> to re-verify affected constraints')}`);
  }
}

/**
 * Update stored file hashes in verify.json
 */
async function updateHashes(
  manifoldDir: string,
  feature: string,
  artifacts: Array<{ path: string; file_hash?: string; satisfies?: string[] }>,
  projectRoot: string
): Promise<void> {
  const verifyPath = join(manifoldDir, `${feature}.verify.json`);
  let verifyData: Record<string, unknown> = {};

  if (existsSync(verifyPath)) {
    try {
      verifyData = JSON.parse(readFileSync(verifyPath, 'utf-8'));
    } catch {
      verifyData = {};
    }
  }

  const fileHashes: Record<string, string> = {};
  for (const artifact of artifacts) {
    const fullPath = join(projectRoot, artifact.path);
    const hash = computeFileHash(fullPath);
    if (hash) {
      fileHashes[artifact.path] = hash;
    }
  }

  verifyData.file_hashes = fileHashes;
  verifyData.hashes_updated_at = new Date().toISOString();


  writeFileSync(verifyPath, JSON.stringify(verifyData, null, 2) + '\n');
}
