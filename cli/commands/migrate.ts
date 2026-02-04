/**
 * Migrate Command for Manifold CLI
 * Satisfies: B4 (Version migration path), RT-6 (YAML to JSON+MD migration)
 *
 * Converts legacy YAML manifolds to the new JSON+Markdown hybrid format.
 */

import type { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';
import {
  findManifoldDir,
  listFeatures,
  type Manifold,
  type Constraint,
  type Tension,
  type RequiredTruth,
} from '../lib/parser.js';
import { detectManifoldFormat } from '../lib/manifold-linker.js';
import type { ManifoldStructure, ConstraintRef, TensionRef, RequiredTruthRef } from '../lib/structure-schema.js';
import {
  println,
  printError,
  printWarning,
  style,
  toJSON,
} from '../lib/output.js';

interface MigrateOptions {
  json?: boolean;
  dryRun?: boolean;
  backup?: boolean;
  all?: boolean;
}

/**
 * Register the migrate command
 */
export function registerMigrateCommand(program: Command): void {
  program
    .command('migrate [feature]')
    .description('Migrate YAML manifold to JSON+Markdown format')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Show what would be migrated without making changes')
    .option('--backup', 'Keep YAML file as .backup (default: true)', true)
    .option('--all', 'Migrate all YAML manifolds')
    .action(async (feature: string | undefined, options: MigrateOptions) => {
      const exitCode = await migrateCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute migrate command
 */
async function migrateCommand(feature: string | undefined, options: MigrateOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  // Migrate all YAML manifolds
  if (options.all || !feature) {
    const features = listFeatures(manifoldDir);
    const results: MigrationResult[] = [];

    for (const f of features) {
      const format = detectManifoldFormat(manifoldDir, f);
      if (format === 'yaml') {
        const result = await migrateFeature(manifoldDir, f, options);
        results.push(result);

        if (!options.json) {
          printMigrationResult(f, result, options.dryRun);
        }
      }
    }

    if (results.length === 0) {
      if (options.json) {
        println(toJSON({ message: 'No YAML manifolds found to migrate' }));
      } else {
        println(`  ${style.dim('No YAML manifolds found to migrate')}`);
      }
      return 0;
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (options.json) {
      println(toJSON({
        migrated: successful,
        failed,
        results,
      }));
    } else {
      println();
      println(`  ${style.dim('Summary:')} ${successful} migrated, ${failed} failed`);
    }

    return failed > 0 ? 2 : 0;
  }

  // Migrate specific feature
  const format = detectManifoldFormat(manifoldDir, feature);

  if (format === 'json-md') {
    if (options.json) {
      println(toJSON({
        feature,
        message: 'Already in JSON+Markdown format',
      }));
    } else {
      println(`  ${style.check()} ${style.feature(feature)} is already in JSON+Markdown format`);
    }
    return 0;
  }

  if (format === 'unknown') {
    if (options.json) {
      println(toJSON({
        feature,
        error: 'Manifold not found',
      }));
    } else {
      printError(`Manifold "${feature}" not found`);
    }
    return 1;
  }

  const result = await migrateFeature(manifoldDir, feature, options);

  if (options.json) {
    println(toJSON(result));
  } else {
    printMigrationResult(feature, result, options.dryRun);
  }

  return result.success ? 0 : 2;
}

interface MigrationResult {
  feature: string;
  success: boolean;
  error?: string;
  jsonPath?: string;
  mdPath?: string;
  backupPath?: string;
  structure?: ManifoldStructure;
}

/**
 * Migrate a single feature from YAML to JSON+Markdown
 */
async function migrateFeature(
  manifoldDir: string,
  feature: string,
  options: MigrateOptions
): Promise<MigrationResult> {
  const yamlPath = join(manifoldDir, `${feature}.yaml`);
  const jsonPath = join(manifoldDir, `${feature}.json`);
  const mdPath = join(manifoldDir, `${feature}.md`);

  // Read YAML
  if (!existsSync(yamlPath)) {
    return {
      feature,
      success: false,
      error: 'YAML file not found',
    };
  }

  let manifold: Manifold;
  try {
    const content = readFileSync(yamlPath, 'utf-8');
    manifold = yaml.parse(content) as Manifold;
  } catch (err) {
    return {
      feature,
      success: false,
      error: `Failed to parse YAML: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  // Extract structure (JSON)
  const structure = extractStructure(manifold);

  // Generate Markdown content
  const markdown = generateMarkdown(manifold);

  // Dry run - just return what would be created
  if (options.dryRun) {
    return {
      feature,
      success: true,
      jsonPath,
      mdPath,
      structure,
    };
  }

  // Write JSON structure
  try {
    writeFileSync(jsonPath, JSON.stringify(structure, null, 2), 'utf-8');
  } catch (err) {
    return {
      feature,
      success: false,
      error: `Failed to write JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  // Write Markdown content
  try {
    writeFileSync(mdPath, markdown, 'utf-8');
  } catch (err) {
    return {
      feature,
      success: false,
      error: `Failed to write Markdown: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  // Backup YAML (or remove)
  let backupPath: string | undefined;
  if (options.backup !== false) {
    backupPath = `${yamlPath}.backup`;
    try {
      renameSync(yamlPath, backupPath);
    } catch (err) {
      // Non-fatal - migration still succeeded
      backupPath = undefined;
    }
  }

  return {
    feature,
    success: true,
    jsonPath,
    mdPath,
    backupPath,
    structure,
  };
}

/**
 * Extract structure from YAML manifold (no text content)
 */
function extractStructure(manifold: Manifold): ManifoldStructure {
  const structure: ManifoldStructure = {
    schema_version: 3,
    feature: manifold.feature,
    phase: manifold.phase,
    mode: manifold.mode,
    created: manifold.created,
    template: manifold.template,
    template_version: manifold.template_version,
  };

  // Extract constraint references (IDs and types only)
  if (manifold.constraints) {
    structure.constraints = {
      business: (manifold.constraints.business || []).map(extractConstraintRef),
      technical: (manifold.constraints.technical || []).map(extractConstraintRef),
      user_experience: (manifold.constraints.user_experience || manifold.constraints.ux || []).map(extractConstraintRef),
      security: (manifold.constraints.security || []).map(extractConstraintRef),
      operational: (manifold.constraints.operational || []).map(extractConstraintRef),
    };
  }

  // Extract tension references
  if (manifold.tensions) {
    structure.tensions = manifold.tensions.map(extractTensionRef);
  }

  // Extract tension summary
  if (manifold.tension_summary) {
    structure.tension_summary = manifold.tension_summary;
  }

  // Extract anchors
  if (manifold.anchors) {
    structure.anchors = {
      required_truths: (manifold.anchors.required_truths || []).map(extractRequiredTruthRef),
      recommended_option: manifold.anchors.recommended_option,
      implementation_phases: manifold.anchors.implementation_phases,
    };
  }

  // Extract iterations
  if (manifold.iterations) {
    structure.iterations = manifold.iterations;
  }

  // Extract convergence
  if (manifold.convergence) {
    structure.convergence = manifold.convergence;
  }

  // Extract generation
  if (manifold.generation) {
    structure.generation = manifold.generation;
  }

  // Extract constraint graph
  if (manifold.constraint_graph) {
    structure.constraint_graph = manifold.constraint_graph;
  }

  // Extract quick summary for light mode
  if (manifold.quick_summary) {
    structure.quick_summary = manifold.quick_summary;
  }

  return structure;
}

function extractConstraintRef(c: Constraint): ConstraintRef {
  return {
    id: c.id,
    type: c.type,
  };
}

function extractTensionRef(t: Tension): TensionRef {
  return {
    id: t.id,
    type: t.type,
    between: t.between,
    status: t.status,
  };
}

function extractRequiredTruthRef(rt: RequiredTruth): RequiredTruthRef {
  return {
    id: rt.id,
    status: rt.status,
    maps_to: rt.maps_to_constraints,
  };
}

/**
 * Generate Markdown content from YAML manifold
 */
function generateMarkdown(manifold: Manifold): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${manifold.feature}`);
  lines.push('');

  // Outcome
  lines.push('## Outcome');
  lines.push('');
  lines.push(manifold.outcome || '[No outcome specified]');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Context
  if (manifold.context) {
    lines.push('## Context');
    lines.push('');

    if (manifold.context.motivation?.length) {
      lines.push('### Motivation');
      lines.push('');
      for (const m of manifold.context.motivation) {
        lines.push(`- ${m}`);
      }
      lines.push('');
    }

    if (manifold.context.prior_art?.length) {
      lines.push('### Prior Art');
      lines.push('');
      for (const p of manifold.context.prior_art) {
        lines.push(`- ${p}`);
      }
      lines.push('');
    }

    if (manifold.context.success_metrics?.length) {
      lines.push('### Success Metrics');
      lines.push('');
      for (const s of manifold.context.success_metrics) {
        lines.push(`- ${s}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Constraints
  lines.push('## Constraints');
  lines.push('');

  const categories = [
    { key: 'business', label: 'Business' },
    { key: 'technical', label: 'Technical' },
    { key: 'user_experience', label: 'User Experience' },
    { key: 'security', label: 'Security' },
    { key: 'operational', label: 'Operational' },
  ];

  for (const { key, label } of categories) {
    const constraints = manifold.constraints?.[key as keyof typeof manifold.constraints] || [];
    if (constraints.length === 0) continue;

    lines.push(`### ${label}`);
    lines.push('');

    for (const c of constraints as Constraint[]) {
      lines.push(`#### ${c.id}: ${c.statement.split('.')[0] || 'Untitled'}`);
      lines.push('');
      lines.push(c.statement);
      lines.push('');

      if (c.rationale) {
        lines.push(`> **Rationale:** ${c.rationale}`);
        lines.push('');
      }

      if (c.implemented_by?.length) {
        lines.push(`**Implemented by:** ${c.implemented_by.map(p => `\`${p}\``).join(', ')}`);
        lines.push('');
      }

      if (c.verified_by?.length) {
        const verifiers = c.verified_by.map(e =>
          typeof e === 'string' ? e : e.path || 'unknown'
        );
        lines.push(`**Verified by:** ${verifiers.map(p => `\`${p}\``).join(', ')}`);
        lines.push('');
      }
    }
  }

  // Tensions
  if (manifold.tensions?.length) {
    lines.push('---');
    lines.push('');
    lines.push('## Tensions');
    lines.push('');

    for (const t of manifold.tensions) {
      const titlePart = t.description.split('.')[0] || 'Untitled';
      lines.push(`### ${t.id}: ${titlePart}`);
      lines.push('');
      lines.push(t.description);
      lines.push('');

      if (t.resolution) {
        lines.push(`> **Resolution:** ${t.resolution}`);
        lines.push('');
      }
    }
  }

  // Required Truths
  if (manifold.anchors?.required_truths?.length) {
    lines.push('---');
    lines.push('');
    lines.push('## Required Truths');
    lines.push('');

    for (const rt of manifold.anchors.required_truths) {
      const titlePart = rt.statement.split('.')[0] || 'Untitled';
      lines.push(`### ${rt.id}: ${titlePart}`);
      lines.push('');
      lines.push(rt.statement);
      lines.push('');

      if (rt.evidence) {
        const evidenceStr = typeof rt.evidence === 'string'
          ? rt.evidence
          : Array.isArray(rt.evidence)
            ? rt.evidence.map(e => e.path || 'unknown').join(', ')
            : 'unknown';
        lines.push(`**Evidence:** ${evidenceStr}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

/**
 * Print migration result
 */
function printMigrationResult(feature: string, result: MigrationResult, dryRun?: boolean): void {
  if (result.success) {
    const prefix = dryRun ? style.dim('[dry-run] ') : '';
    println(`  ${prefix}${style.check()} ${style.feature(feature)}`);
    println(`    JSON: ${result.jsonPath}`);
    println(`    MD:   ${result.mdPath}`);
    if (result.backupPath) {
      println(`    ${style.dim(`Backup: ${result.backupPath}`)}`);
    }
  } else {
    println(`  ${style.cross()} ${style.feature(feature)}: ${style.error(result.error || 'Unknown error')}`);
  }
}
