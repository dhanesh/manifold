/**
 * Show Command for Manifold CLI
 * Satisfies: U2 (Combined view of JSON+Markdown manifolds)
 *
 * Displays a merged view of JSON structure and Markdown content.
 */

import type { Command } from 'commander';
import { join } from 'path';
import { findManifoldDir, listFeatures } from '../lib/parser.js';
import {
  loadManifoldByFeature,
  detectManifoldFormat,
  formatLinkingResult,
} from '../lib/manifold-linker.js';
import type { ManifoldStructure } from '../lib/structure-schema.js';
import type { ManifoldContent } from '../lib/markdown-parser.js';
import {
  println,
  printError,
  style,
  toJSON,
  formatHeader,
} from '../lib/output.js';

interface ShowOptions {
  json?: boolean;
  structure?: boolean;
  content?: boolean;
  validate?: boolean;
}

/**
 * Register the show command
 */
export function registerShowCommand(program: Command): void {
  program
    .command('show [feature]')
    .description('Show combined JSON+Markdown manifold content')
    .option('--json', 'Output as JSON')
    .option('--structure', 'Show only JSON structure')
    .option('--content', 'Show only Markdown content')
    .option('--validate', 'Include linking validation')
    .action(async (feature: string | undefined, options: ShowOptions) => {
      const exitCode = await showCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute show command
 */
async function showCommand(feature: string | undefined, options: ShowOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  // List features if none specified
  if (!feature) {
    const features = listFeatures(manifoldDir);

    if (features.length === 0) {
      if (options.json) {
        println(toJSON({ features: [], message: 'No manifolds found' }));
      } else {
        printError('No manifolds found in .manifold/');
      }
      return 1;
    }

    if (options.json) {
      const result = features.map((f) => ({
        feature: f,
        format: detectManifoldFormat(manifoldDir, f),
      }));
      println(toJSON({ features: result }));
    } else {
      println(formatHeader('Manifolds'));
      println();
      for (const f of features) {
        const format = detectManifoldFormat(manifoldDir, f);
        const formatIcon = format === 'json-md' ? '📄' : format === 'yaml' ? '📝' : '❓';
        println(`  ${formatIcon} ${style.feature(f)} ${style.dim(`(${format})`)}`);
      }
      println();
      println(`  ${style.dim('Use:')} manifold show <feature> ${style.dim('to view details')}`);
    }

    return 0;
  }

  // Check format
  const format = detectManifoldFormat(manifoldDir, feature);

  if (format === 'unknown') {
    if (options.json) {
      println(toJSON({ feature, error: 'Manifold not found' }));
    } else {
      printError(`Manifold "${feature}" not found`);
    }
    return 1;
  }

  if (format === 'yaml') {
    if (options.json) {
      println(toJSON({
        feature,
        format: 'yaml',
        message: 'Use manifold migrate to convert to JSON+Markdown format',
      }));
    } else {
      println(`  ${style.warning('Manifold is in legacy YAML format')}`);
      println(`  ${style.dim('Run:')} manifold migrate ${feature} ${style.dim('to convert')}`);
    }
    return 0;
  }

  // Load JSON+Markdown manifold
  const result = loadManifoldByFeature(manifoldDir, feature);

  if (!result.success) {
    if (options.json) {
      println(toJSON({ feature, error: result.error }));
    } else {
      printError(result.error || 'Failed to load manifold');
    }
    return 1;
  }

  const { structure, content, linking } = result;

  // JSON output
  if (options.json) {
    const output: Record<string, unknown> = { feature, format: 'json-md' };

    if (!options.content) {
      output.structure = structure;
    }

    if (!options.structure && content) {
      output.content = {
        outcome: content.outcome,
        constraints: Object.fromEntries(content.constraints),
        tensions: Object.fromEntries(content.tensions),
        requiredTruths: Object.fromEntries(content.requiredTruths),
      };
    }

    if (options.validate && linking) {
      output.validation = linking;
    }

    println(toJSON(output));
    return linking?.valid === false ? 2 : 0;
  }

  // Human-readable output
  println(formatHeader(`Manifold: ${style.feature(feature)}`));
  println();

  // Show structure (unless --content only)
  if (!options.content && structure) {
    printStructure(structure);
  }

  // Show content (unless --structure only)
  if (!options.structure && content) {
    printContent(content);
  }

  // Show validation (if requested)
  if (options.validate && linking) {
    println();
    println(formatLinkingResult(linking));
  }

  return linking?.valid === false ? 2 : 0;
}

/**
 * Print JSON structure in readable format
 */
function printStructure(structure: ManifoldStructure): void {
  println(`  ${style.dim('Phase:')} ${structure.phase}`);
  println(`  ${style.dim('Schema:')} v${structure.schema_version}`);

  if (structure.mode) {
    println(`  ${style.dim('Mode:')} ${structure.mode}`);
  }

  println();

  // Constraints summary
  if (structure.constraints) {
    const counts = {
      business: structure.constraints.business?.length || 0,
      technical: structure.constraints.technical?.length || 0,
      user_experience: structure.constraints.user_experience?.length || 0,
      security: structure.constraints.security?.length || 0,
      operational: structure.constraints.operational?.length || 0,
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    println(`  ${style.dim('Constraints:')} ${total} total`);
    for (const [category, count] of Object.entries(counts)) {
      if (count > 0) {
        const ids = structure.constraints[category as keyof typeof structure.constraints]
          ?.map((c) => c.id)
          .join(', ');
        println(`    ${category}: ${count} (${ids})`);
      }
    }
    println();
  }

  // Tensions summary
  if (structure.tensions?.length) {
    const resolved = structure.tensions.filter((t) => t.status === 'resolved').length;
    println(`  ${style.dim('Tensions:')} ${structure.tensions.length} (${resolved} resolved)`);
    for (const t of structure.tensions) {
      const statusIcon = t.status === 'resolved' ? style.check() : style.warn();
      println(`    ${statusIcon} ${t.id}: ${t.type} between ${t.between.join(', ')}`);
    }
    println();
  }

  // Required truths summary
  if (structure.anchors?.required_truths?.length) {
    const satisfied = structure.anchors.required_truths.filter(
      (rt) => rt.status === 'SATISFIED'
    ).length;
    println(
      `  ${style.dim('Required Truths:')} ${structure.anchors.required_truths.length} (${satisfied} satisfied)`
    );
    for (const rt of structure.anchors.required_truths) {
      const statusIcon =
        rt.status === 'SATISFIED'
          ? style.check()
          : rt.status === 'PARTIAL'
            ? style.warn()
            : style.cross();
      println(`    ${statusIcon} ${rt.id}: ${rt.status}`);
    }
    println();
  }

  // Convergence
  if (structure.convergence) {
    println(`  ${style.dim('Convergence:')} ${structure.convergence.status}`);
    println();
  }
}

/**
 * Print Markdown content in readable format
 */
function printContent(content: ManifoldContent): void {
  // Outcome
  if (content.outcome) {
    println(`  ${style.dim('Outcome:')}`);
    println(`    ${content.outcome}`);
    println();
  }

  // Constraints
  if (content.constraints.size > 0) {
    println(`  ${style.dim('Constraint Content:')}`);
    for (const [id, c] of content.constraints) {
      println(`    ${style.feature(id)}: ${c.title}`);
      if (c.statement) {
        const preview = c.statement.length > 80 ? c.statement.slice(0, 77) + '...' : c.statement;
        println(`      ${style.dim(preview)}`);
      }
    }
    println();
  }

  // Tensions
  if (content.tensions.size > 0) {
    println(`  ${style.dim('Tension Content:')}`);
    for (const [id, t] of content.tensions) {
      println(`    ${style.feature(id)}: ${t.title}`);
      if (t.description) {
        const preview = t.description.length > 80 ? t.description.slice(0, 77) + '...' : t.description;
        println(`      ${style.dim(preview)}`);
      }
    }
    println();
  }

  // Required Truths
  if (content.requiredTruths.size > 0) {
    println(`  ${style.dim('Required Truth Content:')}`);
    for (const [id, rt] of content.requiredTruths) {
      println(`    ${style.feature(id)}: ${rt.title}`);
      if (rt.statement) {
        const preview = rt.statement.length > 80 ? rt.statement.slice(0, 77) + '...' : rt.statement;
        println(`      ${style.dim(preview)}`);
      }
    }
    println();
  }
}
