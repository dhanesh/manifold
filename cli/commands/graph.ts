/**
 * Graph Command for Manifold CLI
 * Outputs constraint network as JSON, ASCII, or GraphViz DOT
 * Satisfies: Phase B (Constraint Graph Data Model)
 */

import type { Command } from 'commander';
import {
  findManifoldDir,
  loadFeature,
  listFeatures
} from '../lib/parser.js';
import {
  println,
  printError,
  toJSON
} from '../lib/output.js';
import {
  ConstraintSolver,
  type ConstraintGraph,
  visualizeGraphAscii,
  exportGraphDot
} from '../lib/solver.js';

interface GraphOptions {
  json?: boolean;
  ascii?: boolean;
  dot?: boolean;
}

/**
 * Register the graph command
 */
export function registerGraphCommand(program: Command): void {
  program
    .command('graph [feature]')
    .description('Output constraint network as JSON, ASCII, or DOT')
    .option('--json', 'Output as JSON (default)')
    .option('--ascii', 'Output as ASCII visualization')
    .option('--dot', 'Output as GraphViz DOT format')
    .action(async (feature: string | undefined, options: GraphOptions) => {
      const exitCode = await graphCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute graph command
 * Returns exit code: 0 = success, 1 = error
 */
async function graphCommand(feature: string | undefined, options: GraphOptions): Promise<number> {
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    return 1;
  }

  // If no feature specified, list available features
  if (!feature) {
    const features = listFeatures(manifoldDir);

    if (features.length === 0) {
      printError('No manifolds found in .manifold/', 'Run manifold init <feature> to create one');
      return 1;
    }

    if (options.json || (!options.ascii && !options.dot)) {
      println(toJSON({ features, message: 'Specify a feature to generate graph' }));
    } else {
      println('Available features:');
      for (const f of features) {
        println(`  - ${f}`);
      }
      println('\nUsage: manifold graph <feature> [--ascii|--dot]');
    }
    return 0;
  }

  // Load the feature
  const data = loadFeature(manifoldDir, feature);

  if (!data || !data.manifold) {
    printError(`Feature "${feature}" not found`, `Available features: ${listFeatures(manifoldDir).join(', ') || 'none'}`);
    return 1;
  }

  // Get constraint graph (built in solver constructor)
  const solver = new ConstraintSolver(data.manifold, data.anchor);
  const graph = solver.getGraph();

  // Output in requested format
  if (options.dot) {
    println(exportGraphDot(graph));
  } else if (options.ascii) {
    println(visualizeGraphAscii(graph));
  } else {
    // Default to JSON
    println(toJSON(formatGraphForJson(graph, feature)));
  }

  return 0;
}

/**
 * Format constraint graph for JSON output
 */
function formatGraphForJson(graph: ConstraintGraph, feature: string): object {
  return {
    version: graph.version,
    feature,
    generated_at: graph.generated_at,
    statistics: {
      total_nodes: Object.keys(graph.nodes).length,
      constraints: Object.values(graph.nodes).filter(n => n.type === 'constraint').length,
      tensions: Object.values(graph.nodes).filter(n => n.type === 'tension').length,
      required_truths: Object.values(graph.nodes).filter(n => n.type === 'required_truth').length,
      artifacts: Object.values(graph.nodes).filter(n => n.type === 'artifact').length,
      total_edges: graph.edges.dependencies.length + graph.edges.conflicts.length + graph.edges.satisfies.length
    },
    nodes: graph.nodes,
    edges: graph.edges
  };
}
