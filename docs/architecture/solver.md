<!-- Satisfies: O2 (solver architecture documented), RT-7 -->

# Solver Module Architecture

The constraint solver (`cli/lib/solver.ts`, ~1,870 lines) builds a directed graph from manifold data, detects semantic conflicts between constraints, generates wave-based execution plans, and supports bidirectional dependency queries. The companion module `cli/lib/mermaid.ts` converts solver output into Mermaid diagrams and terminal-rendered ASCII.

## Overview

The solver treats development as **constraint satisfaction**. Given a manifold (constraints, tensions, required truths, artifacts), it:

1. **Builds a constraint graph** -- nodes for each constraint, tension, required truth, and artifact; edges for dependencies, conflicts, and satisfaction relationships.
2. **Detects semantic conflicts** -- keyword-based analysis that surfaces contradictions the author may not have explicitly documented as tensions.
3. **Generates execution plans** -- topological sort into parallel waves, identifying critical paths and parallelization opportunities.
4. **Supports bidirectional queries** -- "what must be true for X?" (backward) and "what does X block?" (forward).
5. **Compares across features** -- detects conflicts between constraints in different manifolds.

## Data Model

### ConstraintGraph

The central data structure. Defined in `parser.ts`, populated by the solver.

```
ConstraintGraph
  version: 1
  generated_at: ISO timestamp
  feature: string
  nodes: Record<string, ConstraintNode>
  edges:
    dependencies: [from, to][]      -- solid arrows (-->)
    conflicts:    [a, b][]          -- dotted arrows (-.->)
    satisfies:    [artifact, constraint][]  -- thick arrows (==>)
```

### ConstraintNode

Every entity in the manifold becomes a node with a uniform shape:

| Field | Description |
|-------|-------------|
| `id` | Constraint ID (B1, T2), tension ID (TN-1), RT ID (RT-3), or generated artifact ID (ART-path) |
| `type` | `constraint` \| `tension` \| `required_truth` \| `artifact` |
| `label` | Human-readable description (constraint statement, tension description, file path) |
| `depends_on` | IDs this node requires before it can be satisfied |
| `blocks` | IDs that depend on this node (reverse edges, computed) |
| `conflicts_with` | IDs in tension with this node |
| `status` | `UNKNOWN` \| `REQUIRED` \| `SATISFIED` \| `BLOCKED` \| `CONFLICTED` |
| `critical_path` | Whether this node is on the longest dependency chain |

### Graph Construction Pipeline

The `buildGraphInternal()` method builds the graph in six steps:

```
1. addConstraintNodes()      -- All 5 categories (business, technical, UX, security, operational)
2. addTensionNodes()         -- Tensions become diamond nodes + conflict edges between their `between` constraints
3. addRequiredTruthNodes()   -- RTs link to constraints via `maps_to_constraints`; anchor doc adds sequential deps
4. addArtifactNodes()        -- Generated files link to what they satisfy
5. buildReverseEdges()       -- Populate `blocks` arrays from `depends_on` arrays
6. Extract dependency edges  -- Flatten node.depends_on into edges.dependencies tuples
```

Key rules:
- **Invariant constraints** start on the critical path (`critical_path: true`).
- **Tensions** have status `SATISFIED` if resolved, `CONFLICTED` if unresolved.
- **Artifact IDs** are generated from file paths: `ART-` + path with non-alphanumeric chars replaced by `-`.
- **Anchor document** dependency chains (sequential, blocking) are parsed via regex to add edges the manifold YAML does not express directly.

## Caching Strategy

The solver uses a **session-scoped in-memory cache** to avoid rebuilding graphs on repeated queries within the same CLI session.

### Cache Structure

```typescript
// Module-level Map, lives for the process lifetime
const graphCache = new Map<string, CachedGraph>();

interface CachedGraph {
  graph: ConstraintGraph;
  plan?: ExecutionPlan;
  createdAt: number;
  manifestHash: string;
}
```

### Hash-Based Invalidation

Cache keys are feature names. Staleness is detected by comparing a manifest hash:

```typescript
function generateManifestHash(manifold: Manifold): string {
  // Counts constraints, tensions, RTs, and artifacts
  return `${manifold.feature}:${manifold.phase}:${constraintCount}:${tensionCount}:${rtCount}:${artifactCount}`;
}
```

The hash is a colon-delimited string of: **feature name + phase + constraint count + tension count + RT count + artifact count**. Any structural change (adding a constraint, advancing a phase) invalidates the cache. Content-only edits (rewording a statement) do not invalidate -- this is an intentional trade-off for speed.

### Cache Lifecycle

| Operation | Function | Behavior |
|-----------|----------|----------|
| Read | `getCachedGraph(feature, manifold)` | Returns cached graph if hash matches, `null` otherwise |
| Write | `cacheGraph(feature, manifold, graph, plan?)` | Stores graph + optional plan with current hash |
| Invalidate | `clearGraphCache()` | Clears entire cache |
| Bypass | `ConstraintSolver.createWithoutCache()` | Deletes feature entry, forces rebuild |
| Stats | `getGraphCacheStats()` | Returns cache size and feature list |

When `markSatisfied()` mutates graph state, it invalidates the cached execution plan and re-caches the updated graph.

## Conflict Detection

### Single-Feature Conflicts

`detectSemanticConflicts(manifold)` finds conflicts the author did not explicitly list as tensions. It runs four detectors in sequence:

#### 1. Contradictory Invariants (severity: critical)

Compares every pair of invariant-type constraints. Two invariants conflict if:
- They contain **opposing keyword pairs** (must/must not, always/never, enable/disable, require/prohibit, etc.)
- They share **at least 2 common words** longer than 3 characters (subject overlap)

```typescript
const contradictionPairs = [
  ['must', 'must not'], ['always', 'never'],
  ['all', 'none'],      ['enable', 'disable'],
  ['allow', 'block'],   ['require', 'prohibit'],
  ['maximum', 'minimum'], ['synchronous', 'asynchronous'],
];
```

#### 2. Resource Conflicts (severity: high)

Groups constraints by resource keywords (memory, cpu, latency, budget, connections, tokens, etc.). Within each resource group, flags pairs that both specify **numeric requirements** with units (ms, seconds, MB, GB, %).

#### 3. Temporal Conflicts (severity: medium)

Detects constraints where one requires **concurrent** execution and another requires **sequential** execution for overlapping operations. Uses keyword sets:
- Simultaneous: `simultaneous`, `concurrent`, `parallel`, `same time`
- Sequential: `sequential`, `serial`, `one at a time`, `in order`

#### 4. Scope Conflicts (severity: low)

Detects constraints from **different categories** where one has global scope (`all`, `every`, `always`, `system-wide`) and another has local scope (`specific`, `only`, `certain`, `limited`, `conditional`) for overlapping subjects.

### Output Structure

```typescript
interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: SemanticConflict[];      // Each has: id, type, constraints[], severity, explanation, suggestion
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}
```

## Cross-Feature Analysis

`detectCrossFeatureConflicts(manifolds[])` compares constraints across different features. Key design insight from the source:

> ID reuse is NOT a conflict. B1 in feature A and B1 in feature B are independent -- they're just IDs within namespaces. The real problem: Can constraint X in feature A coexist with constraint Y in feature B?

### Three Cross-Feature Conflict Types

| Type | Comparison | Severity | Detection Method |
|------|-----------|----------|-----------------|
| `logical_contradiction` | invariant vs invariant | `blocking` | Negation patterns, format exclusivity, boolean opposites, always/never |
| `resource_tension` | boundary vs goal | `requires_acceptance` | Resource keyword overlap + boundary limit indicators vs goal flexibility indicators |
| `scope_conflict` | any vs any | `review_needed` | Global scope keywords vs local scope keywords with domain overlap |

### Contradiction Detection (Cross-Feature)

More sophisticated than single-feature detection. Uses four checks with increasing specificity:

1. **Explicit negation**: "must X" vs "must not X" via regex matching
2. **Mutually exclusive formats**: Both specify a format (JSON, XML, YAML, etc.) and they differ
3. **Boolean opposites**: Pattern pairs like `synchronous/asynchronous`, `mutable/immutable`, `public/private`, `stateful/stateless`
4. **Always/never with same verb**: "always cache" vs "never cache"

All checks require **at least 2 shared domain keywords** (extracted after stop-word removal) to confirm the constraints discuss the same subject.

### Resolution Options

Each cross-feature conflict includes resolution suggestions:

- **Blocking**: Scope one constraint, relax to goal, or remove
- **Resource tension**: Accept and document, relax boundary, or constrain goal
- **Scope conflict**: Clarify exception rules, add explicit scoping, or accept as intentional

## Execution Planning

`generateExecutionPlan(strategy)` converts the graph into parallel waves.

### Wave Generation Algorithm

```
1. Initialize: all nodes in `remaining` set, empty `satisfied` set
2. Loop while remaining is non-empty:
   a. Find all nodes whose dependencies are fully in `satisfied` (or not in `remaining`)
   b. If no ready nodes found → circular dependency → break cycle by taking first remaining
   c. Group ready nodes into a Wave with parallel tasks
   d. Move ready nodes from `remaining` to `satisfied`
3. Calculate critical path and parallelization factor
```

Each wave is assigned a **phase label** based on majority node type:
- Mostly constraints -> `CONSTRAINED`
- Mostly tensions -> `TENSIONED`
- Mostly required truths -> `ANCHORED`
- Mostly artifacts -> `GENERATED`

### Critical Path

Found via **longest path in DAG** using topological sort:

```typescript
findCriticalPath(): string[] {
  // Topological sort
  // Forward pass: for each node, propagate max distance to blocked nodes
  // Backtrack from node with maximum distance
}
```

The parallelization factor is `total_nodes / wave_count`, indicating average parallelism per wave.

### Real-Time Updates

The solver supports incremental updates without full rebuild:

| Method | Purpose |
|--------|---------|
| `markSatisfied(nodeId)` | Mark node done, return newly unblocked and ready nodes |
| `markManySatisfied(nodeIds)` | Batch version |
| `getReadyNodes()` | Nodes with all deps satisfied, not yet done |
| `getBlockedNodes()` | Nodes with unsatisfied deps |
| `getProgress()` | `{ satisfied, total, percentage }` |
| `getRemainingWork()` | Ready/blocked breakdown by type + estimated waves |

## Mermaid Export Pipeline

`cli/lib/mermaid.ts` converts solver data structures into Mermaid diagram syntax and renders them as ASCII for terminal display.

### Conversion Functions

| Function | Input | Direction | Purpose |
|----------|-------|-----------|---------|
| `graphToMermaid(graph)` | ConstraintGraph | TD | Full graph with subgraphs by node type |
| `executionPlanToMermaid(plan)` | ExecutionPlan | LR | Waves as subgraphs, tasks as parallel nodes |
| `backwardReasoningToMermaid(graph, targetId, reqs)` | Graph + target | TD | Target at top, requirements cascade down |
| `miniGraphToMermaid(graph)` | ConstraintGraph | TD | Compact: IDs + status only, no subgraphs |

### Node Shape Mapping

```typescript
// constraint:      [label]       rectangle
// tension:         {label}       diamond
// required_truth:  (label)       rounded
// artifact:        [/label/]     parallelogram
```

### Edge Style Mapping

```
dependencies:  -->   solid arrow
conflicts:     -.->  dotted arrow
satisfies:     ==>   thick arrow
```

### Terminal Rendering

For terminal output, a separate set of functions generates **LR-direction, flat (no subgraphs), short-label** diagrams optimized for 80-120 column terminals:

```typescript
renderGraphToTerminal(graph, mode)     // 'full' includes legend table, 'mini' is graph only
renderPlanToTerminal(plan)             // Includes wave/task/parallelization summary
renderBackwardToTerminal(graph, target, reqs)
```

All renderers use `beautiful-mermaid`'s `renderMermaidAscii()` with compact padding. On rendering failure, they fall back to raw Mermaid syntax.

The `full` mode appends a **legend table** mapping short node IDs to full descriptions and colored status indicators.

### DOT Export

`exportGraphDot(graph)` produces GraphViz DOT format as an alternative to Mermaid, with type-based shapes and colors (blue rectangles for constraints, yellow diamonds for tensions, green ellipses for required truths, gray notes for artifacts).

## Key Functions Reference

### ConstraintSolver Class

| Method | Returns | Description |
|--------|---------|-------------|
| `constructor(manifold, anchor?)` | -- | Builds or loads cached graph |
| `static createWithoutCache(manifold, anchor?)` | `ConstraintSolver` | Forces fresh graph build |
| `getGraph()` | `ConstraintGraph` | Returns the built graph |
| `generateExecutionPlan(strategy?)` | `ExecutionPlan` | Wave-based parallel plan |
| `findCriticalPath()` | `string[]` | Longest dependency chain |
| `whatMustBeTrue(targetId)` | `string[]` | Backward reasoning (BFS on depends_on) |
| `whatDoesThisBlock(sourceId)` | `string[]` | Forward reasoning (BFS on blocks) |
| `getConflicts(targetId)` | `string[]` | Direct conflicts for a node |
| `markSatisfied(nodeId)` | `{ success, unblocked, newlyReady, progress }` | Incremental state update |
| `getReadyNodes()` | `string[]` | Nodes ready to work on |
| `getBlockedNodes()` | `string[]` | Nodes waiting on dependencies |
| `getProgress()` | `{ satisfied, total, percentage }` | Completion stats |
| `getRemainingWork()` | `{ ready, blocked, byType, estimatedWaves }` | Full remaining work summary |

### Standalone Functions

| Function | Description |
|----------|-------------|
| `getCachedGraph(feature, manifold)` | Cache read with hash check |
| `cacheGraph(feature, manifold, graph, plan?)` | Cache write |
| `clearGraphCache()` | Wipe cache |
| `getGraphCacheStats()` | Cache size and feature list |
| `detectSemanticConflicts(manifold)` | Single-feature conflict detection |
| `detectCrossFeatureConflicts(manifolds[])` | Multi-feature conflict detection |
| `formatConflictResults(result)` | Format single-feature results for display |
| `formatCrossFeatureResults(result)` | Format cross-feature results for display |
| `exportGraphDot(graph)` | GraphViz DOT export |

### Mermaid Functions (mermaid.ts)

| Function | Description |
|----------|-------------|
| `graphToMermaid(graph)` | Full Mermaid flowchart (TD) with subgraphs |
| `executionPlanToMermaid(plan)` | Wave-based Mermaid flowchart (LR) |
| `backwardReasoningToMermaid(graph, target, reqs)` | Backward reasoning diagram (TD) |
| `miniGraphToMermaid(graph)` | Compact ID-only graph (TD) |
| `renderGraphToTerminal(graph, mode?)` | ASCII render with optional legend |
| `renderPlanToTerminal(plan)` | ASCII render with summary line |
| `renderBackwardToTerminal(graph, target, reqs)` | ASCII backward reasoning |
| `renderMermaidToTerminal(syntax)` | Raw Mermaid string to ASCII |

## File Dependencies

```
solver.ts
  imports from: parser.ts (types), output.ts (printWarning)
  exports to:   solve.ts (command), graph.ts (command), status.ts, verify.ts

mermaid.ts
  imports from: beautiful-mermaid, parser.ts (types), output.ts (formatTable, style)
  exports to:   graph.ts (command), status.ts, show.ts
```
