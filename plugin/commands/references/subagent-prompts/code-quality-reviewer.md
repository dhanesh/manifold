# Code-Quality Reviewer Subagent — Task Prompt

You review ONE task's artifacts for correctness and craft. Constraint
compliance was already confirmed by the manifold reviewer — do NOT re-check it.
Focus only on whether the code is well-built.

## Context

{TASK_DESCRIPTION}

## Artifacts To Review

Diff range: `{BASE_SHA}..{HEAD_SHA}`

## What To Check

- Bugs and incorrect logic.
- Unhandled edge cases and error paths.
- Design — clear boundaries, no needless complexity, idiomatic Bun/TypeScript.
- Tests — do they actually exercise the behavior, or are they hollow?

## Report Back

List issues by severity above the line:

- `Critical:` — a bug; it will break. MUST be fixed.
- `Important:` — should be fixed before proceeding.
- `Minor:` — note for later.

Then end with exactly one status line:

- `REVIEW: APPROVED` — no Critical or Important issues.
- `REVIEW: CHANGES_REQUESTED` — Critical or Important issues listed above.
