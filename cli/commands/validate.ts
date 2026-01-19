/**
 * Validate Command for Manifold CLI
 * Satisfies: T2 (Parse both schema v1 and v2 correctly), T3 (Exit codes)
 */

import type { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  findManifoldDir,
  listFeatures,
  parseYamlSafe,
  type Manifold
} from '../lib/parser.js';
import { validateManifold, type ValidationResult } from '../lib/schema.js';
import {
  detectSemanticConflicts,
  formatConflictResults,
  detectCrossFeatureConflicts,
  formatCrossFeatureResults
} from '../lib/solver.js';
import {
  println,
  printError,
  printWarning,
  formatHeader,
  formatValidationResult,
  style,
  toJSON
} from '../lib/output.js';

interface ValidateOptions {
  json?: boolean;
  strict?: boolean;
  all?: boolean;  // Show all errors instead of truncating at 20 (TN4 resolution)
  conflicts?: boolean;  // Run semantic conflict detection (INT-1, B2, RT-4)
  crossFeature?: boolean;  // Run cross-feature conflict detection (T4)
  metrics?: boolean;  // Show validation metrics summary (GAP-4)
}

/**
 * Validation metrics for tracking error patterns
 * Satisfies: GAP-4 (error metrics tracking)
 */
interface ValidationMetrics {
  startTime: number;
  endTime?: number;
  totalFeatures: number;
  validFeatures: number;
  invalidFeatures: number;
  schemaVersions: Map<number, number>;  // version -> count
  errorsByCategory: Map<string, number>;  // field category -> count
  warningsByCategory: Map<string, number>;
  totalErrors: number;
  totalWarnings: number;
  parseErrors: number;
  fileNotFound: number;
}

/**
 * Create initial metrics object
 */
function createMetrics(): ValidationMetrics {
  return {
    startTime: Date.now(),
    totalFeatures: 0,
    validFeatures: 0,
    invalidFeatures: 0,
    schemaVersions: new Map(),
    errorsByCategory: new Map(),
    warningsByCategory: new Map(),
    totalErrors: 0,
    totalWarnings: 0,
    parseErrors: 0,
    fileNotFound: 0
  };
}

/**
 * Update metrics from a validation result
 */
function updateMetrics(metrics: ValidationMetrics, result: FeatureValidationResult): void {
  metrics.totalFeatures++;

  if (result.valid) {
    metrics.validFeatures++;
  } else {
    metrics.invalidFeatures++;
  }

  // Track parse errors and file not found
  if (result.parseError) {
    metrics.parseErrors++;
  }
  if (!result.result && !result.parseError) {
    metrics.fileNotFound++;
  }

  // Track schema versions and errors
  if (result.result) {
    const version = result.result.schemaVersion;
    metrics.schemaVersions.set(version, (metrics.schemaVersions.get(version) || 0) + 1);

    // Categorize errors by field path root
    for (const err of result.result.errors) {
      const category = extractCategory(err.field);
      metrics.errorsByCategory.set(category, (metrics.errorsByCategory.get(category) || 0) + 1);
      metrics.totalErrors++;
    }

    // Categorize warnings
    for (const warn of result.result.warnings) {
      const category = extractCategory(warn.field);
      metrics.warningsByCategory.set(category, (metrics.warningsByCategory.get(category) || 0) + 1);
      metrics.totalWarnings++;
    }
  }
}

/**
 * Extract category from field path (e.g., "constraints.business[0].id" -> "constraints")
 */
function extractCategory(field: string): string {
  const parts = field.split(/[.\[]/);
  return parts[0] || 'root';
}

/**
 * Format metrics for display
 */
function formatMetrics(metrics: ValidationMetrics): string {
  const lines: string[] = [];
  const duration = (metrics.endTime || Date.now()) - metrics.startTime;

  lines.push(formatHeader('Validation Metrics'));
  lines.push('');

  // Summary
  lines.push(`  ${style.dim('Features Validated:')} ${metrics.totalFeatures}`);
  lines.push(`  ${style.dim('Valid:')} ${style.success(String(metrics.validFeatures))} | ${style.dim('Invalid:')} ${metrics.invalidFeatures > 0 ? style.error(String(metrics.invalidFeatures)) : '0'}`);
  lines.push(`  ${style.dim('Duration:')} ${duration}ms`);
  lines.push('');

  // Schema versions
  if (metrics.schemaVersions.size > 0) {
    lines.push(`  ${style.dim('Schema Versions:')}`);
    const sortedVersions = [...metrics.schemaVersions.entries()].sort((a, b) => b[0] - a[0]);
    for (const [version, count] of sortedVersions) {
      const percentage = Math.round((count / metrics.totalFeatures) * 100);
      lines.push(`    v${version}: ${count} (${percentage}%)`);
    }
    lines.push('');
  }

  // Error breakdown
  if (metrics.totalErrors > 0) {
    lines.push(`  ${style.error('Errors by Category:')} (${metrics.totalErrors} total)`);
    const sortedErrors = [...metrics.errorsByCategory.entries()].sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedErrors) {
      lines.push(`    ${category}: ${count}`);
    }
    lines.push('');
  }

  // Warning breakdown
  if (metrics.totalWarnings > 0) {
    lines.push(`  ${style.warning('Warnings by Category:')} (${metrics.totalWarnings} total)`);
    const sortedWarnings = [...metrics.warningsByCategory.entries()].sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedWarnings) {
      lines.push(`    ${category}: ${count}`);
    }
    lines.push('');
  }

  // Special cases
  if (metrics.parseErrors > 0 || metrics.fileNotFound > 0) {
    lines.push(`  ${style.dim('Issues:')}`);
    if (metrics.parseErrors > 0) {
      lines.push(`    Parse errors: ${metrics.parseErrors}`);
    }
    if (metrics.fileNotFound > 0) {
      lines.push(`    Files not found: ${metrics.fileNotFound}`);
    }
  }

  return lines.join('\n');
}

// Maximum errors to display before truncation (per U3)
const MAX_ERRORS_DISPLAY = 20;

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

  if (options.json) {
    const jsonResult: Record<string, unknown> = { ...result.json };
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
    if (metrics) {
      println();
      println(formatMetrics(metrics));
    }
  }

  return result.valid ? 0 : 2;
}

interface FeatureValidationResult {
  valid: boolean;
  json: Record<string, unknown>;
  result?: ValidationResult;
  parseError?: string;
  manifold?: Manifold;  // For conflict detection (INT-1)
}

/**
 * Validate a single feature
 */
async function validateFeature(
  manifoldDir: string,
  feature: string,
  options: ValidateOptions
): Promise<FeatureValidationResult> {
  const manifoldPath = join(manifoldDir, `${feature}.yaml`);

  // Check file exists
  if (!existsSync(manifoldPath)) {
    return {
      valid: false,
      json: {
        feature,
        valid: false,
        error: 'Manifold file not found',
        path: manifoldPath
      }
    };
  }

  // Read and parse file
  let content: string;
  try {
    content = readFileSync(manifoldPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      json: {
        feature,
        valid: false,
        error: `Failed to read file: ${message}`,
        path: manifoldPath
      }
    };
  }

  // Parse YAML
  const parsed = parseYamlSafe<Manifold>(content);

  if (!parsed) {
    return {
      valid: false,
      parseError: 'Invalid YAML syntax',
      json: {
        feature,
        valid: false,
        error: 'Invalid YAML syntax',
        path: manifoldPath
      }
    };
  }

  // Validate against schema
  const result = validateManifold(parsed, options.strict);

  return {
    valid: result.valid,
    result,
    manifold: parsed,  // Include for conflict detection (INT-1)
    json: {
      feature,
      valid: result.valid,
      schemaVersion: result.schemaVersion,
      errors: result.errors.length > 0 ? result.errors : undefined,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      path: manifoldPath
    }
  };
}

/**
 * Print validation output to console
 * Satisfies: U3 (error truncation), TN4 (--all flag), INT-1 (conflict detection)
 */
function printValidationOutput(feature: string, result: FeatureValidationResult, options: { showAll?: boolean; conflicts?: boolean } = {}): void {
  const { showAll = false, conflicts = false } = options;
  println(formatHeader(`Validating: ${style.feature(feature)}`));

  // Parse error
  if (result.parseError) {
    println(`  ${style.cross()} ${style.error(result.parseError)}`);
    return;
  }

  // File not found
  if (!result.result) {
    println(`  ${style.cross()} ${style.error('Manifold file not found')}`);
    return;
  }

  const { valid, errors, warnings, schemaVersion } = result.result;

  // Schema version
  println(`  Schema: v${schemaVersion}`);

  // Overall result
  println(`  Result: ${formatValidationResult(valid, errors.length, warnings.length)}`);

  // Errors with truncation (per U3, TN4)
  if (errors.length > 0) {
    println();
    println(`  ${style.error('Errors:')}`);

    const errorsToShow = showAll ? errors : errors.slice(0, MAX_ERRORS_DISPLAY);

    for (const err of errorsToShow) {
      println(`    ${style.cross()} ${style.dim(err.field)}: ${err.message}`);
      if (err.value !== undefined) {
        println(`      ${style.dim('Value:')} ${JSON.stringify(err.value)}`);
      }
    }

    // Show truncation message if applicable
    if (!showAll && errors.length > MAX_ERRORS_DISPLAY) {
      const hidden = errors.length - MAX_ERRORS_DISPLAY;
      println();
      println(`  ${style.dim(`... and ${hidden} more error${hidden > 1 ? 's' : ''}. Run with --all to see all ${errors.length} errors.`)}`);
    }
  }

  // Warnings with truncation
  if (warnings.length > 0) {
    println();
    println(`  ${style.warning('Warnings:')}`);

    const warningsToShow = showAll ? warnings : warnings.slice(0, MAX_ERRORS_DISPLAY);

    for (const warn of warningsToShow) {
      println(`    ${style.warn()} ${style.dim(warn.field)}: ${warn.message}`);
      if (warn.suggestion) {
        println(`      ${style.dim('Suggestion:')} ${warn.suggestion}`);
      }
    }

    // Show truncation message if applicable
    if (!showAll && warnings.length > MAX_ERRORS_DISPLAY) {
      const hidden = warnings.length - MAX_ERRORS_DISPLAY;
      println();
      println(`  ${style.dim(`... and ${hidden} more warning${hidden > 1 ? 's' : ''}. Run with --all to see all ${warnings.length} warnings.`)}`);
    }
  }

  // Semantic conflict detection (INT-1, B2, RT-4)
  if (conflicts && result.manifold) {
    println();
    const conflictResult = detectSemanticConflicts(result.manifold);
    println(formatConflictResults(conflictResult));
  }
}
