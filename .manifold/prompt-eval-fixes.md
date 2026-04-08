# prompt-eval-fixes

## Outcome

Implement fixes from the prompt evaluation (improvements.md), raising overall prompt quality from 3.7/5.0 to 4.2+/5.0. Effective scope: ~12 issues after codebase reconciliation (P3, P6, P10, P13 already resolved). The 5 highest-impact fixes are: (1) Rewrite SKILL.md to reflect v3 JSON+Markdown format, (2) Replace m4's non-executable AutoSuggester TypeScript block with CLI invocation, (3) Elevate m4's binding constraint check to STEP 0, (4) Add mandatory validation to m0-init (formatting) and m-quick (missing entirely), (5) Fix m1's pre-mortem TIMEFRAME placeholder and add security detection to m-quick.

---

## Constraints

### Business

#### B1: Accurate Entrypoint Documentation

SKILL.md must accurately document the current v3 JSON+Markdown hybrid format. New users loading the overview skill must not receive information about deprecated YAML format as the primary approach.

> **Rationale:** SKILL.md is the entry point for agents loading Manifold for the first time. Incorrect information here (line 43: "Creates `.manifold/<feature-name>.yaml`") contaminates the entire session. The eval scored SKILL.md 1.4/5 — the lowest in the codebase.

#### B2: All Eval Fixes Implemented

All confirmed issues from the prompt evaluation must be addressed. Dropped issues (P3, P6, P10, P13) must be documented as already-resolved with evidence.

> **Rationale:** The evaluation represents a systematic quality audit. Partial implementation leaves known failure modes active.

#### B3: Prompt Quality Score Improvement

The aggregate prompt quality score across all 8 files should improve measurably. Target: no file below 3.0/5.0 (currently m4-generate at 2.6, m-quick at 2.6, SKILL.md at 1.4).

> **Rationale:** The eval's scoring dimensions (clarity, specificity, grounding, robustness, error handling) directly correlate with LLM output reliability.

### Technical

#### T1: Schema Validation Compliance

All modified prompt files must produce outputs that pass `manifold validate <feature>` when followed by an LLM. No prompt instruction may reference field names, ID formats, or enum values that conflict with the Zod schema in `cli/lib/structure-schema.ts`.

> **Rationale:** Schema drift between prompts and validation is the #1 source of silent corruption.

#### T2: Cross-Phase Data Contract Integrity

Data handoff points between phases must have explicit, unambiguous instructions in both the producing and consuming phase prompts.

> **Rationale:** The eval found m3→m4 binding constraint handoff buried as step 3b (P7), m2 context dedup undefined after compaction (P9).

#### T3: LLM-Executable Instructions Only

Every code block in a prompt file that appears as an instruction for the LLM to execute must be actually executable by the LLM.

> **Rationale:** The AutoSuggester block in m4 (P2) is the most critical example. Replace with CLI commands.

#### T4: Consistent Field Names Across Phases

Field names referenced in prompts must match exactly across all phases.

> **Rationale:** Schema field verification confirmed `recommended_option` (anchors) and `selected_option` (iterations/.passthrough()) are both correct in context. But any NEW field names added must match schema.

#### T5: Defined Flag Behavior

Every flag mentioned in any prompt's usage section must have corresponding execution instructions in the same file.

> **Rationale:** P11 (`--from-quick` in m-quick but not m0-init) and P12 (`--prd`/`--stories` in m4 usage but not in execution flow) create undefined behavior.

### User Experience

#### U1: Consistent Mandatory Section Formatting

All phase prompts must use the same formatting pattern for mandatory validation.

> **Rationale:** m0-init has validation as step 8 without the ⚠️ marker. m-quick has no validation at all.

#### U2: Security Intent Detection in Light Mode

m-quick must detect security-relevant feature names and suggest full workflow before proceeding.

> **Rationale:** P5 notes that a user doing what they believe is a simple auth change will use m-quick and bypass all GAP checklists.

#### U3: Concrete Default for Undefined Placeholders

All placeholder text in prompts must have a concrete default value when the source data may not contain the referenced information.

> **Rationale:** P8 identified that most feature outcomes don't contain a timeframe.

### Security

#### S1: No Prompt Injection via Placeholder Values

Placeholder substitutions in prompts must not allow user-controlled text to alter prompt instructions.

> **Rationale:** The pre-mortem pass inserts outcome text into a prompt template.

### Operational

#### O1: Plugin Sync After Changes

All changes to files in `install/commands/` must be synced to `plugin/commands/` via `bun scripts/sync-plugin.ts`.

> **Rationale:** CI enforces this via diff-guard. Forgetting sync breaks the plugin distribution.

#### O2: Backward Compatibility with Existing Manifolds

No change to prompt files may cause existing valid manifolds to fail validation or produce incorrect phase transitions.

> **Rationale:** There are 20+ existing manifolds in `.manifold/`.

#### O3: Changes Must Be Regression-Testable

Each fix should be verifiable by running the affected phase command against a known feature and checking output passes `manifold validate`.

> **Rationale:** The eval proposes a golden test set. While full eval infrastructure is out of scope, each fix should be manually verifiable.

---

## Tensions

### TN1: SKILL.md Rewrite Accuracy vs Backward Compatibility

Rewriting SKILL.md to accurately reflect v3 (B1) could break workflows that depend on its current content (O2). Investigation confirmed Codex agent skills are separate files — they do NOT reference the overview SKILL.md.

> **Resolution:** Full rewrite is safe. SKILL.md is an orientation-only document with no downstream consumers.

### TN2: AutoSuggester Replacement Command Does Not Exist

The eval suggested `manifold solve <feature> --dry-run`, but `--dry-run` does not exist. The actual CLI supports `--json`, `--ascii`, `--dot`, `--mermaid`, `--backward`.

> **Resolution:** Use `manifold solve <feature> --json` instead of the non-existent `--dry-run`.

### TN3: m-quick Simplicity vs Security Detection

Adding security intent detection (U2) conflicts with m-quick's simplicity value proposition (B3).

> **Resolution:** Minimal keyword gate at start of m-quick, user can override. A gate, not a wall.

### TN4: Content Removal vs Completeness

Removing duplicated "Why Backward Reasoning" from m3 (P17) and outdated SKILL.md content (B1) reduces token consumption but may leave users without context.

> **Resolution:** Replace wrong content with correct content; remove duplicated section with cross-reference to README/CLAUDE.md.

---

## Required Truths

### RT-1: SKILL.md Documents v3 JSON+Markdown as Primary Format

For B1 to hold, SKILL.md must: (a) replace all YAML references with JSON+MD hybrid, (b) update every command summary to match current behavior, (c) clarify storage section that JSON+MD is the default, YAML is legacy-only.

**Gap:** Lines 43-44 (YAML), all command summary blocks, storage section line 292. Requires full file rewrite.

### RT-2: m4 AutoSuggester Block Is a Valid CLI Command

For T3 to hold, the TypeScript block at m4 lines 409-422 must be replaced with `manifold solve <feature> --json` and the expected output format must be documented so the LLM knows how to parse it.

**Gap:** Replace TS block, add output format example, add interpretation guidance.

### RT-3: m4 Reads Binding Constraint as STEP 0

For T2 to hold, m4's execution instructions must begin with reading `anchors.binding_constraint` from JSON and prioritizing artifact generation around it. Currently buried as step 3b.

**Gap:** Restructure execution instructions: add `### STEP 0: Binding Constraint Check (MANDATORY)` before current step 1.

### RT-4: m0-init Mandatory Validation Uses Standard Format

For U1 to hold, m0-init's step 8 ("Run `manifold validate <feature>`") must be reformatted to match the `### ⚠️ Mandatory Post-Phase Validation` pattern used in m1-m3.

**Gap:** Formatting change only — the instruction exists, the pattern doesn't match.

### RT-5: m-quick Includes Validation and Security Gate

For U1+U2 to hold, m-quick must: (a) add `manifold validate` after file creation, (b) add security keyword detection before proceeding.

**Gap:** Both are missing entirely. Need ~15 lines of new content in m-quick.

### RT-6: m1 Pre-mortem TIMEFRAME Has Concrete Default

For U3 to hold, the placeholder `[TIMEFRAME from outcome]` at m1 line 316 must be replaced with a concrete default: "6 months from now — or the deadline in the outcome if one was stated."

**Gap:** Single line replacement.

### RT-7: m0-init Handles --from-quick Flag

For T5 to hold, either: (a) m0-init.md adds execution instructions for `--from-quick`, or (b) m-quick.md changes the upgrade path to not reference an undefined flag.

**Gap:** One of two files needs updating. Option (a) is more forward-compatible.

### RT-8: m4 PRD/Stories Flags in Execution Flow

For T5 to hold, m4's main execution flow must reference `--prd` and `--stories` flags with explicit instructions for when they apply.

**Gap:** Flags are listed in usage but the step-by-step execution doesn't incorporate them.

### RT-9: m2 Context Dedup Handles Compaction

For T2 to hold, m2's "When to Skip" context lookup guidance must account for conversation compaction losing prior context.

**Gap:** Current text says "if domain context is still in the conversation" — the LLM can't reliably know this after compaction. Add: "If unsure whether context survived compaction, re-run the lookup."

### RT-10: m2 GAP-16 Has Firing Condition in Compliance Table

For B2 to hold (all fixes), GAP-16 (Cache Invalidation Sub-Constraints) must either appear in the mandatory compliance table with a firing condition, or be explicitly documented as optional.

**Gap:** GAP-16 exists as a section (line 254) but is not in the GAP compliance table. Add to table or mark as optional.

### RT-11: m4 Includes @constraint Annotation Guidance

For B2 to hold, m4's test generation guidance should mention `@constraint` / `// Satisfies:` annotation convention so tests are created with these annotations from the start (rather than only learning about them in m5).

**Gap:** m4 already has `// Satisfies:` comments in examples (line 515), but doesn't explicitly instruct the LLM to generate tests with these annotations. Minor addition.

### RT-12: m3 "Why Backward Reasoning" Replaced with Cross-Reference

For B2 to hold, the duplicated pedagogical section in m3 (line 166) should be replaced with a one-line reference to avoid token waste.

**Gap:** Replace ~15 lines with one-line cross-reference.

---

## Binding Constraint

**BINDING CONSTRAINT: RT-1 (SKILL.md Rewrite)**
- Status: NOT_SATISFIED
- Reason: SKILL.md is the largest single change (full file rewrite) and the highest-impact fix (entry point contamination affects all new sessions). If this isn't done correctly, every other fix is undermined because new users start with wrong mental models.
- Dependency chain: RT-1 doesn't block other RTs technically, but B1 (invariant) is the strongest constraint and RT-1 is its sole satisfier.

---

## Solution Space

### Option A: File-by-File Sequential (Recommended)
Edit each prompt file individually, validate after each change. Order by impact: SKILL.md → m4-generate → m-quick → m1-constrain → m0-init → m2-tension → m3-anchor → m5-verify. Plugin sync once at the end.

- Satisfies: All RTs (RT-1 through RT-12)
- Reversibility: **TWO_WAY** — each file edit is independently reversible via git
- Complexity: Low
- Risk: Low — validation after each file catches errors immediately
- Trade-off: Slower but safest; each change is isolated and testable

### Option B: Parallel Batch by Severity
Group into 3 batches: Critical (P1, P2, P4, P5), Important (P7-P9, P11-P12), Nice-to-have (P14-P17). Execute batches in order with validation between batches.

- Satisfies: All RTs
- Reversibility: **TWO_WAY**
- Complexity: Medium
- Risk: Medium — errors within a batch may interact
- Trade-off: Faster but harder to isolate which change caused a validation failure

### Option C: Single Comprehensive Pass
Edit all 8 files in one pass, organized by file. Validate once at the end.

- Satisfies: All RTs
- Reversibility: **TWO_WAY**
- Complexity: Medium
- Risk: Higher — late validation means all errors surface at once
- Trade-off: Most efficient if changes are well-understood, riskier if mistakes compound

---

## Tension Validation

| Tension | Status | By Option A |
|---------|--------|-------------|
| TN1 (SKILL.md rewrite scope) | CONFIRMED | Full rewrite in first file |
| TN2 (AutoSuggester → CLI) | CONFIRMED | `manifold solve --json` in m4 edit |
| TN3 (m-quick simplicity) | CONFIRMED | Minimal keyword gate in m-quick edit |
| TN4 (content removal) | CONFIRMED | Cross-references replace duplication |

No tensions REOPENED. All resolutions honored by Option A.

---

## Dropped Issues (Already Resolved in Codebase)

| ID | Finding | Evidence |
|----|---------|----------|
| P3 | Dotted RT IDs fail validation | `RequiredTruthRefSchema` at schema line 278 supports `/^RT-[\d.]+$/` |
| P6 | m4 missing Interaction Rules | Present at m4-generate.md line 1008 |
| P10 | `selected_option` vs `recommended_option` | Different contexts: iterations (passthrough) vs anchors (schema field). Both correct. |
| P13 | m5 no pre-verification validation | "Quality Gate: Schema Validation" section at m5-verify.md lines 595-620 |
