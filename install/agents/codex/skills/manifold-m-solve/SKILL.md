---
name: manifold-m-solve
description: "Generate parallel execution plan from constraint network. Identifies waves, critical path, and bidirectional dependencies"
---

# /manifold:m-solve

# /manifold:m-solve - Constraint Solver

Generate parallel execution plan from constraint network.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Reads From** | Manifold YAML, anchor document |
| **Outputs** | Execution plan with parallel waves |
| **Graph Version** | `1` |

> This command performs **read-only analysis**. It does not modify manifold files.
>
> See `SCHEMA_REFERENCE.md` for valid constraint_graph node types, edge definitions, and execution plan structure.

## Usage

```
/manifold:m-solve <feature-name> [--backward] [--visualize] [--dot]
```

## Flags

- `--backward` - Reason from outcome backward (Arrival-style bidirectional analysis)
- `--visualize` - Show ASCII constraint network and execution plan
- `--dot` - Output GraphViz DOT format for diagram generation

## Why Constraint Solving?

**Traditional approach** (sequential):
```
Task → Subtask 1 → Subtask 2 → Subtask 3 → Done
```
Each step waits for the previous. No parallelization. No visibility into dependencies.

**Manifold approach** (constraint network):
```
{Constraints, Tensions, Required Truths} → Graph → Parallel Waves → Done
```
All relationships visible. Independent tasks execute in parallel. Critical path identified.

## Process

1. **Build constraint graph** from manifold YAML
   - Constraints become nodes
   - Tensions become conflict edges
   - Required truths become nodes with dependencies
   - Artifacts become nodes with satisfies edges

2. **Identify dependencies**
   - Parse `tension.between[]` for conflict relationships
   - Parse `maps_to_constraints` for RT dependencies
   - Parse `dependency_chain` from anchor document

3. **Detect parallel opportunities**
   - Find nodes with no dependencies (Wave 1)
   - Find nodes whose dependencies are satisfied (subsequent waves)
   - Calculate parallelization factor

4. **Generate execution plan**
   - Group tasks into parallel waves
   - Identify critical path (longest dependency chain)
   - Map waves to conceptual phases for human comprehension

## Example: Forward Analysis

```
/manifold:m-solve payment-retry --visualize

CONSTRAINT NETWORK: payment-retry
══════════════════════════════════════════════════

┌─ CONSTRAINTS ─────────────────────────────────────┐
│ ○ B1: No duplicate payments *                     │
│ ○ B2: 95% retry success rate                      │
│ ○ T1: API response < 200ms                        │
│ ○ T2: Atomic state transitions                    │
└───────────────────────────────────────────────────┘
        │
        ▼
┌─ TENSIONS ────────────────────────────────────────┐
│ B1, T1 ┄⚡┄ Performance vs Safety                 │
│ U1, O1 ━⚡━ UX vs Operational (resolved)          │
└───────────────────────────────────────────────────┘
        │
        ▼
┌─ REQUIRED TRUTHS ─────────────────────────────────┐
│ ○ RT-1: Idempotency key preserved * ← [B1, T1]   │
│ ○ RT-2: Error classification exists ← [T2]       │
│ ○ RT-3: Retry budget sufficient ← [O2]           │
└───────────────────────────────────────────────────┘

* = critical path

EXECUTION PLAN
══════════════

Strategy: hybrid
Parallelization Factor: 2.1x
Critical Path: B1 → TN1 → RT-1 → ART-idempotency

Wave 1 (CONSTRAINED) - 4 parallel tasks:
  ├── [B1] Discover and document: No duplicate payments
  ├── [B2] Discover and document: 95% retry success
  ├── [T1] Discover and document: API response < 200ms
  └── [T2] Discover and document: Atomic state transitions

Wave 2 (TENSIONED) - 2 parallel tasks:
  ├── [TN1] Analyze and resolve: Performance vs Safety
  └── [TN2] Analyze and resolve: UX vs Operational

Wave 3 (ANCHORED) - 3 parallel tasks:
  ├── [RT-1] Derive and validate: Idempotency key (CRITICAL)
  ├── [RT-2] Derive and validate: Error classification
  └── [RT-3] Derive and validate: Retry budget

Wave 4 (GENERATED) - 3 parallel tasks:
  ├── [ART-*] Generate: src/idempotency.ts
  ├── [ART-*] Generate: src/error-classifier.ts
  └── [ART-*] Generate: src/retry-policy.ts
```

## Example: Backward Reasoning

```
/manifold:m-solve payment-retry --backward

BACKWARD ANALYSIS: What must be TRUE for outcome?
═══════════════════════════════════════════════════

Outcome: "95% retry success for transient failures"

Starting from outcome, working backward...

RT-1: Idempotency key preserved
├── REQUIRES: B1 (no duplicates)
├── REQUIRES: T1 (latency budget)
└── WHY: Without idempotency, retries create duplicates

RT-2: Error classification exists
├── REQUIRES: T2 (atomic state)
└── WHY: Must distinguish transient from permanent failures

RT-3: Retry budget sufficient
├── REQUIRES: O2 (monitoring)
└── WHY: Need 3+ attempts with exponential backoff

DEPENDENCY CHAIN:
B1 ──┐
     ├──→ TN1 ──→ RT-1 ──→ Outcome
T1 ──┘

T2 ──────────────→ RT-2 ──→ Outcome

O2 ──────────────→ RT-3 ──→ Outcome

CRITICAL QUESTION:
Given desired state Z (95% retry success), what configuration
of constraints satisfies all required truths simultaneously?

BLOCKING DEPENDENCIES:
- RT-1 blocks artifact generation (idempotency.ts)
- B1 must be satisfied before RT-1 can be validated
- TN1 must be resolved before RT-1 makes sense
```

## Example: DOT Export

```
/manifold:m-solve payment-retry --dot > graph.dot
dot -Tpng graph.dot -o constraint-network.png
```

Generates a visual diagram showing:
- Constraints (blue boxes)
- Tensions (yellow diamonds)
- Required truths (green ellipses)
- Artifacts (gray notes)
- Dependencies (solid arrows)
- Conflicts (red dashed lines)
- Satisfies relationships (green dotted lines)

## Temporal Non-Linearity

This command embodies **temporally non-linear reasoning**:

1. **All information exists simultaneously**
   - Not a sequence of steps but a constraint network
   - Past (constraints) and future (outcome) are symmetric

2. **Bidirectional causal reasoning**
   - Forward: "If B1, then RT-1 becomes possible"
   - Backward: "For outcome Z, what must be TRUE?"
   - Both views available simultaneously

3. **Parallel execution waves**
   - Independent tasks identified and grouped
   - Only sequential dependencies enforced
   - Parallelization factor shows speedup

4. **Phases retained for human comprehension**
   - Waves map to CONSTRAINED, TENSIONED, etc.
   - AI executes in parallel, humans see familiar phases

## Execution Instructions

When this command is invoked:

1. Read manifold from `.manifold/<feature>.json` (or `.yaml` for legacy)
2. Read anchors from JSON `anchors` section (or `.manifold/<feature>.anchor.yaml` for legacy)
3. Build constraint graph:
   - Parse constraints from all categories
   - Parse tensions and create conflict edges
   - Parse required truths and their dependencies
   - Parse artifacts and their satisfies relationships
4. Generate execution plan:
   - Use topological sort to identify waves
   - Calculate parallelization factor
   - Find critical path
5. If `--backward`: Show bidirectional analysis
6. If `--visualize`: Show ASCII network and plan
7. If `--dot`: Output GraphViz DOT format

## CLI Integration

This slash command maps to:

```bash
manifold graph <feature>   # Output constraint graph JSON
manifold solve <feature>   # Output execution plan JSON
```

With flags:
- `--ascii` for ASCII visualization
- `--dot` for GraphViz DOT format
- `--backward` for bidirectional analysis
