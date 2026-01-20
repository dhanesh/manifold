# Manifold Schema Quick Reference
<!-- MANIFOLD_SCHEMA_VERSION:3 -->

> **CRITICAL**: Use ONLY these exact values. Do NOT invent new phases, types, or statuses.

## Valid Values

| Category | Valid Values |
|----------|--------------|
| **Phases** | `INITIALIZED` \| `CONSTRAINED` \| `TENSIONED` \| `ANCHORED` \| `GENERATED` \| `VERIFIED` |
| **Constraint Types** | `invariant` \| `goal` \| `boundary` |
| **Tension Types** | `trade_off` \| `resource_tension` \| `hidden_dependency` |
| **Tension Statuses** | `resolved` \| `unresolved` |
| **Required Truth Statuses** | `SATISFIED` \| `PARTIAL` \| `NOT_SATISFIED` \| `SPECIFICATION_READY` |
| **Convergence Statuses** | `NOT_STARTED` \| `IN_PROGRESS` \| `CONVERGED` |

## v3 Schema (Current)

| Category | Valid Values |
|----------|--------------|
| **Evidence Types** | `file_exists` \| `content_match` \| `test_passes` \| `metric_value` \| `manual_review` |
| **Evidence Statuses** | `VERIFIED` \| `PENDING` \| `FAILED` \| `STALE` |
| **Node Types** | `constraint` \| `tension` \| `required_truth` \| `artifact` |
| **Node Statuses** | `UNKNOWN` \| `REQUIRED` \| `SATISFIED` \| `BLOCKED` \| `CONFLICTED` |

## Constraint ID Prefixes

| Category | Prefix |
|----------|--------|
| Business | B1, B2, ... |
| Technical | T1, T2, ... |
| User Experience | U1, U2, ... |
| Security | S1, S2, ... |
| Operational | O1, O2, ... |

## Phase Transitions

```
INITIALIZED -> CONSTRAINED -> TENSIONED -> ANCHORED -> GENERATED -> VERIFIED
     ^                                                               |
     +----------------------- (iteration) ---------------------------+
```

For full schema documentation, run `/manifold` or see SCHEMA_REFERENCE.md.
