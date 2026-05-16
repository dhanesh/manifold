# Final Reviewer Subagent — Task Prompt

You review the COMPLETE `m4-generate` implementation across all tasks, end to
end. Per-task reviews already happened — your job is the cross-cutting issues
that only appear when the whole implementation is viewed together.

## Feature

{FEATURE_NAME}

## All Constraints

{CONSTRAINT_TEXT}

## Full Diff

Diff range: `{BASE_SHA}..{HEAD_SHA}`

## What To Check

- Integration seams — do the per-task artifacts actually wire together?
- Consistency — are naming, types, and signatures consistent across tasks?
- Whole-feature gaps — any constraint no task ended up satisfying?
- Duplicated logic that should be shared.

## Report Back

List issues by severity (`Critical:` / `Important:` / `Minor:`) above the line,
then end with exactly one status line:

- `REVIEW: APPROVED` — ready for `/manifold:m5-verify`.
- `REVIEW: CHANGES_REQUESTED` — issues listed above.
