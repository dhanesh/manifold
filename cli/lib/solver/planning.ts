/**
 * Execution Planning Module
 * Satisfies: T3, T6, RT-4
 *
 * Standalone functions for generating execution plans, finding critical
 * paths, and topological sorting of constraint graphs.
 */

import type {
  ConstraintGraph,
  ConstraintNode,
  ExecutionPlan,
  Wave,
  ParallelTask,
  ManifoldPhase,
} from '../parser';
import { printWarning } from '../output';

/**
 * Generate execution plan with parallel waves from a constraint graph
 */
export function generateWaves(graph: ConstraintGraph): Wave[] {
  const waves: Wave[] = [];
  const satisfied = new Set<string>();
  const remaining = new Set(Object.keys(graph.nodes));

  let waveNum = 0;

  while (remaining.size > 0) {
    waveNum++;

    // Find nodes with all dependencies satisfied
    const ready: string[] = [];
    for (const id of remaining) {
      const node = graph.nodes[id];
      const depsResolved = node.depends_on.every(
        (d) => satisfied.has(d) || !remaining.has(d)
      );
      if (depsResolved) ready.push(id);
    }

    if (ready.length === 0 && remaining.size > 0) {
      // Circular dependency detected - break the cycle
      printWarning(`Circular dependency detected. Remaining: ${[...remaining].join(', ')}`);
      // Take the first remaining item to break the cycle
      ready.push([...remaining][0]);
    }

    // Group by phase for human comprehension
    const phase = determineWavePhase(graph, ready);

    waves.push({
      number: waveNum,
      phase,
      parallel_tasks: createParallelTasks(graph, ready),
      blocking_dependencies: [...satisfied],
    });

    for (const id of ready) {
      satisfied.add(id);
      remaining.delete(id);
    }
  }

  return waves;
}

/**
 * Find critical path (longest dependency chain) in a constraint graph
 */
export function findCriticalPathInGraph(graph: ConstraintGraph): string[] {
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();

  // Initialize distances
  for (const id of Object.keys(graph.nodes)) {
    distances.set(id, 0);
    predecessors.set(id, null);
  }

  // Topological sort + longest path
  const sorted = topologicalSortGraph(graph);

  for (const id of sorted) {
    const node = graph.nodes[id];
    const currentDist = distances.get(id) || 0;

    for (const blocked of node.blocks) {
      const blockedDist = distances.get(blocked) || 0;
      if (currentDist + 1 > blockedDist) {
        distances.set(blocked, currentDist + 1);
        predecessors.set(blocked, id);
      }
    }
  }

  // Find the node with maximum distance
  let maxDist = 0;
  let endNode = '';
  for (const [id, dist] of distances) {
    if (dist > maxDist) {
      maxDist = dist;
      endNode = id;
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = endNode;
  while (current) {
    path.unshift(current);
    current = predecessors.get(current) || null;
  }

  return path;
}

/**
 * Topological sort of a constraint graph
 */
export function topologicalSortGraph(graph: ConstraintGraph): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);

    const node = graph.nodes[id];
    for (const dep of node.depends_on) {
      if (graph.nodes[dep]) {
        visit(dep);
      }
    }
    result.push(id);
  };

  for (const id of Object.keys(graph.nodes)) {
    visit(id);
  }

  return result;
}

/**
 * Determine the conceptual phase for a wave based on node types
 */
function determineWavePhase(graph: ConstraintGraph, nodeIds: string[]): ManifoldPhase {
  const types = nodeIds.map((id) => graph.nodes[id]?.type);

  // Majority type determines phase
  if (types.filter((t) => t === 'constraint').length > types.length / 2) {
    return 'CONSTRAINED';
  }
  if (types.filter((t) => t === 'tension').length > types.length / 2) {
    return 'TENSIONED';
  }
  if (types.filter((t) => t === 'required_truth').length > types.length / 2) {
    return 'ANCHORED';
  }
  if (types.filter((t) => t === 'artifact').length > types.length / 2) {
    return 'GENERATED';
  }

  return 'CONSTRAINED';
}

/**
 * Create parallel tasks from node IDs
 */
function createParallelTasks(graph: ConstraintGraph, nodeIds: string[]): ParallelTask[] {
  return nodeIds.map((id) => {
    const node = graph.nodes[id];
    return {
      id: `TASK-${id}`,
      node_ids: [id],
      action: determineAction(node),
      description: node.label,
      artifact_paths: node.type === 'artifact' ? [node.label] : undefined,
    };
  });
}

/**
 * Determine action description for a node based on its type
 */
function determineAction(node: ConstraintNode): string {
  switch (node.type) {
    case 'constraint':
      return 'Discover and document';
    case 'tension':
      return 'Analyze and resolve';
    case 'required_truth':
      return 'Derive and validate';
    case 'artifact':
      return 'Generate';
    default:
      return 'Process';
  }
}
