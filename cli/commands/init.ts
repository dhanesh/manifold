/**
 * Init Command for Manifold CLI
 * Satisfies: U1 (mirrors /m0-init), RT-5 (Edge case handling)
 */

import type { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';
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

  // Check if manifold already exists
  const manifoldPath = join(manifoldDir, `${feature}.yaml`);

  if (existsSync(manifoldPath) && !options.force) {
    if (options.json) {
      println(toJSON({
        error: 'Manifold already exists',
        path: manifoldPath,
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

  // Generate manifold content
  const manifold = generateManifoldTemplate(feature, options.outcome);

  // Write file
  try {
    const content = yaml.stringify(manifold, {
      indent: 2,
      lineWidth: 100,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'QUOTE_DOUBLE'
    });

    // Add header comment
    const header = `# ${feature}.yaml
# Constraint Manifold for ${feature}
# Created: ${new Date().toISOString().split('T')[0]}
# Schema: v3

`;

    writeFileSync(manifoldPath, header + content, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (options.json) {
      println(toJSON({ error: `Failed to write manifold: ${message}` }));
    } else {
      printError(`Failed to write manifold: ${message}`);
    }
    return 1;
  }

  // Success output
  if (options.json) {
    println(toJSON({
      success: true,
      feature,
      path: manifoldPath,
      nextAction: `/m1-constrain ${feature}`
    }));
  } else {
    println(`${style.check()} Created manifold: ${style.feature(feature)}`);
    println(`  Path: ${manifoldPath}`);
    println();
    println(`  ${style.dim('Next:')} /m1-constrain ${feature}`);
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

/**
 * Generate manifold template
 * Satisfies: Schema v3 with evidence[], constraint_graph
 */
function generateManifoldTemplate(feature: string, outcome?: string): Record<string, unknown> {
  const now = new Date().toISOString();

  return {
    schema_version: 3,
    feature,
    outcome: outcome || `[Describe the desired outcome for ${feature}]`,
    phase: 'INITIALIZED',
    created: now.split('T')[0],

    // Context section
    context: {
      motivation: [
        '[Why is this feature needed?]',
        '[What problem does it solve?]'
      ],
      prior_art: [
        '[Any existing solutions or patterns to consider?]'
      ],
      success_metrics: [
        '[How will we measure success?]'
      ]
    },

    // Constraints placeholder (populated by /m1-constrain)
    constraints: {
      business: [],
      technical: [],
      user_experience: [],
      security: [],
      operational: []
    },

    // Tensions placeholder (populated by /m2-tension)
    tensions: [],
    tension_summary: {
      trade_offs: 0,
      resource_tensions: 0,
      hidden_dependencies: 0,
      total: 0,
      resolved: 0,
      unresolved: 0
    },

    // Anchors placeholder (populated by /m3-anchor)
    anchors: {
      required_truths: [],
      recommended_option: null,
      implementation_phases: [],
      anchor_document: null
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
    },

    // v3: Evidence system (reality grounding)
    evidence: [],

    // v3: Constraint graph (temporal non-linearity)
    constraint_graph: {
      version: 1,
      generated_at: now,
      feature,
      nodes: {},
      edges: {
        dependencies: [],
        conflicts: [],
        satisfies: []
      }
    }
  };
}
