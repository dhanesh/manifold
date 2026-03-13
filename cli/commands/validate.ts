/**
 * Validate Command for Manifold CLI
 * Satisfies: T2 (Parse both schema v1 and v2 correctly), T3 (Exit codes)
 *
 * Supports both legacy YAML format and new JSON+Markdown hybrid format.
 */

import type { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import {
  findManifoldDir,
  listFeatures,
  loadFeature,
  parseYamlSafe,
  type Manifold,
  type Evidence,
} from '../lib/parser.js';
import { validateManifold, type ValidationResult } from '../lib/schema.js';
import {
  detectSemanticConflicts,
  formatConflictResults,
  detectCrossFeatureConflicts,
  formatCrossFeatureResults
} from '../lib/solver.js';
import {
  detectManifoldFormat,
  loadManifoldByFeature,
  formatLinkingResult,
  type LinkingResult,
} from '../lib/manifold-linker.js';
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
  evidence?: boolean;  // Run evidence integrity validation
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

interface FeatureValidationResult {
  valid: boolean;
  json: Record<string, unknown>;
  result?: ValidationResult;
  parseError?: string;
  manifold?: Manifold;  // For conflict detection (INT-1)
  format?: 'yaml' | 'json' | 'json-md';  // Format of the manifold
  linkingResult?: LinkingResult;  // For JSON+MD format
}

/**
 * Validate a single feature
 * Supports both YAML and JSON+Markdown formats
 */
async function validateFeature(
  manifoldDir: string,
  feature: string,
  options: ValidateOptions
): Promise<FeatureValidationResult> {
  // Detect format
  const format = detectManifoldFormat(manifoldDir, feature);

  // Handle JSON+Markdown format
  if (format === 'json-md') {
    return validateJsonMdFeature(manifoldDir, feature, options);
  }

  // Handle JSON-only format
  if (format === 'json') {
    return validateJsonOnlyFeature(manifoldDir, feature, options);
  }

  // Handle legacy YAML format
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
    format: 'yaml',
    json: {
      feature,
      valid: result.valid,
      format: 'yaml',
      schemaVersion: result.schemaVersion,
      errors: result.errors.length > 0 ? result.errors : undefined,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      path: manifoldPath
    }
  };
}

/**
 * Validate a JSON+Markdown format feature
 */
async function validateJsonMdFeature(
  manifoldDir: string,
  feature: string,
  options: ValidateOptions
): Promise<FeatureValidationResult> {
  const jsonPath = join(manifoldDir, `${feature}.json`);
  const mdPath = join(manifoldDir, `${feature}.md`);

  // Load and validate using linker
  const loadResult = loadManifoldByFeature(manifoldDir, feature);

  // Distinguish between load failure (can't read/parse files) and linking failure
  // (files loaded but cross-references have issues). Only bail out for load failures.
  if (!loadResult.success && !loadResult.linking) {
    return {
      valid: false,
      format: 'json-md',
      json: {
        feature,
        valid: false,
        format: 'json-md',
        error: loadResult.error,
        paths: { json: jsonPath, md: mdPath }
      }
    };
  }

  const { structure, linking } = loadResult;

  // Convert linking result to validation result format
  const errors = (linking?.errors || []).map((e) => ({
    field: e.field,
    message: e.message,
    value: undefined,
  }));

  const warnings = (linking?.warnings || []).map((w) => ({
    field: w.field,
    message: w.message,
    suggestion: w.suggestion,
  }));

  const validationResult: ValidationResult = {
    valid: linking?.valid ?? true,
    errors,
    warnings,
    schemaVersion: 3,
  };

  return {
    valid: validationResult.valid,
    result: validationResult,
    format: 'json-md',
    linkingResult: linking,
    json: {
      feature,
      valid: validationResult.valid,
      format: 'json-md',
      schemaVersion: 3,
      phase: structure?.phase,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      linking: linking ? {
        totalConstraints: linking.summary.totalConstraints,
        linkedConstraints: linking.summary.linkedConstraints,
        totalTensions: linking.summary.totalTensions,
        linkedTensions: linking.summary.linkedTensions,
        totalRequiredTruths: linking.summary.totalRequiredTruths,
        linkedRequiredTruths: linking.summary.linkedRequiredTruths,
      } : undefined,
      paths: { json: jsonPath, md: mdPath }
    }
  };
}

/**
 * Validate a JSON-only format feature (no accompanying .md file)
 */
async function validateJsonOnlyFeature(
  manifoldDir: string,
  feature: string,
  options: ValidateOptions
): Promise<FeatureValidationResult> {
  const jsonPath = join(manifoldDir, `${feature}.json`);

  // Check file exists
  if (!existsSync(jsonPath)) {
    return {
      valid: false,
      json: {
        feature,
        valid: false,
        error: 'Manifold file not found',
        path: jsonPath
      }
    };
  }

  // Read and parse file
  let content: string;
  try {
    content = readFileSync(jsonPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      json: {
        feature,
        valid: false,
        error: `Failed to read file: ${message}`,
        path: jsonPath
      }
    };
  }

  // Parse JSON
  let parsed: Manifold;
  try {
    parsed = JSON.parse(content) as Manifold;
  } catch {
    return {
      valid: false,
      parseError: 'Invalid JSON syntax',
      json: {
        feature,
        valid: false,
        error: 'Invalid JSON syntax',
        path: jsonPath
      }
    };
  }

  // Validate against schema
  const result = validateManifold(parsed, options.strict);

  return {
    valid: result.valid,
    result,
    manifold: parsed,  // Include for conflict detection (INT-1)
    format: 'json',
    json: {
      feature,
      valid: result.valid,
      format: 'json',
      schemaVersion: result.schemaVersion,
      errors: result.errors.length > 0 ? result.errors : undefined,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      path: jsonPath
    }
  };
}

// ============================================================
// Evidence Integrity Validation
// ============================================================

/**
 * Evidence validation result entry.
 * Represents a single finding from evidence integrity checking.
 */
export interface EvidenceResult {
  level: 'error' | 'warning' | 'info';
  message: string;
  /** The constraint or RT ID this result relates to */
  target?: string;
}

/**
 * Validate evidence integrity for a single feature manifold.
 *
 * Checks performed:
 * 1. Orphaned maps_to references (error): RT.maps_to_constraints IDs must exist in constraints
 * 2. Evidence file paths exist on disk (warning): Only checked for GENERATED/VERIFIED phases
 * 3. Invariant constraints have test_passes evidence chain (warning)
 * 4. Evidence type completeness (info): Suggestions for improving evidence coverage
 *
 * @param manifoldDir - Path to .manifold/ directory
 * @param feature - Feature name to validate
 * @returns Array of evidence validation results
 */
export function validateEvidenceIntegrity(
  manifoldDir: string,
  feature: string
): EvidenceResult[] {
  const results: EvidenceResult[] = [];

  // Load the feature using the unified loader
  const featureData = loadFeature(manifoldDir, feature);
  if (!featureData?.manifold) return results;

  const manifold = featureData.manifold;
  const projectRoot = resolve(manifoldDir, '..');

  // Collect all constraint IDs and types
  const constraintIds = new Set<string>();
  const invariantIds = new Set<string>();
  const constraintCategories = ['business', 'technical', 'user_experience', 'security', 'operational'] as const;

  for (const category of constraintCategories) {
    const constraints = manifold.constraints?.[category] ?? [];
    for (const constraint of constraints) {
      if (constraint.id) {
        constraintIds.add(constraint.id);
        if (constraint.type === 'invariant') {
          invariantIds.add(constraint.id);
        }
      }
    }
  }

  // Also check deprecated 'ux' category (v1 compatibility)
  const uxConstraints = manifold.constraints?.ux ?? [];
  for (const constraint of uxConstraints) {
    if (constraint.id) {
      constraintIds.add(constraint.id);
      if (constraint.type === 'invariant') {
        invariantIds.add(constraint.id);
      }
    }
  }

  // Track which invariant constraints have test_passes evidence via any chain
  const constraintsWithTestEvidence = new Set<string>();

  // Only check file paths for phases where artifacts should exist
  const phase = manifold.phase;
  const checkFilePaths = phase === 'GENERATED' || phase === 'VERIFIED';

  // Check required truths
  const requiredTruths = manifold.anchors?.required_truths ?? [];

  // No RTs means nothing to validate
  if (requiredTruths.length === 0) return results;

  for (const rt of requiredTruths) {
    if (!rt.id) continue;

    const mapsTo = rt.maps_to_constraints ?? [];
    // Handle both string (v1/v2) and Evidence[] (v3) evidence formats
    const evidenceArr: Evidence[] = Array.isArray(rt.evidence)
      ? (rt.evidence as Evidence[])
      : [];

    // --- Check 1: Orphaned maps_to references (ERROR) ---
    for (const constraintId of mapsTo) {
      if (!constraintIds.has(constraintId)) {
        results.push({
          level: 'error',
          message: `${rt.id} maps_to '${constraintId}' but ${constraintId} does not exist in constraints`,
          target: rt.id,
        });
      }
    }

    // --- Check 2: Evidence file paths exist on disk (WARNING) ---
    if (checkFilePaths && evidenceArr.length > 0) {
      for (const ev of evidenceArr) {
        if (!ev.path) continue;

        // Only check file-based evidence types
        if (ev.type === 'file_exists' || ev.type === 'content_match' || ev.type === 'test_passes') {
          const fullPath = resolve(projectRoot, ev.path);
          if (!existsSync(fullPath)) {
            results.push({
              level: 'warning',
              message: `${rt.id} evidence path does not exist: ${ev.path}`,
              target: rt.id,
            });
          }
        }
      }
    }

    // --- Track test_passes evidence for invariant chain (Check 3) ---
    const hasTestPasses = evidenceArr.some(ev => ev.type === 'test_passes');
    if (hasTestPasses) {
      for (const constraintId of mapsTo) {
        constraintsWithTestEvidence.add(constraintId);
      }
    }

    // --- Check 4: Evidence type completeness (INFO) ---
    if (evidenceArr.length > 0) {
      const hasFileExists = evidenceArr.some(ev => ev.type === 'file_exists');
      const mapsToInvariant = mapsTo.some(id => invariantIds.has(id));

      if (!hasFileExists) {
        results.push({
          level: 'info',
          message: `${rt.id} has no file_exists evidence — consider adding one to prove code exists`,
          target: rt.id,
        });
      }

      if (mapsToInvariant && !hasTestPasses) {
        results.push({
          level: 'info',
          message: `${rt.id} maps to invariant constraint(s) but has no test_passes evidence — consider adding test_passes for higher confidence`,
          target: rt.id,
        });
      }
    }
  }

  // Also check direct constraint evidence (verified_by field)
  for (const category of constraintCategories) {
    const constraints = manifold.constraints?.[category] ?? [];
    for (const constraint of constraints) {
      const directEvidence: Evidence[] = constraint.verified_by ?? [];
      for (const ev of directEvidence) {
        if (ev.type === 'test_passes') {
          constraintsWithTestEvidence.add(constraint.id);
        }
        // Check file paths on direct evidence too
        if (checkFilePaths && ev.path) {
          const fullPath = resolve(projectRoot, ev.path);
          if (!existsSync(fullPath)) {
            results.push({
              level: 'warning',
              message: `Constraint ${constraint.id} evidence path does not exist: ${ev.path}`,
              target: constraint.id,
            });
          }
        }
      }
    }
  }

  // --- Check 3: Invariant constraints without any test_passes evidence chain (WARNING) ---
  for (const invariantId of invariantIds) {
    if (!constraintsWithTestEvidence.has(invariantId)) {
      // Only warn if at least one RT maps to this invariant
      const hasMappedRT = requiredTruths.some(
        rt => (rt.maps_to_constraints ?? []).includes(invariantId)
      );

      if (hasMappedRT) {
        results.push({
          level: 'warning',
          message: `Invariant constraint ${invariantId} has no test_passes evidence chain`,
          target: invariantId,
        });
      }
    }
  }

  return results;
}

/**
 * Print evidence validation results to console.
 * Groups results by severity (errors, warnings, info) with truncation support.
 */
function printEvidenceResults(results: EvidenceResult[], options: { showAll?: boolean } = {}): void {
  const { showAll = false } = options;

  const errors = results.filter(r => r.level === 'error');
  const warnings = results.filter(r => r.level === 'warning');
  const infos = results.filter(r => r.level === 'info');

  println();
  println(`  ${style.bold('Evidence Integrity:')}`);

  // Errors
  if (errors.length > 0) {
    const errorsToShow = showAll ? errors : errors.slice(0, MAX_ERRORS_DISPLAY);
    for (const err of errorsToShow) {
      println(`    ${style.cross()} ${err.message}`);
    }
    if (!showAll && errors.length > MAX_ERRORS_DISPLAY) {
      const hidden = errors.length - MAX_ERRORS_DISPLAY;
      println(`    ${style.dim(`... and ${hidden} more evidence error${hidden > 1 ? 's' : ''}.`)}`);
    }
  }

  // Warnings
  if (warnings.length > 0) {
    const warningsToShow = showAll ? warnings : warnings.slice(0, MAX_ERRORS_DISPLAY);
    for (const warn of warningsToShow) {
      println(`    ${style.warn()} ${warn.message}`);
    }
    if (!showAll && warnings.length > MAX_ERRORS_DISPLAY) {
      const hidden = warnings.length - MAX_ERRORS_DISPLAY;
      println(`    ${style.dim(`... and ${hidden} more evidence warning${hidden > 1 ? 's' : ''}.`)}`);
    }
  }

  // Info
  if (infos.length > 0) {
    const infosToShow = showAll ? infos : infos.slice(0, MAX_ERRORS_DISPLAY);
    for (const info of infosToShow) {
      println(`    ${style.info('i')} ${style.dim(info.message)}`);
    }
    if (!showAll && infos.length > MAX_ERRORS_DISPLAY) {
      const hidden = infos.length - MAX_ERRORS_DISPLAY;
      println(`    ${style.dim(`... and ${hidden} more evidence info message${hidden > 1 ? 's' : ''}.`)}`);
    }
  }

  // Summary line
  const parts: string[] = [];
  if (errors.length > 0) parts.push(style.error(`${errors.length} error${errors.length !== 1 ? 's' : ''}`));
  if (warnings.length > 0) parts.push(style.warning(`${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`));
  if (infos.length > 0) parts.push(style.dim(`${infos.length} info`));
  if (parts.length > 0) {
    println(`    ${style.dim('Summary:')} ${parts.join(', ')}`);
  } else {
    println(`    ${style.check()} ${style.success('No evidence integrity issues')}`);
  }
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

  // File not found or loading error
  if (!result.result) {
    // Use actual error message from the validation result
    const errorMsg = typeof result.json?.error === 'string' && result.json.error
      ? result.json.error
      : 'Manifold file not found';
    println(`  ${style.cross()} ${style.error(errorMsg)}`);
    if (result.format) {
      const formatLabel = result.format === 'json-md' ? 'JSON+Markdown' :
                          result.format === 'json' ? 'JSON' : 'YAML';
      println(`  ${style.dim('Format:')} ${formatLabel}`);
    }
    if (result.json?.paths) {
      const paths = result.json.paths as { json?: string; md?: string };
      if (paths.json) println(`  ${style.dim('JSON:')} ${paths.json}`);
      if (paths.md) println(`  ${style.dim('MD:')} ${paths.md}`);
    } else if (result.json?.path) {
      println(`  ${style.dim('Path:')} ${result.json.path}`);
    }
    return;
  }

  const { valid, errors, warnings, schemaVersion } = result.result;

  // Format indicator
  if (result.format) {
    const formatLabel = result.format === 'json-md' ? 'JSON+Markdown' :
                        result.format === 'json' ? 'JSON' : 'YAML';
    println(`  Format: ${formatLabel}`);
  }

  // Schema version
  println(`  Schema: v${schemaVersion}`);

  // Linking summary for JSON+MD format
  if (result.linkingResult) {
    const { summary } = result.linkingResult;
    println(`  Linked: ${summary.linkedConstraints}/${summary.totalConstraints} constraints, ` +
            `${summary.linkedTensions}/${summary.totalTensions} tensions, ` +
            `${summary.linkedRequiredTruths}/${summary.totalRequiredTruths} required truths`);
  }

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
