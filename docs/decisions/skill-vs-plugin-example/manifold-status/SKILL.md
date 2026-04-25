---
name: manifold-status
description: Show current Manifold state, constraint summary, workflow progress, and next recommended action. Use when the user asks for Manifold status, asks "what phase am I in", asks what to do next on a Manifold feature, or runs /manifold-status.
argument-hint: "[<feature-name>] [--history] [--diff]"
metadata:
  short-description: Show Manifold state and next action
  source: install/commands/m-status.md
---

# Manifold Status

Show current Manifold state and next recommended action. Read-only — never mutate files.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| Phases | `INITIALIZED`, `CONSTRAINED`, `TENSIONED`, `ANCHORED`, `GENERATED`, `VERIFIED` |
| Convergence | `NOT_STARTED`, `IN_PROGRESS`, `CONVERGED` |
| Constraint Types | `invariant`, `goal`, `boundary` |
| Tension Statuses | `resolved`, `unresolved` |

When displaying phase information, use ONLY the values above.

## Scope Guard (mandatory)

This command is READ-ONLY. It displays the current state and suggests the next action. It does not modify any files.

Do NOT during manifold-status:
- Modify any manifold files or source files
- Spawn background agents or sub-agents
- Auto-invoke the suggested next action
- Begin work on any phase

The "SUGGESTED NEXT ACTION" is informational only. The user must explicitly invoke the next phase command.

## Usage

```
/manifold-status [<feature-name>] [--history] [--diff]
```

If no feature is specified, shows all active manifolds.

Flags:
- `--history` — show full iteration history
- `--diff` — show changes since last iteration

## Phase → Next Action

| Phase | Next Action |
|-------|-------------|
| INITIALIZED | `/manifold-m1-constrain` |
| CONSTRAINED | `/manifold-m2-tension` |
| TENSIONED | `/manifold-m3-anchor` |
| ANCHORED | `/manifold-m4-generate` |
| GENERATED | `/manifold-m5-verify` |
| VERIFIED | Complete |

(Phase commands keep the `mN-` prefix because `m0`–`m6` is the phase index. Utility commands without a phase number drop the lone `m-` since `manifold-` already marks them.)

## Execution

1. If a feature name was provided:
   - Detect format: JSON+MD (`.manifold/<feature>.json` + `.manifold/<feature>.md`) or legacy YAML (`.manifold/<feature>.yaml`)
   - Read corresponding files plus any `.anchor.yaml` and `.verify.json`
   - Display detailed status with format indicator
2. If no feature name:
   - Scan `.manifold/` for all manifold files
   - Detect format per feature
   - Display summary table
3. Determine next action based on current phase
4. Display workflow progress with checkmarks

For format details and example output layouts, see `references/output-templates.md`.

## Convergence Detection

A manifold is CONVERGED when:
1. All INVARIANT constraints are SATISFIED
2. Test pass rate ≥ 95%
3. No blocking gaps remain
4. At least one full generate→verify cycle has completed

## Context Restoration (post-compaction)

When resuming after context compaction, output a context restoration block telling the agent which `.manifold/<feature>.md` sections to read before the next phase:

```
CONTEXT RESTORATION:
Read .manifold/<feature>.md sections before next phase:
→ <next-phase>: <sections>
```

Section map by next phase:

| Next Phase | Sections |
|------------|----------|
| m1-constrain | `## Outcome` |
| m2-tension | `## Constraints` |
| m3-anchor | `## Constraints`, `## Tensions` |
| m4-generate | `## Tensions`, `## Required Truths`, `## Solution Space` |
| m5-verify | `## Required Truths` |
| m6-integrate | `## Required Truths` |

## Post-display behavior

After displaying status: say "Waiting for your command" and STOP. Never auto-invoke the suggested next action. Phase transitions require explicit user invocation.

Optionally run `manifold validate <feature>` after displaying status if the user wants a schema check.
