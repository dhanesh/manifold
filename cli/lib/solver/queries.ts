/**
 * Graph Query & Update Operations
 * Satisfies: T3, T6, RT-4
 *
 * Standalone functions for querying constraint graphs and updating
 * node statuses. Used by ConstraintSolver class methods.
 */

import type { ConstraintGraph, ConstraintNode } from '../parser';

/**
 * Find all prerequisites for a target node (backward reasoning)
 */
export function findPrerequisites(graph: ConstraintGraph, targetId: string): string[] {
  const required = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = graph.nodes[current];
    if (!node) continue;

    for (const dep of node.depends_on) {
      if (!required.has(dep)) {
        required.add(dep);
        queue.push(dep);
      }
    }
  }

  return [...required];
}

/**
 * Find all nodes blocked by a source node (forward reasoning)
 */
export function findBlockedNodes(graph: ConstraintGraph, sourceId: string): string[] {
  const blocked = new Set<string>();
  const queue = [sourceId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = graph.nodes[current];
    if (!node) continue;

    for (const b of node.blocks) {
      if (!blocked.has(b)) {
        blocked.add(b);
        queue.push(b);
      }
    }
  }

  return [...blocked];
}

/**
 * Get nodes in conflict with the target
 */
export function getNodeConflicts(graph: ConstraintGraph, targetId: string): string[] {
  const node = graph.nodes[targetId];
  return node?.conflicts_with ?? [];
}

/**
 * Mark a node as satisfied and find newly unblocked nodes
 */
export function markNodeSatisfied(graph: ConstraintGraph, nodeId: string): {
  success: boolean;
  unblocked: string[];
  newlyReady: string[];
} {
  const node = graph.nodes[nodeId];
  if (!node) {
    return { success: false, unblocked: [], newlyReady: [] };
  }

  // Update status
  node.status = 'SATISFIED';

  // Find newly unblocked nodes (nodes that were waiting on this one)
  const unblocked = node.blocks.filter(blockedId => {
    const blocked = graph.nodes[blockedId];
    if (!blocked || blocked.status === 'SATISFIED') return false;

    // Check if all dependencies are now satisfied
    return blocked.depends_on.every(depId => {
      const dep = graph.nodes[depId];
      return dep?.status === 'SATISFIED';
    });
  });

  // Update unblocked nodes to REQUIRED (ready to work on)
  for (const id of unblocked) {
    const blocked = graph.nodes[id];
    if (blocked && blocked.status === 'BLOCKED') {
      blocked.status = 'REQUIRED';
    }
  }

  // Find all nodes that are now ready (no unsatisfied dependencies)
  const newlyReady = findReadyNodes(graph);

  return { success: true, unblocked, newlyReady };
}

/**
 * Get current progress statistics for a graph
 */
export function getGraphProgress(graph: ConstraintGraph): {
  satisfied: number;
  total: number;
  percentage: number;
} {
  const nodes = Object.values(graph.nodes);
  const total = nodes.length;
  const satisfied = nodes.filter(n => n.status === 'SATISFIED').length;
  const percentage = total > 0 ? Math.round((satisfied / total) * 100) : 0;

  return { satisfied, total, percentage };
}

/**
 * Get nodes that are ready to work on (all dependencies satisfied)
 */
export function findReadyNodes(graph: ConstraintGraph): string[] {
  return Object.keys(graph.nodes).filter(id => {
    const node = graph.nodes[id];
    if (!node || node.status === 'SATISFIED') return false;

    return node.depends_on.every(depId => {
      const dep = graph.nodes[depId];
      return dep?.status === 'SATISFIED';
    });
  });
}

/**
 * Get nodes that are blocked (waiting on unsatisfied dependencies)
 */
export function findBlockedByDependencies(graph: ConstraintGraph): string[] {
  return Object.keys(graph.nodes).filter(id => {
    const node = graph.nodes[id];
    if (!node || node.status === 'SATISFIED') return false;

    return node.depends_on.some(depId => {
      const dep = graph.nodes[depId];
      return dep?.status !== 'SATISFIED';
    });
  });
}
