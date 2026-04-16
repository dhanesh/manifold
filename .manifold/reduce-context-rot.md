# reduce-context-rot

## Outcome

Zero context rot and token optimization as a first-class feature across the entire m0-m6 workflow. Every technique for keeping context fresh and minimizing token consumption is applied: reduced verbosity, visual/concise output formatting, manifold markdown as the canonical referenced source of truth at every phase execution. Details that must persist are captured in manifold files and referenced (not re-stated) when tasks execute.

**Key objectives:**
- Each phase reads from `.manifold/<feature>.md` rather than relying on degrading conversation context
- Output to the user is maximally visual, minimal in word count
- Cross-phase information transfer uses file references, not inline repetition
- Token budget is treated as a scarce resource at every design decision

---

## Constraints

### Business

#### B1: No Manifold Data Loss During Compaction

Constraint and decision data persisted in `.manifold/` files must never be lost when conversation context is compacted. Manifold files are the persistent store of truth.

> **Rationale:** Context compaction is inevitable in long m0→m6 workflows. If manifold data only exists in conversation context, compaction destroys it silently. Current phases don't read from disk at start — they trust (degraded) context.

#### B2: Measurable Token Reduction

Total token consumption per complete m0→m6 workflow should decrease measurably compared to current baseline.

> **Rationale:** Lower token cost = faster execution, lower API cost, more context headroom for user's actual problem. Current skill files total 3,777 lines — significant overhead per phase invocation.

---

### Technical

#### T1: Phases Read Required State From Disk

Every phase command MUST read its required manifold state from `.manifold/<feature>.json` and `.manifold/<feature>.md` at execution start. Never rely solely on conversation context for manifold state.

> **Rationale:** Codebase analysis shows only m6-integrate currently reads from disk. All other phases trust conversation context, which degrades after compaction. This is the primary context rot vector.

#### T2: Phase Skill File ≤400 Lines

No individual phase skill file (m0-init.md through m6-integrate.md) may exceed 400 lines.

> **Rationale:** Current m4-generate.md is 1,044 lines — injected into context on every invocation. Oversized skill files consume tokens before the phase even starts. The 400-line boundary forces extraction of shared logic while preserving self-containment.

#### T3: Cross-Phase Transfer Via File References Only

Information produced by one phase and needed by a later phase must be read from manifold files, not repeated inline in conversation output.

> **Rationale:** Inline repetition (e.g., re-listing all constraints in m2 output) wastes tokens and creates stale copies. File references are always current.

#### T4: Shared Logic in Referenced Sections

Common patterns across phases (output formatting, manifold reading, validation) should be factored into reusable referenced modules.

> **Rationale:** Current phases duplicate patterns for output formatting, file reading, and validation. Shared modules reduce total skill file size and ensure consistency.

#### T5: Smart Delta Reads Per Phase

Each phase reads only the manifold sections it needs, not the entire manifold. Phase-specific read manifests define what's required.

> **Rationale:** m2-tension needs constraints but not verification results. m5-verify needs anchors but not tension resolution rationale. Reading everything wastes tokens.

**Smart delta map:**
| Phase | Reads from JSON | Reads from MD |
|-------|----------------|---------------|
| m1 | phase, constraints (empty) | outcome |
| m2 | constraints | constraint statements |
| m3 | constraints, tensions | tension descriptions |
| m4 | anchors, tensions | required truths, resolutions |
| m5 | full structure | full content |
| m6 | full structure | full content |

---

### User Experience

#### U1: Phase Output ≤50 Lines

Phase completion output to the user must not exceed 50 lines, including the next-step suggestion.

> **Rationale:** Long outputs are skimmed, not read. 50 lines fits comfortably in one terminal screen with room for the user's next command. Details belong in manifold files, not output.

#### U2: Visual Formatting Over Prose

Phase output should use tables, trees, status icons, and structured layouts rather than paragraph prose.

> **Rationale:** Visual patterns are scanned faster than paragraphs. A constraint table communicates more in fewer tokens than prose descriptions.

#### U3: Status→Next Pattern in ≤3 Lines

Every phase output must end with a compact "what happened → what's next" block in 3 lines or fewer.

> **Rationale:** Users need two things after any phase: confirmation it worked, and the next command. This should be instant to find, not buried in output.

---

### Security

#### S1: Compaction Data Loss Must Be Detectable

If context compaction causes manifold data to diverge from what's in `.manifold/` files, the divergence must be detectable — not silently accepted.

> **Rationale:** Silent data loss is worse than visible data loss. If phases read from disk (T1), this is naturally satisfied — disk state is authoritative. Detection matters for the transition period and edge cases.

---

### Operational

#### O1: Phases Re-Entrant After Compaction

Running a phase command after context compaction must produce correct results by reading state from manifold files on disk.

> **Rationale:** Users lose context after long sessions or browser refreshes. A phase that can't recover from compaction forces the user to restart the workflow. Re-entrancy from disk eliminates this failure mode.

#### O2: m-status Restores Working Context

`/manifold:m-status` must provide sufficient context from manifold files alone for the user (and the AI) to resume work without re-reading prior conversation.

> **Rationale:** m-status is the recovery entry point after compaction. Currently it provides a summary — it should provide enough detail that the next phase can execute correctly.

---

## Tensions

### TN1: Size Budget vs Disk-Read Boilerplate

**Type:** resource_tension | **Between:** T2 ↔ T1, O1 | **Status:** resolved

Adding context-refresh instructions to each phase (read manifold JSON, read manifold MD, validate state) consumes ~20-30 lines × 7 phases = 140-210 lines of duplicated boilerplate, eating into the ≤400-line budget.

> **Resolution:** Extract shared context-refresh logic into a **phase-commons CLI hook** that fires before each phase skill. Each phase gets manifold state injected automatically — zero boilerplate in the skill file.
> **TRIZ:** P10 (Prior action) — pre-load state before the phase starts.

### TN2: Output Brevity vs Context Restoration

**Type:** trade_off | **Between:** U1 ↔ O2 | **Status:** resolved

m-status needs to restore enough context for the AI to resume work after compaction. But full context (all constraints + tensions + anchors) may exceed the 50-line output cap.

> **Resolution:** m-status shows a compact summary table within 50 lines. The summary tells the AI which manifold files/sections to read for detail. Context restoration = summary + disk reads, not summary alone.
> **TRIZ:** P1 (Segmentation) — split context into summary (output) + detail (disk).
> **Propagation:** O2 TIGHTENED — summary must be specific enough to guide AI's disk reads.

### TN3: Shared Modules vs Platform Constraint

**Type:** hidden_dependency | **Between:** T4 ↔ T1 | **Status:** resolved

Claude Code skills load independently — no import/include mechanism exists. T4 (shared modules) cannot be satisfied by the skill system alone.

> **Resolution:** Implement **phase-commons as a CLI hook** (like existing setup hooks in `install/hooks/`). The hook fires before each phase skill, reads manifold state from disk, and injects shared patterns (context refresh, output formatting directives) into the conversation context.
> **TRIZ:** P15 (Dynamization) — use runtime injection (hooks) instead of compile-time imports.
> **Blocking:** TN3 resolution is a prerequisite for T4 and T1. Must be implemented first.

### TN4: File Size Cap vs m4-generate Completeness

**Type:** trade_off | **Between:** T2 ↔ B2 | **Status:** resolved

m4-generate.md is currently 1,044 lines — it covers artifact generation for code, tests, docs, runbooks, alerts, and dashboards. The ≤400-line boundary cannot accommodate all artifact types in one file.

> **Resolution:** Split m4-generate into a **core orchestrator** (≤400 lines) that reads the manifold and determines which artifacts to generate, plus **artifact-specific modules** (`m4-code.md`, `m4-tests.md`, `m4-ops.md`) loaded on demand via Read calls. Only the modules needed for the current generation are loaded.
> **TRIZ:** P1 (Segmentation) — break into independent, composable parts.

### TN5: File References vs Visual Scannability

**Type:** trade_off | **Between:** T3 ↔ U2 | **Status:** resolved

Pure file references (e.g., "see `.manifold/feature.md#B1`") aren't scannable. Users need some inline content to understand phase output at a glance. But inlining full constraint content wastes tokens.

> **Resolution:** Output includes **compact index tables** (ID + title columns) inline. Full statements, rationale, and detail remain in manifold files on disk. Pattern: "inline the index, offload the detail."
> **TRIZ:** P3 (Local quality) — different strategies per content type.
> **Propagation:** T3 TIGHTENED — allows minimal inline (IDs + titles in tables), but NOT full statements or rationale.

---

## Required Truths

### RT-1: Phase-Commons Hook Exists ★ BINDING CONSTRAINT

A `manifold hook phase-commons` CLI command exists and is registered as a `UserPromptSubmit` hook. It detects `/manifold:m*` commands, reads manifold state from disk via smart delta, and injects it into the conversation as a system-reminder.

**Maps to:** T1, T4, O1 | **Status:** NOT_SATISFIED

**Gap:** No such hook exists. Current hooks (`manifold hook context`, `manifold hook schema-guard`, `manifold hook prompt-enforcer`) don't provide pre-phase context injection.

**Convention:** Follows existing `manifold hook <name>` CLI pattern. Implemented as a CLI subcommand in `cli/commands/hook/`, invoked via hooks.json.

**Sub-truths:**
- RT-1.1: Hook detects `/manifold:m*` commands in UserPromptSubmit event
- RT-1.2: Hook reads manifold state via smart delta (phase→sections map from T5)
- RT-1.3: Hook injects state as system-reminder before skill loads

### RT-2: All Phase Files ≤400 Lines

Every phase skill file (m0-init.md through m6-integrate.md) fits within the 400-line boundary after extracting shared logic to the phase-commons hook and splitting oversized phases.

**Maps to:** T2, B2 | **Status:** NOT_SATISFIED

**Gap:** 4 of 7 files exceed 400 lines: m4 (1,044), m5 (628), m2 (593), m1 (557). m3 (449) is borderline.

**Sub-truths:**
- RT-2.1: Shared patterns (output format, validation, next-step) extracted to hook (depends on RT-1)
- RT-2.2: m4-generate split into core (≤400) + artifact modules (m4-code.md, m4-tests.md, m4-ops.md)
- RT-2.3: Phase content condensed without losing critical phase-specific instructions

### RT-3: Manifold Files = Sole Persistent Store

All phase-produced state is written to `.manifold/` files. No decision or constraint data exists only in conversation context.

**Maps to:** B1, S1 | **Status:** PARTIAL

**Gap:** PreCompact hook (`manifold hook context`) already preserves summary during compaction (RT-3.2 SATISFIED). But phases don't always write all outputs to disk before displaying.

**Sub-truths:**
- RT-3.1: Every phase writes its outputs to .manifold/ files before displaying to user
- RT-3.2: PreCompact hook preserves state during compaction ✓ SATISFIED

### RT-4: Visual Output Template System

A consistent output format exists that all phases follow: table-based summaries, ≤50-line cap, status→next footer.

**Maps to:** U1, U2, U3 | **Status:** NOT_SATISFIED

**Gap:** No template — each phase formats ad hoc. Output conventions documented in phase-commons hook (injected before each phase).

**Sub-truths:**
- RT-4.1: Table-based constraint/tension/RT summaries (ID + title columns)
- RT-4.2: ≤50-line cap enforced per phase output
- RT-4.3: "status → next" footer in ≤3 lines

### RT-5: m-status Restores Full Working Context

`/manifold:m-status` reads all manifold files and produces a compact summary that tells the AI exactly which files/sections to read for detail.

**Maps to:** O2 | **Status:** PARTIAL

**Gap:** Current m-status shows summary but doesn't guide AI to read specific manifold sections for detail.

**Sub-truths:**
- RT-5.1: m-status reads all manifold files, produces compact state summary
- RT-5.2: Summary includes "read these files/sections for detail" directives

### RT-6: Output References by ID, Not Inline

Phase output uses compact index tables (ID + title) for cross-referencing. Full content stays in manifold files.

**Maps to:** T3 | **Status:** PARTIAL

**Gap:** Some phases already do this. Convention needs to be formalized in output template (RT-4).

---

## Solution Space

### Option A: Hook-First, Incremental Refactor ← SELECTED

**Reversibility:** TWO_WAY

**Execution order:**
1. Build `manifold hook phase-commons` CLI command (RT-1) ★ binding
2. Register as UserPromptSubmit hook in hooks.json
3. Define output template conventions in phase-commons (RT-4)
4. Refactor phases largest-first: m4→m2→m1→m3→m5→m0→m6 (RT-2)
5. Update m-status for context restoration (RT-5)

**Tension validation:** All 5 tensions CONFIRMED by this option.

### Option B: Parallel Refactor

Build hook + refactor all 7 phases simultaneously via parallel worktrees. Faster but merge conflict risk.

**Reversibility:** TWO_WAY

### Option C: Convention-Only (No Hook)

Add read/format instructions inline to each skill file. Simpler but T4 unsatisfied, ~25 lines duplicated per phase.

**Reversibility:** TWO_WAY
