# manifold-enhancements

## Outcome

Integrate 8 structured enhancements + non-software domain support into Manifold's constraint workflow. All enhancements are backward-compatible, require no new phases, and add no runtime dependencies. The framework gains: pre-mortem stress-testing (m1), constraint genealogy (m1), TRIZ contradiction resolution (m2), directional propagation (m2), recursive backward chaining (m3), ToC bottleneck identification (m3), reversibility tagging (m4), probabilistic constraint bounds (m1/m5), and a non-software domain translation layer.

---

## Constraints

### Business

#### B1: Phase Count Unchanged

Phase count must remain unchanged — 7 phases (m0-m6), no additions.

> **Rationale:** Phase stability is the framework's API contract. Adding phases breaks all existing documentation, user muscle memory, and agent command translations (Gemini, Codex). Enhancements must enrich existing phases, not create new ones.

#### B2: TRIZ Tier C Not Surfaced in Non-Engineering

TRIZ Tier C principles (P18, P29-P33, P36-P39) must not be surfaced in non-engineering contexts — no forced metaphors.

> **Rationale:** Tier C principles have "no strong abstract analog" per the TRIZ reference. Forcing them into non-software contexts would produce confusing, misleading resolution suggestions that erode user trust.

#### B3: Natural Integration Feel

Pre-mortem and TRIZ integrations should feel like natural parts of their phases, not bolt-ons — the interview flow should not feel longer, just more structured.

> **Rationale:** If enhancements make the workflow feel heavier, users will skip phases or abandon the framework. The value proposition is better decisions, not more ceremony.

### Technical

#### T1: Software Workflow Backward-Compatible

Software workflow must be fully backward-compatible — no breaking changes to existing manifold file formats or command interfaces.

> **Rationale:** Existing users and CI pipelines depend on current schema. Breaking changes require migration tooling, versioned documentation, and coordinated rollout — none of which is in scope.

#### T2: Existing Manifold Files Continue to Validate

Existing `.manifold/*.json` and `.manifold/*.yaml` files must continue to validate — all new fields are additive.

> **Rationale:** The CLI validation pipeline (`manifold validate`) is the quality gate. If existing manifolds fail validation after the update, it blocks all ongoing feature work across every project using Manifold.

#### T3: Domain Flag Defaults to Software

`--domain` flag must default to `software` — all existing usage unchanged.

> **Rationale:** Zero-change default ensures the 100% of current users who don't need non-software mode are never impacted. Explicit opt-in prevents accidental category remapping.

#### T4: No New Runtime Dependencies

All functionality is prompt-based — no new runtime dependencies in the CLI or plugin.

> **Rationale:** Manifold's distribution model (Claude Code plugin + standalone CLI) requires zero external dependencies beyond Bun. Adding runtime deps would complicate installation and break the single-binary CLI distribution.

#### T5: New Files Fit Existing Directory Structure

New files fit within existing directory structure: `docs/triz-principles.md`, `docs/non-programming/guide.md`, `docs/m4-generate-nonsoftware.md` — no new top-level directories.

> **Rationale:** Directory structure is documented in CLAUDE.md and enforced by convention. New top-level dirs require updating all agent translations, sync scripts, and developer onboarding docs.

#### T6: Schema Additions Must Be Zod-Compatible

All new JSON schema fields must have corresponding Zod types in `cli/lib/structure-schema.ts` and pass the JSON Schema at `install/manifold-structure.schema.json`.

> **Rationale:** Dual schema validation (Zod runtime + JSON Schema IDE) is how Manifold catches malformed manifolds. Fields without Zod types bypass runtime validation; fields missing from JSON Schema lose IDE autocompletion.

### User Experience

#### U1: Non-Software Operable Without Dev Background

Non-software workflow operable without software background — vocabulary test: no jargon requiring a developer to interpret.

> **Rationale:** The non-software domain is explicitly targeting non-developers (PMs, strategists, founders). Software jargon in universal categories defeats the purpose of the translation layer.

#### U2: Genealogy Adds Signal Without Friction

Constraint genealogy adds signal without friction — source defaults to `interview`, challenger flagged only when it changes resolution direction.

> **Rationale:** If every constraint requires manual source/challenger classification, the interview becomes a form-filling exercise. Smart defaults (source: interview, challenger: inferred) keep the flow conversational.

#### U3: Probabilistic Bounds Only on Metric Constraints

Probabilistic bounds prompt only fires on metric-based constraints — not on qualitative constraints.

> **Rationale:** Asking "what percentile?" for "code should be readable" is nonsensical. The probabilistic prompt must detect measurable thresholds (latency, cost, rate) and skip qualitative statements.

#### U4: Recursive Chaining Depth Default is Reasonable

Recursive backward chaining defaults to depth 2 with max 4, and surfaces clear warnings when max depth is reached without resolution.

> **Rationale:** Depth 1 is current behavior. Depth 2 catches most second-order gaps. Depth 4 is the practical limit before the output tree becomes unwieldy. Unbounded recursion would generate noise.

#### U5: TRIZ Suggestions Must Be Actionable or Omitted

When a tension's parameter pair has no close match in the TRIZ lookup table, the system must say "no strong TRIZ mapping — resolve via direct analysis" rather than forcing a weak match. Approximate matches must be labeled as such with the approximation distance noted.

> **Rationale:** (source: pre-mortem) TRIZ adds value only when the principle-to-domain mapping is strong. Weak mappings produce suggestions that sound authoritative but mislead. Users spend time decoding principle names instead of resolving tensions. A bad TRIZ suggestion is worse than no TRIZ suggestion — it wastes resolution effort on the wrong framing.

### Security

#### S1: Schema Migration Must Not Corrupt Existing Data

Adding new fields to the constraint schema (source, challenger, threshold, reversibility_log, propagation_effects, binding_constraint, children) must never cause existing manifold data to be lost, overwritten, or silently dropped during any CLI operation.

> **Rationale:** Manifold files represent accumulated design decisions. Data corruption in a manifold is equivalent to losing the architectural rationale for a feature — it cannot be reconstructed.

### Operational

#### O1: Diff Guard CI Must Pass After Changes

All changes must pass the Diff Guard workflow — agent command translations (Gemini/Codex), parallel bundle, and plugin sync must be regenerated and committed.

> **Rationale:** The Diff Guard is the canonical-source enforcement mechanism. Changes to command files that skip the build step will block all PRs.

#### O2: Test Coverage for New Schema Fields

New schema fields (source, challenger, threshold, etc.) must have validation tests in the CLI test suite.

> **Rationale:** Schema fields without tests can drift from their Zod definitions undetected. The 315-test suite is the regression safety net — new fields need test coverage proportional to their complexity.

#### O3: Implementation Order Respects Dependencies

Enhancements must be implemented in dependency order (genealogy → probabilistic → pre-mortem → TRIZ → propagation → reversibility → recursive chaining → ToC → non-software domain).

> **Rationale:** The enhancements have explicit dependencies: pre-mortem reads source tags (Enhancement 2), TRIZ reads challenger tags (Enhancement 2), propagation builds on TRIZ (Enhancement 3), ToC needs the truth tree (Enhancement 7). Out-of-order implementation creates integration failures.

---

## Tensions

### TN1: Schema Richness vs. Natural Feel

Adding 7 new optional JSON fields (source, challenger, threshold, reversibility_log, propagation_effects, binding_constraint, children) satisfies T6's schema completeness requirement but risks violating B3's natural integration feel — manifold files become visually heavier.

> **Resolution:** Option A — All new fields optional in Zod with smart defaults. CLI only shows populated fields in output. AI prompts populate fields behind the scenes (source defaults to `interview`, challenger inferred from context). The schema grows but individual manifold files stay lean — users only see what's relevant to their feature.

### TN2: Interview Depth vs. Interview Length

Pre-mortem (Enhancement 1), genealogy tagging (Enhancement 2), and probabilistic bounds (Enhancement 6) each add sub-steps to the m1-constrain interview. Together they risk making the phase feel longer, conflicting with B3's natural feel goal.

> **Resolution:** Accept the design as-is — the mechanisms already partition the additions rather than stacking them. Pre-mortem runs *after* elicitation closes (coda, not inline). Genealogy uses smart defaults (U2 — no manual classification). Probabilistic bounds only fire on metric constraints (U3 — most constraints skipped). The interview gains structure, not length.

### TN3: Universal Categories vs. Software Schema

Non-software mode (U1) needs universal categories (Obligations, Desires, Resources, Risks, Dependencies) that replace the current software categories (Business, Technical, UX, Security, Operational). But T1 and T2 (both invariants) mandate no breaking changes to existing file formats.

> **Resolution:** The `--domain` flag gates which category set is used. Software mode (default, per T3) uses current categories unchanged. Non-software mode uses universal categories. Both coexist in the schema — universal categories map to the same JSON structure with different labels. No existing file is affected because the flag defaults to `software`.

### TN4: Sequential Safety vs. Development Speed

O3 requires strict dependency order (9 sequential steps). But some enhancements share no schema overlap and could be parallelized. Strict sequencing is safe but slow; parallelism is faster but risks integration conflicts.

> **Resolution:** Option B — Parallel within dependency tiers. Tier 1: genealogy + probabilistic bounds (independent schema extensions, parallel). Tier 2: pre-mortem + TRIZ (both read genealogy fields, parallel with each other). Tier 3: propagation + reversibility (different phases, parallel). Tier 4: recursive chaining → ToC (sequential — ToC reads the truth tree). Tier 5: non-software domain (depends on all). Estimated ~40% faster than strict sequential with controlled integration risk.

### TN5: TRIZ Coverage vs. Output Quality

B2 gates Tier C principles in non-engineering, but U5 (from pre-mortem) goes further — demanding that *any* weak TRIZ match in *any* context be omitted rather than forced. The tension is between systematic TRIZ coverage (Enhancement 3's goal of principle-guided resolution) and output quality (U5's insistence that bad suggestions are worse than none).

> **Resolution:** U5 subsumes B2. B2 remains as the hard gate for Tier C in non-engineering (invariant — never violated). U5 extends the quality bar to Tier A/B principles as well: if the parameter pair match is approximate, label the approximation distance; if no reasonable match exists, fall back to "resolve via direct analysis." TRIZ becomes a best-effort enhancement, not a mandatory step — it fires when useful and stays silent when not.

---

## Required Truths

*Backward reasoning: "For all 8 enhancements + non-software domain to work, what MUST be true?"*

### Tier 1: Schema Foundation (Enhancement 2 + Enhancement 6)

### RT-1: Constraint Schema Accepts Optional Genealogy Fields

`structure-schema.ts` ConstraintRefSchema must accept optional `source` and `challenger` string fields. Existing manifolds without these fields must continue to validate unchanged.

**Gap:** ConstraintRefSchema currently has only `id` and `type`. No `source` or `challenger` fields exist.
**Maps to:** T6 (Zod-compatible), T2 (existing files validate), S1 (no data corruption)

### RT-2: Genealogy Smart Defaults Are Populated by AI Prompts

m1-constrain prompt instructions must set `source: interview` by default and infer `challenger` from constraint content. Users never manually fill these fields unless overriding.

**Gap:** m1-constrain has no genealogy tagging instructions. No smart default logic exists.
**Maps to:** T6 (schema fields used), U2 (signal without friction)

### RT-3: Constraint Schema Accepts Optional Threshold Object

ConstraintRefSchema must accept an optional `threshold` object with `kind` (deterministic | statistical) and type-specific sub-fields (ceiling, p99, p50, failure_rate, window).

**Gap:** No threshold field exists in the constraint schema. All constraints are implicitly deterministic.
**Maps to:** T6 (Zod-compatible), U3 (metric-only firing)

### Tier 2: Phase Prompt Enrichments (Enhancement 1 + Enhancement 3)

### RT-4: Pre-mortem Section Exists in m1-constrain Prompt

`install/commands/manifold:m1-constrain.md` must contain a pre-mortem pass section that runs after elicitation closes, requests three failure stories, and tags new constraints with `source: pre-mortem`.

**Gap:** No pre-mortem section exists in the current m1-constrain prompt.
**Maps to:** B3 (natural feel — runs as coda, not inline), U2 (uses source tagging from RT-1)

### RT-5: TRIZ Principles Reference Document Exists

`docs/triz-principles.md` must contain all 40 TRIZ principles with tier ratings (A/B/C), plain-language definitions, software application notes, and life/strategy application notes.

**Gap:** File does not exist. The enhancements doc specifies 565 lines of content.
**Maps to:** T5 (fits existing directory), B2 (Tier C marked), U5 (tier ratings enable quality gating)

### RT-6: TRIZ Classification Step Exists in m2-tension Prompt

`install/commands/manifold:m2-tension.md` must contain a TRIZ classification step between detection and resolution: classify as Technical/Physical contradiction, map to parameter pairs, surface top 2-3 principles per tension with quality gate (U5).

**Gap:** No TRIZ section exists in the current m2-tension prompt. Tension resolution is currently ad-hoc.
**Maps to:** B3 (structured, not bolt-on), U5 (weak matches omitted)

### Tier 3: Cross-Phase Mechanics (Enhancement 8 + Enhancement 4)

### RT-7: Propagation Effects Schema Field Exists in Tensions

Tension schema must accept an optional `propagation_effects` array where each entry has `constraint_id`, `effect` (TIGHTENED | LOOSENED | VIOLATED), and `note`.

**Gap:** TensionSchema has no `propagation_effects` field. Resolution effects are not tracked.
**Maps to:** T6 (Zod-compatible)

### RT-8: Reversibility Taxonomy Integrated into m4-generate

`install/commands/manifold:m4-generate.md` must include reversibility tagging (TWO_WAY | REVERSIBLE_WITH_COST | ONE_WAY) for each action step, with ONE_WAY steps grouped for explicit acknowledgment.

**Gap:** No reversibility section exists in m4-generate. No `reversibility_log` in schema.
**Maps to:** B3 (surfaces decision weight naturally), U4 (reasonable defaults)

### RT-9: Propagation Check Section Exists in m2-tension Prompt

`install/commands/manifold:m2-tension.md` must contain a propagation check after each tension resolution: list affected constraints, classify as TIGHTENED/LOOSENED/VIOLATED, block VIOLATED resolutions.

**Gap:** No propagation check exists. Tensions are resolved in isolation.
**Maps to:** T6 (propagation_effects field used)

### RT-10: Reversibility Log Schema Field Exists

ManifoldStructureSchema must accept an optional `reversibility_log` array where each entry has `action_step`, `description`, `reversibility`, and optional `one_way_consequence`.

**Gap:** No reversibility_log field exists in the schema.
**Maps to:** T6 (Zod-compatible)

### Tier 4: Recursive Reasoning (Enhancement 7 + Enhancement 5)

### RT-11: m0-init Accepts --domain Flag

`install/commands/manifold:m0-init.md` must accept `--domain=software|non-software` flag defaulting to `software`. Non-software mode activates universal categories in m1 and alternate artifacts in m4.

**Gap:** No --domain flag exists in m0-init.
**Maps to:** U1 (non-software operable), T3 (defaults to software)

### RT-12: Non-Software Artifact Templates Exist

`docs/m4-generate-nonsoftware.md` must define artifact templates for: decision brief, scenario stress-tests, narrative guide, recovery playbook, risk watch list.

**Gap:** File does not exist. The enhancements doc specifies 366 lines of content.
**Maps to:** U1 (non-software artifacts), T5 (fits existing directory)

### RT-13: Existing Manifolds Validate After All Schema Changes

After all new optional fields are added (source, challenger, threshold, propagation_effects, reversibility_log, binding_constraint, children), every existing `.manifold/*.json` file in the repo must pass `manifold validate` unchanged.

**Gap:** None — this is a regression gate, not a build task. Currently SATISFIED by definition (no changes made yet). Becomes the critical check after each schema modification.
**Maps to:** T2 (existing files validate), S1 (no data corruption)

### RT-14: Validation Tests Cover All New Schema Fields

CLI test suite must include tests for: source/challenger on constraints, threshold object variants (deterministic/statistical), propagation_effects on tensions, reversibility_log, binding_constraint, children on required truths.

**Gap:** No tests exist for any of these fields. 315 existing tests cover current schema only.
**Maps to:** O2 (test coverage), T6 (Zod types validated)

### RT-15: Diff Guard Passes After All Command File Changes

After modifying m0-init, m1-constrain, m2-tension, m3-anchor, m4-generate, m5-verify prompt files, all agent translations (Gemini/Codex) and plugin sync must be regenerated.

**Gap:** Build pipeline exists and works. Gap is operational — must remember to run builds after each tier.
**Maps to:** O1 (Diff Guard passes)

---

## Solution Space

### Option A: Tier-Parallel Prompt-First Implementation (Recommended)

Implement in 5 tiers per TN4 resolution. Within each tier, start with prompt changes (command .md files), then schema changes (structure-schema.ts + JSON Schema), then tests. Each tier merged and validated before the next begins.

- **Satisfies:** All 15 required truths
- **Approach:** Prompt-first means the AI behavior changes are usable immediately; schema fields formalize what the prompts already produce
- **Risk:** Low — prompt changes are additive, schema fields are optional
- **Tier plan:**
  - Tier 1: RT-1, RT-2, RT-3 (genealogy + probabilistic schema)
  - Tier 2: RT-4, RT-5, RT-6 (pre-mortem + TRIZ prompts)
  - Tier 3: RT-7, RT-8, RT-9, RT-10 (propagation + reversibility)
  - Tier 4: RT-11, RT-12 (non-software domain)
  - Cross-cutting: RT-13, RT-14, RT-15 (validation gates — run after each tier)
