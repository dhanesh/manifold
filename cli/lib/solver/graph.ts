/**
 * Constraint Graph Builder & Solver — Satisfies: T3, T6, RT-4
 * Builds constraint networks from manifold data. Delegates execution
 * planning to planning.ts, queries to queries.ts, viz to visualization.ts.
 */

import { Manifold, ConstraintGraph, ConstraintNode, ConstraintNodeStatus,
  ExecutionPlan, Wave, ParallelTask, ManifoldPhase, AnchorDocument } from '../parser';
import { getCachedGraph, cacheGraph, graphCache } from './cache';
import { generateWaves, findCriticalPathInGraph } from './planning';
import { findPrerequisites, findBlockedNodes, getNodeConflicts,
  markNodeSatisfied, getGraphProgress, findReadyNodes, findBlockedByDependencies } from './queries';

// Re-export types for command modules
export type { ConstraintGraph, ConstraintNode, ExecutionPlan, Wave, ParallelTask };

export class ConstraintSolver {
  private manifold: Manifold;
  private anchor?: AnchorDocument;
  private graph: ConstraintGraph;
  private cachedPlan?: ExecutionPlan;

  constructor(manifold: Manifold, anchor?: AnchorDocument) {
    this.manifold = manifold;
    this.anchor = anchor;

    // Try to use cached graph
    const cached = getCachedGraph(manifold.feature, manifold);
    if (cached) {
      this.graph = cached.graph;
      this.cachedPlan = cached.plan;
    } else {
      // Build fresh graph and cache it
      this.graph = this.buildGraphInternal();
      cacheGraph(manifold.feature, manifold, this.graph);
    }
  }

  /**
   * Create solver with cache bypass (for fresh analysis)
   */
  static createWithoutCache(manifold: Manifold, anchor?: AnchorDocument): ConstraintSolver {
    graphCache.delete(manifold.feature);
    return new ConstraintSolver(manifold, anchor);
  }

  /**
   * Get the built constraint graph
   */
  getGraph(): ConstraintGraph {
    return this.graph;
  }

  /**
   * Build constraint graph from manifold data (internal implementation)
   */
  private buildGraphInternal(): ConstraintGraph {
    const nodes = new Map<string, ConstraintNode>();
    const dependencies: [string, string][] = [];
    const conflicts: [string, string][] = [];
    const satisfies: [string, string][] = [];

    // 1. Add constraints as nodes
    this.addConstraintNodes(nodes);

    // 2. Add tensions as conflict edges and nodes
    this.addTensionNodes(nodes, conflicts);

    // 3. Add required truths as nodes with dependencies
    this.addRequiredTruthNodes(nodes, dependencies);

    // 4. Add artifacts with satisfies relationships
    this.addArtifactNodes(nodes, satisfies);

    // 5. Build reverse edges (what does each node block?)
    this.buildReverseEdges(nodes);

    // 6. Extract dependency edges from nodes
    for (const [id, node] of nodes) {
      for (const dep of node.depends_on) {
        dependencies.push([id, dep]);
      }
    }

    return {
      version: 1,
      generated_at: new Date().toISOString(),
      feature: this.manifold.feature,
      nodes: Object.fromEntries(nodes),
      edges: {
        dependencies,
        conflicts,
        satisfies,
      },
    };
  }

  /**
   * Add constraint nodes from all categories
   */
  private addConstraintNodes(nodes: Map<string, ConstraintNode>): void {
    const categories = ['business', 'technical', 'user_experience', 'security', 'operational'] as const;

    for (const category of categories) {
      const constraints = this.manifold.constraints?.[category] ?? [];
      for (const c of constraints) {
        nodes.set(c.id, {
          id: c.id,
          type: 'constraint',
          label: c.statement,
          depends_on: c.depends_on ?? [],
          blocks: [],
          conflicts_with: [],
          status: this.inferConstraintStatus(c.id),
          critical_path: c.type === 'invariant', // INVARIANTs start on critical path
        });
      }
    }
  }

  /**
   * Add tension nodes and conflict edges
   */
  private addTensionNodes(
    nodes: Map<string, ConstraintNode>,
    conflicts: [string, string][]
  ): void {
    for (const t of this.manifold.tensions ?? []) {
      // Add tension as a node
      nodes.set(t.id, {
        id: t.id,
        type: 'tension',
        label: t.description,
        depends_on: t.between, // Tension depends on the constraints it's between
        blocks: [],
        conflicts_with: t.between,
        status: t.status === 'resolved' ? 'SATISFIED' : 'CONFLICTED',
        critical_path: false,
      });

      // Add conflict edges between the constraints
      if (t.between.length >= 2) {
        for (let i = 0; i < t.between.length; i++) {
          for (let j = i + 1; j < t.between.length; j++) {
            conflicts.push([t.between[i], t.between[j]]);

            // Update constraint nodes with conflict info
            const nodeA = nodes.get(t.between[i]);
            const nodeB = nodes.get(t.between[j]);
            if (nodeA) nodeA.conflicts_with.push(t.between[j]);
            if (nodeB) nodeB.conflicts_with.push(t.between[i]);
          }
        }
      }
    }
  }

  /**
   * Add required truth nodes with dependencies
   */
  private addRequiredTruthNodes(
    nodes: Map<string, ConstraintNode>,
    dependencies: [string, string][]
  ): void {
    const requiredTruths = this.manifold.anchors?.required_truths ?? [];

    for (const rt of requiredTruths) {
      const dependsOn = rt.maps_to_constraints ?? [];

      nodes.set(rt.id, {
        id: rt.id,
        type: 'required_truth',
        label: rt.statement,
        depends_on: dependsOn,
        blocks: [],
        conflicts_with: [],
        status: this.mapRTStatus(rt.status),
        critical_path: rt.priority === 1,
      });
    }

    // Also check anchor document for more detailed dependencies
    if (this.anchor?.dependency_chain) {
      const chain = this.anchor.dependency_chain;

      // Add sequential dependencies
      if (chain.sequential) {
        for (const seq of chain.sequential) {
          // Parse "RT-1 + RT-2 must complete before RT-4" style
          const match = seq.match(/RT-(\d+).*before.*RT-(\d+)/i);
          if (match) {
            const from = `RT-${match[2]}`;
            const to = `RT-${match[1]}`;
            const node = nodes.get(from);
            if (node && !node.depends_on.includes(to)) {
              node.depends_on.push(to);
            }
          }
        }
      }

      // Mark blocking items as critical path
      if (chain.blocking) {
        for (const blocking of chain.blocking) {
          const rtMatch = blocking.match(/RT-(\d+)/);
          if (rtMatch) {
            const node = nodes.get(`RT-${rtMatch[1]}`);
            if (node) node.critical_path = true;
          }
        }
      }
    }
  }

  /**
   * Add artifact nodes with satisfies relationships
   */
  private addArtifactNodes(
    nodes: Map<string, ConstraintNode>,
    satisfies: [string, string][]
  ): void {
    const artifacts = this.manifold.generation?.artifacts ?? [];

    for (const artifact of artifacts) {
      const id = `ART-${artifact.path.replace(/[^a-zA-Z0-9]/g, '-')}`;

      // Dependencies: artifacts depend on the RTs/constraints they satisfy
      const dependsOn = artifact.satisfies ?? [];

      nodes.set(id, {
        id,
        type: 'artifact',
        label: artifact.path,
        depends_on: dependsOn,
        blocks: [],
        conflicts_with: [],
        status: artifact.status === 'generated' ? 'SATISFIED' : 'UNKNOWN',
        critical_path: false,
      });

      // Add satisfies edges
      for (const constraintId of artifact.satisfies ?? []) {
        satisfies.push([id, constraintId]);
      }
    }
  }

  /**
   * Build reverse edges (what does each node block?)
   */
  private buildReverseEdges(nodes: Map<string, ConstraintNode>): void {
    for (const [id, node] of nodes) {
      for (const dep of node.depends_on) {
        const depNode = nodes.get(dep);
        if (depNode && !depNode.blocks.includes(id)) {
          depNode.blocks.push(id);
        }
      }
    }
  }

  /**
   * Map RequiredTruth status to ConstraintNodeStatus
   */
  private mapRTStatus(status: string): ConstraintNodeStatus {
    switch (status) {
      case 'SATISFIED':
        return 'SATISFIED';
      case 'PARTIAL':
        return 'REQUIRED';
      case 'NOT_SATISFIED':
        return 'REQUIRED';
      case 'SPECIFICATION_READY':
        return 'REQUIRED';
      default:
        return 'UNKNOWN';
    }
  }

  /** Infer constraint status from verification data */
  private inferConstraintStatus(constraintId: string): ConstraintNodeStatus {
    if (this.manifold.verification?.result === 'PASS') return 'SATISFIED';
    return 'REQUIRED';
  }

  // --- Execution Planning (delegates to planning.ts) ---

  /** Generate execution plan with parallel waves */
  generateExecutionPlan(strategy: 'forward' | 'backward' | 'hybrid' = 'hybrid'): ExecutionPlan {
    // Return cached plan if available
    if (this.cachedPlan && this.cachedPlan.strategy === strategy) {
      return this.cachedPlan;
    }

    const waves = generateWaves(this.graph);

    // Calculate metrics
    const criticalPath = this.findCriticalPath();
    const totalNodes = Object.keys(this.graph.nodes).length;
    const parallelizationFactor = totalNodes / waves.length;

    const plan: ExecutionPlan = {
      generated_at: new Date().toISOString(),
      strategy,
      waves,
      critical_path: criticalPath,
      parallelization_factor: Math.round(parallelizationFactor * 10) / 10,
    };

    // Cache the plan
    this.cachedPlan = plan;
    cacheGraph(this.manifold.feature, this.manifold, this.graph, plan);

    return plan;
  }

  /**
   * Find critical path (longest dependency chain)
   */
  findCriticalPath(): string[] {
    return findCriticalPathInGraph(this.graph);
  }

  // --- Bidirectional Queries (delegates to queries.ts) ---

  /** What must be TRUE for target to be satisfied? (Backward reasoning) */
  whatMustBeTrue(targetId: string): string[] {
    return findPrerequisites(this.graph, targetId);
  }

  /** What does this node block? (Forward reasoning) */
  whatDoesThisBlock(sourceId: string): string[] {
    return findBlockedNodes(this.graph, sourceId);
  }

  /** Get nodes in conflict with the target */
  getConflicts(targetId: string): string[] {
    return getNodeConflicts(this.graph, targetId);
  }

  // --- Real-Time Updates (delegates to queries.ts) ---

  /** Mark a node as satisfied and recalculate affected portions */
  markSatisfied(nodeId: string): {
    success: boolean;
    unblocked: string[];
    newlyReady: string[];
    progress: { satisfied: number; total: number; percentage: number };
  } {
    const result = markNodeSatisfied(this.graph, nodeId);
    if (!result.success) {
      return { ...result, progress: this.getProgress() };
    }

    // Invalidate cached plan since graph state changed
    this.cachedPlan = undefined;
    cacheGraph(this.manifold.feature, this.manifold, this.graph);

    return { ...result, progress: this.getProgress() };
  }

  /**
   * Mark multiple nodes as satisfied at once
   */
  markManySatisfied(nodeIds: string[]): {
    unblocked: string[];
    newlyReady: string[];
    progress: { satisfied: number; total: number; percentage: number };
  } {
    const allUnblocked = new Set<string>();

    for (const nodeId of nodeIds) {
      const result = this.markSatisfied(nodeId);
      result.unblocked.forEach(id => allUnblocked.add(id));
    }

    return {
      unblocked: [...allUnblocked],
      newlyReady: findReadyNodes(this.graph),
      progress: this.getProgress()
    };
  }

  /** Get current progress statistics */
  getProgress(): { satisfied: number; total: number; percentage: number } {
    return getGraphProgress(this.graph);
  }

  /** Get nodes that are ready to work on (all dependencies satisfied) */
  getReadyNodes(): string[] {
    return findReadyNodes(this.graph);
  }

  /** Get nodes that are blocked (waiting on unsatisfied dependencies) */
  getBlockedNodes(): string[] {
    return findBlockedByDependencies(this.graph);
  }

  /**
   * Get remaining work summary
   */
  getRemainingWork(): {
    ready: string[];
    blocked: string[];
    byType: Record<string, number>;
    estimatedWaves: number;
  } {
    const ready = this.getReadyNodes();
    const blocked = this.getBlockedNodes();

    const byType: Record<string, number> = {
      constraint: 0,
      tension: 0,
      required_truth: 0,
      artifact: 0
    };

    for (const id of [...ready, ...blocked]) {
      const node = this.graph.nodes[id];
      if (node && byType[node.type] !== undefined) {
        byType[node.type]++;
      }
    }

    // Estimate waves remaining
    const remainingPlan = this.generateExecutionPlan();
    const estimatedWaves = remainingPlan.waves.filter(w =>
      w.parallel_tasks.some(t => {
        const nodeId = t.node_ids[0];
        const node = this.graph.nodes[nodeId];
        return node?.status !== 'SATISFIED';
      })
    ).length;

    return { ready, blocked, byType, estimatedWaves };
  }
}

// ============================================================
// Visualization Helpers
// ============================================================

/**
 * Export graph as DOT format (for GraphViz)
 */
export function exportGraphDot(graph: ConstraintGraph): string {
  const lines: string[] = ['digraph ConstraintNetwork {'];
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, fontsize=10];');
  lines.push('');

  const typeStyles: Record<string, string> = {
    constraint: 'shape=box, fillcolor=lightblue, style=filled',
    tension: 'shape=diamond, fillcolor=lightyellow, style=filled',
    required_truth: 'shape=ellipse, fillcolor=lightgreen, style=filled',
    artifact: 'shape=note, fillcolor=lightgray, style=filled',
  };

  for (const [id, node] of Object.entries(graph.nodes)) {
    const style = typeStyles[node.type] || '';
    const label = truncate(node.label, 30).replace(/"/g, '\\"');
    const critical = node.critical_path ? ', penwidth=3' : '';
    lines.push(`  "${id}" [label="${id}\\n${label}", ${style}${critical}];`);
  }

  lines.push('');

  for (const [from, to] of graph.edges.dependencies) {
    lines.push(`  "${from}" -> "${to}" [style=solid];`);
  }

  for (const [a, b] of graph.edges.conflicts) {
    lines.push(`  "${a}" -> "${b}" [style=dashed, color=red, dir=both, constraint=false];`);
  }

  for (const [artifact, constraint] of graph.edges.satisfies) {
    lines.push(`  "${artifact}" -> "${constraint}" [style=dotted, color=green];`);
  }

  lines.push('}');
  return lines.join('\n');
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
