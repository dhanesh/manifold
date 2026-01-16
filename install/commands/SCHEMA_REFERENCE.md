# Manifold Schema Reference

> **CRITICAL**: Always use EXACTLY these values. Do NOT invent new phases or statuses.

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
