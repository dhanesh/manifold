/**
 * Verify Command for Manifold CLI
 * Satisfies: U1 (mirrors /m5-verify), RT-2 (Output matching AI equivalents)
 */

import type { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import {
  findManifoldDir,
  loadFeature,
  listFeatures,
  type FeatureData,
  type Manifold,
  type Constraint
} from '../lib/parser.js';
import { countConstraints, countConstraintsByType } from '../lib/schema.js';
import {
  println,
  printError,
  formatHeader,
  formatKeyValue,
  style,
  toJSON
} from '../lib/output.js';

interface VerifyOptions {
  json?: boolean;
  artifacts?: boolean;
  strict?: boolean;
}

interface ArtifactVerification {
  path: string;
  exists: boolean;
  type?: string;
  satisfies?: string[];
}

interface VerificationResult {
  feature: string;
  result: 'PASS' | 'FAIL' | 'PARTIAL';
  artifacts?: {
    verified: number;
    total: number;
    missing: string[];
    details: ArtifactVerification[];
  };
  coverage?: {
    constraintsTotal: number;
    constraintsSatisfied: number;
    requiredTruthsTotal: number;
    requiredTruthsSatisfied: number;
    percentage: number;
  };
  issues: string[];
}

/**
 * Register the verify command
 */
export function registerVerifyCommand(program: Command): void {
  program
    .command('verify [feature]')
    .description('Check artifact existence and basic coverage')
    .option('--json', 'Output as JSON')
    .option('--artifacts', 'Verify generated artifacts exist')
    .option('--strict', 'Require all artifacts and coverage')
    .action(async (feature: string | undefined, options: VerifyOptions) => {
      const exitCode = await verifyCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute verify command
 * Returns exit code: 0 = pass, 1 = error, 2 = verification failure
 * Satisfies: T3 (Unix exit codes)
 */
async function verifyCommand(feature: string | undefined, options: VerifyOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  // Verify all features if none specified
  if (!feature) {
    const features = listFeatures(manifoldDir);

    if (features.length === 0) {
      if (options.json) {
        println(toJSON({ features: [], message: 'No manifolds found' }));
      } else {
        printError('No manifolds found in .manifold/', 'Run manifold init <feature> to create one');
      }
      return 1;
    }

    const results: VerificationResult[] = [];
    let hasFailures = false;

    for (const f of features) {
      const result = await verifyFeature(manifoldDir, f, options);
      results.push(result);

      if (result.result === 'FAIL') {
        hasFailures = true;
      }

      if (!options.json) {
        printVerificationOutput(result, options);
        println();
      }
    }

    if (options.json) {
      println(toJSON({
        result: hasFailures ? 'FAIL' : 'PASS',
        features: results
      }));
    }

    return hasFailures ? 2 : 0;
  }

  // Verify specific feature
  const data = loadFeature(manifoldDir, feature);

  if (!data) {
    if (options.json) {
      println(toJSON({ error: `Feature "${feature}" not found` }));
    } else {
      printError(`Feature "${feature}" not found`, `Available features: ${listFeatures(manifoldDir).join(', ') || 'none'}`);
    }
    return 1;
  }

  const result = await verifyFeature(manifoldDir, feature, options);

  if (options.json) {
    println(toJSON(result));
  } else {
    printVerificationOutput(result, options);
  }

  return result.result === 'PASS' ? 0 : 2;
}

/**
 * Verify a single feature
 */
async function verifyFeature(
  manifoldDir: string,
  feature: string,
  options: VerifyOptions
): Promise<VerificationResult> {
  const data = loadFeature(manifoldDir, feature);

  if (!data || !data.manifold) {
    return {
      feature,
      result: 'FAIL',
      issues: ['Manifold file not found or invalid']
    };
  }

  const manifold = data.manifold;
  const issues: string[] = [];
  const result: VerificationResult = {
    feature,
    result: 'PASS',
    issues
  };

  // Verify artifacts if requested or if generation data exists
  if (options.artifacts || manifold.generation?.artifacts) {
    const projectRoot = dirname(manifoldDir);
    const artifactResult = verifyArtifacts(manifold, projectRoot);
    result.artifacts = artifactResult;

    if (artifactResult.missing.length > 0) {
      issues.push(`${artifactResult.missing.length} artifact(s) missing`);
      result.result = options.strict ? 'FAIL' : 'PARTIAL';
    }
  }

  // Calculate coverage
  const coverage = calculateCoverage(manifold);
  result.coverage = coverage;

  if (options.strict) {
    // Strict mode: all constraints should be addressed
    if (coverage.percentage < 100) {
      issues.push(`Coverage is ${coverage.percentage}% (strict requires 100%)`);
      result.result = 'FAIL';
    }

    // All required truths should be satisfied
    if (coverage.requiredTruthsSatisfied < coverage.requiredTruthsTotal) {
      issues.push(`${coverage.requiredTruthsTotal - coverage.requiredTruthsSatisfied} required truth(s) not satisfied`);
      result.result = 'FAIL';
    }
  }

  // Check for unresolved tensions
  const unresolvedTensions = manifold.tensions?.filter(t => t.status === 'unresolved') ?? [];
  if (unresolvedTensions.length > 0) {
    issues.push(`${unresolvedTensions.length} unresolved tension(s)`);
    if (options.strict) {
      result.result = 'FAIL';
    }
  }

  // Phase check for strict mode
  if (options.strict && manifold.phase !== 'VERIFIED') {
    issues.push(`Phase is ${manifold.phase}, expected VERIFIED`);
    result.result = 'FAIL';
  }

  return result;
}

/**
 * Verify artifacts exist on disk
 */
function verifyArtifacts(manifold: Manifold, projectRoot: string): NonNullable<VerificationResult['artifacts']> {
  const artifacts = manifold.generation?.artifacts ?? [];
  const details: ArtifactVerification[] = [];
  const missing: string[] = [];

  for (const artifact of artifacts) {
    const fullPath = join(projectRoot, artifact.path);
    const exists = existsSync(fullPath);

    details.push({
      path: artifact.path,
      exists,
      type: artifact.type,
      satisfies: artifact.satisfies
    });

    if (!exists) {
      missing.push(artifact.path);
    }
  }

  return {
    verified: details.filter(d => d.exists).length,
    total: artifacts.length,
    missing,
    details
  };
}

/**
 * Calculate coverage metrics
 */
function calculateCoverage(manifold: Manifold): NonNullable<VerificationResult['coverage']> {
  const constraintCounts = countConstraints(manifold);
  const totalConstraints = constraintCounts.total;

  // Count satisfied from verification, generation coverage, or estimate from phase
  let satisfiedConstraints = 0;

  // Priority 1: Check verification section (most accurate, post-verification)
  if (manifold.verification?.constraints_satisfied !== undefined) {
    satisfiedConstraints = manifold.verification.constraints_satisfied;
  }
  // Priority 2: Check generation coverage
  else if (manifold.generation?.coverage?.constraints_addressed !== undefined) {
    satisfiedConstraints = manifold.generation.coverage.constraints_addressed;
  }
  // Priority 3: Estimate based on phase
  else {
    const phaseProgress: Record<string, number> = {
      'INITIALIZED': 0,
      'CONSTRAINED': 0.2,
      'TENSIONED': 0.4,
      'ANCHORED': 0.6,
      'GENERATED': 0.8,
      'VERIFIED': 1.0
    };
    satisfiedConstraints = Math.floor(totalConstraints * (phaseProgress[manifold.phase] ?? 0));
  }

  // Count required truths - check verification first, then anchors
  const requiredTruths = manifold.anchors?.required_truths ?? [];
  let satisfiedTruths = 0;

  // Check if verification has the satisfied count
  if (manifold.verification?.required_truths_satisfied) {
    const rtStr = String(manifold.verification.required_truths_satisfied);
    const match = rtStr.match(/^(\d+)/);
    satisfiedTruths = match ? parseInt(match[1], 10) : 0;
  } else {
    satisfiedTruths = requiredTruths.filter(rt => rt.status === 'SATISFIED').length;
  }

  const percentage = totalConstraints > 0
    ? Math.round((satisfiedConstraints / totalConstraints) * 100)
    : 0;

  return {
    constraintsTotal: totalConstraints,
    constraintsSatisfied: satisfiedConstraints,
    requiredTruthsTotal: requiredTruths.length,
    requiredTruthsSatisfied: satisfiedTruths,
    percentage
  };
}

/**
 * Print verification output to console
 */
function printVerificationOutput(result: VerificationResult, options: VerifyOptions): void {
  // Header with result
  const resultColor = result.result === 'PASS'
    ? style.success(result.result)
    : result.result === 'PARTIAL'
      ? style.warning(result.result)
      : style.error(result.result);

  println(formatHeader(`Verify: ${style.feature(result.feature)} → ${resultColor}`));

  // Coverage
  if (result.coverage) {
    const c = result.coverage;
    println(formatKeyValue(
      'Constraints',
      `${c.constraintsSatisfied}/${c.constraintsTotal} (${c.percentage}%)`
    ));

    if (c.requiredTruthsTotal > 0) {
      println(formatKeyValue(
        'Required Truths',
        `${c.requiredTruthsSatisfied}/${c.requiredTruthsTotal} satisfied`
      ));
    }
  }

  // Artifacts
  if (result.artifacts) {
    const a = result.artifacts;
    const artifactStatus = a.missing.length === 0
      ? style.success(`${a.verified}/${a.total} exist`)
      : style.warning(`${a.verified}/${a.total} exist, ${a.missing.length} missing`);

    println(formatKeyValue('Artifacts', artifactStatus));

    // Show missing artifacts
    if (a.missing.length > 0 && !options.json) {
      println();
      println(`  ${style.warning('Missing:')}`);
      for (const path of a.missing) {
        println(`    ${style.cross()} ${path}`);
      }
    }
  }

  // Issues
  if (result.issues.length > 0) {
    println();
    println(`  ${style.warning('Issues:')}`);
    for (const issue of result.issues) {
      println(`    ${style.warn()} ${issue}`);
    }
  }
}
