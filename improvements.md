# Manifold Prompt Eval — Core Phase Commands

**Scope:** m0-init, m1-constrain, m2-tension, m3-anchor, m4-generate, m5-verify, m-quick, SKILL.md  
**Date:** April 2026  
**Method:** Full read of each file, evaluated across 6 dimensions

---

## Executive Summary

The core phase prompts are structurally sound and significantly above average for agentic prompt engineering. The scope guard pattern, phase-transition rules, and JSON+Markdown hybrid format are genuinely well-designed. The main failure modes are: one critically outdated orientation file (SKILL.md), one un-executable pseudo-code block in m4 that the LLM will either hallucinate its way through or silently skip, schema drift in m3's recursive backward chaining, and several places where instructions are incomplete enough that a model will fill in the gap with confident nonsense.

**Overall quality: 3.7 / 5.0** — Good foundation, specific fixable issues that cause real output degradation.

---

## 1. Prompt Inventory

| File | Phase | Est. Tokens | Clarity | Specificity | Grounding | Robustness | Error Handling | Score |
|------|-------|------------|---------|-------------|-----------|------------|----------------|-------|
| m0-init.md | INITIALIZED | ~3,500 | 5 | 5 | 4 | 4 | 3 | **4.2** |
| m1-constrain.md | CONSTRAINED | ~8,000 | 4 | 5 | 5 | 4 | 4 | **4.4** |
| m2-tension.md | TENSIONED | ~7,500 | 4 | 5 | 5 | 4 | 4 | **4.4** |
| m3-anchor.md | ANCHORED | ~6,000 | 4 | 4 | 4 | 3 | 3 | **3.6** |
| m4-generate.md | GENERATED | ~12,000 | 3 | 3 | 3 | 2 | 2 | **2.6** |
| m5-verify.md | VERIFIED | ~8,000 | 4 | 5 | 4 | 4 | 3 | **4.0** |
| m-quick.md | (light) | ~2,500 | 4 | 3 | 2 | 2 | 2 | **2.6** |
| SKILL.md | (overview) | ~4,000 | 2 | 2 | 1 | 1 | 1 | **1.4** |

---

## 2. Cross-Cutting Observations

**What works well:**

1. **Scope guards are excellent.** Every phase command has an explicit `## Scope Guard (MANDATORY)` section with a positive statement of what's allowed and a bulleted list of what's forbidden. This is effective because it preemptively blocks the most common LLM failure mode — scope creep. The "user's prompt is the OUTCOME, not a work order" framing in m0 is particularly good.

2. **Phase Transition Rules prevent auto-chaining.** The `MANDATORY: This command requires EXPLICIT user invocation` with `STOP AND WAIT` is consistently applied across m1–m5. This is critical for an agentic workflow and it's done well.

3. **JSON+Markdown hybrid design is clearly documented.** The "Key rule: JSON contains NO text content" principle is stated in every relevant prompt. The dueling memory aids ("Constraints _state_ → `statement`", "Tensions _describe_ → `description`") are a clever way to encode a schema decision directly in the prompt.

4. **Examples are concrete and cover the happy path.** Every command has a realistic worked example with actual feature names and realistic constraint IDs. This is strong grounding.

5. **Interaction Rules are standardized.** The three-rule block at the bottom of every command (AskUserQuestion, next-step suggestion, labeled trade-offs) is consistent and enforced with clear links to the commandments (RT-1, RT-3, U1, U2). Missing from m4 and m5.

6. **GAP checklists in m1 address known blind spots.** The 6 GAP checklists (03, 09, 10, 11, 14, 17) with explicit "When Required" firing conditions are genuinely useful — they encode domain knowledge about constraint discovery failures into the prompt.

**What has issues:**

7. **m4-generate is by far the most complex prompt and has the most reliability problems.** At ~12,000 tokens it is 3x the length of m0-init. Complexity ≠ reliability. The parallelization step, binding constraint handoff, reversibility tagging, evidence population, artifact classification, non-software branching, and PRD/stories flags are all in one document. Each adds interaction surface where the model can fail. It reads like a spec, not a prompt.

8. **SKILL.md is a deceptive entrypoint.** Users loading the overview skill get instructions that are factually wrong for the current schema version. This actively misleads new users before they reach the individual command files.

---

## 3. Per-Prompt Findings

### m0-init.md — Score: 4.2/5

**What it does well:**
- Scope guard is the cleanest in the codebase. The "user's prompt is the OUTCOME, not a work order" sentence will prevent a full class of failures where Claude starts building the thing instead of initializing a manifold.
- Domain auto-detection logic (software vs non-software signals) is specific enough to be actionable, with clear `AskUserQuestion` escalation path.
- The schema version compatibility table is genuinely useful context that prevents incorrect version assumptions.

**Critical issues:**
- **No `manifold validate` after file creation.** m1, m2, m3 all mandate `manifold validate <feature>` before displaying results. m0 does not. Step 8 says "Run `manifold validate <feature>`" but it's buried in the execution instructions and not marked ⚠️ or MANDATORY like the others. If m0 produces an invalid JSON structure, it won't be caught until m1 tries to read it.

  > Current: step 8 — "Run `manifold validate <feature>` — confirm the new manifold is valid"  
  > Fix: Add `### ⚠️ Mandatory Post-Phase Validation` section matching the pattern in m1–m3.

**Important improvements:**
- The `--from-quick` flag is mentioned in m-quick as an upgrade path (`/manifold:m0-init <feature> --from-quick`) but m0-init.md never defines how to handle it. The LLM will either invent behavior or ignore the flag.

**Nice-to-have:**
- Interaction Rules comment annotation (`<!-- Satisfies: RT-1... -->`) is present but the referenced RTs are invisible to the LLM unless the commandments document is in context. Low overhead to keep, fine as-is.

---

### m1-constrain.md — Score: 4.4/5

**What it does well:**
- GAP checklists are the strongest feature of m1. The table with explicit firing conditions and the `gap_checklist_compliance` schema block means there's a machine-verifiable record of whether each checklist ran.
- Pre-mortem pass design (three stories, source tagging, AskUserQuestion) is methodologically sound.
- Constraint Quality Check (1-3 scoring on specificity/measurability/testability) with inline suggestion template is immediately actionable.
- Draft Required Truths seeding is an excellent context-bridging mechanism between phases.

**Critical issues:**
- **Pre-mortem TIMEFRAME placeholder is undefined.** Line 316: `"Imagine it is [TIMEFRAME from outcome]."` — `[TIMEFRAME from outcome]` is never defined anywhere. Most feature outcomes don't contain a timeframe ("95% retry success" has no temporal component). The LLM will either hallucinate a timeframe ("6 months from now") or produce an awkward prompt.

  > Current: `"Imagine it is [TIMEFRAME from outcome]. This has clearly failed..."`  
  > Fix: `"Imagine it is [6 months after launch / the stated deadline / 3 months from now if no deadline given]. This has clearly failed..."` — give a concrete default.

**Important improvements:**
- The constraint genealogy section (source/challenger tags) warns "CRITICAL: These are separate enums. Do NOT mix them." This is good, but `technical-reality` as a challenger (not source) is still confusing. A tiny worked example showing the valid vs. invalid combination would prevent the most likely mistake.
- The WebSearch context lookup instructions say "summarize findings in a brief 'Domain Context' block" but provide no guidance on what to do if WebSearch returns nothing useful or contradictory results. Add a fallback: "If no current sources are found, explicitly state 'Using training knowledge — web search was unproductive' and proceed."

**Nice-to-have:**
- The GAP ID sequence (03, 09, 10, 11, 14, 17) is non-sequential, implying deprecated/removed gaps. A brief note ("GAP IDs reflect the original engineering hardening feature and are non-sequential") would prevent users from wondering what happened to GAP-01 through GAP-08.

---

### m2-tension.md — Score: 4.4/5

**What it does well:**
- TRIZ classification is the most sophisticated piece of prompting in the entire codebase. Step-by-step (classify → map → output format) with quality gates (U5: "No strong TRIZ mapping — resolve via direct analysis" and B2: tier gate for non-engineering contexts) are well-calibrated.
- Constructive Relaxation Suggestion on VIOLATED is genuinely useful — it turns a dead-end into an actionable trade-off.
- Failure Cascade Analysis (GAP-06) with the recursive "What if the fallback also fails?" structure, terminating at three defined endpoints, is methodologically clean.
- Blocking Dependency Export for m3 closes the feedback loop between phases.

**Critical issues:**
- **Context lookup deduplication logic is underspecified.** The "When to Skip" says: "Context lookup was already performed in m1-constrain within the same session and the domain context is still in the conversation." The LLM has no reliable way to know if context is "still in the conversation" after compaction. This should say: "If domain context from m1 was summarized in the compaction, re-run the lookup for tension-relevant topics."

**Important improvements:**
- The tension resolution output format (the TENSION/CHALLENGER PROFILE/TYPE/PARAMETERS block) is defined but the Challenger Profile line (`CHALLENGER PROFILE: [C-ID] challenger: [tag] vs. [C-ID] challenger: [tag]`) uses a bracket notation that conflicts with the JSON field name. Make clear this is a display format, not a schema field.
- Cache Invalidation Sub-Constraints (GAP-16) is buried at the bottom with no firing condition. Unlike the other GAPs, it doesn't appear in the mandatory compliance table. Either add it to the table with a firing condition or remove the separate section.

**Nice-to-have:**
- The Common Tension Patterns table (Speed vs Safety, UX vs Security, etc.) is good but only has 4 rows. This is a seed — adding 4-6 more would pay off in discovery rate.

---

### m3-anchor.md — Score: 3.6/5

**What it does well:**
- Theory of Constraints bottleneck identification (three-question method) is well-constructed and the binding constraint output format is unambiguous.
- Solution-Tension Validation (cross-phase feedback) closes an important loop: verifying that the recommended option doesn't reopen resolved tensions. This is good cross-phase coherence.
- Reversibility tagging for solution options with the THREE_WAY/REVERSIBLE_WITH_COST/ONE_WAY taxonomy is actionable.

**Critical issues:**
- **Dotted RT IDs (RT-1.1, RT-1.1.2) will fail schema validation.** The Recursive Backward Chaining section introduces `RT-1.1`, `RT-1.1.2`, etc. as valid IDs. But the JSON schema (defined in `cli/lib/structure-schema.ts` via Zod) is not shown to use these. The standard ID format used everywhere else is `RT-\d+` (RT-1, RT-2, etc.). If the Zod validator uses a regex like `/^RT-\d+$/`, dotted IDs will fail `manifold validate`. This means every session that reaches recursive decomposition depth > 1 will produce an invalid manifold.

  > Fix: Either document that the Zod schema supports dotted IDs, or change the example to use flat IDs with a parent field: `{"id": "RT-11", "parent": "RT-1", "depth": 1}`.

- **`anchors.binding_constraint` schema is defined in m3 but the contract with m4 is implicit.** m3 says m4 MUST read `anchors.binding_constraint`, but m4's execution instructions bury this as step "3b" after step 3, in a small indented block. If an LLM runs m4 from context that doesn't include m3's instructions (e.g., fresh session loading only m4), it will skip the binding constraint prioritization entirely. The binding constraint check in m4 should be in its own `## STEP 0` equivalent, not nested.

**Important improvements:**
- The depth recursion max is 4, but there's no guidance on what to do when the tree is still unresolved at depth 4 beyond "flag remaining gaps explicitly." What flag format? How should the user be notified? Add: `If depth 4 is reached with unresolved leaves, surface via AskUserQuestion: "Recursive decomposition hit max depth. [N] truths are still unresolved. Would you like to: A. Accept and document as assumptions, B. Continue manually, or C. Treat as blocking?"`.

- Iteration recording in m3 has a `"selected_option"` field (e.g., `"selected_option": "Option A"`) but the schema example shows string format while the JSON anchors use `"recommended_option": "C"` (single letter). These should be consistent.

**Nice-to-have:**
- The "Why Backward Reasoning?" section with the Forward vs. Backward comparison is good pedagogically but is duplicated content that also appears in SKILL.md and the README. It consumes tokens on every invocation for users who already understand the framework.

---

### m4-generate.md — Score: 2.6/5

This is the most problematic prompt in the system. It's ~12,000 tokens encoding a mixture of what the LLM should do, what the CLI does, what architecture decisions were made, and TypeScript pseudo-code that looks executable but isn't. The LLM cannot reliably distinguish between "here's the context about parallel execution" and "here is code you should run."

**What it does well:**
- Artifact Placement Rules section with the correct/wrong location table is excellent. This is exactly the kind of project-specific knowledge that prevents common integration failures.
- Evidence population rules (type selection guide, `artifact_class` taxonomy, `verified_by` on invariants) are specific and complete.
- Non-software domain branching to `docs/m4-generate-nonsoftware.md` is clean.

**Critical issues:**
- **The AutoSuggester TypeScript block is not executable by the LLM.** Lines 409–422:
  ```typescript
  const suggester = new AutoSuggester(process.cwd());
  const tasks = [...];
  const suggestion = await suggester.suggest(tasks);
  if (suggestion.shouldParallelize) {
    console.log(suggester.formatSuggestion(suggestion));
  }
  ```
  This is not a shell command. `AutoSuggester` is a class from the `lib/parallel` module. Claude Code cannot `import` it and `await` it during prompt execution. The LLM will either: (a) ignore the block and skip the parallelization check, (b) hallucinate what the output would be and make up a speedup estimate like "2.5x, Confidence: 85%", or (c) attempt to write a temporary TS file and run it, which may work but is fragile.

  > Fix: Replace the TypeScript block with a shell command:
  > ```bash
  > # Check if parallelization is beneficial (manifold CLI handles analysis)
  > manifold solve <feature> --dry-run
  > ```
  > Then show the LLM what the output looks like and how to interpret it.

- **Interaction Rules are absent from m4.** m0–m3 and m-quick all have the standard three-rule block at the bottom. m4 does not. This means m4 doesn't enforce AskUserQuestion for user input, doesn't mandate a next-step suggestion, and doesn't have labeled trade-off guidance. Given m4 is the phase with the most user decisions (option selection, parallelization approval, ONE_WAY acknowledgments), this is the phase most in need of it.

  > Fix: Add the standard Interaction Rules block.

**Important improvements:**
- The binding constraint handoff (step 3b) should be elevated to a `### ⚡ STEP 0: Binding Constraint Check (MANDATORY)` at the top of execution instructions, not buried as step 3b. The comment in Enhancement 5b — "Without this handoff, m4 generates in arbitrary order and the binding constraint may be addressed last (or inadequately)" — confirms this is a known risk.

- ONE_WAY acknowledgment requirement says "Require explicit acknowledgment of each before proceeding" but doesn't specify the AskUserQuestion format. Without the format, the LLM will ask as plain text, violating the interaction rules of the broader framework. Provide the exact AskUserQuestion template.

- PRD/stories flags (`--prd`, `--stories`) are listed in the usage section but have no corresponding execution instructions. Where do they appear in the execution flow? What constraints drive PRD generation? This is a dangling feature with no implementation guidance.

**Nice-to-have:**
- The Task Tracking JSON example shows artifact status as `"generated"` while the valid values table says `generated`, `pending`, `failed`. A brief sentence clarifying that all artifacts start as `pending`, transition to `generated` on completion, and `failed` on error would help.

---

### m5-verify.md — Score: 4.0/5

**What it does well:**
- Satisfaction Levels (DOCUMENTED → IMPLEMENTED → TESTED → VERIFIED) with the critical distinction for `test_passes` status (PENDING vs VERIFIED) is precise and prevents inflated scores.
- The Enhancement Verification Checks (Genealogy, Statistical, Reversibility, Propagation, Binding Constraint) are a good systematic way to verify the metadata correctness introduced by earlier enhancements.
- Test Tier Classification with the "mocked unit tests prove code structure, not runtime behavior" caveat is correct and important.

**Critical issues:**
- **No pre-verification schema validation.** m5 reads `.manifold/<feature>.json` and `.verify.json` but doesn't mandate `manifold validate <feature>` before starting. If m3 produced invalid dotted RT IDs (see m3 finding above), m5 will attempt verification against a malformed schema and produce garbage results. Add: "Before starting, run `manifold validate <feature>`. If it fails, halt and surface the errors. Do not attempt verification against an invalid schema."

**Important improvements:**
- Drift Detection is mentioned as a separate post-verification step (`manifold drift <feature>`) but the instructions don't make clear when the LLM should suggest running it. Is it automatic? Manual? Clarify: "After displaying the verification matrix, always suggest: `manifold drift <feature>` to check for post-verification file changes."

- The `--levels` flag is described but there's no guidance on what the LLM should do with the output. If a constraint is only DOCUMENTED (not TESTED), should the LLM surface a gap? Clarify the action implication of each level.

**Nice-to-have:**
- The `@constraint` / `// Satisfies:` annotation parsing for traceability matrix is excellent design but only explained here in m5. It should also be mentioned in m4-generate's test generation guidance so tests are created with these annotations from the start.

---

### m-quick.md — Score: 2.6/5

**What it does well:**
- The decision matrix (when to use light vs. full mode) is clear and well-calibrated. The "if you can describe the change in one sentence, use light mode" rule is memorable and correct.
- The upgrade path to full workflow via `--from-quick` is documented.

**Critical issues:**
- **No `manifold validate` anywhere.** m-quick creates JSON and Markdown manifold files but never runs validation. The minimal manifold example shows `"quick_summary"` as a top-level key — if the Zod schema doesn't include this field, every light-mode output will fail schema validation when later processed by the CLI.

  > Fix: Add a step after file creation: "Run `manifold validate <feature>` and fix any errors. The light-mode manifold must pass schema validation."

- **All 6 GAP checklists are absent.** Security changes in particular should still trigger at least GAP-09 and GAP-10. The current guidance ("Security and compliance ALWAYS need full workflow") relies entirely on the user correctly self-selecting into full mode. But a user doing what they believe is a simple auth change will use m-quick and get none of the security gap analysis. At minimum, add a security intent detection step: "If the outcome or feature name contains auth, token, password, permission, or secret, mandate full workflow and do not proceed with m-quick."

**Important improvements:**
- The `--from-quick` flag in the upgrade path is not defined in m0-init.md. One of these needs to change: either m0-init.md adds `--from-quick` handling, or m-quick should say `This will prompt m1-constrain to expand your 3 constraints into full category coverage` instead of implying a dedicated flag path.

- Phase 2 "Quick Generate" says "Essential tests only (happy path + one edge case)" but doesn't clarify what test artifact format to use or whether to create the JSON manifold tracking entries. Without these, m5-verify can't process the output from a light-mode session.

**Nice-to-have:**
- The comparison table (Light vs Full) is a good summary. Consider adding a "Risk level" row as a proxy for when to choose each.

---

### SKILL.md (Overview) — Score: 1.4/5

**What it does well:**
- Clear `name` and `description` frontmatter with the "USE WHEN learning about Manifold" guidance.
- The quick-start command list at the top is accurate for command names.

**Critical issues:**
- **Actively documents the wrong file format.** Line 43: `Creates .manifold/<feature-name>.yaml`. This is the old YAML format. The current format creates TWO files: `.manifold/<feature>.json` + `.manifold/<feature>.md`. Any user who loads SKILL.md first and reads this will have an incorrect mental model of what m0-init does.

- **Command summaries are out of sync with actual commands.** SKILL.md's m0-init block still says `Creates .manifold/<feature-name>.yaml`, m4-generate block says `src/retry/payment-retry.ts` (flat path, not `lib/`), and the m5-verify block doesn't mention any of the v3.1 flags (`--verify-evidence`, `--run-tests`, `--execute`, `--levels`).

- **Storage section is wrong.** Line 283 says the storage format uses JSON+Markdown, but then line 292 says "Legacy YAML format (`.yaml` files) is still supported for backwards compatibility" without clarifying that new manifolds should NEVER be YAML. A new user reading this section has no reason to prefer JSON+Markdown.

  > This file needs a rewrite, not patches. The quickest fix: add a banner at the top:
  > ```
  > > ⚠️ This overview file may be outdated. For accurate behavior,
  > > load individual commands directly: /manifold:m0-init, etc.
  > ```
  > Then schedule a full rewrite to v3 schema accuracy.

---

## 4. Top 5 Highest-Impact Fixes

### Fix 1: Rewrite or deprecate SKILL.md

**Problem:** SKILL.md documents YAML as the primary format and includes command summaries that diverge from actual command behavior. Every new user who runs the top-level skill orientation gets a wrong mental model.

**Why it matters:** This is the entry point for agents loading the skill for the first time. Incorrect information here contaminates the entire session.

**Before:**
```markdown
**What it does:**
- Creates `.manifold/<feature-name>.yaml`
- Initializes empty constraint categories
```

**After:**
```markdown
**What it does:**
- Creates TWO files: `.manifold/<feature>.json` (structure) + `.manifold/<feature>.md` (content)
- JSON: IDs, types, phases only. NO text content.
- Markdown: outcome, constraint statements, rationale
- Schema version 3 (v3 features: evidence, constraint_graph, iterations)

> Individual command files are the authoritative source.
> This overview is for orientation only.
```

---

### Fix 2: Replace AutoSuggester TypeScript block in m4 with CLI invocation

**Problem:** Lines 409–422 in m4-generate.md show TypeScript code that creates an `AutoSuggester` instance and awaits its output. This is not executable by the LLM. The LLM will hallucinate the speedup estimate and confidence score.

**Why it matters:** The parallelization check is presented as MANDATORY (STEP 0). If the LLM fakes the output, users get false confidence that parallel generation was properly evaluated.

**Before:**
```typescript
const suggester = new AutoSuggester(process.cwd());
const tasks = [...];
const suggestion = await suggester.suggest(tasks);
if (suggestion.shouldParallelize) {
  console.log(suggester.formatSuggestion(suggestion));
}
```

**After:**
```bash
# Run parallelization analysis via CLI
manifold solve <feature> --dry-run
```
Then document the output format the LLM should parse:
```
PARALLEL OPPORTUNITY DETECTED
Groups: 3 (code: 4 files, tests: 3 files, docs+ops: 4 files)
Est. speedup: 2.5x | Confidence: HIGH
Recommendation: Use /manifold:parallel for generation
```

---

### Fix 3: Fix dotted RT IDs in m3 recursive backward chaining

**Problem:** m3 introduces `RT-1.1`, `RT-1.1.2` IDs for recursive sub-truths, but the Zod schema at `cli/lib/structure-schema.ts` almost certainly validates RT IDs as `/^RT-\d+$/`. This will cause `manifold validate` failures for any session reaching depth > 1.

**Why it matters:** The recursive backward chaining is a differentiating feature of Manifold. It will silently corrupt the manifold JSON on every use.

**Before:**
```json
{"id": "RT-1.1", "status": "NOT_SATISFIED", "depth": 1, "children": []}
```

**After (option A — flat with parent reference):**
```json
{"id": "RT-11", "parent_id": "RT-1", "depth": 1, "status": "NOT_SATISFIED", "children": []}
```

**After (option B — if schema supports dotted):** Add an explicit note confirming the Zod schema allows dotted IDs. If it doesn't, update the schema in `structure-schema.ts` and regenerate the JSON Schema file.

---

### Fix 4: Add mandatory validation to m0-init and m-quick

**Problem:** m1, m2, m3, m4 all mandate `manifold validate <feature>` post-phase. m0-init and m-quick do not. These are the two phases where schema errors are most likely to be introduced (initial file creation and non-standard light-mode format).

**Why it matters:** Validation errors propagate silently through the entire workflow. A malformed m0-init output will cause confusing failures in m3 or m5.

**Fix for m0-init:** Add after step 8:
```markdown
### ⚠️ Mandatory Post-Phase Validation

After creating both files, run validation before showing results:

```bash
manifold validate <feature>
```

If validation fails, fix the JSON structure before proceeding. Common issues: missing required fields (`$schema`, `schema_version`), invalid domain value.
```

**Fix for m-quick:** Add after file creation step:
```markdown
Run `manifold validate <feature>` — the light-mode manifold must pass schema validation before displaying results. Fix any errors; do not display the confirmation summary until validation passes.
```

---

### Fix 5: Add Interaction Rules to m4 and fix m3's pre-mortem TIMEFRAME

**Problem (m4):** m4-generate is the phase with the most user decision points (option selection, parallelization approval, ONE_WAY acknowledgments), but it's the only core command missing the Interaction Rules block. This means decisions in m4 can be asked as plain text, inconsistent with the rest of the framework.

**Problem (m1 pre-mortem):** `"Imagine it is [TIMEFRAME from outcome]"` — `TIMEFRAME` is never defined and most outcomes don't have one.

**Fix for m4:** Add at end:
```markdown
## Interaction Rules (MANDATORY)
<!-- Satisfies: RT-1 (next-step templates), RT-3 (structured input), U1 (suggest next), U2 (AskUserQuestion) -->

1. **Questions → AskUserQuestion**: When you need user input (option selection, parallelization approval, ONE_WAY acknowledgment), use `AskUserQuestion` with structured options. NEVER ask as plain text.
2. **ONE_WAY steps → explicit acknowledgment format**:
   - Present: "This step is irreversible: [consequence]. Do you want to proceed?"
   - Options: A. Yes, proceed | B. No, choose different option | C. Review consequences
3. **Phase complete → Suggest next**: ALWAYS end with `/manifold:m5-verify <feature>`.
```

**Fix for m1 pre-mortem TIMEFRAME (before):**
```
"Imagine it is [TIMEFRAME from outcome]. This has clearly failed"
```
**After:**
```
"Imagine it is [6 months from now — or the deadline in the outcome if one was stated, otherwise 6 months]. This has clearly failed"
```

---

## 5. Eval Methodology

### What to Measure (5 Core Metrics)

**Metric 1: Schema compliance rate**
- Definition: Percentage of phase outputs that pass `manifold validate <feature>`
- How to compute: Run `manifold validate --json` after each phase; parse `exit_code == 0` as pass
- Target: ≥ 95% for m0-m3, ≥ 90% for m4 (more complex)
- What it catches: Format drift, hallucinated fields, invalid enum values

**Metric 2: Scope guard adherence rate**
- Definition: Percentage of runs where the LLM does NOT create files outside `.manifold/` during phases m0–m3 and m5
- How to compute: Track filesystem state before and after each phase; any files created outside `.manifold/` = violation
- Target: 100% (zero tolerance — scope violations are the core failure mode this prompt design prevents)

**Metric 3: Constraint discovery recall**
- Definition: For a golden test case with N known constraints, what percentage does m1 discover?
- How to compute: Create 3-5 golden features with ground-truth constraint sets; run m1; compute |discovered ∩ known| / |known|
- Target: ≥ 80% recall, < 20% false positive rate (invented constraints not in ground truth)
- What it catches: LLM being too conservative (misses) or too creative (hallucinations)

**Metric 4: Phase transition accuracy**
- Definition: After each phase, does `phase` in `.manifold/<feature>.json` match the expected value?
- How to compute: Read `.json` after each command; assert `phase == expected`
- Valid values: `INITIALIZED` → `CONSTRAINED` → `TENSIONED` → `ANCHORED` → `GENERATED` → `VERIFIED`
- Target: 100%

**Metric 5: Cross-phase coherence**
- Definition: Does m3's recommended solution honor all resolved tensions from m2?
- How to compute: After m3, run `tension_validation` check — count `REOPENED` tensions
- Target: 0 REOPENED tensions for auto-resolved features; user-acknowledged REOPENED is acceptable

---

### Golden Test Set Structure

Maintain a `tests/evals/` directory with 3-5 canonical features:

```
tests/evals/
├── payment-retry/          # Complex: auth, idempotency, rate limits
│   ├── ground-truth.json   # Known constraints, tensions, required truths
│   ├── phase-outputs/      # Expected .json and .md for each phase
│   └── assertions.yaml     # Specific claims that must hold
├── login-timeout/          # Simple: single-category, m-quick appropriate
│   └── ...
├── data-export/            # Security-heavy: tests GAP-09, GAP-10
│   └── ...
└── schema/
    └── assertions.schema.json  # JSON Schema for assertion files
```

Each `assertions.yaml` should include:
```yaml
phase: m1-constrain
assertions:
  - type: constraint_exists
    id: B1
    contains: "duplicate"           # rough semantic match
  - type: schema_valid              # must pass manifold validate
  - type: phase_correct
    expected: CONSTRAINED
  - type: scope_guard               # no files outside .manifold/
  - type: gap_checklist_present
    gaps: [GAP-03, GAP-10]         # required for this feature
```

---

### Regression Testing for Prompt Changes

When changing any phase command file:

1. **Run the full golden test suite** against the changed command on at least 2 models (Claude Sonnet + one other)
2. **Diff `.manifold/` outputs** against the last passing run — unexpected schema changes are regressions
3. **Check the 5 core metrics** — any degradation > 5% is a blocking regression
4. **Specific to the phase changed:** run at least 3 diverse inputs (simple feature, complex feature, non-software domain)

**Recommended tooling: promptfoo**

```yaml
# promptfoo.yaml
providers:
  - id: claude-sonnet-4-5
  - id: claude-haiku-3-5

prompts:
  - file://plugin/commands/m1-constrain.md

tests:
  - vars:
      feature: payment-retry
      outcome: "95% retry success for transient failures"
    assert:
      - type: javascript
        value: |
          // Check manifold validate passes
          const result = require('child_process')
            .execSync('manifold validate payment-retry --json')
          return JSON.parse(result).valid === true
      - type: javascript
        value: |
          // Check phase transition
          const manifest = JSON.parse(fs.readFileSync('.manifold/payment-retry.json'))
          return manifest.phase === 'CONSTRAINED'
```

promptfoo handles provider comparison, snapshot testing, and CI integration natively. It's the right fit because manifold outputs are structured (JSON + files) rather than free-form text.

For semantic evaluation (e.g., "are the generated constraints actually relevant?"), add Braintrust with an LLM judge:
```python
# braintrust_eval.py
@braintrust.task
def eval_constraint_relevance(input, output):
    # Judge: are the discovered constraints relevant to the feature?
    score = judge_llm(
        f"Feature: {input['feature']}\nOutcome: {input['outcome']}\nConstraints: {output['constraints']}\nAre these constraints relevant and non-hallucinated?"
    )
    return score
```

---

### CI Gate for Prompts

```yaml
# .github/workflows/prompt-eval.yml
name: Prompt Eval
on:
  pull_request:
    paths:
      - 'plugin/commands/**'
      - 'install/commands/**'

jobs:
  schema-regression:
    steps:
      - run: npx promptfoo eval --config tests/evals/promptfoo.yaml --output results.json
      - run: node scripts/assert-eval-results.js results.json
        # Fails if schema_compliance < 95% or scope_guard < 100%
      
  golden-test:
    steps:
      - run: bun run tests/evals/run-golden.ts
        # Runs all 5 golden features through changed phases
        # Diffs outputs against last-known-good snapshots
        # Fails on unexpected .json structure changes
```

**Gate thresholds:**
- Schema compliance: block PR if < 90%
- Scope guard adherence: block PR if < 100%  
- Phase transition accuracy: block PR if < 100%
- Constraint recall on golden set: warn if < 75%, block if < 60%

---

## Appendix: Quick-Reference Issue List

| ID | File | Severity | Issue |
|----|------|----------|-------|
| P1 | SKILL.md | Critical | Documents YAML as primary format; entire file is outdated |
| P2 | m4-generate.md | Critical | AutoSuggester TypeScript block is not LLM-executable; will be hallucinated |
| P3 | m3-anchor.md | Critical | Dotted RT IDs (RT-1.1) will fail Zod schema validation |
| P4 | m0-init.md | Critical | No mandatory `manifold validate` post-creation |
| P5 | m-quick.md | Critical | No `manifold validate`, no security intent detection, all GAP checklists absent |
| P6 | m4-generate.md | Important | Missing Interaction Rules block |
| P7 | m3-anchor.md | Important | Binding constraint handoff buried as step 3b; should be STEP 0 |
| P8 | m1-constrain.md | Important | Pre-mortem TIMEFRAME placeholder is undefined |
| P9 | m2-tension.md | Important | Context lookup deduplication is undefined after compaction |
| P10 | m3-anchor.md | Important | `selected_option` vs `recommended_option` inconsistency in iteration schema |
| P11 | m0-init.md | Important | `--from-quick` flag undefined in execution instructions |
| P12 | m4-generate.md | Important | PRD/stories flags have no execution instructions |
| P13 | m5-verify.md | Important | No pre-verification schema validation |
| P14 | m2-tension.md | Nice-to-have | GAP-16 cache sub-constraints missing from compliance table |
| P15 | m1-constrain.md | Nice-to-have | Non-sequential GAP IDs (03,09,10,11,14,17) need explanation |
| P16 | m5-verify.md | Nice-to-have | `@constraint` annotation guidance should also appear in m4 |
| P17 | m3-anchor.md | Nice-to-have | "Why Backward Reasoning" section duplicates README/SKILL.md content |

