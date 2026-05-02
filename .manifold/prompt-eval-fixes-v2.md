# prompt-eval-fixes-v2

## Outcome

Close the P0 and P1 gaps identified in `tests/golden/prompt-eval-report.md` (2026-04-17) so the next cut of `install/commands/m0-m5.md` produces schema-conformant manifolds in both software and non-software domains, with reduced m3 variance.

**Source:** `tests/golden/prompt-eval-report.md`

**P0 (correctness — must close):**

- **Non-software domain branch in m0-init.** Today, `--domain=non-software` produces a hybrid broken state: the model renames constraint IDs (OB/R/D/RK/DP) but keeps the software category keys (business/technical/user_experience/security/operational). This satisfies neither the schema (IDs don't match `B|T|U|S|O\d+`) nor the CLAUDE.md contract (categories weren't swapped). Pick one contract — either remap the category keys and extend the schema to accept both shapes, or keep software keys and mandate software IDs with non-software semantics documented in statements — and enforce it unambiguously in the skill. Evidence: `/Users/dhanesh/code/xp/work/.manifold/ai-workshop-showcase.json` fails schema with 15 ID violations.
- **`evidence.id` field enforcement.** `m3-anchor.md` and `m4-generate.md` show JSON snippets for evidence items; at least one variant omits the required `id` field and the model copies that one. Audit every evidence snippet across both skills to ensure `"id": "E1"` is always present. Evidence: 9 `evidence.*.id: Required` violations on `ai-workshop-showcase`.
- **`iterations.*.result` string enforcement.** Every phase (m1-m5) writes to `iterations[]`. The schema requires `result: string`; the skill snippets sometimes omit it in favor of phase-specific fields (`constraints_added`, `tensions_found`, etc.). Either (a) audit every iteration snippet in every skill to include a `result` string, or (b) have the `manifold hook phase-commons` hook inject `result` when missing. Evidence: 5 `iterations.*.result: Required` violations on `ai-workshop-showcase`.

**P1 (reliability — should close):**

- **m3 variance reduction.** m3-anchor produced 0, 13, and 23 required truths across three nominally identical runs. Driven by unconstrained `--depth` recursion default. Either constrain the default more tightly, accept recursion as opt-in only, or split m3 into a minimal driver + optional `references/recursive-decomposition.md` loaded only when depth > 1.
- **m5 always writes `.verify.json`.** Currently missing on non-software runs even when phase advances to VERIFIED. Rule: write `.verify.json` unconditionally (SATISFIED, PARTIAL, or blocked); phase stays GENERATED if blockers exist but the artifact is independent of the phase decision.

**P2 (robustness — nice to have):**

- **m3 skip-entirely case.** In 1 of 3 recent runs m3 returned with 0 turns and $0 (never invoked). m3 is the largest skill at 360 lines. Splitting the body behind `references/` would shrink the always-loaded context and reduce the likelihood of m3 being budget-starved or context-evicted.

**Out of scope (explicitly):**

- Test harness bugs (false-FAIL on m5 GENERATED-with-verify.json, false-FAIL on rate-cap string match). Already documented in `tests/golden/README.md` P3 — separate work from prompt fixes.
- New feature work beyond what the report flags.

**Success criteria (how we'll know it worked):**

1. Re-running `manifold validate` on a freshly generated non-software manifold produces zero violations.
2. `ai-workshop-showcase` (or an equivalent re-run) has `.verify.json` present on disk when phase advances past GENERATED.
3. Three consecutive harness runs of a seed technical feature stay within the currently calibrated tolerance bands in `tests/golden/fixtures/reduce-context-rot.yaml` without further widening.

---

## Pre-mortem Stress-Test (2026-04-17)

Three failure stories, imagining the feature has clearly failed 6 months from now:

1. **Seen coming:** We shipped schema-extending fixes but never ran `manifold validate` on a *freshly generated* non-software manifold. We patched the broken `ai-workshop-showcase` but the next user to run `/manifold:m0-init --domain=non-software` hit the same hybrid state. → **Surfaced O4.**
2. **Surprise:** Making `evidence.id` and `iterations.result` strictly required broke the 19 existing software manifolds (retroactive schema tightening). → **Already covered by O3** (additive-only) + **B2** (pass-rate invariant).
3. **External party / upstream:** Someone pushed prompt changes by editing `plugin/` directly while diff-guard CI was flaky; the un-synced `install/` changes never landed, so the non-software bug reappears after a release. → **Already covered by existing diff-guard CI workflow** (not re-asserted here; out of prompt scope).

---

## Constraints

### Business

#### B1: Non-Software Schema Conformance

Non-software domain manifolds produced by `/manifold:m0-init --domain=non-software` must conform to the canonical schema — either by extending the schema to accept non-software shapes, or by documenting non-software semantics within statements using the existing software ID pattern.

> **Rationale:** The CLAUDE.md contract claims support for a non-software mode. Today `0/1` non-software manifolds (`ai-workshop-showcase.json`) pass schema validation, with 30+ violations. Shipping a partially-working contract is worse than shipping none.

**Type:** INVARIANT
**Source:** interview · **Challenger:** stakeholder

#### B2: Software Corpus Validation Pass Rate

Software-domain corpus (`19/19` manifolds) must maintain `100%` validation pass rate after any schema or prompt change.

> **Rationale:** 19/19 today is the strongest signal we have that the software path is production-quality. Tightening schema rules to close non-software gaps must not regress this.

**Type:** GOAL
**Source:** interview

---

### Technical

#### T1: `evidence.id` Field Required in Templates

Every JSON snippet in `m3-anchor.md` and `m4-generate.md` that shows an evidence item includes `"id": "E<n>"`.

> **Rationale:** 9 of the 30+ violations on `ai-workshop-showcase` are `evidence.*.id: Required`. The model copies whichever snippet omits the field; eliminating the ambiguous example eliminates the violation class.

**Type:** INVARIANT · **Threshold:** deterministic — 0 violations per fresh-run manifold
**Source:** interview · **Challenger:** technical-reality (schema is the validator; no negotiation)

#### T2: `iterations.*.result` String Required in Templates

Every iteration emission snippet in m1–m5 skills includes `result: string`, or the `manifold hook phase-commons` hook injects `result` when phase-specific fields are present without it.

> **Rationale:** 5 of the violations stem from iteration records missing the required `result` field. Two valid fixes: audit snippets or inject via hook. The constraint is on the outcome, not the mechanism.

**Type:** INVARIANT · **Threshold:** deterministic — 0 violations per fresh-run manifold
**Source:** interview · **Challenger:** technical-reality

#### T3: m5 Writes `.verify.json` Unconditionally

`m5-verify.md` emits `.manifold/<feature>.verify.json` on every completion code path — SATISFIED, PARTIAL, or blocked — independent of whether phase advances to VERIFIED.

> **Rationale:** `ai-workshop-showcase` is phase=VERIFIED with no `.verify.json` on disk; this breaks both the harness grading path and the drift-baseline step. Phase decision and artifact presence are independent concerns.

**Type:** INVARIANT
**Source:** interview

#### T4: Single-Contract Non-Software Branch

The non-software domain branch in `m0-init.md` resolves to exactly ONE contract. The hybrid "rename IDs, keep keys" state must not be a reachable output.

> **Rationale:** The current default produces a shape neither the schema nor the CLAUDE.md contract accepts. Picking one contract unambiguously is the only exit. Two candidate resolutions surface in m2: (a) remap category keys and extend schema, (b) keep software keys with software IDs and document non-software semantics in statements.

**Type:** BOUNDARY
**Source:** interview · **Challenger:** stakeholder (which contract wins is a design choice)

#### T5: m3 RT Count Variance Within Calibrated Band

m3-anchor produces `anchors.required_truths_total` within `[10, 28]` across three consecutive runs on the seed `reduce-context-rot` feature, without further widening the band in `tests/golden/fixtures/reduce-context-rot.yaml`.

> **Rationale:** Observed range was `0 → 13 → 23` across three nominally identical runs. The band exists because we calibrated to the noise; the fix should reduce the noise, not widen the band further.

**Type:** GOAL · **Threshold:** statistical — `required_truths_total ∈ [10, 28]` across 3 consecutive runs
**Source:** interview

#### T6: m3-anchor Prompt Body Size Ceiling

The always-loaded body of `m3-anchor.md` stays under 250 lines. Recursive-decomposition guidance lives in `references/recursive-decomposition.md` loaded only when `--depth > 1`.

> **Rationale:** At 360 lines, m3-anchor is the largest skill and correlates with the one "skipped entirely" run (0 turns, $0). Shrinking the always-loaded context reduces the probability of budget-starvation / context-eviction.

**Type:** BOUNDARY · **Threshold:** deterministic — 250 lines always-loaded body
**Source:** interview

---

### User Experience

#### U1: Non-Software Category Headings Match Contract

When `domain: non-software`, the generated markdown category headings match the CLAUDE.md universal vocabulary (`Obligations`, `Desires`, `Resources`, `Risks`, `Dependencies`) OR the skill output explains unambiguously why software headings were retained.

> **Rationale:** The failure mode today is silent: the user sees software headings and has no signal that non-software mode even engaged. Either produce the documented shape or surface the reason.

**Type:** INVARIANT
**Source:** interview · **Challenger:** stakeholder

#### U2: Validation Errors Surface Field Path + Required Pattern

`manifold validate` failures include the field path (e.g., `anchors.required_truths[0].evidence[2].id`) and the required shape (e.g., `Required field, string matching E\d+`), not just `Required`.

> **Rationale:** Today's errors force users to read `SCHEMA_REFERENCE.md` to know what to fix. Self-service debugging is faster if the error is specific enough to act on directly.

**Type:** GOAL
**Source:** interview

---

### Security

<!-- No net-new security constraints. Existing prompt-injection guard in phase-commons pre-mortem section already covers outcome-text-as-data semantics. -->

---

### Operational

#### O1: `manifold validate` Remains Canonical Gate

`manifold validate <feature>` is the single schema enforcement gate (exit code `0` pass, `2` validation failure). No parallel validators are introduced; schema changes route through this path only.

> **Rationale:** The gate works (it caught all 30+ violations on `ai-workshop-showcase`). Adding competing validators creates a source-of-truth ambiguity that prompts — and users — will resolve incorrectly.

**Type:** INVARIANT
**Source:** interview · **Challenger:** technical-reality

#### O2: Golden-File Harness Gates Prompt Changes

Prompt changes merge only after three consecutive harness runs on a seed feature stay within the calibrated tolerance bands.

> **Rationale:** Without this, per-run variance (already observed at 0→13→23 on m3) masks both regressions and improvements. Three consecutive passes is the smallest signal strong enough to distinguish noise from state change.

**Type:** GOAL
**Source:** interview

#### O3: Schema Changes Are Additive-Only

Any schema change made to support non-software domain is additive — no new required fields on existing manifold shapes that would invalidate the 19-manifold software corpus.

> **Rationale:** The "surprise" pre-mortem failure: tightening to fix non-software breaks the software corpus. Additive-only is the contract that lets both paths coexist.

**Type:** BOUNDARY
**Source:** interview · **Challenger:** technical-reality

#### O4: Fresh-Run Validation Required for Acceptance

Feature acceptance requires `manifold validate` passing on a *freshly generated* non-software manifold — not a post-hoc audit of `ai-workshop-showcase` with the old shape.

> **Rationale:** Pre-mortem story 1. Patching the existing broken artifact proves nothing about the fix; we need a new `/manifold:m0-init --domain=non-software` invocation that produces a clean manifold from scratch.

**Type:** BOUNDARY
**Source:** pre-mortem

---

## Tensions

### TN1: Non-Software Schema Contract

The non-software domain branch must satisfy the CLAUDE.md universal-vocabulary contract (`Obligations/Desires/Resources/Risks/Dependencies`) while the schema must remain a single source of truth that doesn't break the existing 19-manifold software corpus.

**Type:** Trade-off · physical contradiction (one schema, two shapes simultaneously)
**Between:** T4 (single-contract branch) · O3 (additive-only schema)
**Challenger profile:** T4 `stakeholder` vs. O3 `technical-reality`
**TRIZ:** Flexibility vs. Consistency → P1 (Segmentation), P15 (Dynamization), P40 (Composite)

> **Resolution:** Option A — Schema Union. Extend the schema via a zod discriminated union on `domain`. Software shape unchanged. Non-software shape uses keys `obligations/desires/resources/risks/dependencies` with ID prefixes `OB/D/R/RK/DP`. Decision locked via user selection on 2026-04-18.

**Propagation:**

- `B2` (software corpus pass-rate): **TIGHTENED** — zod-update regression risk on the 19-manifold corpus; mitigated by explicit pre/post validation sweep
- `O3` (additive-only): **SAFE** — discriminated union adds alternatives without changing existing required fields on the software shape
- `U1` (non-software headings): **LOOSENED** — CLAUDE.md universal vocabulary matches directly via the canonical non-software keys

**Validation criteria:**

1. Schema accepts discriminated union on `domain` field with two shapes
2. All 19 existing software manifolds validate without modification
3. Fresh `/manifold:m0-init --domain=non-software` produces manifold with `obligations/desires/resources/risks/dependencies` keys
4. Fresh non-software manifold passes `manifold validate` with zero violations

---

### TN2: m3 Variance Path — Split vs Depth-Constrain

Reducing m3-anchor's always-loaded body (T6) by moving recursive-decomposition to `references/` could drop default-run RT counts below the calibrated floor of 10 (T5), because recursion is what produces RT children.

**Type:** Trade-off · technical contradiction
**Between:** T5 (RT variance within `[10, 28]`) · T6 (m3 body ≤ 250 lines)
**TRIZ:** Simplicity vs. Capability → P1 (Segmentation), P15 (Dynamization), P35 (Parameter changes)

> **Resolution:** Split recursion behind `install/commands/references/recursive-decomposition.md`, loaded only when `--depth > 1`. In parallel, strengthen flat-mode RT elicitation in the always-loaded body so the 10-floor holds without recursion.

**Propagation:**

- `T5` (RT variance): **LOOSENED** — fewer depth excursions on default runs → variance collapses toward the lower band
- `T6` (body size): **LOOSENED** — directly satisfied once recursive section moves out
- m3 capability: **preserved** via progressive disclosure

**Validation criteria:**

1. `m3-anchor.md` always-loaded body ≤ 250 lines
2. `references/recursive-decomposition.md` exists and is loaded only when `--depth > 1`
3. Flat-mode elicitation produces `required_truths_total ≥ 10` on default runs

---

### TN3: m5 Artifact Emission vs Harness Strictness

Making m5 write `.verify.json` unconditionally (T3) is the semantically correct behavior, but until the P3 harness false-FAIL modes are fixed, the golden-file harness (O2) will FAIL on runs that correctly emit `.verify.json` with blockers and phase=GENERATED.

**Type:** Trade-off · temporal (bridging work is out of scope per source report)
**Between:** T3 (m5 always writes `.verify.json`) · O2 (harness gates prompt changes)
**TRIZ:** Global vs Local optimum → P3 (Local quality), P17 (Another dimension)

> **Resolution:** Accept carve-out. O2 interpretation is re-stated as: *"three consecutive runs within tolerance, **excluding** the P3 false-FAIL modes documented in `tests/golden/README.md`."* The harness fix (m5 GENERATED-with-verify.json, m4 rate-cap string match) is explicitly out of scope for this feature per the source report.

**Propagation:**

- `T3`: **SAFE** — unconditional emission stands independent of phase decision
- `O2`: **TIGHTENED** (temporarily) — requires asterisked interpretation until the separate P3 harness work lands

**Validation criteria:**

1. `.verify.json` present on disk after every m5 invocation regardless of phase decision
2. `tests/golden/README.md` documents the carve-out for harness false-FAIL modes
3. Golden-file harness runs within tolerance band, excluding P3 false-FAIL cases

---

## Required Truths

**Outcome:** Schema-conformant manifolds in software AND non-software domains, with m3 variance inside the calibrated band.

**Binding constraint:** **RT-1** — Schema union implementation. Until the zod discriminated union ships, RT-5 (non-software headings), RT-10 (fresh-run acceptance), and RT-7 (additive-only) cannot land. RT-1 is also the only ONE_WAY step in Option A; everything else is reversible.

---

### RT-1: Schema Union on `domain` Field

The Zod manifold schema accepts both a software shape and a non-software shape, discriminated by the top-level `domain` field.

**Status:** NOT_SATISFIED
**Maps to:** B1, T4, O3
**Gap:** Today `install/manifold-structure.schema.ts` defines one shape only. Non-software IDs (OB/D/R/RK/DP) and non-software keys (obligations/desires/resources/risks/dependencies) have no schema home.
**Evidence to collect:** `content_match` on `discriminatedUnion` in the schema module; `test_passes` on schema tests that round-trip both shapes.

#### RT-1.1: `z.discriminatedUnion('domain', [software, nonSoftware])` is defined

**Status:** NOT_SATISFIED · **Depth:** 1 · Primitive (verifiable fact)
**Gap:** Discriminated union does not exist yet in the Zod schema.

#### RT-1.2: CLI parser / loader accepts both shapes without branching at call-sites

**Status:** NOT_SATISFIED · **Depth:** 1 · Primitive
**Gap:** Today consumers assume the software shape. Must verify `cli/lib/parser.ts` and `cli/commands/validate.ts` route through the discriminated union without per-domain special cases leaking out.

#### RT-1.3: Both shapes round-trip through `validate → JSON → validate`

**Status:** NOT_SATISFIED · **Depth:** 1 · Primitive
**Gap:** No round-trip test exists. Required to prevent silent shape drift on serialization.

---

### RT-2: `evidence.id` Present in Every Template Snippet

`m3-anchor.md` and `m4-generate.md` JSON snippets all include `"id": "E<n>"` on evidence items.

**Status:** NOT_SATISFIED
**Maps to:** T1
**Gap:** At least one snippet in each file omits `id`. Audit both files, normalize every evidence example to the full shape.
**Evidence to collect:** `content_match` sweep on both skills; assertion that every evidence-like JSON block contains `"id":`.

---

### RT-3: `iterations.*.result` String Present in Every Iteration Snippet

Every iteration emission snippet in m1–m5 skills includes `result: string`, OR `install/hooks/phase-commons.sh` injects `result` when missing before the manifold is written.

**Status:** NOT_SATISFIED
**Maps to:** T2
**Gap:** 5 of the violations on `ai-workshop-showcase` trace to this. Two valid closure mechanisms; one must be chosen and verified.
**Evidence to collect:** `content_match` on all five skill files; `test_passes` on a fixture that emits iteration-less JSON and verifies the hook injects `result`.

---

### RT-4: m5 Emits `.verify.json` on Every Completion Path

`install/commands/m5-verify.md` writes `.manifold/<feature>.verify.json` unconditionally — SATISFIED, PARTIAL, or blocked — independent of whether phase advances.

**Status:** NOT_SATISFIED
**Maps to:** T3
**Gap:** Current m5 gates artifact emission on the phase decision. `ai-workshop-showcase` is phase=VERIFIED with no `.verify.json` on disk, confirming the gap.
**Evidence to collect:** `file_exists` check on `.verify.json` after a blocked m5 run.

---

### RT-5: Non-Software Markdown Headings Match CLAUDE.md Contract

When `domain: non-software`, the m0-init markdown template produces category headings `Obligations / Desires / Resources / Risks / Dependencies`.

**Status:** NOT_SATISFIED · **Depends on:** RT-1
**Maps to:** U1, T4
**Gap:** Today m0-init emits software headings regardless of domain. Template must branch.
**Evidence to collect:** `content_match` on freshly generated non-software `.md` for the five universal headings.

---

### RT-6: `manifold validate` Remains the Canonical Gate

No parallel or competing schema validators are introduced; the existing `cli/commands/validate.ts` remains the single enforcement path.

**Status:** SATISFIED
**Maps to:** O1
**Gap:** None — this is a negative constraint (do-not-introduce). Verification is "no new validator added" during the change.
**Evidence to collect:** `content_match` on `cli/commands/` for any new validator entrypoint — expect none.

---

### RT-7: Schema Changes Are Additive on the Software Shape

No new required fields are added to the software shape as part of the non-software work. New fields, if any, are optional or live only on the non-software branch of the union.

**Status:** SPECIFICATION_READY
**Maps to:** O3, B2
**Gap:** Specification is clear; implementation must respect it. Guarded by RT-10 (fresh-run on non-software) plus a pre/post sweep on the 19-manifold software corpus.
**Evidence to collect:** `test_passes` — re-validate all 19 software manifolds before and after the schema change; diff must show zero new violations.

---

### RT-8: m3 Body ≤ 250 Lines and Flat Elicitation ≥ 10 RTs on Default Runs

`install/commands/m3-anchor.md` always-loaded body is ≤ 250 lines with recursion moved to `references/recursive-decomposition.md`. Flat-mode elicitation reliably produces `required_truths_total ≥ 10` without invoking the reference file.

**Status:** NOT_SATISFIED
**Maps to:** T5, T6
**Gap:** Current body is 360 lines. No reference file exists. Flat-mode elicitation is under-specified in the body today.
**Evidence to collect:** `metric_value` on `wc -l install/commands/m3-anchor.md`; `file_exists` on `references/recursive-decomposition.md`; `test_passes` on a seed-feature harness run producing ≥ 10 RTs at default depth.

---

### RT-9: Validation Errors Include Field Path + Required Pattern

`manifold validate` output on failure names the offending field path (e.g., `anchors.required_truths[0].evidence[2].id`) and the required shape.

**Status:** PARTIAL
**Maps to:** U2
**Gap:** Zod already surfaces paths; the current CLI formatter collapses some of them. Improvement is format-layer work, not a new validator (keeps RT-6 intact).
**Evidence to collect:** `content_match` on a synthetic failure output that expects a dotted path and a `Required field, pattern: ...` fragment.

---

### RT-10: Fresh-Run Non-Software Manifold Validates Clean

A freshly invoked `/manifold:m0-init --domain=non-software <feature>` followed by `manifold validate <feature>` passes with zero violations — no retrofitting of existing artifacts.

**Status:** SPECIFICATION_READY
**Maps to:** O4, B1
**Gap:** The feature is only "done" when a brand-new non-software manifold produced by the updated prompts validates clean. This is the acceptance gate, not a patch-the-old-one gate.
**Evidence to collect:** `test_passes` on a scripted fresh-run: `m0-init` → `validate` with exit code 0, in CI.

---

## Solution Space

Three options were evaluated against the 10 RTs and the binding constraint (RT-1).

### Option A: Schema-first Sequential ← **Recommended**

Land the schema union first (RT-1), then fix non-software template headings (RT-5), then do the template audits (RT-2, RT-3), then m5 artifact rule (RT-4), then m3 split (RT-8), then error message polish (RT-9). O3/B2 guarded by pre/post software-corpus sweep at every step.

- **Satisfies:** RT-1, RT-2, RT-3, RT-4, RT-5, RT-6, RT-7, RT-8, RT-9, RT-10
- **Gaps:** None (with implementation)
- **Reversibility:** Mostly TWO_WAY. The schema-shape choice itself is ONE_WAY once published — gated by the binding-constraint callout in the anchor.
- **Sequence honors dependency chain:** RT-1 → RT-5 → RT-10 → RT-7 (matches binding-constraint chain)
- **Confirms TN1 (schema union), TN2 (split), TN3 (carve-out).**

### Option B: Template Audits First, Schema Second

Fix the ambiguous template snippets (RT-2, RT-3) and m5 artifact rule (RT-4) first; defer the schema union until after the software corpus has re-verified against the tightened templates. Do non-software schema work last.

- **Satisfies:** RT-2, RT-3, RT-4, RT-6, RT-8, RT-9 immediately; RT-1, RT-5, RT-7, RT-10 later
- **Gaps during partial ship:** RT-1, RT-5, RT-10 — non-software stays broken until Phase 2 lands
- **Reversibility:** All steps TWO_WAY until the schema change
- **Risk:** Defers the binding constraint. Pattern observed in `engineering-hardening` retrospective — binding constraints deferred to the end are frequently under-addressed.

### Option C: Parallel Split (Two Tracks)

Track 1 (schema + non-software branch) and Track 2 (template audits + m5 + m3 split) run in parallel worktrees, merged at the end.

- **Satisfies:** Same final set as Option A
- **Gaps:** None at end state
- **Reversibility:** TWO_WAY per track until merge
- **Risk:** Option A already sequences correctly via the dependency chain; parallelization here costs coordination overhead without materially compressing critical path (RT-1 is on the critical path regardless).

**Recommendation: Option A.** It matches the dependency chain surfaced by the binding-constraint analysis and keeps the ONE_WAY step (schema shape choice) as the very first commit, which is where context and attention are freshest.

---

## Tension Validation (closing the loop with m2)

All three resolved tensions honored by Option A:

- **TN1 (schema contract):** CONFIRMED — Option A implements Option A from m2 (zod discriminated union)
- **TN2 (m3 variance vs body):** CONFIRMED — RT-8 enforces both the 250-line ceiling AND the flat `≥ 10` RT floor
- **TN3 (m5 artifact vs harness):** CONFIRMED — RT-4 (unconditional `.verify.json`) is upheld; harness carve-out remains documented and out-of-scope

No tensions REOPENED.


---

## Artifacts (m4 generation — Option A, depth B)

**Generated this phase (13 files, status=generated):**

| Path | Type | Satisfies |
|------|------|-----------|
| `install/commands/references/recursive-decomposition.md` | doc (reference) | RT-8 |
| `tests/schema/schema-union.test.ts` | test (binding) | RT-1, RT-1.1, RT-1.3, RT-3 |
| `tests/schema/corpus-software-regression.test.ts` | test | RT-2, RT-7 |
| `tests/prompt-templates/m0-init-non-software.test.ts` | test | RT-1.2, RT-4, RT-5 |
| `tests/prompt-templates/fresh-run-non-software.test.ts` | test (binding) | RT-1, RT-10 |
| `tests/prompt-templates/evidence-id-present.test.ts` | test | RT-9 |
| `tests/prompt-templates/iterations-result-present.test.ts` | test | RT-9 |
| `tests/prompt-templates/m5-unconditional-verify.test.ts` | test | RT-9 |
| `tests/prompt-templates/m3-size.test.ts` | test | RT-8 |
| `tests/cli/validate-error-format.test.ts` | test | RT-9 |
| `docs/prompt-eval-fixes-v2/README.md` | doc | U1 |
| `docs/prompt-eval-fixes-v2/DECISIONS.md` | doc | U1, O1 |
| `ops/runbooks/non-software-schema-rollout.md` | runbook | O3, B2 |

**Planned EDITs (6 applied per iteration 6; precise diffs in `docs/prompt-eval-fixes-v2/DECISIONS.md`):**

| Step | Path | Reversibility | EDIT ref |
|------|------|---------------|----------|
| 1 | `cli/lib/structure-schema.ts` | ONE_WAY | DECISIONS.md#edit-1 |
| 1 | `install/manifold-structure.schema.json` | (regenerated) | DECISIONS.md#edit-1 |
| 2 | `install/commands/m0-init.md` | TWO_WAY | DECISIONS.md#edit-2 |
| 3 | `install/commands/m3-anchor.md` | TWO_WAY | DECISIONS.md#edit-3 |
| 4 | `install/commands/m4-generate.md` | TWO_WAY | DECISIONS.md#edit-4 |
| 5 | `install/commands/m5-verify.md` | TWO_WAY | DECISIONS.md#edit-6 |

A seventh EDIT against `install/hooks/phase-commons` was originally planned for the `iterations.result` injection path. It was retired during iteration 6: the template-audit approach (the `iterations-result-present` test plus the existing m1–m5 skill snippets) satisfies RT-9 directly, so no new hook was needed.

Tests were designed to FAIL pre-EDIT and PASS post-EDIT — giving m5-verify a meaningful NOT_SATISFIED → SATISFIED signal per gap. Step 1 (ONE_WAY) was acknowledged and applied per `reversibility_log[0].one_way_consequence`.
