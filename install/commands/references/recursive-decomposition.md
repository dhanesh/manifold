# Recursive Backward Chaining (Enhancement 7)

> Loaded by `/manifold:m3-anchor` only when `--depth > 1`. The always-loaded body of `m3-anchor.md` describes flat (depth-1) elicitation; this file covers multi-level decomposition.
>
> Satisfies: RT-8 (m3 body ≤ 250 lines + flat mode ≥ 10 RTs), T6 (body size ceiling).

## When to engage recursion

After the first-pass required truths are generated, for each truth with status `NOT_SATISFIED` or `PARTIAL`:

1. Take the truth as the new sub-outcome
2. Ask: "For [required truth] to hold, what MUST be true?"
3. Generate second-order required truths with dotted IDs (`RT-1.1`, `RT-1.2`, ...)
4. Check each against the constraint set and current state
5. Tag each:
   - **SATISFIED** — already holds, stop
   - **PRIMITIVE** — verifiable fact, recursion stops
   - **REQUIRES_FURTHER_DECOMPOSITION** — continue recursing
6. For each `REQUIRES_FURTHER_DECOMPOSITION` truth, recurse to `--depth` (default: 2, maximum: 4)

## Termination conditions

Recursion stops when ANY of:

- All leaves are `SATISFIED` or `PRIMITIVE`
- Maximum depth is reached — flag remaining gaps explicitly
- A circular dependency is detected — flag and surface to user

## Output format

Output the full dependency tree, not just the leaf nodes:

```
REQUIRED TRUTH: RT-1 Retries are idempotent [NOT_SATISFIED]
  ├── RT-1.1 Unique request IDs generated per call [NOT_SATISFIED]
  │     ├── RT-1.1.1 ID generation library available [SATISFIED]
  │     └── RT-1.1.2 ID stored with TTL matching retry window [NOT_SATISFIED]
  │           └── RT-1.1.2.1 Persistence layer with TTL support exists [PRIMITIVE — verify]
  └── RT-1.2 Server-side deduplication check on ID [NOT_SATISFIED]
        └── RT-1.2.1 Deduplication store accessible at request time [NOT_SATISFIED]
```

## Parameter

`--depth=N` (default: 2, range: 1-4). Depth 1 is flat-mode behavior (this file not loaded). Surface a warning if depth 4 is reached without all leaves resolving.

## Schema

Required truths gain `depth` and `children` fields:

```json
{"id": "RT-1", "status": "NOT_SATISFIED", "depth": 0, "children": [
  {"id": "RT-1.1", "status": "NOT_SATISFIED", "depth": 1, "children": []}
]}
```

`children` is an array of child RT objects with the same shape. `depth: 0` is the root-level RT; children increment `depth`.

## Variance guardrails

The m3 evaluation (`tests/golden/prompt-eval-report.md`, 2026-04-17) observed `required_truths_total` drift of `0 → 13 → 23` across three nominally identical runs. To stay inside the calibrated band `[10, 28]`:

- Default to `--depth=2`; do not silently escalate to depth 3 or 4
- Do not recurse on `SATISFIED` leaves
- Tag every leaf; "unknown" is not a valid terminal tag — resolve it or mark `PRIMITIVE — verify`
- When depth is exhausted with open `REQUIRES_FURTHER_DECOMPOSITION` leaves, list them in the anchor summary so they are visible, not silently truncated
