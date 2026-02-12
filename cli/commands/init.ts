/**
 * Init Command for Manifold CLI
 * Satisfies: U1 (mirrors /manifold:m0-init), RT-5 (Edge case handling)
 *
 * Generates JSON+Markdown hybrid format (preferred) by default.
 */

import type { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findManifoldDir } from '../lib/parser.js';
import {
  println,
  printError,
  style,
  toJSON
} from '../lib/output.js';

interface InitOptions {
  json?: boolean;
  outcome?: string;
  force?: boolean;
}

/**
 * Register the init command
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init <feature>')
    .description('Create a new manifold with template')
    .option('--json', 'Output as JSON')
    .option('-o, --outcome <outcome>', 'Set the outcome statement')
    .option('-f, --force', 'Overwrite existing manifold')
    .action(async (feature: string, options: InitOptions) => {
      const exitCode = await initCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute init command
 * Returns exit code: 0 = success, 1 = error
 */
async function initCommand(feature: string, options: InitOptions): Promise<number> {
  // Validate feature name
  if (!isValidFeatureName(feature)) {
    if (options.json) {
      println(toJSON({
        error: 'Invalid feature name',
        message: 'Feature name must be lowercase alphanumeric with hyphens only'
      }));
    } else {
      printError(
        'Invalid feature name',
        'Use lowercase alphanumeric characters and hyphens only (e.g., my-feature)'
      );
    }
    return 1;
  }

  // Find or create .manifold directory
  let manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    manifoldDir = join(process.cwd(), '.manifold');
    try {
      mkdirSync(manifoldDir, { recursive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (options.json) {
        println(toJSON({ error: `Failed to create .manifold/ directory: ${message}` }));
      } else {
        printError(`Failed to create .manifold/ directory: ${message}`);
      }
      return 1;
    }
  }

  // Check if manifold already exists (check both JSON+MD and legacy YAML)
  const jsonPath = join(manifoldDir, `${feature}.json`);
  const mdPath = join(manifoldDir, `${feature}.md`);
  const yamlPath = join(manifoldDir, `${feature}.yaml`);

  const existingPath = existsSync(jsonPath) ? jsonPath :
                       existsSync(yamlPath) ? yamlPath : null;

  if (existingPath && !options.force) {
    if (options.json) {
      println(toJSON({
        error: 'Manifold already exists',
        path: existingPath,
        suggestion: 'Use --force to overwrite'
      }));
    } else {
      printError(
        `Manifold "${feature}" already exists`,
        'Use --force to overwrite or choose a different name'
      );
    }
    return 1;
  }

  // Generate manifold content (JSON+MD format)
  const { structure, markdown } = generateManifoldTemplate(feature, options.outcome);

  // Write JSON structure file
  try {
    writeFileSync(jsonPath, JSON.stringify(structure, null, 2), 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (options.json) {
      println(toJSON({ error: `Failed to write JSON: ${message}` }));
    } else {
      printError(`Failed to write JSON: ${message}`);
    }
    return 1;
  }

  // Write Markdown content file
  try {
    writeFileSync(mdPath, markdown, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (options.json) {
      println(toJSON({ error: `Failed to write Markdown: ${message}` }));
    } else {
      printError(`Failed to write Markdown: ${message}`);
    }
    return 1;
  }

  // Success output
  if (options.json) {
    println(toJSON({
      success: true,
      feature,
      format: 'json-md',
      paths: {
        json: jsonPath,
        md: mdPath
      },
      nextAction: `/manifold:m1-constrain ${feature}`
    }));
  } else {
    println(`${style.check()} Created manifold: ${style.feature(feature)}`);
    println(`  JSON: ${jsonPath}`);
    println(`  MD:   ${mdPath}`);
    println();
    println(`  ${style.dim('Next:')} /manifold:m1-constrain ${feature}`);
  }

  return 0;
}

/**
 * Validate feature name
 * Must be lowercase alphanumeric with hyphens only
 */
function isValidFeatureName(name: string): boolean {
  return /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(name);
}

interface ManifoldTemplate {
  structure: Record<string, unknown>;
  markdown: string;
}

/**
 * Generate manifold template in JSON+MD format
 * Satisfies: Schema v3 with evidence[], constraint_graph
 */
function generateManifoldTemplate(feature: string, outcome?: string): ManifoldTemplate {
  const now = new Date().toISOString();
  const date = now.split('T')[0];
  const outcomeText = outcome || `[Describe the desired outcome for ${feature}]`;

  // JSON structure (IDs, types, phases, references only)
  const structure: Record<string, unknown> = {
    schema_version: 3,
    feature,
    phase: 'INITIALIZED',
    created: date,

    // Constraints placeholder (populated by /manifold:m1-constrain)
    constraints: {
      business: [],
      technical: [],
      user_experience: [],
      security: [],
      operational: []
    },

    // Tensions placeholder (populated by /manifold:m2-tension)
    tensions: [],
    tension_summary: {
      trade_offs: 0,
      resource_tensions: 0,
      hidden_dependencies: 0,
      total: 0,
      resolved: 0,
      unresolved: 0
    },

    // Anchors placeholder (populated by /manifold:m3-anchor)
    anchors: {
      required_truths: [],
      implementation_phases: []
    },

    // v2+: Iteration tracking
    iterations: [
      {
        number: 0,
        phase: 'init',
        timestamp: now,
        result: 'initialized'
      }
    ],

    // v2+: Convergence tracking
    convergence: {
      status: 'NOT_STARTED'
    }
  };

  // Markdown content (human-readable text)
  const markdown = `# ${feature}

## Outcome

${outcomeText}

---

## Context

### Motivation

- [Why is this feature needed?]
- [What problem does it solve?]

### Prior Art

- [Any existing solutions or patterns to consider?]

### Success Metrics

- [How will we measure success?]

---

## Constraints

### Business

_No business constraints defined yet. Run \`/manifold:m1-constrain ${feature}\` to discover constraints._

### Technical

_No technical constraints defined yet._

### User Experience

_No UX constraints defined yet._

### Security

_No security constraints defined yet._

### Operational

_No operational constraints defined yet._

---

## Tensions

_No tensions identified yet. Run \`/manifold:m2-tension ${feature}\` after defining constraints._

---

## Required Truths

_No required truths anchored yet. Run \`/manifold:m3-anchor ${feature}\` after resolving tensions._
`;

  return { structure, markdown };
}
