name: manifold-context
description: Preserve Manifold constraint state for context retention. Reads .manifold/ directory and outputs a summary of current features, phases, constraints, tensions, and next actions. Use this skill when resuming work or before starting a new phase.

# /manifold-context

## Purpose
Satisfies: RT-4 (Codex hooks via skills), TN1 (skills-as-hooks pattern)

This skill provides context preservation equivalent to Claude Code's PreCompact hook.
Since Codex CLI does not have lifecycle hooks, this skill packages the same functionality
as an on-demand capability.

## When to Use
- At the start of a session to load manifold context
- Before starting a new manifold phase
- When you need to recall the current state of constraint discovery
- After context compression or token limits are approached

## Instructions

Read all files in the `.manifold/` directory of the current project. For each feature found:

1. **Identify the feature** from the filename (e.g., `payment-retry.json` → feature: `payment-retry`)
2. **Read the JSON file** (`.manifold/<feature>.json`) to get:
   - Current phase (INITIALIZED, CONSTRAINED, TENSIONED, ANCHORED, GENERATED, VERIFIED)
   - Constraint counts by category (business, technical, UX, security, operational)
   - Tension count and resolution status
   - Required truth statuses
   - Convergence status
3. **Read the MD file** (`.manifold/<feature>.md`) to get:
   - Outcome statement
   - Key constraint statements
   - Tension descriptions
4. **Output a summary** in this format:

```
## Manifold State

### Feature: <name>
- Phase: <phase> (<n>/6)
- Outcome: <outcome>
- Constraints: Business: <n>, Technical: <n>, UX: <n>, Security: <n>, Operational: <n>
- Tensions: <n> detected, <n> resolved
- Next: <suggested next command>
```

### Phase → Next Action Mapping
| Phase | Next Command |
|-------|-------------|
| INITIALIZED | `/m1-constrain <feature>` |
| CONSTRAINED | `/m2-tension <feature>` |
| TENSIONED | `/m3-anchor <feature>` |
| ANCHORED | `/m4-generate <feature>` |
| GENERATED | `/m5-verify <feature>` |
| VERIFIED | Complete! |

If no `.manifold/` directory exists, output: "No manifold found in this project."
