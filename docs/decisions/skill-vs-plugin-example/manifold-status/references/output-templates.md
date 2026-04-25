# Manifold m-status output templates

Reference templates for the layouts emitted by `manifold-m-status`. Loaded on demand when the agent needs to format output.

## Single-feature output

```
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

WORKFLOW PROGRESS:
[✓] m0-init        - Manifold initialized
[✓] m1-constrain   - 12 constraints discovered
[✓] m2-tension     - 2 tensions found, 1 resolved
[✓] m3-anchor      - 3 solution options generated
[ ] m4-generate    - Pending
[ ] m5-verify      - Pending

SUGGESTED NEXT ACTION (run when ready):
→ /manifold-m4-generate payment-retry --option=C

Waiting for your command...
```

## All-features summary

```
MANIFOLD STATUS: All Features

┌──────────────────┬─────────────┬─────────────┬──────────────────────────────────┐
│ Feature          │ Phase       │ Updated     │ Next Action                      │
├──────────────────┼─────────────┼─────────────┼──────────────────────────────────┤
│ payment-retry    │ ANCHORED    │ 2 hours ago │ /manifold-m4-generate --option=C │
│ user-auth        │ CONSTRAINED │ 1 day ago   │ /manifold-m2-tension user-auth   │
│ analytics-export │ VERIFIED    │ 3 days ago  │ Complete!                        │
└──────────────────┴─────────────┴─────────────┴──────────────────────────────────┘

Active Manifolds: 3 (1 complete, 2 in progress)
```

## With iteration history (--history)

```
MANIFOLD STATUS: payment-retry

Phase: VERIFIED (5/5)

ITERATION HISTORY:
┌───────────┬───────────┬────────────┬───────────────┬─────────────┐
│ Iteration │ Phase     │ Gaps Found │ Gaps Resolved │ Result      │
├───────────┼───────────┼────────────┼───────────────┼─────────────┤
│ 1         │ generate  │ 3          │ 0             │ artifacts   │
│ 2         │ verify    │ 14         │ 0             │ gaps found  │
│ 3         │ generate  │ 0          │ 10            │ fixes       │
│ 4         │ verify    │ 0          │ 4             │ PASS        │
└───────────┴───────────┴────────────┴───────────────┴─────────────┘

CONVERGENCE STATUS: CONVERGED
├── All invariants satisfied: 6/6
├── Test pass rate: 100%
├── Blocking gaps: 0
└── Iterations to convergence: 4
```

## File detection

| Files Present | Format |
|---------------|--------|
| `.json` + `.md` | JSON+Markdown Hybrid |
| `.yaml` only | Legacy YAML |
