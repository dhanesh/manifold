# prompt-eval-fixes-v2

Remediation feature derived from `tests/golden/prompt-eval-report.md` (2026-04-17).

## What this feature is

A manifold-tracked work item to close the gaps the prompt evaluation surfaced in the current cut of
`install/commands/m0-m5.md` + `install/hooks/phase-commons`.

The eval showed two distinct failure classes:

1. **Non-software domain never shipped.** 0/1 non-software manifolds validate (30+ violations on
   `ai-workshop-showcase`). The m0-init branch renames constraint IDs but keeps software category
   keys — a hybrid state neither the schema nor CLAUDE.md expects.
2. **Technical path is non-deterministic at m3.** Required-truth count drifted `0 → 13 → 23` across
   three nominally identical runs. `.verify.json` sometimes missing; evidence examples sometimes
   drop `id`; iteration snippets sometimes drop `result`.

## Gaps being closed (from the eval report)

| Gap | Severity | Closed by |
|-----|----------|-----------|
| Non-software domain branch never applied | P0 | Schema union on `domain` + m0-init rewrite |
| `evidence.id` missing in prompt templates | P0 | Audit test + template EDITs |
| `iterations[].result` missing in prompt templates | P0 | Audit test + template EDITs |
| m3 variance (0 → 13 → 23 RTs) | P1 | Flat-mode default + extracted recursive reference |
| m5 sometimes skips `.verify.json` | P1 | Unconditional-emit language + audit test |
| m3 size (360 lines — largest prompt, most timeout-prone) | P2 | Body ≤ 250 lines + reference file |

## Approach — Option A (Sequential, schema-first)

Selected because the non-software domain branch is the ONE_WAY decision that gates everything else.
Landing it first means all subsequent EDITs (template content, evidence audit, iteration audit) can
verify against the final schema. Splitting into parallel worktrees (Option C) was rejected because
the schema change touches `parseManifoldStructure`, which every other test in this feature imports.

Sequence:

1. **Schema EDIT** (ONE_WAY) — `cli/lib/structure-schema.ts` becomes a `z.discriminatedUnion('domain', …)`
2. Regenerate `install/manifold-structure.schema.json` via `zodToJsonSchema`
3. m0-init.md EDIT — non-software branch uses obligations/desires/resources/risks/dependencies keys
4. m3-anchor.md EDIT — extract recursive content, flat mode is default
5. m4-generate.md + m3-anchor.md EDIT — enforce `evidence.id`
6. m1…m5 skills EDIT (or phase-commons hook) — enforce `iterations[].result`
7. m5-verify.md EDIT — always emit `.verify.json`

See `DECISIONS.md` for precise diffs and rationale.

## Artifacts generated at m4

- **9 test files** (scaffolds covering RT-1..RT-9)
- **1 reference file** (`install/commands/references/recursive-decomposition.md`)
- **3 planning docs** (this file, `DECISIONS.md`, and an ops runbook)

Each test is designed to FAIL today and PASS once its corresponding EDIT lands. This gives
m5-verify a meaningful NOT_SATISFIED → SATISFIED signal per gap.

## Convergence gate

`/manifold:m5-verify prompt-eval-fixes-v2` passes when:

- Schema corpus regression: 19/19 software manifolds still validate
- Non-software fresh-run: ≥1 non-software manifold validates cleanly
- Evidence audit: every evidence JSON block in m3/m4 contains `"id":`
- Iteration audit: every iteration snippet in m1…m5 contains `"result":`
- m5 audit: unconditional-emit language present
- m3 size audit: ≤ 250 lines + recursive-decomposition.md referenced

## Pointers

- Source eval: `tests/golden/prompt-eval-report.md`
- Decision log: `docs/prompt-eval-fixes-v2/DECISIONS.md`
- Rollout runbook: `ops/runbooks/non-software-schema-rollout.md`
- Manifold: `.manifold/prompt-eval-fixes-v2.{json,md}`
