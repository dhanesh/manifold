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

    let cycleBrokenNode: string | undefined;
    if (ready.length === 0 && remaining.size > 0) {
      // Circular dependency: no node has its dependencies satisfied, so a valid
      // topological step is impossible. Break the cycle deterministically by
      // forcing the remaining node with the FEWEST unresolved dependencies
      // (closest to ready) rather than an arbitrary first element, and flag the
      // wave so downstream consumers know the ordering is heuristic past here.
      cycleBrokenNode = pickCycleBreakNode(graph, remaining);
      printWarning(
        `Circular dependency detected. Forcing ${cycleBrokenNode} to break the cycle. ` +
          `Remaining: ${[...remaining].join(', ')}`
      );
      ready.push(cycleBrokenNode);
    }

    // Group by phase for human comprehension
    const phase = determineWavePhase(graph, ready);

    waves.push({
      number: waveNum,
      phase,
      parallel_tasks: createParallelTasks(graph, ready),
      blocking_dependencies: [...satisfied],
      ...(cycleBrokenNode
        ? { cycle_broken: true, cycle_broken_node: cycleBrokenNode }
        : {}),
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

  // Topological sort + longest path. Longest-path-via-topo-order is only valid
  // on a DAG; if the graph has a cycle we still degrade to a best-effort path
  // (so the visualiser keeps working) but warn that the result is approximate.
  const { order: sorted, hasCycle, cycleNodes } = topologicalSort(graph);
  if (hasCycle) {
    printWarning(
      `Critical path computed on a graph containing a dependency cycle ` +
        `(${cycleNodes.join(' → ')}); result is approximate until the cycle is resolved.`
    );
  }

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

  // Reconstruct path. Guard against revisiting a node: if the graph contains a
  // cycle the predecessor chain can loop (A → B → A …), so stop the moment we
  // re-encounter a node rather than spinning forever.
  const path: string[] = [];
  const seen = new Set<string>();
  let current: string | null = endNode;
  while (current && !seen.has(current)) {
    seen.add(current);
    path.unshift(current);
    current = predecessors.get(current) || null;
  }

  return path;
}

export interface TopoSortResult {
  /** Best-effort topological order (dependencies before dependents). */
  order: string[];
  /** True when at least one directed cycle (back edge) was found. */
  hasCycle: boolean;
  /** Distinct nodes participating in a detected cycle (empty when acyclic). */
  cycleNodes: string[];
}

/**
 * Topological sort of a constraint graph WITH cycle detection.
 *
 * Standard three-colour DFS: WHITE = unvisited, GREY = on the current recursion
 * stack, BLACK = fully explored. Re-entering a GREY node is a back edge — i.e.
 * a directed cycle — which is recorded in `cycleNodes` instead of being silently
 * ignored (the previous single-`visited`-set version could not tell a back edge
 * from a harmless cross/forward edge). A topological ordering is only defined for
 * a DAG, so callers MUST check `hasCycle` before trusting `order`.
 */
export function topologicalSort(graph: ConstraintGraph): TopoSortResult {
  const WHITE = 0,
    GREY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const order: string[] = [];
  const cycleNodes = new Set<string>();
  const stack: string[] = [];

  for (const id of Object.keys(graph.nodes)) color.set(id, WHITE);

  const visit = (id: string) => {
    color.set(id, GREY);
    stack.push(id);

    const node = graph.nodes[id];
    for (const dep of node.depends_on) {
      if (!graph.nodes[dep]) continue; // dangling dependency — not in this graph
      const c = color.get(dep);
      if (c === GREY) {
        // Back edge: the cycle is the stack slice from `dep` to the current node.
        const from = stack.indexOf(dep);
        for (const n of stack.slice(from)) cycleNodes.add(n);
      } else if (c === WHITE) {
        visit(dep);
      }
    }

    stack.pop();
    color.set(id, BLACK);
    order.push(id);
  };

  for (const id of Object.keys(graph.nodes)) {
    if (color.get(id) === WHITE) visit(id);
  }

  return { order, hasCycle: cycleNodes.size > 0, cycleNodes: [...cycleNodes] };
}

/**
 * Back-compatible wrapper returning only the best-effort order.
 * @deprecated Prefer {@link topologicalSort} so cycles can be detected.
 */
export function topologicalSortGraph(graph: ConstraintGraph): string[] {
  return topologicalSort(graph).order;
}

/**
 * Choose which node to force-schedule when a dependency cycle blocks all
 * progress. Deterministic: the remaining node with the fewest UNRESOLVED
 * dependencies (ties broken by id) so the break is reproducible and stays as
 * close to a valid order as possible.
 */
function pickCycleBreakNode(graph: ConstraintGraph, remaining: Set<string>): string {
  let best: string | null = null;
  let bestUnresolved = Infinity;
  for (const id of [...remaining].sort()) {
    const node = graph.nodes[id];
    const unresolved = node.depends_on.filter((d) => remaining.has(d)).length;
    if (unresolved < bestUnresolved) {
      bestUnresolved = unresolved;
      best = id;
    }
  }
  return best ?? [...remaining][0];
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
