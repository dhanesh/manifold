# Manifold prompt-optimization loop

A sound self-prompting loop that progressively improves the `m1`–`m6` command prompts and proves
a measurable quality delta vs. the un-improved baseline. Designed with the
`crafting-self-prompting-loops` discipline — see `LOOP_SPEC.md` for the full 10-slot spec.

## What it optimizes for

Three axes (see `rubric.md`), exactly the ones requested:

1. **Artifact quality** — m4's code/tests/docs/ops.
2. **Outcome adherence** — do the artifacts, together, achieve the *verbatim* outcome.
3. **Anchor-tree map quality** — for each backward-reasoning edge (parent→child), **relevance**
   (is the child a real prerequisite?) × **confidence** (how necessary?), plus calibration of the
   tree's *self-reported* relevance/confidence against an independent judge.

## The non-negotiables (baked in)

- **Backstop (LSC-3):** 6 rounds/phase, 6 phases, token wind-down < 60k. Fires in the harness
  regardless of the model's `CONVERGED` flag. Safe state = stopped, prompts left unchanged.
- **Two-channel (LSC-7):** candidate prompts, generated artifacts, and judge verdicts are all
  `<data>`; the rubric + fixture outcomes are the trusted control channel. The candidate prompt
  is run only to emit artifacts into `/tmp/manifold-eval/`, never granted repo authority.
- **Human gate (LSC-8):** the workflow **never writes real prompt files**. It returns the winning
  text; you promote each locked prompt only after approval (promote → `sync:plugin` → merge).

## Run it

```bash
# Scoped dry-ish run on one phase, one fixture (cheapest first):
#   Workflow({ scriptPath: 'ops/prompt-optimization/optimize-prompts.workflow.js',
#              args: { phases: [{id:'m3-anchor', file:'install/commands/m3-anchor.md',
#                                axis:'Axis 3 — anchor-tree map quality'}],
#                      fixtures: ['ops/prompt-optimization/fixtures/payment-idempotency.md'] } })

# Full sweep (all six phases, both fixtures) — large spend, gate before kicking off:
#   Workflow({ scriptPath: 'ops/prompt-optimization/optimize-prompts.workflow.js' })
```

The workflow returns `{ summary, promotions }`. `summary` is the per-phase
`baseline → best (Δ)` table; `promotions` carries the winning prompt text for phases that beat
baseline by `MARGIN` (1.0). Apply promotions by overwriting `install/commands/mX.md`, then
`bun scripts/sync-plugin.ts`, then commit — **each step gated**.

## Tuning

All knobs live at the top of `optimize-prompts.workflow.js` and in `rubric.md`
(`EPSILON / MARGIN / PATIENCE`). Keep the two files in sync — the workflow constants must match
the rubric's thresholds.

## Iterating on the loop itself

The workflow is resumable: edit the `.js` file and re-invoke with the same `scriptPath`
(optionally `resumeFromRunId`) — unchanged `agent()` calls return cached results.
