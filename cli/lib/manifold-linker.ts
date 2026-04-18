/**
 * JSON-Markdown Linker for Manifold
 * Satisfies: RT-3 (Validate links between JSON structure and Markdown content)
 *
 * This module validates that:
 * 1. All IDs in JSON have matching content in Markdown
 * 2. All tension.between references exist as constraint IDs
 * 3. All required_truth.maps_to references exist
 * 4. Content quality is sufficient (no empty statements/descriptions)
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ZodIssue } from 'zod';
import {
  ManifoldStructureSchema,
  type ManifoldStructure,
  collectStructureIds,
  validateTensionReferences,
  validateRequiredTruthReferences,
  getCategoryKeys,
  SOFTWARE_CATEGORY_KEYS,
  NON_SOFTWARE_CATEGORY_KEYS,
} from './structure-schema.js';
import {
  parseManifoldMarkdown,
  validateMarkdownCompleteness,
  validateContentQuality,
  type ManifoldContent,
} from './markdown-parser.js';

// ============================================================
// Linking Result Types
// ============================================================

export interface LinkingError {
  type: 'missing_content' | 'missing_structure' | 'invalid_reference' | 'empty_content' | 'schema_error';
  field: string;
  message: string;
  suggestion?: string;
}

export interface LinkingWarning {
  type: 'extra_content' | 'quality' | 'recommendation';
  field: string;
  message: string;
  suggestion?: string;
}

export interface LinkingResult {
  valid: boolean;
  errors: LinkingError[];
  warnings: LinkingWarning[];
  summary: {
    totalConstraints: number;
    totalTensions: number;
    totalRequiredTruths: number;
    linkedConstraints: number;
    linkedTensions: number;
    linkedRequiredTruths: number;
  };
}

// ============================================================
// Main Linking Functions
// ============================================================

/**
 * Validate that JSON structure and Markdown content are properly linked
 */
export function validateManifoldLink(
  structure: ManifoldStructure,
  content: ManifoldContent
): LinkingResult {
  const errors: LinkingError[] = [];
  const warnings: LinkingWarning[] = [];

  // Collect all IDs from structure
  const structureIds = collectStructureIds(structure);

  // Collect all IDs from content
  const contentIds = new Set<string>([
    ...content.constraints.keys(),
    ...content.tensions.keys(),
    ...content.requiredTruths.keys(),
  ]);

  // Track linking counts
  let linkedConstraints = 0;
  let linkedTensions = 0;
  let linkedRequiredTruths = 0;

  // ============================================================
  // Check 1: All JSON constraint IDs have Markdown content
  // ============================================================

  if (structure.constraints) {
    const constraintsByCategory = structure.constraints as Record<string, Array<{ id: string }> | undefined>;
    for (const category of getCategoryKeys(structure.domain)) {
      for (const constraint of constraintsByCategory[category] || []) {
        if (!content.constraints.has(constraint.id)) {
          errors.push({
            type: 'missing_content',
            field: `constraints.${category}.${constraint.id}`,
            message: `Constraint "${constraint.id}" not found in Markdown`,
            suggestion: `Add heading "#### ${constraint.id}: [Title]" to Markdown file`,
          });
        } else {
          linkedConstraints++;

          // Check content quality
          const constraintContent = content.constraints.get(constraint.id)!;
          if (!constraintContent.statement || constraintContent.statement.trim() === '') {
            warnings.push({
              type: 'quality',
              field: `constraints.${category}.${constraint.id}`,
              message: `Constraint "${constraint.id}" has empty statement`,
              suggestion: 'Add description text after the constraint heading',
            });
          }
        }
      }
    }
  }

  // ============================================================
  // Check 2: All JSON tension IDs have Markdown content
  // ============================================================

  for (const tension of structure.tensions || []) {
    if (!content.tensions.has(tension.id)) {
      errors.push({
        type: 'missing_content',
        field: `tensions.${tension.id}`,
        message: `Tension "${tension.id}" not found in Markdown`,
        suggestion: `Add heading "### ${tension.id}: [Title]" to Markdown file`,
      });
    } else {
      linkedTensions++;

      // Check content quality
      const tensionContent = content.tensions.get(tension.id)!;
      if (!tensionContent.description || tensionContent.description.trim() === '') {
        warnings.push({
          type: 'quality',
          field: `tensions.${tension.id}`,
          message: `Tension "${tension.id}" has empty description`,
          suggestion: 'Add description text after the tension heading',
        });
      }

      // Check resolved tensions have resolution
      if (tension.status === 'resolved' && !tensionContent.resolution) {
        warnings.push({
          type: 'quality',
          field: `tensions.${tension.id}`,
          message: `Resolved tension "${tension.id}" missing resolution`,
          suggestion: 'Add "> **Resolution:** [explanation]" blockquote',
        });
      }
    }
  }

  // ============================================================
  // Check 3: All JSON required truth IDs have Markdown content
  // ============================================================

  if (structure.anchors?.required_truths) {
    for (const rt of structure.anchors.required_truths) {
      if (!content.requiredTruths.has(rt.id)) {
        errors.push({
          type: 'missing_content',
          field: `anchors.required_truths.${rt.id}`,
          message: `Required truth "${rt.id}" not found in Markdown`,
          suggestion: `Add heading "### ${rt.id}: [Title]" to Markdown file`,
        });
      } else {
        linkedRequiredTruths++;

        // Check content quality
        const rtContent = content.requiredTruths.get(rt.id)!;
        if (!rtContent.statement || rtContent.statement.trim() === '') {
          warnings.push({
            type: 'quality',
            field: `anchors.required_truths.${rt.id}`,
            message: `Required truth "${rt.id}" has empty statement`,
            suggestion: 'Add description text after the required truth heading',
          });
        }
      }
    }
  }

  // ============================================================
  // Check 4: Extra content in Markdown not in JSON (warnings only)
  // ============================================================

  for (const id of content.constraints.keys()) {
    if (!structureIds.has(id)) {
      warnings.push({
        type: 'extra_content',
        field: `markdown.constraints.${id}`,
        message: `Constraint "${id}" in Markdown not found in JSON structure`,
        suggestion: `Add {"id": "${id}", "type": "..."} to JSON constraints`,
      });
    }
  }

  for (const id of content.tensions.keys()) {
    if (!structureIds.has(id)) {
      warnings.push({
        type: 'extra_content',
        field: `markdown.tensions.${id}`,
        message: `Tension "${id}" in Markdown not found in JSON structure`,
        suggestion: `Add {"id": "${id}", ...} to JSON tensions array`,
      });
    }
  }

  for (const id of content.requiredTruths.keys()) {
    if (!structureIds.has(id)) {
      warnings.push({
        type: 'extra_content',
        field: `markdown.requiredTruths.${id}`,
        message: `Required truth "${id}" in Markdown not found in JSON structure`,
        suggestion: `Add {"id": "${id}", ...} to JSON anchors.required_truths`,
      });
    }
  }

  // ============================================================
  // Check 5: Validate tension.between references
  // ============================================================

  const tensionRefErrors = validateTensionReferences(structure);
  for (const { tensionId, missingRef } of tensionRefErrors) {
    errors.push({
      type: 'invalid_reference',
      field: `tensions.${tensionId}.between`,
      message: `Tension "${tensionId}" references unknown constraint "${missingRef}"`,
      suggestion: `Ensure constraint "${missingRef}" exists in JSON constraints`,
    });
  }

  // ============================================================
  // Check 6: Validate required_truth.maps_to references
  // ============================================================

  const rtRefErrors = validateRequiredTruthReferences(structure);
  for (const { truthId, missingRef } of rtRefErrors) {
    warnings.push({
      type: 'quality',
      field: `anchors.required_truths.${truthId}.maps_to`,
      message: `Required truth "${truthId}" maps_to unknown ID "${missingRef}"`,
      suggestion: `Ensure "${missingRef}" exists in constraints or tensions`,
    });
  }

  // ============================================================
  // Count totals
  // ============================================================

  let totalConstraints = 0;
  let totalTensions = structure.tensions?.length || 0;
  let totalRequiredTruths = structure.anchors?.required_truths?.length || 0;

  if (structure.constraints) {
    const constraintsByCategory = structure.constraints as Record<string, Array<unknown> | undefined>;
    for (const category of getCategoryKeys(structure.domain)) {
      totalConstraints += constraintsByCategory[category]?.length || 0;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalConstraints,
      totalTensions,
      totalRequiredTruths,
      linkedConstraints,
      linkedTensions,
      linkedRequiredTruths,
    },
  };
}

// ============================================================
// File-Based Linking
// ============================================================

/**
 * Format a Zod issue as a single-line, actionable error. Adds a domain-aware hint
 * when the discriminated union rejects crossover category keys or when the
 * discriminator is missing or invalid.
 */
function formatZodError(issue: ZodIssue, declaredDomain: unknown): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
  const base = `${path}: ${issue.message}`;

  if (issue.code === 'unrecognized_keys' && path === 'constraints') {
    const keys = (issue as ZodIssue & { keys?: string[] }).keys ?? [];
    const hitSoftware = keys.some((k) => (SOFTWARE_CATEGORY_KEYS as readonly string[]).includes(k));
    const hitNonSoftware = keys.some((k) => (NON_SOFTWARE_CATEGORY_KEYS as readonly string[]).includes(k));
    if (declaredDomain === 'non-software' && hitSoftware) {
      return `${base}\n      hint: domain is "non-software" — use ${NON_SOFTWARE_CATEGORY_KEYS.join('/')} (not ${SOFTWARE_CATEGORY_KEYS.join('/')}).`;
    }
    if (declaredDomain === 'software' && hitNonSoftware) {
      return `${base}\n      hint: domain is "software" — use ${SOFTWARE_CATEGORY_KEYS.join('/')} (not ${NON_SOFTWARE_CATEGORY_KEYS.join('/')}).`;
    }
    // Missing-domain case: preprocess silently mapped to software, but the user
    // actually wrote non-software category keys. The declaredDomain is absent,
    // so the two branches above don't fire — emit an explicit hint to set it.
    if (declaredDomain === undefined && hitNonSoftware) {
      return `${base}\n      hint: this looks like a non-software manifold — set "domain": "non-software" at the top level.`;
    }
  }

  // Zod emits invalid_union_discriminator with path === ['domain'] (not root),
  // so match on code alone. Fires for missing domain and invalid values like "hybrid".
  if (issue.code === 'invalid_union_discriminator') {
    return `${base}\n      hint: set domain to either "software" or "non-software" at the top level.`;
  }

  return base;
}

/**
 * Load and validate a manifold from JSON and Markdown files
 */
export interface LoadManifoldResult {
  success: boolean;
  structure?: ManifoldStructure;
  content?: ManifoldContent;
  linking?: LinkingResult;
  error?: string;
}

export function loadAndValidateManifold(
  jsonPath: string,
  mdPath: string
): LoadManifoldResult {
  // Check JSON file exists
  if (!existsSync(jsonPath)) {
    return {
      success: false,
      error: `JSON structure file not found: ${jsonPath}`,
    };
  }

  // Check Markdown file exists
  if (!existsSync(mdPath)) {
    return {
      success: false,
      error: `Markdown content file not found: ${mdPath}`,
    };
  }

  // Load and parse JSON
  let structure: ManifoldStructure;
  try {
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(jsonContent);
    const result = ManifoldStructureSchema.safeParse(parsed);

    if (!result.success) {
      const declaredDomain = (parsed as { domain?: unknown })?.domain;
      const errors = result.error.errors
        .map((e) => formatZodError(e, declaredDomain))
        .join('\n    ');
      return {
        success: false,
        error: `Invalid JSON structure:\n    ${errors}`,
      };
    }

    structure = result.data;
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  // Load and parse Markdown
  let content: ManifoldContent;
  try {
    const mdContent = readFileSync(mdPath, 'utf-8');
    content = parseManifoldMarkdown(mdContent);
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse Markdown: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  // Validate linking
  const linking = validateManifoldLink(structure, content);

  return {
    success: linking.valid,
    structure,
    content,
    linking,
  };
}

/**
 * Load manifold by feature name from .manifold directory
 */
export function loadManifoldByFeature(
  manifoldDir: string,
  feature: string
): LoadManifoldResult {
  const jsonPath = join(manifoldDir, `${feature}.json`);
  const mdPath = join(manifoldDir, `${feature}.md`);

  return loadAndValidateManifold(jsonPath, mdPath);
}

// ============================================================
// Format Detection (JSON+MD vs YAML)
// ============================================================

export type ManifoldFormat = 'json-md' | 'json' | 'yaml' | 'unknown';

/**
 * Detect the format of a manifold (JSON+MD hybrid, JSON-only, or legacy YAML)
 */
export function detectManifoldFormat(manifoldDir: string, feature: string): ManifoldFormat {
  const jsonPath = join(manifoldDir, `${feature}.json`);
  const mdPath = join(manifoldDir, `${feature}.md`);
  const yamlPath = join(manifoldDir, `${feature}.yaml`);

  const hasJson = existsSync(jsonPath);
  const hasMd = existsSync(mdPath);
  const hasYaml = existsSync(yamlPath);

  if (hasJson && hasMd) {
    return 'json-md';
  }

  if (hasJson) {
    return 'json';
  }

  if (hasYaml) {
    return 'yaml';
  }

  return 'unknown';
}

/**
 * List all features and their formats
 */
export function listFeaturesWithFormat(manifoldDir: string): Array<{
  feature: string;
  format: ManifoldFormat;
}> {
  if (!existsSync(manifoldDir)) return [];

  // readdirSync imported at top level
  const files = readdirSync(manifoldDir) as string[];
  const features = new Set<string>();

  for (const file of files) {
    // Extract feature name from various file types
    if (file.endsWith('.json')) {
      features.add(file.replace('.json', ''));
    } else if (file.endsWith('.yaml') && !file.includes('.anchor.') && !file.includes('.verify.')) {
      features.add(file.replace('.yaml', ''));
    } else if (file.endsWith('.md')) {
      features.add(file.replace('.md', ''));
    }
  }

  return Array.from(features)
    .sort()
    .map((feature) => ({
      feature,
      format: detectManifoldFormat(manifoldDir, feature),
    }));
}

// ============================================================
// Formatting Helpers
// ============================================================

/**
 * Format linking result for display
 */
export function formatLinkingResult(result: LinkingResult): string {
  const lines: string[] = [];

  lines.push('MANIFOLD LINKING VALIDATION');
  lines.push('═══════════════════════════');
  lines.push('');

  // Summary
  const { summary } = result;
  lines.push('Summary:');
  lines.push(`  Constraints: ${summary.linkedConstraints}/${summary.totalConstraints} linked`);
  lines.push(`  Tensions: ${summary.linkedTensions}/${summary.totalTensions} linked`);
  lines.push(`  Required Truths: ${summary.linkedRequiredTruths}/${summary.totalRequiredTruths} linked`);
  lines.push('');

  // Status
  if (result.valid) {
    lines.push('Status: ✓ VALID');
  } else {
    lines.push('Status: ✗ INVALID');
  }
  lines.push('');

  // Errors
  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      lines.push(`  ✗ [${err.type}] ${err.field}`);
      lines.push(`    ${err.message}`);
      if (err.suggestion) {
        lines.push(`    → ${err.suggestion}`);
      }
    }
    lines.push('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warn of result.warnings) {
      lines.push(`  ⚠ [${warn.type}] ${warn.field}`);
      lines.push(`    ${warn.message}`);
      if (warn.suggestion) {
        lines.push(`    → ${warn.suggestion}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
