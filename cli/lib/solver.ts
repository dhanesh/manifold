/**
 * Constraint Solver Module
 * Satisfies: Phase B & C - Temporal Non-Linearity
 *
 * Builds constraint networks from manifold data and generates
 * parallel execution plans with wave-based processing.
 */

import {
  Manifold,
  Constraint,
  Tension,
  RequiredTruth,
  ConstraintGraph,
  ConstraintNode,
  ConstraintNodeStatus,
  ConstraintNodeType,
  ExecutionPlan,
  Wave,
  ParallelTask,
  ManifoldPhase,
  AnchorDocument,
} from './parser';

// ============================================================
// Constraint Solver
// ============================================================

export class ConstraintSolver {
  private manifold: Manifold;
  private anchor?: AnchorDocument;
  private graph: ConstraintGraph;

  constructor(manifold: Manifold, anchor?: AnchorDocument) {
    this.manifold = manifold;
    this.anchor = anchor;
    this.graph = this.buildGraph();
  }

  /**
   * Get the built constraint graph
   */
  getGraph(): ConstraintGraph {
    return this.graph;
  }

  /**
   * Build constraint graph from manifold data
   */
  private buildGraph(): ConstraintGraph {
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

  /**
   * Infer constraint status from verification data
   */
  private inferConstraintStatus(constraintId: string): ConstraintNodeStatus {
    // Check if we have verification data
    if (this.manifold.verification) {
      // Simple heuristic: if verification passed, assume satisfied
      if (this.manifold.verification.result === 'PASS') {
        return 'SATISFIED';
      }
    }

    // Default to REQUIRED (needs work)
    return 'REQUIRED';
  }

  // ============================================================
  // Execution Planning
  // ============================================================

  /**
   * Generate execution plan with parallel waves
   */
  generateExecutionPlan(strategy: 'forward' | 'backward' | 'hybrid' = 'hybrid'): ExecutionPlan {
    const waves: Wave[] = [];
    const satisfied = new Set<string>();
    const remaining = new Set(Object.keys(this.graph.nodes));

    let waveNum = 0;

    while (remaining.size > 0) {
      waveNum++;

      // Find nodes with all dependencies satisfied
      const ready: string[] = [];
      for (const id of remaining) {
        const node = this.graph.nodes[id];
        const depsResolved = node.depends_on.every(
          (d) => satisfied.has(d) || !remaining.has(d)
        );
        if (depsResolved) ready.push(id);
      }

      if (ready.length === 0 && remaining.size > 0) {
        // Circular dependency detected - break the cycle
        console.warn(`Circular dependency detected. Remaining: ${[...remaining].join(', ')}`);
        // Take the first remaining item to break the cycle
        ready.push([...remaining][0]);
      }

      // Group by phase for human comprehension
      const phase = this.determineWavePhase(ready);

      waves.push({
        number: waveNum,
        phase,
        parallel_tasks: this.createParallelTasks(ready),
        blocking_dependencies: [...satisfied],
      });

      for (const id of ready) {
        satisfied.add(id);
        remaining.delete(id);
      }
    }

    // Calculate metrics
    const criticalPath = this.findCriticalPath();
    const totalNodes = Object.keys(this.graph.nodes).length;
    const parallelizationFactor = totalNodes / waves.length;

    return {
      generated_at: new Date().toISOString(),
      strategy,
      waves,
      critical_path: criticalPath,
      parallelization_factor: Math.round(parallelizationFactor * 10) / 10,
    };
  }

  /**
   * Determine the conceptual phase for a wave
   */
  private determineWavePhase(nodeIds: string[]): ManifoldPhase {
    const types = nodeIds.map((id) => this.graph.nodes[id]?.type);

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

    // Default based on wave number would be better, but we don't have that context here
    return 'CONSTRAINED';
  }

  /**
   * Create parallel tasks from node IDs
   */
  private createParallelTasks(nodeIds: string[]): ParallelTask[] {
    return nodeIds.map((id) => {
      const node = this.graph.nodes[id];
      return {
        id: `TASK-${id}`,
        node_ids: [id],
        action: this.determineAction(node),
        description: node.label,
        artifact_paths: node.type === 'artifact' ? [node.label] : undefined,
      };
    });
  }

  /**
   * Determine action for a node
   */
  private determineAction(node: ConstraintNode): string {
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

  /**
   * Find critical path (longest dependency chain)
   */
  private findCriticalPath(): string[] {
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize distances
    for (const id of Object.keys(this.graph.nodes)) {
      distances.set(id, 0);
      predecessors.set(id, null);
    }

    // Topological sort + longest path
    const sorted = this.topologicalSort();

    for (const id of sorted) {
      const node = this.graph.nodes[id];
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
   * Topological sort of the graph
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.graph.nodes[id];
      for (const dep of node.depends_on) {
        if (this.graph.nodes[dep]) {
          visit(dep);
        }
      }
      result.push(id);
    };

    for (const id of Object.keys(this.graph.nodes)) {
      visit(id);
    }

    return result;
  }

  // ============================================================
  // Bidirectional Queries
  // ============================================================

  /**
   * What must be TRUE for target to be satisfied?
   * (Backward reasoning - Arrival style)
   */
  whatMustBeTrue(targetId: string): string[] {
    const required = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = this.graph.nodes[current];
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
   * What does this node block?
   * (Forward reasoning)
   */
  whatDoesThisBlock(sourceId: string): string[] {
    const blocked = new Set<string>();
    const queue = [sourceId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = this.graph.nodes[current];
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
  getConflicts(targetId: string): string[] {
    const node = this.graph.nodes[targetId];
    return node?.conflicts_with ?? [];
  }
}

// ============================================================
// Visualization Helpers
// ============================================================

/**
 * ASCII visualization of constraint graph
 */
export function visualizeGraphAscii(graph: ConstraintGraph): string {
  const lines: string[] = [];

  lines.push(`CONSTRAINT NETWORK: ${graph.feature}`);
  lines.push('═'.repeat(50));
  lines.push('');

  // Group nodes by type
  const byType: Record<string, ConstraintNode[]> = {
    constraint: [],
    tension: [],
    required_truth: [],
    artifact: [],
  };

  for (const node of Object.values(graph.nodes)) {
    byType[node.type]?.push(node);
  }

  // Constraints
  if (byType.constraint.length > 0) {
    lines.push('┌─ CONSTRAINTS ' + '─'.repeat(36) + '┐');
    for (const node of byType.constraint) {
      const status = node.status === 'SATISFIED' ? '✓' : '○';
      const critical = node.critical_path ? ' *' : '';
      const label = truncate(node.label, 40);
      lines.push(`│ ${status} ${node.id}: ${label}${critical}`);
    }
    lines.push('└' + '─'.repeat(50) + '┘');
  }

  // Tensions
  if (byType.tension.length > 0) {
    lines.push('        │');
    lines.push('        ▼');
    lines.push('┌─ TENSIONS ' + '─'.repeat(39) + '┐');
    for (const node of byType.tension) {
      const status = node.status === 'SATISFIED' ? '━' : '┄';
      const conflicts = node.conflicts_with.join(', ');
      lines.push(`│ ${conflicts} ${status}⚡${status} ${truncate(node.label, 30)}`);
    }
    lines.push('└' + '─'.repeat(50) + '┘');
  }

  // Required Truths
  if (byType.required_truth.length > 0) {
    lines.push('        │');
    lines.push('        ▼');
    lines.push('┌─ REQUIRED TRUTHS ' + '─'.repeat(32) + '┐');
    for (const node of byType.required_truth) {
      const status = node.status === 'SATISFIED' ? '✓' : '○';
      const critical = node.critical_path ? ' *' : '';
      const deps = node.depends_on.length > 0 ? ` ← [${node.depends_on.join(', ')}]` : '';
      lines.push(`│ ${status} ${node.id}: ${truncate(node.label, 25)}${critical}${deps}`);
    }
    lines.push('└' + '─'.repeat(50) + '┘');
  }

  // Artifacts
  if (byType.artifact.length > 0) {
    lines.push('        │');
    lines.push('        ▼');
    lines.push('┌─ ARTIFACTS ' + '─'.repeat(38) + '┐');
    for (const node of byType.artifact) {
      const status = node.status === 'SATISFIED' ? '✓' : '○';
      lines.push(`│ ${status} ${truncate(node.label, 45)}`);
    }
    lines.push('└' + '─'.repeat(50) + '┘');
  }

  lines.push('');
  lines.push(`* = critical path`);
  lines.push(`Nodes: ${Object.keys(graph.nodes).length}`);
  lines.push(`Edges: ${graph.edges.dependencies.length + graph.edges.conflicts.length + graph.edges.satisfies.length}`);

  return lines.join('\n');
}

/**
 * ASCII visualization of execution plan
 */
export function visualizeExecutionPlan(plan: ExecutionPlan): string {
  const lines: string[] = [];

  lines.push('EXECUTION PLAN');
  lines.push('══════════════');
  lines.push('');
  lines.push(`Strategy: ${plan.strategy}`);
  lines.push(`Parallelization Factor: ${plan.parallelization_factor}x`);
  lines.push(`Critical Path: ${plan.critical_path.join(' → ')}`);
  lines.push('');

  for (const wave of plan.waves) {
    lines.push(`Wave ${wave.number} (${wave.phase}) - ${wave.parallel_tasks.length} parallel task${wave.parallel_tasks.length > 1 ? 's' : ''}:`);

    for (const task of wave.parallel_tasks) {
      const nodeId = task.node_ids[0] || '';
      const action = task.action;
      const desc = truncate(task.description || '', 35);
      lines.push(`  ├── [${nodeId}] ${action}: ${desc}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export graph as DOT format (for GraphViz)
 */
export function exportGraphDot(graph: ConstraintGraph): string {
  const lines: string[] = ['digraph ConstraintNetwork {'];
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, fontsize=10];');
  lines.push('');

  // Define node styles by type
  const typeStyles: Record<string, string> = {
    constraint: 'shape=box, fillcolor=lightblue, style=filled',
    tension: 'shape=diamond, fillcolor=lightyellow, style=filled',
    required_truth: 'shape=ellipse, fillcolor=lightgreen, style=filled',
    artifact: 'shape=note, fillcolor=lightgray, style=filled',
  };

  // Add nodes
  for (const [id, node] of Object.entries(graph.nodes)) {
    const style = typeStyles[node.type] || '';
    const label = truncate(node.label, 30).replace(/"/g, '\\"');
    const critical = node.critical_path ? ', penwidth=3' : '';
    lines.push(`  "${id}" [label="${id}\\n${label}", ${style}${critical}];`);
  }

  lines.push('');

  // Add dependency edges
  for (const [from, to] of graph.edges.dependencies) {
    lines.push(`  "${from}" -> "${to}" [style=solid];`);
  }

  // Add conflict edges
  for (const [a, b] of graph.edges.conflicts) {
    lines.push(`  "${a}" -> "${b}" [style=dashed, color=red, dir=both, constraint=false];`);
  }

  // Add satisfies edges
  for (const [artifact, constraint] of graph.edges.satisfies) {
    lines.push(`  "${artifact}" -> "${constraint}" [style=dotted, color=green];`);
  }

  lines.push('}');
  return lines.join('\n');
}

// Helper function
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
