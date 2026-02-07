/**
 * Solve Command for Manifold CLI
 * Generates execution plan from constraint network
 * Satisfies: Phase C (Execution Planning), Phase D (/m-solve equivalent), B3 (--mermaid export)
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
  formatHeader,
  formatKeyValue,
  style,
  toJSON
} from '../lib/output.js';
import {
  ConstraintSolver,
  type ExecutionPlan,
  exportGraphDot
} from '../lib/solver.js';
import {
  graphToMermaid,
  executionPlanToMermaid,
  backwardReasoningToMermaid,
  renderMermaidToTerminal
} from '../lib/mermaid.js';

interface SolveOptions {
  json?: boolean;
  ascii?: boolean;
  dot?: boolean;
  mermaid?: boolean;
  backward?: boolean;
  target?: string;
}

/**
 * Register the solve command
 */
export function registerSolveCommand(program: Command): void {
  program
    .command('solve [feature]')
    .description('Generate parallel execution plan from constraint network')
    .option('--json', 'Output as JSON (default)')
    .option('--ascii', 'Output as ASCII visualization')
    .option('--dot', 'Output as GraphViz DOT format')
    .option('--mermaid', 'Output as raw Mermaid syntax')
    .option('--backward', 'Reason backward from outcome (Arrival-style)')
    .option('--target <id>', 'Target node for backward reasoning (default: outcome)')
    .action(async (feature: string | undefined, options: SolveOptions) => {
      const exitCode = await solveCommand(feature, options);
      process.exit(exitCode);
    });
}

/**
 * Execute solve command
 * Returns exit code: 0 = success, 1 = error
 */
async function solveCommand(feature: string | undefined, options: SolveOptions): Promise<number> {
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

    if (options.json || (!options.ascii && !options.dot && !options.mermaid)) {
      println(toJSON({ features, message: 'Specify a feature to generate execution plan' }));
    } else {
      println('Available features:');
      for (const f of features) {
        println(`  - ${f}`);
      }
      println('\nUsage: manifold solve <feature> [--ascii|--dot|--mermaid|--backward]');
    }
    return 0;
  }

  // Load the feature
  const data = loadFeature(manifoldDir, feature);

  if (!data || !data.manifold) {
    printError(`Feature "${feature}" not found`, `Available features: ${listFeatures(manifoldDir).join(', ') || 'none'}`);
    return 1;
  }

  // Create constraint solver (graph is built in constructor)
  const solver = new ConstraintSolver(data.manifold, data.anchor);

  // Handle backward reasoning
  if (options.backward) {
    return handleBackwardReasoning(solver, feature, options);
  }

  // Generate execution plan
  const plan = solver.generateExecutionPlan();

  // Output in requested format
  const graph = solver.getGraph();
  if (options.dot) {
    // Satisfies: T3 (existing format unchanged)
    println(exportGraphDot(graph));
  } else if (options.mermaid) {
    // Satisfies: B3 (raw Mermaid export)
    println(graphToMermaid(graph));
    println();
    println(executionPlanToMermaid(plan));
  } else if (options.ascii) {
    // Satisfies: U2 (terminal-friendly), B2 (uses Mermaid renderer)
    const graphMermaid = graphToMermaid(graph);
    println(renderMermaidToTerminal(graphMermaid));
    println();
    const planMermaid = executionPlanToMermaid(plan);
    println(renderMermaidToTerminal(planMermaid));
  } else {
    // Default to JSON — Satisfies: T3 (existing format unchanged)
    println(toJSON(formatPlanForJson(plan, feature)));
  }

  return 0;
}

/**
 * Handle backward reasoning mode
 */
function handleBackwardReasoning(
  solver: ConstraintSolver,
  feature: string,
  options: SolveOptions
): number {
  const graph = solver.getGraph();

  if (!graph) {
    printError('Failed to build constraint graph');
    return 1;
  }

  // Find target node (default to first required truth or use --target)
  let targetId = options.target;

  if (!targetId) {
    // Find outcome node or first required truth
    const rts = Object.values(graph.nodes).filter(n => n.type === 'required_truth');
    if (rts.length > 0) {
      targetId = rts[0].id;
    } else {
      printError('No required truths found for backward reasoning');
      return 1;
    }
  }

  // Perform backward query
  const requirements = solver.whatMustBeTrue(targetId);

  if (options.json) {
    println(toJSON({
      feature,
      target: targetId,
      reasoning: 'backward',
      requirements,
      dependency_chain: buildDependencyChain(solver, targetId)
    }));
  } else if (options.mermaid) {
    // Satisfies: B3 (raw Mermaid export for backward reasoning)
    println(backwardReasoningToMermaid(graph, targetId, requirements));
  } else {
    // ASCII output — use Mermaid for dependency visualization
    printBackwardAnalysis(solver, feature, targetId, requirements, options.ascii);
  }

  return 0;
}

/**
 * Build dependency chain for backward reasoning
 */
function buildDependencyChain(solver: ConstraintSolver, targetId: string): object {
  const graph = solver.getGraph();
  if (!graph) return {};

  const visited = new Set<string>();
  const chain: Record<string, string[]> = {};

  function traverse(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = graph.nodes[nodeId];
    if (!node) return;

    chain[nodeId] = node.depends_on;

    for (const depId of node.depends_on) {
      traverse(depId);
    }
  }

  traverse(targetId);
  return chain;
}

/**
 * Print backward analysis with Mermaid visualization
 */
function printBackwardAnalysis(
  solver: ConstraintSolver,
  feature: string,
  targetId: string,
  requirements: string[],
  useAsciiGraph?: boolean
): void {
  const graph = solver.getGraph();
  if (!graph) return;

  println(formatHeader(`Backward Analysis: ${style.feature(feature)}`));
  println();
  println(`${style.bold('Target')}: ${targetId}`);
  println(`${style.bold('Question')}: What must be TRUE for this outcome?`);
  println();

  // Show requirements list
  println(style.bold('REQUIRED CONDITIONS:'));
  println('═'.repeat(50));

  for (const reqId of requirements) {
    const node = graph.nodes[reqId];
    if (!node) continue;

    const typeIcon = getTypeIcon(node.type);
    const statusIcon = node.status === 'SATISFIED' ? style.success('✓') : style.warning('○');

    println(`${statusIcon} ${typeIcon} ${reqId}: ${node.label}`);

    // Show what this depends on
    if (node.depends_on.length > 0) {
      println(`    └── REQUIRES: ${node.depends_on.join(', ')}`);
    }

    // Show conflicts
    if (node.conflicts_with.length > 0) {
      println(`    └── ${style.warning('CONFLICTS')}: ${node.conflicts_with.join(', ')}`);
    }
  }

  println();

  // Show dependency chain as Mermaid graph
  println(style.bold('DEPENDENCY CHAIN:'));
  println('═'.repeat(50));
  if (useAsciiGraph) {
    const mermaidSyntax = backwardReasoningToMermaid(graph, targetId, requirements);
    println(renderMermaidToTerminal(mermaidSyntax));
  } else {
    // Default text: still use Mermaid for the chain visualization
    const mermaidSyntax = backwardReasoningToMermaid(graph, targetId, requirements);
    println(renderMermaidToTerminal(mermaidSyntax));
  }

  println();

  // Show critical path
  const criticalPath = solver.findCriticalPath();
  println(style.bold('CRITICAL PATH:'));
  println(criticalPath.map(id => style.error(id)).join(' → '));

  println();

  // Show blocking dependencies
  println(style.bold('BLOCKING DEPENDENCIES:'));
  const targetNode = graph.nodes[targetId];
  if (targetNode && targetNode.depends_on.length > 0) {
    for (const depId of targetNode.depends_on) {
      const depNode = graph.nodes[depId];
      if (depNode && depNode.status !== 'SATISFIED') {
        println(`  ${style.warning('•')} ${depId} blocks ${targetId}`);
      }
    }
  }
}

/**
 * Get icon for node type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'constraint': return '▣';
    case 'tension': return '◇';
    case 'required_truth': return '◎';
    case 'artifact': return '□';
    default: return '○';
  }
}

/**
 * Format execution plan for JSON output
 */
function formatPlanForJson(plan: ExecutionPlan, feature: string): object {
  return {
    feature,
    generated_at: plan.generated_at,
    strategy: plan.strategy,
    statistics: {
      total_waves: plan.waves.length,
      total_tasks: plan.waves.reduce((sum, w) => sum + w.parallel_tasks.length, 0),
      parallelization_factor: plan.parallelization_factor.toFixed(2)
    },
    critical_path: plan.critical_path,
    waves: plan.waves.map(w => ({
      number: w.number,
      phase: w.phase,
      task_count: w.parallel_tasks.length,
      blocking_dependencies: w.blocking_dependencies,
      tasks: w.parallel_tasks
    }))
  };
}
