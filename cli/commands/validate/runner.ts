/**
 * Validation runner — core validation orchestration logic
 * Satisfies: T3 (< 500 lines), T6 (backward-compatible exports), RT-4
 *
 * Contains: validateFeature, validateJsonMdFeature, validateJsonOnlyFeature,
 * validateEvidenceIntegrity
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { ParseError } from '../../lib/errors.js';
import {
  loadFeature,
  parseYamlSafe,
  type Manifold,
  type Evidence,
} from '../../lib/parser.js';
import { validateManifold, type ValidationResult } from '../../lib/schema.js';
import {
  detectManifoldFormat,
  loadManifoldByFeature,
} from '../../lib/manifold-linker.js';
import type {
  ValidateOptions,
  FeatureValidationResult,
  EvidenceResult,
} from './types.js';

/**
 * Validate a single feature
 * Supports both YAML and JSON+Markdown formats
 */
export async function validateFeature(
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
    const err = new ParseError(`Failed to read manifold file`, {
      cause: error instanceof Error ? error : undefined,
      filePath: manifoldPath,
    });
    return {
      valid: false,
      json: {
        feature,
        valid: false,
        error: err.toUserMessage(),
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
  _options: ValidateOptions
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
