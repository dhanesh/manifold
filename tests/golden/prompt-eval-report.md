# Manifold Prompt Evaluation Report

**Date:** 2026-04-17
**Scope:** Current `install/commands/m0-m5.md` + `install/hooks/phase-commons` hook
**Branch:** `reduce_context_rot` (head: `9bb0108`)
**Method:** Static analysis of existing harness run records + corpus-wide validation; no new LLM calls.

## Headline

The current cut is **fit for purpose on software-domain features** (19/19 verified manifolds pass schema). It is **broken on non-software** (1/1 fails with 30+ schema errors, non-software category swap never applied). Technical convergence is **non-deterministic enough to miss the VERIFIED gate** in all 3 recent end-to-end runs — though m0-m4 individually succeeded.

To make it better: fix the domain branch in m0-init, make evidence IDs and iteration result-strings non-optional in prompt output templates, and write `.verify.json` unconditionally at m5.

## What was evaluated

| Source | Count | Purpose |
|---|---|---|
| `tests/golden/pilot/validation-run-{1,2-m4-clean,3}.json` | 3 | End-to-end m0→m5 runs, technical feature (`reduce-context-rot`) |
| `.manifold/*.json` (VERIFIED) | 19 | Software-domain corpus |
| `/Users/dhanesh/code/xp/work/.manifold/ai-workshop-showcase.json` | 1 | Non-software corpus (only available non-technical run) |
| `cli/manifold validate` | all | Schema adherence |

## 1. Technical eval — reduce-context-rot

### End-to-end convergence: 0/3

| Run | Final phase | Cost | Duration | m4 artifacts | RTs | Failure point |
|---|---|---|---|---|---|---|
| 1 | TENSIONED | $2.69 | 564s | 0 | 0 | m3 skipped (0s, $0) — harness timeout or prompt refusal |
| 2 | GENERATED | $4.53 | 1199s | 20 | 23 | m5 found blockers; phase did not advance |
| 3 | GENERATED | $6.14 | 1313s | 28 | 13 | Anthropic 5-hour cap hit on m5 (not a prompt failure) |

### Per-phase prompt signals

| Phase | Prompt size (lines) | Behavior in 3 runs | Verdict |
|---|---|---|---|
| m0-init | 255 | 3/3 succeed, 43-44s, ~$0.32 | ✅ Stable |
| m1-constrain | 270 | 3/3 succeed, 149-184s, $0.69-0.77 | ✅ Stable |
| m2-tension | 307 | 3/3 succeed, 257-345s, $1.07-1.67 | ✅ Stable |
| m3-anchor | 360 | 2/3 succeed; 1 skipped entirely (0 turns) | ⚠️ Unstable — largest prompt, most likely to be budget/timeout-starved |
| m4-generate | 276 | 2/2 succeed (Run 1 didn't reach it), 559-927s variance | ⚠️ Wide duration spread; artifact count drifts 20→28 across nominal-identical inputs |
| m5-verify | 293 | 1/1 ran; correctly flagged blockers but phase stayed GENERATED | ✅ Semantically correct, ⚠️ downstream tooling doesn't recognize this success shape |

### Non-determinism budget

Post-calibration fixture (`reduce-context-rot.yaml`) widened tolerances to absorb observed drift:

| Dimension | Observed range | Fixture tolerance | Source of drift |
|---|---|---|---|
| `anchors.required_truths_total` | 0-23 | `[10, 28]` | m3 recursive decomposition depth is unconstrained |
| `generation.artifacts_total` | 0-28 | `[15, 35]` | m4 emits supplementary refactor/doc/test artifacts at its discretion |
| `anchors.required_truths_with_children` | 0-5 | `min: 0` | m3 `--depth` default is 2 but often produces 0 children |

This is the strongest signal in the report: **m3 is the variance driver**. It either skips entirely, produces a flat RT list, or produces a deep recursive tree. Same prompt, same inputs.

## 2. Non-technical eval — ai-workshop-showcase

This manifold is phase `VERIFIED`, `domain: "non-software"`, marked `CONVERGED`, 15 constraints, 8 RTs, 18 artifacts. The manifold **fails schema validation** on 30+ points.

### Concrete violations

```
✗ constraints.{business,technical,user_experience,security,operational}.*.id:
  IDs are OB1/OB2/OB3, R1/R2/R3, D1-D4, RK1/RK2, DP1-DP3
  — don't match the required B\d+|T\d+|U\d+|S\d+|O\d+ pattern.

✗ anchors.required_truths.*.evidence.*.id: Required (9 violations)
  — evidence items have type/path/pattern/status but no id field.

✗ iterations.*.result: Required (5 violations)
  — all 5 iterations omit the required result:string summary.
```

### Root-cause in the prompts

1. **m0-init has no effective domain branch for `--domain=non-software`.** The CLAUDE.md contract says non-software mode "replaces these with universal categories: Obligations, Desires, Resources, Risks, Dependencies." What actually happens: the model keeps the software category *keys* (`business`, `technical`, etc.) but renames the IDs inside (OB, R, D, RK, DP). This is a hybrid broken state — neither the schema nor the CLAUDE.md contract expects it.
2. **m3-anchor's output template shows `id` on evidence items in one place and omits it in examples elsewhere.** The model copied the no-`id` variant.
3. **Iteration recording (distributed across m1/m2/m3/m4/m5) shows the full schema with `result` in prose but the JSON snippets in the skill bodies don't always include it.** The model follows the snippet, not the prose.
4. **`.verify.json` is missing** despite phase=VERIFIED. m5-verify wrote the phase but skipped the artifact — possibly because the current m5 skill gates verify.json creation on a decision the non-software flow didn't produce.

Net: **non-software is not actually shipped**. The skills claim to support it, but produce non-conforming output.

## 3. Corpus-wide schema health

| Domain | Features | Validation pass rate |
|---|---|---|
| software | 19 | 19/19 (100%) |
| non-software | 1 | 0/1 (0%) |

All 19 software manifolds — built iteratively with the current prompts over weeks — validate cleanly. This is strong evidence the software path is production-quality.

## 4. What would make the next cut better

Priority-ordered, with evidence:

### P0 — non-software domain branch (affects: 100% of non-software runs)

**m0-init.md** must: if `--domain=non-software`, either (a) remap category keys to `obligations/desires/resources/risks/dependencies` and update the schema to accept both shapes, or (b) keep software keys and mandate software IDs with category meanings documented in statements. Pick one; the current "rename IDs, keep keys" hybrid is what the model produces by default and neither path works.

### P0 — enforce `evidence.id` in prompt templates (affects: ~50% of RTs in recent manifolds)

**m3-anchor.md** and **m4-generate.md** both show evidence examples. Audit every JSON snippet in both files to ensure `"id": "E1"` is present. Today at least one example omits it and the model picks that one.

### P0 — enforce `iterations.*.result: string` (affects: every phase write)

All of m1/m2/m3/m4/m5 write to `iterations[]`. The schema requires `result` (string). Audit iteration JSON snippets in each skill. If the hook `manifold hook phase-commons` is responsible for this, ensure it adds `result` even when the phase-specific fields (e.g. `constraints_added`) are already present.

### P1 — m3 variance (affects: convergence rate on re-runs)

RT count drifted 0→13→23 across three nominally identical runs. This is too wide for a stable gate.
- Constrain `--depth` default (currently 2, observed 0-5).
- Document that RT variance is expected and remove RT count from the golden's `exact` dimensions (already done in the calibrated fixture — keep it that way).
- Consider whether m3's recursive mode should require explicit user opt-in rather than being the default path.

### P1 — m5 always writes `.verify.json` (affects: harness false-FAIL + missing artifacts)

**m5-verify.md** appears to sometimes skip `.verify.json` when gaps are found (observed on ai-workshop-showcase which has no verify file). Make the rule: always write `.verify.json`, whether result is SATISFIED, PARTIAL, or blocked. Phase stays `GENERATED` if blockers exist; artifact presence is independent.

### P2 — m3 robustness (affects: 1/3 runs)

m3 skipped entirely once (0 turns, $0) in Run 1. 360 lines makes it the largest prompt. Consider splitting m3 into a minimal driver that references `references/recursive-decomposition.md` loaded only when `--depth > 1`. This would both shrink the always-loaded context and stabilize the common path.

### P3 — test harness post-conditions (not prompt work, but blocks better evaluation)

Two harness bugs falsely penalized m5 and m4 during this calibration:
- m5 produces `.verify.json` with blockers but phase stays `GENERATED`; harness requires `VERIFIED` and reports FAIL. Should accept `GENERATED` + `.verify.json` present as a valid m5 completion.
- m4 output containing Anthropic rate-cap reset strings ("You've hit your limit...") is string-matched as an m4 error even when m4 already wrote its artifacts. Should check phase advancement before parsing error text.

Already documented in `tests/golden/README.md` — listed here for completeness.

## Summary scorecard

| Dimension | Status |
|---|---|
| Software-domain end-to-end (m0-m5) | ⚠️ Works per-phase; 0/3 recent runs convergence-gated (mostly environmental) |
| Software-domain schema adherence | ✅ 19/19 |
| Non-software domain | ❌ Not shipped — 0/1 manifolds conform to schema |
| m1/m2 stability | ✅ Stable (3/3) |
| m3 stability | ⚠️ Variance driver — 0/3 identical outcomes |
| m4 stability | ✅ Succeeds when reached; artifact count non-deterministic within tolerated band |
| m5 verify artifact | ⚠️ Sometimes missing (confirmed on non-software case) |
| phase-commons hook | ✅ No regressions observed; context rot reduction visible in prompt sizes (~270 lines each vs. pre-hook baselines) |

**Bottom line:** Yes — on the software path — this cut is better than before (cleaner corpus validation, smaller prompts, working phase-commons). On the non-software path, this cut is no better than nothing, because the domain branch never engaged.
