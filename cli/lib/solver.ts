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

// Re-export types for command modules
export type { ConstraintGraph, ConstraintNode, ExecutionPlan, Wave, ParallelTask };

// ============================================================
// Graph Cache
// ============================================================

interface CachedGraph {
  graph: ConstraintGraph;
  plan?: ExecutionPlan;
  createdAt: number;
  manifestHash: string;
}

// In-memory cache for constraint graphs (session-scoped)
const graphCache = new Map<string, CachedGraph>();

/**
 * Generate a hash for cache invalidation
 * Uses feature name + constraint count + phase as a simple change detector
 */
function generateManifestHash(manifold: Manifold): string {
  const constraintCount =
    (manifold.constraints?.business?.length ?? 0) +
    (manifold.constraints?.technical?.length ?? 0) +
    (manifold.constraints?.user_experience?.length ?? 0) +
    (manifold.constraints?.security?.length ?? 0) +
    (manifold.constraints?.operational?.length ?? 0);

  const tensionCount = manifold.tensions?.length ?? 0;
  const rtCount = manifold.anchors?.required_truths?.length ?? 0;
  const artifactCount = manifold.generation?.artifacts?.length ?? 0;

  return `${manifold.feature}:${manifold.phase}:${constraintCount}:${tensionCount}:${rtCount}:${artifactCount}`;
}

/**
 * Get cached graph if valid, or null if cache miss/stale
 */
export function getCachedGraph(feature: string, manifold: Manifold): CachedGraph | null {
  const cached = graphCache.get(feature);
  if (!cached) return null;

  const currentHash = generateManifestHash(manifold);
  if (cached.manifestHash !== currentHash) {
    // Cache is stale, remove it
    graphCache.delete(feature);
    return null;
  }

  return cached;
}

/**
 * Store graph in cache
 */
export function cacheGraph(feature: string, manifold: Manifold, graph: ConstraintGraph, plan?: ExecutionPlan): void {
  graphCache.set(feature, {
    graph,
    plan,
    createdAt: Date.now(),
    manifestHash: generateManifestHash(manifold)
  });
}

/**
 * Clear all cached graphs
 */
export function clearGraphCache(): void {
  graphCache.clear();
}

/**
 * Get cache statistics
 */
export function getGraphCacheStats(): { size: number; features: string[] } {
  return {
    size: graphCache.size,
    features: [...graphCache.keys()]
  };
}

// ============================================================
// Constraint Solver
// ============================================================

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
    // Return cached plan if available
    if (this.cachedPlan && this.cachedPlan.strategy === strategy) {
      return this.cachedPlan;
    }

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
  findCriticalPath(): string[] {
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

  // ============================================================
  // Real-Time Updates
  // ============================================================

  /**
   * Mark a node as satisfied and recalculate affected portions
   * Returns the updated status and what nodes are now unblocked
   */
  markSatisfied(nodeId: string): {
    success: boolean;
    unblocked: string[];
    newlyReady: string[];
    progress: { satisfied: number; total: number; percentage: number };
  } {
    const node = this.graph.nodes[nodeId];
    if (!node) {
      return { success: false, unblocked: [], newlyReady: [], progress: this.getProgress() };
    }

    // Update status
    node.status = 'SATISFIED';

    // Find newly unblocked nodes (nodes that were waiting on this one)
    const unblocked = node.blocks.filter(blockedId => {
      const blocked = this.graph.nodes[blockedId];
      if (!blocked || blocked.status === 'SATISFIED') return false;

      // Check if all dependencies are now satisfied
      return blocked.depends_on.every(depId => {
        const dep = this.graph.nodes[depId];
        return dep?.status === 'SATISFIED';
      });
    });

    // Update unblocked nodes to REQUIRED (ready to work on)
    for (const id of unblocked) {
      const blocked = this.graph.nodes[id];
      if (blocked && blocked.status === 'BLOCKED') {
        blocked.status = 'REQUIRED';
      }
    }

    // Find all nodes that are now ready (no unsatisfied dependencies)
    const newlyReady = Object.keys(this.graph.nodes).filter(id => {
      const n = this.graph.nodes[id];
      if (!n || n.status === 'SATISFIED') return false;

      return n.depends_on.every(depId => {
        const dep = this.graph.nodes[depId];
        return dep?.status === 'SATISFIED';
      });
    });

    // Invalidate cached plan since graph state changed
    this.cachedPlan = undefined;

    // Update cache
    cacheGraph(this.manifold.feature, this.manifold, this.graph);

    return {
      success: true,
      unblocked,
      newlyReady,
      progress: this.getProgress()
    };
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

    // Find all nodes that are now ready
    const newlyReady = Object.keys(this.graph.nodes).filter(id => {
      const n = this.graph.nodes[id];
      if (!n || n.status === 'SATISFIED') return false;

      return n.depends_on.every(depId => {
        const dep = this.graph.nodes[depId];
        return dep?.status === 'SATISFIED';
      });
    });

    return {
      unblocked: [...allUnblocked],
      newlyReady,
      progress: this.getProgress()
    };
  }

  /**
   * Get current progress statistics
   */
  getProgress(): { satisfied: number; total: number; percentage: number } {
    const nodes = Object.values(this.graph.nodes);
    const total = nodes.length;
    const satisfied = nodes.filter(n => n.status === 'SATISFIED').length;
    const percentage = total > 0 ? Math.round((satisfied / total) * 100) : 0;

    return { satisfied, total, percentage };
  }

  /**
   * Get nodes that are ready to work on (all dependencies satisfied)
   */
  getReadyNodes(): string[] {
    return Object.keys(this.graph.nodes).filter(id => {
      const node = this.graph.nodes[id];
      if (!node || node.status === 'SATISFIED') return false;

      return node.depends_on.every(depId => {
        const dep = this.graph.nodes[depId];
        return dep?.status === 'SATISFIED';
      });
    });
  }

  /**
   * Get nodes that are blocked (waiting on unsatisfied dependencies)
   */
  getBlockedNodes(): string[] {
    return Object.keys(this.graph.nodes).filter(id => {
      const node = this.graph.nodes[id];
      if (!node || node.status === 'SATISFIED') return false;

      return node.depends_on.some(depId => {
        const dep = this.graph.nodes[depId];
        return dep?.status !== 'SATISFIED';
      });
    });
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

// ============================================================
// Semantic Conflict Detection
// Satisfies: B2 (conflict detection), RT-4, U4 (explanatory messages)
// ============================================================

/**
 * Result of semantic conflict detection
 */
export interface SemanticConflict {
  id: string;
  type: 'contradictory_invariants' | 'resource_conflict' | 'temporal_conflict' | 'scope_conflict';
  constraints: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  suggestion?: string;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: SemanticConflict[];
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

/**
 * Detect semantic conflicts within a manifold
 * Satisfies: B2 (conflict detection before GENERATED), RT-4, U4 (explanatory)
 *
 * This function analyzes constraints for semantic conflicts that go beyond
 * the explicit tensions already documented in the manifold.
 */
export function detectSemanticConflicts(manifold: Manifold): ConflictDetectionResult {
  const conflicts: SemanticConflict[] = [];
  let conflictId = 0;

  // Get all constraints
  const allConstraints = getAllConstraints(manifold);

  // 1. Detect contradictory invariants
  detectContradictoryInvariants(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // 2. Detect resource conflicts (goals competing for same resource)
  detectResourceConflicts(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // 3. Detect temporal conflicts (timing-related contradictions)
  detectTemporalConflicts(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // 4. Detect scope conflicts (contradictory scope requirements)
  detectScopeConflicts(allConstraints, conflicts, () => `SC-${++conflictId}`);

  // Build summary
  const summary = {
    total: conflicts.length,
    bySeverity: {
      critical: conflicts.filter(c => c.severity === 'critical').length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length,
    },
    byType: {
      contradictory_invariants: conflicts.filter(c => c.type === 'contradictory_invariants').length,
      resource_conflict: conflicts.filter(c => c.type === 'resource_conflict').length,
      temporal_conflict: conflicts.filter(c => c.type === 'temporal_conflict').length,
      scope_conflict: conflicts.filter(c => c.type === 'scope_conflict').length,
    }
  };

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    summary
  };
}

/**
 * Get all constraints from a manifold as a flat array with category info
 */
interface ConstraintWithCategory extends Constraint {
  category: string;
}

function getAllConstraints(manifold: Manifold): ConstraintWithCategory[] {
  const result: ConstraintWithCategory[] = [];

  const categories = ['business', 'technical', 'user_experience', 'security', 'operational'] as const;

  for (const category of categories) {
    const constraints = manifold.constraints?.[category] ?? [];
    for (const c of constraints) {
      result.push({ ...c, category });
    }
  }

  // Also include ux for backward compatibility
  const uxConstraints = manifold.constraints?.ux ?? [];
  for (const c of uxConstraints) {
    result.push({ ...c, category: 'user_experience' });
  }

  return result;
}

/**
 * Detect contradictory invariants (two invariants that cannot both be true)
 * Severity: critical
 */
function detectContradictoryInvariants(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  const invariants = constraints.filter(c => c.type === 'invariant');

  // Keywords that indicate opposite requirements
  const contradictionPairs = [
    ['must', 'must not'],
    ['always', 'never'],
    ['all', 'none'],
    ['enable', 'disable'],
    ['allow', 'block'],
    ['require', 'prohibit'],
    ['maximum', 'minimum'],
    ['synchronous', 'asynchronous'],
  ];

  for (let i = 0; i < invariants.length; i++) {
    for (let j = i + 1; j < invariants.length; j++) {
      const c1 = invariants[i];
      const c2 = invariants[j];

      const statement1 = c1.statement.toLowerCase();
      const statement2 = c2.statement.toLowerCase();

      // Check for contradiction keywords
      for (const [positive, negative] of contradictionPairs) {
        const s1HasPositive = statement1.includes(positive);
        const s1HasNegative = statement1.includes(negative);
        const s2HasPositive = statement2.includes(positive);
        const s2HasNegative = statement2.includes(negative);

        // Check if they're about similar subjects and have opposing keywords
        if ((s1HasPositive && s2HasNegative) || (s1HasNegative && s2HasPositive)) {
          // Check for subject overlap using common nouns
          const s1Words = new Set(statement1.split(/\s+/).filter(w => w.length > 3));
          const s2Words = new Set(statement2.split(/\s+/).filter(w => w.length > 3));
          const overlap = [...s1Words].filter(w => s2Words.has(w));

          if (overlap.length >= 2) {
            conflicts.push({
              id: nextId(),
              type: 'contradictory_invariants',
              constraints: [c1.id, c2.id],
              severity: 'critical',
              explanation: `Invariant ${c1.id} "${truncate(c1.statement, 40)}" may contradict ${c2.id} "${truncate(c2.statement, 40)}" - both are invariants with opposing requirements about: ${overlap.slice(0, 3).join(', ')}`,
              suggestion: 'Review these invariants and either merge them, add explicit precedence, or convert one to a trade_off tension.'
            });
          }
        }
      }
    }
  }
}

/**
 * Detect resource conflicts (multiple goals/boundaries competing for same limited resource)
 * Severity: high
 */
function detectResourceConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Resource-related keywords
  const resourceKeywords = [
    'memory', 'cpu', 'disk', 'bandwidth', 'storage',
    'time', 'latency', 'timeout', 'duration',
    'budget', 'cost', 'price',
    'connections', 'threads', 'workers', 'instances',
    'tokens', 'limit', 'quota', 'capacity'
  ];

  // Find constraints mentioning resources
  const resourceConstraints = constraints.filter(c => {
    const statement = c.statement.toLowerCase();
    return resourceKeywords.some(kw => statement.includes(kw));
  });

  // Group by resource type
  const byResource = new Map<string, ConstraintWithCategory[]>();

  for (const c of resourceConstraints) {
    const statement = c.statement.toLowerCase();
    for (const resource of resourceKeywords) {
      if (statement.includes(resource)) {
        const group = byResource.get(resource) ?? [];
        group.push(c);
        byResource.set(resource, group);
      }
    }
  }

  // Check for conflicts within resource groups
  for (const [resource, group] of byResource) {
    if (group.length < 2) continue;

    // Look for competing numeric requirements
    const numericRequirements = group.filter(c => {
      const match = c.statement.match(/(\d+)\s*(ms|seconds?|minutes?|mb|gb|%)/i);
      return match !== null;
    });

    if (numericRequirements.length >= 2) {
      // Multiple numeric requirements for same resource
      const ids = numericRequirements.map(c => c.id);
      conflicts.push({
        id: nextId(),
        type: 'resource_conflict',
        constraints: ids,
        severity: 'high',
        explanation: `Multiple constraints define limits for "${resource}": ${ids.join(', ')}. These may compete for the same resource and require trade-off analysis.`,
        suggestion: `Document as a resource_tension in the tensions section and specify priority order.`
      });
    }
  }
}

/**
 * Detect temporal conflicts (timing-related contradictions)
 * Severity: medium
 */
function detectTemporalConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Temporal keywords
  const beforeKeywords = ['before', 'prior', 'first', 'initial', 'start'];
  const afterKeywords = ['after', 'following', 'then', 'subsequent', 'end', 'final'];
  const simultaneousKeywords = ['simultaneous', 'concurrent', 'parallel', 'same time'];
  const sequentialKeywords = ['sequential', 'serial', 'one at a time', 'in order'];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const c1 = constraints[i];
      const c2 = constraints[j];

      const s1 = c1.statement.toLowerCase();
      const s2 = c2.statement.toLowerCase();

      // Check for simultaneous vs sequential conflict
      const s1Simultaneous = simultaneousKeywords.some(kw => s1.includes(kw));
      const s2Sequential = sequentialKeywords.some(kw => s2.includes(kw));
      const s1Sequential = sequentialKeywords.some(kw => s1.includes(kw));
      const s2Simultaneous = simultaneousKeywords.some(kw => s2.includes(kw));

      if ((s1Simultaneous && s2Sequential) || (s1Sequential && s2Simultaneous)) {
        // Check if they're about similar operations
        const s1Words = new Set(s1.split(/\s+/).filter(w => w.length > 4));
        const s2Words = new Set(s2.split(/\s+/).filter(w => w.length > 4));
        const overlap = [...s1Words].filter(w => s2Words.has(w));

        if (overlap.length >= 1) {
          conflicts.push({
            id: nextId(),
            type: 'temporal_conflict',
            constraints: [c1.id, c2.id],
            severity: 'medium',
            explanation: `${c1.id} requires ${s1Simultaneous ? 'concurrent' : 'sequential'} execution while ${c2.id} requires ${s2Simultaneous ? 'concurrent' : 'sequential'} execution for operations involving: ${overlap.slice(0, 3).join(', ')}`,
            suggestion: 'Clarify execution order requirements or document as a hidden_dependency tension.'
          });
        }
      }
    }
  }
}

/**
 * Detect scope conflicts (contradictory scope requirements)
 * Severity: low-medium
 */
function detectScopeConflicts(
  constraints: ConstraintWithCategory[],
  conflicts: SemanticConflict[],
  nextId: () => string
): void {
  // Scope keywords
  const globalKeywords = ['all', 'every', 'any', 'global', 'system-wide', 'always'];
  const localKeywords = ['specific', 'only', 'certain', 'some', 'limited', 'conditional'];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const c1 = constraints[i];
      const c2 = constraints[j];

      // Skip if same category (likely intentional refinement)
      if (c1.category === c2.category) continue;

      const s1 = c1.statement.toLowerCase();
      const s2 = c2.statement.toLowerCase();

      const s1Global = globalKeywords.some(kw => s1.includes(kw));
      const s2Local = localKeywords.some(kw => s2.includes(kw));
      const s1Local = localKeywords.some(kw => s1.includes(kw));
      const s2Global = globalKeywords.some(kw => s2.includes(kw));

      // Check for global vs local scope conflict
      if ((s1Global && s2Local) || (s1Local && s2Global)) {
        // Check if they're about similar subjects
        const s1Words = new Set(s1.split(/\s+/).filter(w => w.length > 4));
        const s2Words = new Set(s2.split(/\s+/).filter(w => w.length > 4));
        const overlap = [...s1Words].filter(w => s2Words.has(w));

        if (overlap.length >= 1) {
          conflicts.push({
            id: nextId(),
            type: 'scope_conflict',
            constraints: [c1.id, c2.id],
            severity: 'low',
            explanation: `${c1.id} (${c1.category}) has ${s1Global ? 'global' : 'local'} scope while ${c2.id} (${c2.category}) has ${s2Global ? 'global' : 'local'} scope for: ${overlap.slice(0, 3).join(', ')}`,
            suggestion: 'Consider whether the local constraint is an exception to the global one, or if they need explicit scoping rules.'
          });
        }
      }
    }
  }
}

/**
 * Format conflict detection results for display
 */
export function formatConflictResults(result: ConflictDetectionResult): string {
  const lines: string[] = [];

  lines.push('SEMANTIC CONFLICT ANALYSIS');
  lines.push('══════════════════════════');
  lines.push('');

  if (!result.hasConflicts) {
    lines.push('✓ No semantic conflicts detected');
    return lines.join('\n');
  }

  lines.push(`Found ${result.summary.total} potential conflict${result.summary.total > 1 ? 's' : ''}:`);
  lines.push('');

  // Group by severity
  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;

  for (const severity of severityOrder) {
    const severityConflicts = result.conflicts.filter(c => c.severity === severity);
    if (severityConflicts.length === 0) continue;

    const icon = severity === 'critical' ? '🚨' :
                 severity === 'high' ? '⚠️' :
                 severity === 'medium' ? '📊' : 'ℹ️';

    lines.push(`${icon} ${severity.toUpperCase()} (${severityConflicts.length}):`);
    lines.push('');

    for (const conflict of severityConflicts) {
      lines.push(`  [${conflict.id}] ${conflict.type}`);
      lines.push(`    Constraints: ${conflict.constraints.join(', ')}`);
      lines.push(`    ${conflict.explanation}`);
      if (conflict.suggestion) {
        lines.push(`    💡 ${conflict.suggestion}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================
// Cross-Feature Semantic Conflict Detection
// Satisfies: T4 (semantic conflict detection across features)
//
// Key insight: ID reuse is NOT a conflict. B1 in feature A and B1 in
// feature B are independent - they're just IDs within namespaces.
// The real problem: Can constraint X in feature A coexist with
// constraint Y in feature B?
// ============================================================

/**
 * Constraint with metadata for cross-feature analysis
 */
interface CrossFeatureConstraint {
  feature: string;
  id: string;
  category: string;
  type: 'invariant' | 'goal' | 'boundary';
  statement: string;
}

/**
 * Semantic conflict between constraints in different features
 */
export interface CrossFeatureSemanticConflict {
  id: string;
  type: 'logical_contradiction' | 'resource_tension' | 'scope_conflict';
  severity: 'blocking' | 'requires_acceptance' | 'review_needed';

  constraintA: {
    feature: string;
    id: string;
    category: string;
    type: 'invariant' | 'goal' | 'boundary';
    statement: string;
  };

  constraintB: {
    feature: string;
    id: string;
    category: string;
    type: 'invariant' | 'goal' | 'boundary';
    statement: string;
  };

  // Why this is a conflict
  conflictReason: string;
  sharedDomain: string[];

  // What AI/user should do
  resolution: {
    options: string[];
    requiresUserAcceptance: boolean;
  };
}

/**
 * Cross-feature detection result
 */
export interface CrossFeatureConflictResult {
  hasConflicts: boolean;
  conflicts: CrossFeatureSemanticConflict[];
  summary: {
    total: number;
    featuresAnalyzed: number;
    constraintsAnalyzed: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

/**
 * Extract all constraints from manifolds with full metadata
 */
function extractAllCrossFeatureConstraints(manifolds: Manifold[]): CrossFeatureConstraint[] {
  const result: CrossFeatureConstraint[] = [];
  const categories = ['business', 'technical', 'user_experience', 'security', 'operational'] as const;

  for (const manifold of manifolds) {
    for (const cat of categories) {
      const constraints = manifold.constraints?.[cat] ||
                         (cat === 'user_experience' ? (manifold.constraints as any)?.ux : undefined);
      if (!constraints) continue;

      for (const c of constraints) {
        result.push({
          feature: manifold.feature,
          id: c.id,
          category: cat,
          type: c.type as 'invariant' | 'goal' | 'boundary',
          statement: c.statement
        });
      }
    }
  }

  return result;
}

/**
 * Extract domain keywords from a statement
 * Used to identify if two constraints are about the same topic
 */
function extractDomainKeywords(statement: string): string[] {
  const s = statement.toLowerCase();

  // Remove common stop words and short words
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for',
    'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
    'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
    'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
    'about', 'who', 'get', 'which', 'go', 'me', 'must', 'should', 'shall',
    'may', 'can', 'could', 'would', 'might', 'need', 'want', 'only', 'just',
    'also', 'any', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'than', 'too', 'very', 'same', 'different', 'able', 'back',
    'being', 'been', 'case', 'come', 'does', 'done', 'else', 'even', 'going',
    'good', 'keep', 'know', 'last', 'long', 'made', 'make', 'much', 'never',
    'over', 'part', 'take', 'them', 'then', 'these', 'time', 'upon', 'used',
    'well', 'were', 'when', 'where', 'while', 'work', 'year', 'your'
  ]);

  const words = s.split(/\W+/).filter(w =>
    w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w)
  );

  return [...new Set(words)];
}

/**
 * Detect logical contradiction between two invariants
 * Returns conflict details if found, null otherwise
 *
 * Key insight: For two invariants to truly contradict, they must:
 * 1. Be about the SAME specific property/attribute
 * 2. Have INCOMPATIBLE requirements for that property
 *
 * Example contradictions:
 * - "API responses must use JSON format" vs "API responses must use XML format"
 * - "All operations must be synchronous" vs "All operations must be asynchronous"
 *
 * NOT contradictions (different properties):
 * - "All YAML files must use consistent schema" vs "Schema must be YAML-compatible"
 *   (one is about consistency, other is about compatibility)
 */
function detectCrossFeatureContradiction(
  c1: CrossFeatureConstraint,
  c2: CrossFeatureConstraint
): { sharedDomain: string[]; conflictReason: string } | null {
  const s1 = c1.statement.toLowerCase();
  const s2 = c2.statement.toLowerCase();

  // Extract domain keywords
  const domain1 = extractDomainKeywords(s1);
  const domain2 = extractDomainKeywords(s2);

  // Check domain overlap - need at least 2 shared keywords to be about the same topic
  const sharedDomain = domain1.filter(d => domain2.includes(d));
  if (sharedDomain.length < 2) return null;

  // 1. Check for explicit negation patterns (highest confidence)
  // "must X" vs "must not X" or "must never X"
  const mustPattern = /must\s+(\w+)/g;
  const mustNotPattern = /must\s+(?:not|never)\s+(\w+)/g;

  const mustMatches1 = [...s1.matchAll(mustPattern)].map(m => m[1]);
  const mustNotMatches1 = [...s1.matchAll(mustNotPattern)].map(m => m[1]);
  const mustMatches2 = [...s2.matchAll(mustPattern)].map(m => m[1]);
  const mustNotMatches2 = [...s2.matchAll(mustNotPattern)].map(m => m[1]);

  // Check if s1 says "must X" and s2 says "must not X" (or vice versa)
  for (const verb of mustMatches1) {
    if (mustNotMatches2.includes(verb)) {
      return {
        sharedDomain,
        conflictReason: `One requires "${verb}" while the other prohibits it`
      };
    }
  }
  for (const verb of mustMatches2) {
    if (mustNotMatches1.includes(verb)) {
      return {
        sharedDomain,
        conflictReason: `One requires "${verb}" while the other prohibits it`
      };
    }
  }

  // 2. Check for mutually exclusive format/type specifications
  // Only trigger when BOTH statements specify a format AND the formats differ
  const formatPatterns = [
    /(?:must|should|shall)\s+(?:use|be|return|output)\s+(json|xml|csv|yaml|html|text|binary)\s*(?:format)?/,
    /(?:format|type)\s+(?:must|should|shall)\s+be\s+(json|xml|csv|yaml|html|text|binary)/,
    /(?:response|output|data)\s+(?:must|should|shall)\s+be\s+(?:in\s+)?(json|xml|csv|yaml|html|text|binary)/,
  ];

  for (const pattern of formatPatterns) {
    const format1 = s1.match(pattern);
    const format2 = s2.match(pattern);
    if (format1 && format2 && format1[1] !== format2[1]) {
      return {
        sharedDomain: [...sharedDomain, 'format'],
        conflictReason: `Incompatible format requirements: "${format1[1]}" vs "${format2[1]}"`
      };
    }
  }

  // 3. Check for boolean opposites with high-confidence patterns
  const booleanOpposites = [
    { positive: /\bsynchronous\b/, negative: /\basynchronous\b/, desc: 'sync vs async' },
    { positive: /\benabled?\b/, negative: /\bdisabled?\b/, desc: 'enabled vs disabled' },
    { positive: /\ballowed?\b/, negative: /\b(?:disallowed?|forbidden|prohibited)\b/, desc: 'allowed vs forbidden' },
    { positive: /\brequired\b/, negative: /\b(?:prohibited|forbidden)\b/, desc: 'required vs prohibited' },
    { positive: /\bpublic\b/, negative: /\bprivate\b/, desc: 'public vs private' },
    { positive: /\bencrypted\b/, negative: /\bunencrypted\b/, desc: 'encrypted vs unencrypted' },
    { positive: /\bmutable\b/, negative: /\bimmutable\b/, desc: 'mutable vs immutable' },
    { positive: /\bstateful\b/, negative: /\bstateless\b/, desc: 'stateful vs stateless' },
  ];

  for (const { positive, negative, desc } of booleanOpposites) {
    const s1Positive = positive.test(s1);
    const s1Negative = negative.test(s1);
    const s2Positive = positive.test(s2);
    const s2Negative = negative.test(s2);

    if ((s1Positive && s2Negative) || (s1Negative && s2Positive)) {
      return {
        sharedDomain,
        conflictReason: `Mutually exclusive requirements: ${desc}`
      };
    }
  }

  // 4. Check "always" vs "never" with same verb
  const alwaysMatch = s1.match(/\balways\s+(\w+)/) || s2.match(/\balways\s+(\w+)/);
  const neverMatch = s1.match(/\bnever\s+(\w+)/) || s2.match(/\bnever\s+(\w+)/);

  if (alwaysMatch && neverMatch && alwaysMatch[1] === neverMatch[1]) {
    return {
      sharedDomain,
      conflictReason: `One says "always ${alwaysMatch[1]}" while the other says "never ${neverMatch[1]}"`
    };
  }

  return null;
}

/**
 * Normalize time values to milliseconds for comparison
 */
function normalizeTimeToMs(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('ms')) return value;
  if (u.startsWith('s')) return value * 1000;
  if (u.startsWith('m')) return value * 60000;
  return value;
}

/**
 * Detect resource tension between a boundary and a goal
 * A boundary in one feature may constrain a goal in another
 */
function detectCrossFeatureResourceTension(
  c1: CrossFeatureConstraint,
  c2: CrossFeatureConstraint
): { sharedDomain: string[]; conflictReason: string } | null {
  // One must be boundary, one must be goal
  if (!((c1.type === 'boundary' && c2.type === 'goal') ||
        (c1.type === 'goal' && c2.type === 'boundary'))) {
    return null;
  }

  const boundary = c1.type === 'boundary' ? c1 : c2;
  const goal = c1.type === 'goal' ? c1 : c2;

  const s1 = boundary.statement.toLowerCase();
  const s2 = goal.statement.toLowerCase();

  // Extract domain keywords
  const domain1 = extractDomainKeywords(s1);
  const domain2 = extractDomainKeywords(s2);
  const sharedDomain = domain1.filter(d => domain2.includes(d));

  // Need some overlap to be related
  if (sharedDomain.length < 1) return null;

  // Resource keywords that indicate potential tension
  const resourceKeywords = [
    'memory', 'cpu', 'disk', 'bandwidth', 'storage',
    'time', 'latency', 'timeout', 'duration', 'performance',
    'budget', 'cost', 'price', 'token', 'tokens',
    'connections', 'threads', 'workers', 'instances',
    'limit', 'quota', 'capacity', 'throughput', 'rate',
    'size', 'length', 'count', 'complexity'
  ];

  const s1HasResource = resourceKeywords.some(kw => s1.includes(kw));
  const s2HasResource = resourceKeywords.some(kw => s2.includes(kw));

  // Tension keywords that indicate competing requirements
  const boundaryIndicators = ['must', 'limit', 'maximum', 'minimum', 'within', 'under', 'below', 'above', '<', '>', '≤', '≥'];
  const goalIndicators = ['unlimited', 'flexible', 'support', 'enable', 'allow', 'maximize', 'optimize'];

  const boundaryHasLimit = boundaryIndicators.some(kw => s1.includes(kw));
  const goalHasFlexibility = goalIndicators.some(kw => s2.includes(kw));

  if (s1HasResource && s2HasResource && boundaryHasLimit && goalHasFlexibility) {
    const resourceMentioned = resourceKeywords.find(kw => s1.includes(kw) || s2.includes(kw)) || 'resources';
    return {
      sharedDomain: [resourceMentioned, ...sharedDomain.filter(d => d !== resourceMentioned)].slice(0, 4),
      conflictReason: `Boundary "${boundary.id}" limits ${resourceMentioned} which may constrain goal "${goal.id}"`
    };
  }

  return null;
}

/**
 * Detect scope conflict where constraints apply to overlapping domains with different rules
 */
function detectCrossFeatureScopeConflict(
  c1: CrossFeatureConstraint,
  c2: CrossFeatureConstraint
): { sharedDomain: string[]; conflictReason: string } | null {
  const s1 = c1.statement.toLowerCase();
  const s2 = c2.statement.toLowerCase();

  // Extract domain keywords
  const domain1 = extractDomainKeywords(s1);
  const domain2 = extractDomainKeywords(s2);
  const sharedDomain = domain1.filter(d => domain2.includes(d));

  // Need significant overlap
  if (sharedDomain.length < 2) return null;

  // Scope indicators
  const globalScope = ['all', 'every', 'any', 'global', 'system-wide', 'always', 'everywhere'];
  const localScope = ['specific', 'only', 'certain', 'some', 'limited', 'conditional', 'except', 'unless'];

  const s1Global = globalScope.some(kw => s1.includes(kw));
  const s2Global = globalScope.some(kw => s2.includes(kw));
  const s1Local = localScope.some(kw => s1.includes(kw));
  const s2Local = localScope.some(kw => s2.includes(kw));

  // Check for global vs local scope mismatch
  if ((s1Global && s2Local) || (s1Local && s2Global)) {
    const globalConstraint = s1Global ? c1 : c2;
    const localConstraint = s1Local ? c1 : c2;
    return {
      sharedDomain,
      conflictReason: `"${globalConstraint.id}" has global scope while "${localConstraint.id}" has local scope for overlapping domain: ${sharedDomain.slice(0, 3).join(', ')}`
    };
  }

  return null;
}

/**
 * Detect semantic conflicts across multiple features
 * Satisfies: T4 (semantic conflict detection across features)
 *
 * Key insight: ID reuse (e.g., B1 in feature A and B1 in feature B) is NOT a conflict.
 * Features are independent namespaces. The real question: Can constraint X in feature A
 * coexist with constraint Y in feature B?
 *
 * Detects three types of semantic conflicts:
 * 1. Logical contradictions (BLOCKING) - Two invariants that cannot both be true
 * 2. Resource tensions (REQUIRES ACCEPTANCE) - A boundary constrains a goal
 * 3. Scope conflicts (REVIEW NEEDED) - Overlapping domains with different rules
 */
export function detectCrossFeatureConflicts(manifolds: Manifold[]): CrossFeatureConflictResult {
  const conflicts: CrossFeatureSemanticConflict[] = [];
  let conflictId = 0;

  // Extract all constraints with metadata
  const allConstraints = extractAllCrossFeatureConstraints(manifolds);

  // Compare each pair of constraints from DIFFERENT features
  for (let i = 0; i < allConstraints.length; i++) {
    for (let j = i + 1; j < allConstraints.length; j++) {
      const c1 = allConstraints[i];
      const c2 = allConstraints[j];

      // Skip same-feature comparisons - those are handled by single-feature detection
      if (c1.feature === c2.feature) continue;

      // 1. Check for logical contradiction (invariant vs invariant)
      if (c1.type === 'invariant' && c2.type === 'invariant') {
        const contradiction = detectCrossFeatureContradiction(c1, c2);
        if (contradiction) {
          conflicts.push({
            id: `CONFLICT-${++conflictId}`,
            type: 'logical_contradiction',
            severity: 'blocking',
            constraintA: c1,
            constraintB: c2,
            sharedDomain: contradiction.sharedDomain,
            conflictReason: contradiction.conflictReason,
            resolution: {
              options: [
                `Scope ${c1.feature}/${c1.id} to exclude ${c2.feature}'s domain`,
                `Scope ${c2.feature}/${c2.id} to exclude ${c1.feature}'s domain`,
                `Relax one constraint from invariant to goal`,
                `Remove one constraint entirely`
              ],
              requiresUserAcceptance: true
            }
          });
        }
      }

      // 2. Check for resource tension (boundary vs goal)
      if ((c1.type === 'boundary' && c2.type === 'goal') ||
          (c1.type === 'goal' && c2.type === 'boundary')) {
        const tension = detectCrossFeatureResourceTension(c1, c2);
        if (tension) {
          const boundary = c1.type === 'boundary' ? c1 : c2;
          const goal = c1.type === 'goal' ? c1 : c2;
          conflicts.push({
            id: `TENSION-${++conflictId}`,
            type: 'resource_tension',
            severity: 'requires_acceptance',
            constraintA: boundary,
            constraintB: goal,
            sharedDomain: tension.sharedDomain,
            conflictReason: tension.conflictReason,
            resolution: {
              options: [
                `Accept this tension and document in both features' tensions section`,
                `Relax the boundary constraint ${boundary.id}`,
                `Constrain the goal ${goal.id} to work within the boundary`
              ],
              requiresUserAcceptance: true
            }
          });
        }
      }

      // 3. Check for scope conflicts
      const scopeConflict = detectCrossFeatureScopeConflict(c1, c2);
      if (scopeConflict) {
        conflicts.push({
          id: `REVIEW-${++conflictId}`,
          type: 'scope_conflict',
          severity: 'review_needed',
          constraintA: c1,
          constraintB: c2,
          sharedDomain: scopeConflict.sharedDomain,
          conflictReason: scopeConflict.conflictReason,
          resolution: {
            options: [
              `Clarify if the local constraint is an exception to the global one`,
              `Add explicit scoping rules to both constraints`,
              `Document as an accepted tension if intentional`
            ],
            requiresUserAcceptance: false
          }
        });
      }
    }
  }

  // Build summary
  const summary = {
    total: conflicts.length,
    featuresAnalyzed: manifolds.length,
    constraintsAnalyzed: allConstraints.length,
    bySeverity: {
      blocking: conflicts.filter(c => c.severity === 'blocking').length,
      requires_acceptance: conflicts.filter(c => c.severity === 'requires_acceptance').length,
      review_needed: conflicts.filter(c => c.severity === 'review_needed').length,
    },
    byType: {
      logical_contradiction: conflicts.filter(c => c.type === 'logical_contradiction').length,
      resource_tension: conflicts.filter(c => c.type === 'resource_tension').length,
      scope_conflict: conflicts.filter(c => c.type === 'scope_conflict').length,
    }
  };

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    summary
  };
}

/**
 * Format cross-feature semantic conflict detection results for display
 */
export function formatCrossFeatureResults(result: CrossFeatureConflictResult): string {
  const lines: string[] = [];

  lines.push('SEMANTIC CONFLICT ANALYSIS');
  lines.push('══════════════════════════');
  lines.push('');
  lines.push(`Analyzed: ${result.summary.featuresAnalyzed} features, ${result.summary.constraintsAnalyzed} constraints`);
  lines.push('');

  if (!result.hasConflicts) {
    lines.push('✓ No semantic conflicts detected between features');
    return lines.join('\n');
  }

  // Group by severity and display

  // 1. BLOCKING conflicts (logical contradictions)
  const blockingConflicts = result.conflicts.filter(c => c.severity === 'blocking');
  if (blockingConflicts.length > 0) {
    lines.push(`🚫 BLOCKING CONFLICTS (${blockingConflicts.length}) - Cannot proceed without resolution`);
    lines.push('─'.repeat(60));
    lines.push('');

    for (const conflict of blockingConflicts) {
      lines.push(`[${conflict.id}] ${conflict.type.replace('_', ' ')}`);
      lines.push(`  Feature: ${conflict.constraintA.feature} (${conflict.constraintA.id}) vs Feature: ${conflict.constraintB.feature} (${conflict.constraintB.id})`);
      lines.push('');
      lines.push(`  ${conflict.constraintA.feature}/${conflict.constraintA.id} (${conflict.constraintA.type}):`);
      lines.push(`    "${conflict.constraintA.statement}"`);
      lines.push('');
      lines.push(`  ${conflict.constraintB.feature}/${conflict.constraintB.id} (${conflict.constraintB.type}):`);
      lines.push(`    "${conflict.constraintB.statement}"`);
      lines.push('');
      lines.push(`  Shared Domain: [${conflict.sharedDomain.join(', ')}]`);
      lines.push(`  Conflict: ${conflict.conflictReason}`);
      lines.push('');
      lines.push('  Resolution Options:');
      for (let i = 0; i < conflict.resolution.options.length; i++) {
        lines.push(`    ${i + 1}. ${conflict.resolution.options[i]}`);
      }
      lines.push('');
      lines.push('  ⚠️  REQUIRES USER DECISION before features can coexist');
      lines.push('');
    }
  }

  // 2. REQUIRES ACCEPTANCE (resource tensions)
  const tensionConflicts = result.conflicts.filter(c => c.severity === 'requires_acceptance');
  if (tensionConflicts.length > 0) {
    lines.push(`⚡ RESOURCE TENSIONS (${tensionConflicts.length}) - Require explicit acceptance`);
    lines.push('─'.repeat(60));
    lines.push('');

    for (const conflict of tensionConflicts) {
      lines.push(`[${conflict.id}] ${conflict.type.replace('_', ' ')}`);
      lines.push(`  Feature: ${conflict.constraintA.feature} (${conflict.constraintA.id}) vs Feature: ${conflict.constraintB.feature} (${conflict.constraintB.id})`);
      lines.push('');
      lines.push(`  ${conflict.constraintA.feature}/${conflict.constraintA.id} (${conflict.constraintA.type}):`);
      lines.push(`    "${conflict.constraintA.statement}"`);
      lines.push('');
      lines.push(`  ${conflict.constraintB.feature}/${conflict.constraintB.id} (${conflict.constraintB.type}):`);
      lines.push(`    "${conflict.constraintB.statement}"`);
      lines.push('');
      lines.push(`  Shared Domain: [${conflict.sharedDomain.join(', ')}]`);
      lines.push(`  Tension: ${conflict.conflictReason}`);
      lines.push('');
      lines.push('  Accept this tension? If yes, document in tensions section of both features.');
      lines.push('');
    }
  }

  // 3. REVIEW NEEDED (scope conflicts)
  const reviewConflicts = result.conflicts.filter(c => c.severity === 'review_needed');
  if (reviewConflicts.length > 0) {
    lines.push(`📋 REVIEW NEEDED (${reviewConflicts.length}) - Potential conflicts requiring human judgment`);
    lines.push('─'.repeat(60));
    lines.push('');

    for (const conflict of reviewConflicts) {
      lines.push(`[${conflict.id}] ${conflict.type.replace('_', ' ')}`);
      lines.push(`  ${conflict.constraintA.feature}/${conflict.constraintA.id} vs ${conflict.constraintB.feature}/${conflict.constraintB.id}`);
      lines.push(`  Shared Domain: [${conflict.sharedDomain.join(', ')}]`);
      lines.push(`  Issue: ${conflict.conflictReason}`);
      lines.push('');
    }
  }

  // Summary
  lines.push('SUMMARY');
  lines.push('───────');
  lines.push(`- Blocking: ${result.summary.bySeverity.blocking} (must resolve before proceeding)`);
  lines.push(`- Requires Acceptance: ${result.summary.bySeverity.requires_acceptance} (document as accepted trade-offs)`);
  lines.push(`- Review Needed: ${result.summary.bySeverity.review_needed} (may or may not be actual conflicts)`);
  lines.push('');
  lines.push('To accept tensions, add to each feature\'s manifold:');
  lines.push('  accepted_tensions:');
  lines.push('    - cross_feature: "feature-name"');
  lines.push('      constraint: "T2"');
  lines.push(`      accepted_by: "username"`);
  lines.push(`      date: "${new Date().toISOString().split('T')[0]}"`);
  lines.push('      rationale: "Why this tension is acceptable"');

  return lines.join('\n');
}
