/**
 * Status Command for Manifold CLI
 * Satisfies: RT-2 (Output matching AI equivalents), U1 (mirrors /m-status)
 */

import type { Command } from 'commander';
import {
  findManifoldDir,
  listFeatures,
  loadFeature,
  type FeatureData,
  type Manifold,
  type Iteration
} from '../lib/parser.js';
import { countConstraints, countConstraintsByType } from '../lib/schema.js';
import {
  println,
  printError,
  formatHeader,
  formatKeyValue,
  formatPhase,
  formatSchemaVersion,
  formatConvergence,
  formatConstraintSummary,
  formatTensionSummary,
  formatNextAction,
  formatTable,
  style,
  toJSON
} from '../lib/output.js';
import { ConstraintSolver } from '../lib/solver.js';
import {
  miniGraphToMermaid,
  renderMermaidToTerminal
} from '../lib/mermaid.js';

interface StatusOptions {
  json?: boolean;
  history?: boolean;
  graph?: boolean;
  mermaid?: boolean;
}

/**
 * Register the status command
 */
export function registerStatusCommand(program: Command): void {
  program
    .command('status [feature]')
    .description('Show manifold state, iteration history, and convergence status')
    .option('--json', 'Output as JSON')
    .option('--history', 'Show full iteration history')
    .option('--graph', 'Show constraint network as ASCII graph')
    .option('--mermaid', 'Output constraint network as raw Mermaid syntax')
    .action(async (feature: string | undefined, options: StatusOptions) => {
      const exitCode = await statusCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute status command
 * Returns exit code: 0 = success, 1 = error
 */
async function statusCommand(feature: string | undefined, options: StatusOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found', suggestion: 'Run manifold init <feature> to create one' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  // List all features if none specified
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

    // Show status for all features
    if (options.json) {
      const allStatus = features.map(f => {
        const data = loadFeature(manifoldDir, f);
        return data ? formatFeatureJSON(data, options.history) : null;
      }).filter(Boolean);
      println(toJSON({ features: allStatus }));
    } else {
      println(formatHeader(`Manifold Status (${features.length} feature${features.length !== 1 ? 's' : ''})`));
      println();

      for (const f of features) {
        const data = loadFeature(manifoldDir, f);
        if (data) {
          printFeatureStatus(data, options.history);
          println();
        }
      }
    }

    return 0;
  }

  // Show status for specific feature
  const data = loadFeature(manifoldDir, feature);

  if (!data) {
    if (options.json) {
      println(toJSON({ error: `Feature "${feature}" not found` }));
    } else {
      printError(`Feature "${feature}" not found`, `Available features: ${listFeatures(manifoldDir).join(', ') || 'none'}`);
    }
    return 1;
  }

  // Mermaid raw syntax output — Satisfies: B3, RT-4
  if (options.mermaid) {
    return printFeatureGraph(data, 'mermaid');
  }

  if (options.json) {
    println(toJSON(formatFeatureJSON(data, options.history)));
  } else {
    printFeatureStatus(data, options.history);
    // Show graph after status if --graph flag is set — Satisfies: B1, RT-4
    if (options.graph) {
      println();
      printFeatureGraph(data, 'ascii');
    }
  }

  return 0;
}

/**
 * Format feature data as JSON
 */
function formatFeatureJSON(data: FeatureData, includeHistory?: boolean): Record<string, unknown> {
  const manifold = data.manifold!;
  const constraintCounts = countConstraints(manifold);
  const constraintTypes = countConstraintsByType(manifold);

  const result: Record<string, unknown> = {
    feature: data.feature,
    schemaVersion: data.schemaVersion,
    phase: manifold.phase,
    outcome: manifold.outcome,
    constraints: {
      total: constraintCounts.total,
      byCategory: constraintCounts,
      byType: constraintTypes
    }
  };

  // Tensions
  if (manifold.tensions?.length) {
    const resolved = manifold.tensions.filter(t => t.status === 'resolved').length;
    result.tensions = {
      total: manifold.tensions.length,
      resolved,
      unresolved: manifold.tensions.length - resolved
    };
  }

  // Anchors
  if (manifold.anchors) {
    result.anchors = {
      requiredTruths: manifold.anchors.required_truths?.length ?? 0,
      recommendedOption: manifold.anchors.recommended_option
    };
  }

  // v2: Convergence
  if (manifold.convergence) {
    result.convergence = manifold.convergence;
  }

  // v2: Iterations (if requested)
  if (includeHistory && manifold.iterations?.length) {
    result.iterations = manifold.iterations;
  }

  // Next action
  result.nextAction = formatNextAction(manifold.phase, data.feature);

  return result;
}

/**
 * Print feature status to console
 * Matches /m-status output format exactly
 */
function printFeatureStatus(data: FeatureData, includeHistory?: boolean): void {
  const manifold = data.manifold!;
  const constraintCounts = countConstraints(manifold);

  // Header
  println(formatHeader(`Feature: ${style.feature(data.feature)}`));

  // Basic info
  println(formatKeyValue('Schema', formatSchemaVersion(data.schemaVersion)));
  println(formatKeyValue('Phase', formatPhase(manifold.phase)));

  if (manifold.outcome) {
    println(formatKeyValue('Outcome', manifold.outcome));
  }

  // Constraints summary
  println(formatKeyValue('Constraints', formatConstraintSummary(constraintCounts)));

  // Tensions
  if (manifold.tensions?.length) {
    const resolved = manifold.tensions.filter(t => t.status === 'resolved').length;
    println(formatKeyValue('Tensions', formatTensionSummary(resolved, manifold.tensions.length)));
  }

  // Anchors - check verification section first (post-verification), then fall back to anchors (planning-time)
  if (manifold.anchors?.required_truths?.length) {
    const total = manifold.anchors.required_truths.length;
    let satisfied: number;

    // Check if verification has the satisfied count (post-verification is more accurate)
    if (manifold.verification?.required_truths_satisfied) {
      // Parse from string like "6/6 (100%)" or just use the number
      const rtStr = String(manifold.verification.required_truths_satisfied);
      const match = rtStr.match(/^(\d+)/);
      satisfied = match ? parseInt(match[1], 10) : 0;
    } else {
      // Fall back to counting from anchors
      satisfied = manifold.anchors.required_truths.filter(
        rt => rt.status === 'SATISFIED'
      ).length;
    }
    println(formatKeyValue('Required Truths', `${satisfied}/${total} satisfied`));
  }

  if (manifold.anchors?.recommended_option) {
    println(formatKeyValue('Recommended', manifold.anchors.recommended_option));
  }

  // v2: Convergence
  if (manifold.convergence) {
    println(formatKeyValue('Convergence', formatConvergence(manifold.convergence.status)));
  }

  // v2: Iteration history
  if (includeHistory && manifold.iterations?.length) {
    println();
    println(formatHeader('Iteration History'));
    printIterationTable(manifold.iterations);
  }

  // Next action
  println();
  println(formatKeyValue('Next', style.info(formatNextAction(manifold.phase, data.feature))));
}

/**
 * Print iteration history as a table
 */
function printIterationTable(iterations: Iteration[]): void {
  const rows = iterations.map(iter => ({
    number: `#${iter.number}`,
    phase: iter.phase,
    timestamp: formatTimestamp(iter.timestamp),
    result: formatIterationResult(iter.result)
  }));

  const table = formatTable(
    [
      { header: '#', key: 'number', width: 4 },
      { header: 'Phase', key: 'phase', width: 12 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Result', key: 'result', width: 15 }
    ],
    rows
  );

  println(table);
}

/**
 * Format timestamp for display
 */
function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return ts;
  }
}

/**
 * Format iteration result with color
 */
function formatIterationResult(result: string): string {
  const upper = result.toUpperCase();
  if (upper === 'PASS' || upper === 'CONVERGED' || upper === 'INTEGRATED') {
    return style.success(result);
  } else if (upper === 'FAIL') {
    return style.error(result);
  }
  return result;
}

/**
 * Print constraint network graph for a feature
 * Satisfies: B1, B3, RT-4
 */
function printFeatureGraph(data: FeatureData, mode: 'ascii' | 'mermaid'): number {
  if (!data.manifold) {
    printError('No manifold data available for graph');
    return 1;
  }

  const solver = new ConstraintSolver(data.manifold, data.anchor);
  const graph = solver.getGraph();

  if (!graph || Object.keys(graph.nodes).length === 0) {
    if (mode === 'mermaid') {
      println('graph TD\n    empty["No constraints defined"]');
    } else {
      println(style.dim('  No constraint graph available (no constraints defined)'));
    }
    return 0;
  }

  const mermaidSyntax = miniGraphToMermaid(graph);

  if (mode === 'mermaid') {
    println(mermaidSyntax);
  } else {
    println(formatHeader('Constraint Network'));
    println(renderMermaidToTerminal(mermaidSyntax));
  }

  return 0;
}
