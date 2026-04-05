/**
 * Output formatting for validation results
 * Satisfies: T3 (< 500 lines), T6 (backward-compatible exports), RT-4
 *
 * Contains: printValidationOutput, printEvidenceResults, metrics helpers
 */

import {
  detectSemanticConflicts,
  formatConflictResults,
} from '../../lib/solver.js';
import {
  println,
  formatHeader,
  formatValidationResult,
  style,
} from '../../lib/output.js';
import type {
  FeatureValidationResult,
  EvidenceResult,
  ValidationMetrics,
} from './types.js';

// Maximum errors to display before truncation (per U3)
export const MAX_ERRORS_DISPLAY = 20;

/**
 * Create initial metrics object
 */
export function createMetrics(): ValidationMetrics {
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
export function updateMetrics(metrics: ValidationMetrics, result: FeatureValidationResult): void {
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
export function formatMetrics(metrics: ValidationMetrics): string {
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

/**
 * Print validation output to console
 * Satisfies: U3 (error truncation), TN4 (--all flag), INT-1 (conflict detection)
 */
export function printValidationOutput(feature: string, result: FeatureValidationResult, options: { showAll?: boolean; conflicts?: boolean } = {}): void {
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

/**
 * Print evidence validation results to console.
 * Groups results by severity (errors, warnings, info) with truncation support.
 */
export function printEvidenceResults(results: EvidenceResult[], options: { showAll?: boolean } = {}): void {
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
