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
}

/**
 * Register the validate command
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate [feature]')
    .description('Validate manifold YAML against schema v1/v2')
    .option('--json', 'Output as JSON')
    .option('--strict', 'Enable strict validation (additional warnings)')
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
    let hasErrors = false;

    for (const f of features) {
      const result = await validateFeature(manifoldDir, f, options);
      results.push(result.json);

      if (!result.valid) {
        hasErrors = true;
      }

      if (!options.json) {
        printValidationOutput(f, result);
        println();
      }
    }

    if (options.json) {
      println(toJSON({
        valid: !hasErrors,
        features: results
      }));
    }

    return hasErrors ? 2 : 0;
  }

  // Validate specific feature
  const result = await validateFeature(manifoldDir, feature, options);

  if (options.json) {
    println(toJSON(result.json));
  } else {
    printValidationOutput(feature, result);
  }

  return result.valid ? 0 : 2;
}

interface FeatureValidationResult {
  valid: boolean;
  json: Record<string, unknown>;
  result?: ValidationResult;
  parseError?: string;
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
 */
function printValidationOutput(feature: string, result: FeatureValidationResult): void {
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

  // Errors
  if (errors.length > 0) {
    println();
    println(`  ${style.error('Errors:')}`);
    for (const err of errors) {
      println(`    ${style.cross()} ${style.dim(err.field)}: ${err.message}`);
      if (err.value !== undefined) {
        println(`      ${style.dim('Value:')} ${JSON.stringify(err.value)}`);
      }
    }
  }

  // Warnings
  if (warnings.length > 0) {
    println();
    println(`  ${style.warning('Warnings:')}`);
    for (const warn of warnings) {
      println(`    ${style.warn()} ${style.dim(warn.field)}: ${warn.message}`);
      if (warn.suggestion) {
        println(`      ${style.dim('Suggestion:')} ${warn.suggestion}`);
      }
    }
  }
}
