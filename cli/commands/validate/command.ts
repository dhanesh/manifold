/**
 * Validate Command registration and orchestration
 * Satisfies: T3 (< 500 lines), T6 (backward-compatible exports), RT-4
 *
 * Contains: registerValidateCommand, validateCommand (top-level orchestrator)
 */

import type { Command } from 'commander';
import {
  findManifoldDir,
  listFeatures,
  type Manifold,
} from '../../lib/parser.js';
import {
  detectCrossFeatureConflicts,
  formatCrossFeatureResults
} from '../../lib/solver.js';
import {
  println,
  printError,
  toJSON
} from '../../lib/output.js';
import type {
  ValidateOptions,
  EvidenceResult,
} from './types.js';
import { validateFeature } from './runner.js';
import { validateEvidenceIntegrity } from './runner.js';
import {
  createMetrics,
  updateMetrics,
  formatMetrics,
  printValidationOutput,
  printEvidenceResults,
} from './formatter.js';

/**
 * Register the validate command
 * Satisfies: T1 (v3 support), TN4 (--all flag for error display)
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate [feature]')
    .description('Validate manifold YAML against schema v1/v2/v3')
    .option('--json', 'Output as JSON')
    .option('--strict', 'Enable strict validation (additional warnings)')
    .option('--all', 'Show all errors (by default, truncates at 20)')
    .option('--conflicts', 'Run semantic conflict detection on constraints')
    .option('--cross-feature', 'Run cross-feature conflict detection (requires no feature arg)')
    .option('--metrics', 'Show validation metrics summary (error breakdown, timing)')
    .option('--evidence', 'Check evidence integrity (paths exist, invariant test chains, orphaned references)')
    .action(async (feature: string | undefined, options: ValidateOptions) => {
      const exitCode = await validateCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute validate command
 * Returns exit code: 0 = valid, 1 = error, 2 = validation failure
 * Satisfies: T3 (Unix exit codes)
 */
async function validateCommand(feature: string | undefined, options: ValidateOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  // Validate all features if none specified
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

    // Validate all features
    const results: Record<string, unknown>[] = [];
    const manifolds: Manifold[] = [];
    let hasErrors = false;
    const metrics = options.metrics ? createMetrics() : null;

    for (const f of features) {
      const result = await validateFeature(manifoldDir, f, options);
      results.push(result.json);

      if (!result.valid) {
        hasErrors = true;
      }

      // Collect manifolds for cross-feature analysis
      if (result.manifold) {
        manifolds.push(result.manifold);
      }

      // Update metrics if tracking
      if (metrics) {
        updateMetrics(metrics, result);
      }

      if (!options.json) {
        printValidationOutput(f, result, { showAll: options.all, conflicts: options.conflicts });

        // Evidence integrity validation
        if (options.evidence) {
          const evidenceIssues = validateEvidenceIntegrity(manifoldDir, f);
          if (evidenceIssues.length > 0) {
            printEvidenceResults(evidenceIssues, { showAll: options.all });
            if (evidenceIssues.some(i => i.level === 'error')) {
              hasErrors = true;
            }
          }
        }

        println();
      }
    }

    // Cross-feature conflict detection (T4)
    let crossFeatureResult = null;
    if (options.crossFeature && manifolds.length > 1) {
      crossFeatureResult = detectCrossFeatureConflicts(manifolds);

      if (!options.json) {
        println();
        println(formatCrossFeatureResults(crossFeatureResult));
      }

      if (crossFeatureResult.hasConflicts) {
        hasErrors = true;
      }
    }

    // Display metrics summary if requested (GAP-4)
    if (metrics && !options.json) {
      metrics.endTime = Date.now();
      println();
      println(formatMetrics(metrics));
    }

    if (options.json) {
      const jsonResult: Record<string, unknown> = {
        valid: !hasErrors,
        features: results
      };

      // Include evidence results in JSON output
      if (options.evidence) {
        const evidenceByFeature: Record<string, EvidenceResult[]> = {};
        for (const f of features) {
          const evidenceIssues = validateEvidenceIntegrity(manifoldDir, f);
          if (evidenceIssues.length > 0) {
            evidenceByFeature[f] = evidenceIssues;
            if (evidenceIssues.some(i => i.level === 'error')) {
              hasErrors = true;
            }
          }
        }
        if (Object.keys(evidenceByFeature).length > 0) {
          jsonResult.evidence = evidenceByFeature;
        }
        // Re-evaluate validity after evidence checks
        jsonResult.valid = !hasErrors;
      }

      // Include cross-feature conflicts in JSON output
      if (crossFeatureResult) {
        jsonResult.crossFeatureConflicts = crossFeatureResult;
      }
      // Include metrics in JSON output
      if (metrics) {
        metrics.endTime = Date.now();
        jsonResult.metrics = {
          duration: metrics.endTime - metrics.startTime,
          totalFeatures: metrics.totalFeatures,
          validFeatures: metrics.validFeatures,
          invalidFeatures: metrics.invalidFeatures,
          schemaVersions: Object.fromEntries(metrics.schemaVersions),
          errorsByCategory: Object.fromEntries(metrics.errorsByCategory),
          warningsByCategory: Object.fromEntries(metrics.warningsByCategory),
          totalErrors: metrics.totalErrors,
          totalWarnings: metrics.totalWarnings
        };
      }
      println(toJSON(jsonResult));
    }

    return hasErrors ? 2 : 0;
  }

  // Validate specific feature
  const metrics = options.metrics ? createMetrics() : null;
  const result = await validateFeature(manifoldDir, feature, options);

  if (metrics) {
    updateMetrics(metrics, result);
    metrics.endTime = Date.now();
  }

  // Evidence integrity validation for single feature
  let evidenceIssues: EvidenceResult[] = [];
  if (options.evidence) {
    evidenceIssues = validateEvidenceIntegrity(manifoldDir, feature);
  }
  const hasEvidenceErrors = evidenceIssues.some(i => i.level === 'error');

  if (options.json) {
    const jsonResult: Record<string, unknown> = { ...result.json };
    if (hasEvidenceErrors) {
      jsonResult.valid = false;
    }
    if (evidenceIssues.length > 0) {
      jsonResult.evidence = evidenceIssues;
    }
    if (metrics) {
      jsonResult.metrics = {
        duration: metrics.endTime! - metrics.startTime,
        totalErrors: metrics.totalErrors,
        totalWarnings: metrics.totalWarnings,
        errorsByCategory: Object.fromEntries(metrics.errorsByCategory),
        warningsByCategory: Object.fromEntries(metrics.warningsByCategory)
      };
    }
    println(toJSON(jsonResult));
  } else {
    printValidationOutput(feature, result, { showAll: options.all, conflicts: options.conflicts });
    if (evidenceIssues.length > 0) {
      printEvidenceResults(evidenceIssues, { showAll: options.all });
    }
    if (metrics) {
      println();
      println(formatMetrics(metrics));
    }
  }

  const isValid = result.valid && !hasEvidenceErrors;
  return isValid ? 0 : 2;
}
