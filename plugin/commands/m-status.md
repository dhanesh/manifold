---
description: "Show current Manifold state, constraint summary, workflow progress, and next action"
argument-hint: "[<feature-name>] [--history] [--diff]"
---

# /manifold:m-status - Manifold Status

Show current Manifold state and next recommended action.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Valid Phases** | `INITIALIZED`, `CONSTRAINED`, `TENSIONED`, `ANCHORED`, `GENERATED`, `VERIFIED` |
| **Convergence Statuses** | `NOT_STARTED`, `IN_PROGRESS`, `CONVERGED` |
| **Constraint Types** | `invariant`, `goal`, `boundary` |
| **Tension Statuses** | `resolved`, `unresolved` |

> **CRITICAL**: When displaying phase information, use ONLY the phases listed above.
> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent or display invalid phases.

## Usage

```
/manifold:m-status [<feature-name>] [--history] [--diff]
```

If no feature specified, shows all active manifolds.

**Flags (v2):**
- `--history` - Show full iteration history
- `--diff` - Show changes since last iteration

## Phases

| Phase | Description | Next Action |
|-------|-------------|-------------|
| INITIALIZED | Manifold created | /manifold:m1-constrain |
| CONSTRAINED | Constraints discovered | /manifold:m2-tension |
| TENSIONED | Conflicts analyzed | /manifold:m3-anchor |
| ANCHORED | Solution space defined | /manifold:m4-generate |
| GENERATED | Artifacts created | /manifold:m5-verify |
| VERIFIED | All constraints verified | Complete! |

## Example: Single Feature

```
/manifold:m-status payment-retry

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
[✓] /manifold:m0-init        - Manifold initialized
[✓] /manifold:m1-constrain   - 12 constraints discovered
[✓] /manifold:m2-tension     - 2 tensions found, 1 resolved
[✓] /manifold:m3-anchor      - 3 solution options generated
[ ] /manifold:m4-generate    - Pending
[ ] /manifold:m5-verify      - Pending

FORMAT: JSON+Markdown Hybrid
FILES:
├── .manifold/payment-retry.json     (structure)
├── .manifold/payment-retry.md       (content)
└── .manifold/payment-retry.verify.json  (if verified)

SUGGESTED NEXT ACTION (run when ready):
→ /manifold:m4-generate payment-retry --option=C

⏸️ Waiting for your command...
```

> **Note**: Older manifolds may use legacy YAML format (single `.yaml` file).
> Use `manifold migrate <feature>` to convert to JSON+Markdown.

## Example: With Iteration History (v2)

```
/manifold:m-status payment-retry --history

MANIFOLD STATUS: payment-retry

Phase: VERIFIED (5/5)
Schema Version: 2

[...constraint summary...]

ITERATION HISTORY:
┌───────────┬───────────┬────────────────┬───────────────┬─────────────┐
│ Iteration │ Phase     │ Gaps Found     │ Gaps Resolved │ Result      │
├───────────┼───────────┼────────────────┼───────────────┼─────────────┤
│ 1         │ generate  │ 3              │ 0             │ artifacts   │
├───────────┼───────────┼────────────────┼───────────────┼─────────────┤
│ 2         │ verify    │ 14             │ 0             │ gaps found  │
├───────────┼───────────┼────────────────┼───────────────┼─────────────┤
│ 3         │ generate  │ 0              │ 10            │ fixes       │
├───────────┼───────────┼────────────────┼───────────────┼─────────────┤
│ 4         │ verify    │ 0              │ 4             │ PASS        │
└───────────┴───────────┴────────────────┴───────────────┴─────────────┘

CONVERGENCE STATUS: ✓ CONVERGED
├── All invariants satisfied: 6/6
├── Test pass rate: 100%
├── Blocking gaps: 0
└── Iterations to convergence: 4
```

## Convergence Detection (v2)

A manifold is considered **CONVERGED** when:
1. All INVARIANT constraints are SATISFIED
2. Test pass rate ≥ 95%
3. No blocking gaps remain
4. At least one full generate→verify cycle completed

## Example: All Features

```
/manifold:m-status

MANIFOLD STATUS: All Features

┌──────────────────┬─────────────┬─────────────┬──────────────────────────┐
│ Feature          │ Phase       │ Updated     │ Next Action              │
├──────────────────┼─────────────┼─────────────┼──────────────────────────┤
│ payment-retry    │ ANCHORED    │ 2 hours ago │ /manifold:m4-generate --option=C  │
├──────────────────┼─────────────┼─────────────┼──────────────────────────┤
│ user-auth        │ CONSTRAINED │ 1 day ago   │ /manifold:m2-tension user-auth    │
├──────────────────┼─────────────┼─────────────┼──────────────────────────┤
│ analytics-export │ VERIFIED    │ 3 days ago  │ Complete!                │
└──────────────────┴─────────────┴─────────────┴──────────────────────────┘

Active Manifolds: 3
└── 1 complete, 2 in progress
```

## Execution Instructions

1. If feature name provided:
   - **Detect format**: JSON+MD (`.json` + `.md`) or legacy YAML (`.yaml`)
   - For JSON+Markdown: Read `.manifold/<feature>.json` + `.manifold/<feature>.md`
   - For legacy YAML: Read `.manifold/<feature>.yaml`
   - Read `.manifold/<feature>.anchor.yaml` if exists
   - Read `.manifold/<feature>.verify.json` if exists
   - Display detailed status with format indicator
2. If no feature name:
   - Scan `.manifold/` directory for all manifold files
   - Detect format for each feature
   - Display summary table with format column
3. Determine next action based on current phase
4. Display workflow progress with checkmarks

### Format Detection

| Files Present | Format |
|---------------|--------|
| `.json` + `.md` | JSON+Markdown Hybrid |
| `.yaml` only | Legacy YAML |

Use `manifold show <feature>` or CLI status for format details.

## Post-Display Behavior

**CRITICAL**: After displaying status:
1. If this is a normal check → Display status, **STOP**
2. If resuming from compaction → Display status, say "Waiting for your command", **STOP**
3. **NEVER** auto-invoke the suggested next action
4. The user **MUST** explicitly run the next phase command

The "SUGGESTED NEXT ACTION" is informational only. Phase transitions require explicit user invocation.
