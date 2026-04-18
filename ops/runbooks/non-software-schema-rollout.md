# Runbook — Non-Software Schema Rollout

Procedure for landing EDIT 1 (schema discriminated union, ONE_WAY) + downstream template changes.

## Pre-checks (before any EDIT lands)

1. Confirm corpus size: `ls .manifold/*.json | wc -l` — expect ≥ 19 software manifolds + 0 or 1 non-software.
2. Run the regression test to establish baseline:
   ```bash
   bun test tests/schema/corpus-software-regression.test.ts
   ```
   Must pass on current schema (19/19).
3. Back up: current `cli/lib/structure-schema.ts` and `install/manifold-structure.schema.json`
   should be committed and tagged (`pre-nonsoftware-schema`).

## Step 1 — Land the schema EDIT

1. Apply the discriminated-union rewrite from `docs/prompt-eval-fixes-v2/DECISIONS.md` → EDIT 1.
2. Ensure legacy manifolds (no `domain` field) are pre-normalized to `{domain: 'software'}` inside
   `parseManifoldStructure` before the union dispatch.
3. Regenerate the JSON schema artifact:
   ```bash
   bun cli/scripts/generate-schema.ts
   ```
4. Run:
   ```bash
   bun test tests/schema/schema-union.test.ts
   bun test tests/schema/corpus-software-regression.test.ts
   ```
   Expected: both pass. Software corpus remains 19/19.
5. Commit: `feat(schema): discriminated union on domain (closes RT-1)`.

## Step 2 — m0-init non-software branch

1. Apply EDIT 2 (m0-init.md non-software section).
2. Run:
   ```bash
   bun test tests/prompt-templates/m0-init-non-software.test.ts
   bun test tests/prompt-templates/fresh-run-non-software.test.ts
   ```
3. Manually sanity-check: `/manifold:m0-init demo-ns --domain=non-software --outcome="test"` produces
   a manifold that `cli/manifold validate demo-ns` accepts.
4. Commit: `feat(m0-init): effective non-software branch (closes RT-4)`.

## Steps 3-6 — Template EDITs

Apply EDITs 3-6 in any order (they're independent after the schema lands). Each has a single
audit test that must pass:

| EDIT | Test |
|------|------|
| 3 (m3 size) | `tests/prompt-templates/m3-size.test.ts` |
| 4 (evidence.id) | `tests/prompt-templates/evidence-id-present.test.ts` |
| 5 (iterations.result) | `tests/prompt-templates/iterations-result-present.test.ts` |
| 6 (m5 always-emit) | `tests/prompt-templates/m5-unconditional-verify.test.ts` |

## Post-sweep

1. `bun test` — full suite must pass.
2. `bun run build:all` — regenerate Gemini/Codex translations, parallel bundle, plugin sync.
3. `/manifold:m5-verify prompt-eval-fixes-v2` — expect VERIFIED with all 10 RTs SATISFIED.
4. Sweep the corpus: re-validate every `.manifold/*.json`. Expect 19/19 software + 1/1 non-software
   (once `ai-workshop-showcase` is rerun against the fixed m0-init/m3/m4/m5).

## Rollback

Step 1 is ONE_WAY in terms of schema behavior, but the commit itself is reversible within the repo.

If a catastrophic regression surfaces:

1. Revert the schema commit: `git revert <schema-commit>`
2. Regenerate JSON schema artifact from the reverted Zod.
3. Re-run regression test — should return to baseline.
4. Document the failure and root-cause before reattempting.

If a template EDIT (steps 2-6) causes false-FAILs, revert that specific commit — template changes
do not interlock.

## Observability

Watch for these signals after rollout:

- Harness runs on non-software features produce `phase=VERIFIED` AND `.verify.json` present
- Harness RT variance on repeat software runs narrows from `0-23` toward the target `[10, 28]` band
- Prompt-eval report's "Non-software Features" column flips from 0/1 to ≥ 1/1 next iteration
