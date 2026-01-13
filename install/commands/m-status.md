---
description: "Show current Manifold state, constraint summary, workflow progress, and next action"
---

# /m-status - Manifold Status

Show current Manifold state and next recommended action.

## Usage

```
/m-status [<feature-name>]
```

If no feature specified, shows all active manifolds.

## Phases

| Phase | Description | Next Action |
|-------|-------------|-------------|
| INITIALIZED | Manifold created | /m1-constrain |
| CONSTRAINED | Constraints discovered | /m2-tension |
| TENSIONED | Conflicts analyzed | /m3-anchor |
| ANCHORED | Solution space defined | /m4-generate |
| GENERATED | Artifacts created | /m5-verify |
| VERIFIED | All constraints verified | Complete! |

## Example: Single Feature

```
/m-status payment-retry

MANIFOLD STATUS: payment-retry

Phase: ANCHORED (3/5)
Outcome: 95% retry success for transient failures

CONSTRAINT SUMMARY:
Total: 12 constraints discovered

By Type:
├── INVARIANT: 4 (must never violate)
├── GOAL: 5 (optimize toward)
└── BOUNDARY: 3 (hard limits)

By Category:
├── Business: 3 (B1-B3)
├── Technical: 2 (T1-T2)
├── UX: 2 (U1-U2)
├── Security: 2 (S1-S2)
└── Operational: 2 (O1-O2)

TENSION STATUS:
├── Detected: 2
├── Resolved: 1
└── Pending: 1 (T2: UX vs Operational)

SOLUTION SPACE:
├── Option A: Client-side Exponential Backoff (Low complexity)
├── Option B: Server-side Workflow Engine (High complexity)
└── Option C: Hybrid Approach (Medium complexity) ← Recommended

WORKFLOW PROGRESS:
[✓] /m0-init        - Manifold initialized
[✓] /m1-constrain   - 12 constraints discovered
[✓] /m2-tension     - 2 tensions found, 1 resolved
[✓] /m3-anchor      - 3 solution options generated
[ ] /m4-generate    - Pending
[ ] /m5-verify      - Pending

FILES:
├── .manifold/payment-retry.yaml
└── .manifold/payment-retry.anchor.yaml

NEXT ACTION:
/m4-generate payment-retry --option=C
```

## Example: All Features

```
/m-status

MANIFOLD STATUS: All Features

┌──────────────────┬─────────────┬─────────────┬──────────────────────────┐
│ Feature          │ Phase       │ Updated     │ Next Action              │
├──────────────────┼─────────────┼─────────────┼──────────────────────────┤
│ payment-retry    │ ANCHORED    │ 2 hours ago │ /m4-generate --option=C  │
├──────────────────┼─────────────┼─────────────┼──────────────────────────┤
│ user-auth        │ CONSTRAINED │ 1 day ago   │ /m2-tension user-auth    │
├──────────────────┼─────────────┼─────────────┼──────────────────────────┤
│ analytics-export │ VERIFIED    │ 3 days ago  │ Complete!                │
└──────────────────┴─────────────┴─────────────┴──────────────────────────┘

Active Manifolds: 3
└── 1 complete, 2 in progress
```

## Execution Instructions

1. If feature name provided:
   - Read `.manifold/<feature>.yaml`
   - Read `.manifold/<feature>.anchor.yaml` if exists
   - Read `.manifold/<feature>.verify.yaml` if exists
   - Display detailed status
2. If no feature name:
   - Scan `.manifold/` directory for all `.yaml` files
   - Display summary table
3. Determine next action based on current phase
4. Display workflow progress with checkmarks
