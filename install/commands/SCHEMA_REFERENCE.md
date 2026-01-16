# Manifold Schema Reference

> **CRITICAL**: Always use EXACTLY these values. Do NOT invent new phases or statuses.

## Schema Versions

| Version | Features | Status |
|---------|----------|--------|
| 1 | Original schema, no version field | Supported |
| 2 | Adds `schema_version`, `iterations[]`, `convergence` | Supported |
| 3 | Adds `Evidence[]`, `constraint_graph`, temporal non-linearity | Current |

## Phases (Workflow Order)

| Phase | Set By | Description |
|-------|--------|-------------|
| `INITIALIZED` | /m0-init | Manifold created, feature named |
| `CONSTRAINED` | /m1-constrain | Constraints discovered and documented |
| `TENSIONED` | /m2-tension | Tensions identified and resolved |
| `ANCHORED` | /m3-anchor | Required truths established, option selected |
| `GENERATED` | /m4-generate | Artifacts created |
| `VERIFIED` | /m5-verify | Artifacts validated against constraints |

**Phase Transition Rules:**
```
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
     ↑                                                              |
     └──────────────────── (iteration) ─────────────────────────────┘
```

## Constraint Types

| Type | Description |
|------|-------------|
| `invariant` | Must ALWAYS be true, cannot be compromised |
| `goal` | Should be achieved, can trade off |
| `boundary` | Limits/edges that must not be crossed |

## Constraint Categories

| Category | Prefix |
|----------|--------|
| `business` | B1, B2, ... |
| `technical` | T1, T2, ... |
| `user_experience` | U1, U2, ... |
| `security` | S1, S2, ... |
| `operational` | O1, O2, ... |

## Tension Types

| Type | Description |
|------|-------------|
| `trade_off` | Competing constraints requiring balance |
| `resource_tension` | Resource limits constraining options |
| `hidden_dependency` | Non-obvious relationships between constraints |

## Tension Statuses

| Status | Description |
|--------|-------------|
| `resolved` | Tension addressed with documented resolution |
| `unresolved` | Tension identified but not yet resolved |

## Required Truth Statuses

| Status | Description |
|--------|-------------|
| `SATISFIED` | Truth verified with evidence |
| `PARTIAL` | Partially satisfied, needs more work |
| `NOT_SATISFIED` | Not yet implemented |
| `SPECIFICATION_READY` | Spec complete, ready for implementation |

## Convergence Statuses

| Status | Description |
|--------|-------------|
| `NOT_STARTED` | Convergence tracking not begun |
| `IN_PROGRESS` | Working toward convergence |
| `CONVERGED` | All criteria met, manifold complete |

## YAML Templates

### Phase Update (use EXACTLY as shown)
```yaml
phase: INITIALIZED   # or CONSTRAINED, TENSIONED, ANCHORED, GENERATED, VERIFIED
```

### Constraint Template
```yaml
- id: B1
  type: invariant    # or goal, boundary
  statement: "The constraint statement"
  rationale: "Why this matters"
```

### Tension Template
```yaml
- id: TN1
  type: trade_off    # or resource_tension, hidden_dependency
  between: [B1, T2]
  description: "What is in tension"
  status: resolved   # or unresolved
  resolution: "How it was resolved"
  priority: 1
```

### Required Truth Template
```yaml
- id: RT-1
  statement: "What must be true"
  status: SATISFIED  # or PARTIAL, NOT_SATISFIED, SPECIFICATION_READY
  priority: 1
  evidence: "path/to/evidence.ts"
```

### Iteration Template
```yaml
- number: 1
  phase: constrain   # lowercase phase name for iteration description
  timestamp: "2026-01-16T10:00:00Z"
  result: "Summary of what happened"
```

### Convergence Template
```yaml
convergence:
  status: CONVERGED  # or NOT_STARTED, IN_PROGRESS
  criteria:
    all_invariants_satisfied: true
    all_required_truths_satisfied: true
    no_blocking_gaps: true
```

---

## v3: Evidence System (Reality Grounding)

Evidence provides **concrete verification** for required truths and constraints.

### Evidence Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `file_exists` | File must exist at path | `path` |
| `content_match` | Regex pattern must match file content | `path`, `pattern` |
| `test_passes` | Test must pass when executed | `path`, `test_name` |
| `metric_value` | Runtime metric must meet threshold | `metric_name`, `threshold` |
| `manual_review` | Human-verified evidence | `verified_by` |

### Evidence Statuses

| Status | Description |
|--------|-------------|
| `VERIFIED` | Evidence verified successfully |
| `PENDING` | Awaiting verification |
| `FAILED` | Verification failed |
| `STALE` | File modified since last verification |

### Evidence Template (v3)
```yaml
evidence:
  - type: file_exists
    path: "src/idempotency.ts"
    status: VERIFIED
    verified_at: "2026-01-16T10:00:00Z"

  - type: content_match
    path: "src/idempotency.ts"
    pattern: "idempotency_key.*uuid"
    status: VERIFIED
    message: "Pattern matched: 2 occurrences"

  - type: test_passes
    path: "tests/idempotency.test.ts"
    test_name: "preserves_key_across_retries"
    status: PENDING
```

### Enhanced Required Truth (v3)
```yaml
- id: RT-1
  statement: "Idempotency key must be preserved across retries"
  status: SATISFIED
  priority: 1
  maps_to_constraints: [B1, T1]    # NEW: Link to constraints
  last_verified: "2026-01-16T10:00:00Z"
  evidence:                         # NEW: Array of Evidence objects
    - type: file_exists
      path: "src/idempotency.ts"
      status: VERIFIED
    - type: content_match
      path: "src/idempotency.ts"
      pattern: "class IdempotencyService"
      status: VERIFIED
```

---

## v3: Constraint Graph (Temporal Non-Linearity)

The constraint graph represents all constraints, tensions, and required truths as a **network** rather than a sequence.

### Constraint Node Types

| Type | Description |
|------|-------------|
| `constraint` | Business, technical, UX, security, or operational constraint |
| `tension` | Conflict or trade-off between constraints |
| `required_truth` | Condition that must be true for outcome |
| `artifact` | Generated file that satisfies constraints |

### Constraint Node Statuses

| Status | Description |
|--------|-------------|
| `UNKNOWN` | Not yet analyzed |
| `REQUIRED` | Needs work to satisfy |
| `SATISFIED` | Condition met |
| `BLOCKED` | Waiting on dependencies |
| `CONFLICTED` | In tension with other constraints |

### Constraint Graph Template (v3)
```yaml
constraint_graph:
  version: 1
  generated_at: "2026-01-16T10:00:00Z"
  feature: "payment-retry"

  nodes:
    B1:
      id: B1
      type: constraint
      label: "No duplicate payments"
      depends_on: []
      blocks: [TN1, RT-1]
      conflicts_with: [T1]
      status: SATISFIED
      critical_path: true

    RT-1:
      id: RT-1
      type: required_truth
      label: "Idempotency key preserved"
      depends_on: [B1, T1]
      blocks: [ART-idempotency]
      conflicts_with: []
      status: REQUIRED
      critical_path: true

  edges:
    dependencies:
      - [RT-1, B1]     # RT-1 depends on B1
      - [RT-1, T1]     # RT-1 depends on T1
    conflicts:
      - [B1, T1]       # B1 conflicts with T1
    satisfies:
      - [ART-idempotency, RT-1]  # Artifact satisfies RT-1
```

### Execution Plan Template (v3)
```yaml
execution_plan:
  generated_at: "2026-01-16T10:00:00Z"
  strategy: hybrid    # forward, backward, or hybrid

  waves:
    - number: 1
      phase: CONSTRAINED
      parallel_tasks:
        - id: TASK-B1
          node_ids: [B1]
          action: "Discover and document"
        - id: TASK-B2
          node_ids: [B2]
          action: "Discover and document"
      blocking_dependencies: []

    - number: 2
      phase: TENSIONED
      parallel_tasks:
        - id: TASK-TN1
          node_ids: [TN1]
          action: "Analyze and resolve"
      blocking_dependencies: [B1, B2]

  critical_path: [B1, TN1, RT-1, ART-idempotency]
  parallelization_factor: 2.1
```

---

## Bidirectional Reasoning (v3)

v3 supports **Arrival-style** temporal non-linearity:

### Forward Query
"Given constraint B1 is satisfied, what becomes possible?"
```
B1 → TN1 → RT-1 → Outcome
```

### Backward Query
"For outcome Z to be achieved, what MUST be true?"
```
Outcome ← RT-1 ← {B1, T1} ← TN1
```

Both queries are valid and provide complementary views of the same constraint network.
