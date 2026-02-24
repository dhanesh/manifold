# docs-production-ready

## Outcome

Documentation is production-ready: new developers can install Manifold, understand its value, and use all major features within 30 minutes. Every capability that exists in code is accurately represented in docs. Adoption friction is minimized through clear quickstart paths, complete reference material, and troubleshooting guidance.

---

## Constraints

### Business

#### B1: Code-to-Doc Parity

Every user-facing feature that exists in code MUST have corresponding documentation. No capability should be discoverable only through source code reading.

> **Rationale:** Undocumented features effectively don't exist for users. The gap analysis found 9 CLI commands but only 4 documented in README, plus major subsystems (evidence, solver, graph viz) with 0-20% doc coverage. This is the single biggest adoption blocker.

#### B2: 30-Minute Time-to-Value

A new developer should be able to install Manifold, run a complete workflow (init through verify), and understand the value proposition within 30 minutes.

> **Rationale:** Developer tools that can't demonstrate value quickly get abandoned. The current walkthrough exists but references YAML format (not current JSON+MD default), and the README quickstart lacks expected output examples.

#### B3: Multi-Audience Accessibility

Documentation must serve three distinct audiences: developers (primary), product managers, and non-programming users — each with appropriate entry points and language.

> **Rationale:** PM templates and non-programming guides already exist in code (13 PM templates, 5 scenario docs), but cross-linking from README is minimal. Users of these audiences can't find their entry points.

#### B4: Release-Ready Completeness

Documentation must be complete enough to accompany a public release announcement without caveats about "see source code for details."

> **Rationale:** The 2.24.0 release includes features (multi-agent support, parallel execution, evidence system) that are production-ready in code but would embarrass a release announcement due to missing docs.

### Technical

#### T1: Documentation Accuracy

All code examples, command syntax, flag names, and output examples in docs MUST match current implementation. No stale examples.

> **Rationale:** The walkthrough still references `.yaml` files when JSON+MD is the default since schema v3. The README CLI section shows 4 commands when 9 exist. `tension.status` shows `detected, resolved, accepted` but code uses `resolved, unresolved`. Stale docs are worse than no docs.

#### T2: Schema Consistency

All documentation must use consistent terminology matching the Zod schemas in `cli/lib/schema.ts` and `cli/lib/structure-schema.ts`.

> **Rationale:** Field name confusion (`statement` vs `description`) was a known problem that JSON+MD hybrid solved. Docs must not reintroduce this confusion.

#### T3: CLI Reference Completeness

Every CLI command must document: purpose, syntax, all flags with types and defaults, exit codes, and at least one example with expected output.

> **Rationale:** Five commands are completely undocumented (`graph`, `show`, `completion`, `migrate`, `solve`). Documented commands (`status`, `validate`, `verify`) are missing flags like `--history`, `--graph`, `--conflicts`, `--cross-feature`, `--artifacts`, `--verify-evidence`.

#### T4: Runnable Examples

Every code example in documentation must be copy-pasteable and produce the documented output (or close to it) when run against the example manifolds.

> **Rationale:** Non-runnable examples waste time and destroy trust. The `examples/` directory exists but isn't linked from docs.

#### T5: Template Documentation Coverage

All 15 core templates and 13 PM templates must have: purpose description, constraint list, when-to-use guidance, and at least one usage example.

> **Rationale:** Templates are a major adoption accelerator. `install/templates/README.md` exists but PM template README coverage is uneven, and the main README only lists 4 of the 15+ templates.

### User Experience

#### U1: Progressive Disclosure

Documentation must support progressive learning: quickstart (5 min) → walkthrough (30 min) → reference (as needed) → advanced topics (deep dives). No single doc should require reading all other docs first.

> **Rationale:** Current docs are somewhat flat — the README tries to cover everything (579 lines) but lacks clear learning paths. A new user doesn't know whether to start with README, walkthrough, or glossary.

#### U2: Discoverable Navigation

Every doc page must have: a clear title, a "what you'll learn" summary, links to prerequisites, and links to next steps. Users must never reach a dead end.

> **Rationale:** Current docs have inconsistent navigation. Some docs link forward (walkthrough → glossary), most don't link back. The GLOSSARY has no link to the walkthrough. The parallel-agents README doesn't link to the m-solve command.

#### U3: Error Recovery Guidance

Documentation must include a troubleshooting section covering: common validation errors, schema migration issues, phase transition problems, and "how do I undo" scenarios.

> **Rationale:** Currently 0% coverage. When `manifold validate` fails with exit code 2, there's no guidance on how to fix the specific errors. When a manifold gets stuck in a phase, there's no documented recovery path.

#### U4: Visual Learning Support

Complex concepts (constraint graph, phase flow, parallel execution, backward reasoning) must include diagrams — either Mermaid, ASCII art, or both.

> **Rationale:** The README has a good ASCII phase flow diagram but nothing for constraint graphs, parallel execution architecture, or the evidence verification pipeline. The `graph` and `show` commands produce visualizations, but users don't know they exist.

#### U5: Consistent Example Feature

All documentation examples should use a consistent example feature (like "notification-preferences" from the walkthrough) so users can follow a coherent narrative across docs.

> **Rationale:** Current docs use different examples: README uses "payment-retry", walkthrough uses "notification-preferences", CLAUDE.md uses both. This cognitive context-switching slows learning.

### Security

#### S1: No Secrets in Examples

Documentation examples must never include real API keys, tokens, credentials, or internal URLs. All examples must use obvious placeholder values.

> **Rationale:** Standard practice. The install script curl commands use real GitHub URLs (expected), but any future API integration examples must use placeholders.

#### S2: Secure Installation Guidance

Install instructions must document: what files are created, what permissions are needed, what the uninstall process removes, and verification steps.

> **Rationale:** The install script pipes curl to bash — users need confidence about what it does. Current install docs don't explain what gets written where. The uninstall docs exist but lack detail about what's removed.

### Operational

#### O1: Documentation Drift Detection

There must be a mechanism to detect when code changes make documentation stale. Preferably automated (CI check) or at minimum a documented review process.

> **Rationale:** The diff-guard workflow checks plugin sync but not documentation accuracy. When a new flag is added to a CLI command, nothing alerts that README is now outdated. This is how docs got 60% stale.

#### O2: Contribution-Friendly Structure

Documentation must be organized so that external contributors can add or update docs without understanding the entire structure. Each doc should be self-contained with clear scope.

> **Rationale:** Contributing section in README is minimal (3 lines about conventional commits). No CONTRIBUTING.md explaining doc structure, style guide, or review process.

#### O3: Single Source of Truth

Each piece of information must live in exactly one place, with other locations linking to it. No copy-paste duplication between README, CLAUDE.md, and individual doc files.

> **Rationale:** The constraint type table appears in README, CLAUDE.md, GLOSSARY, and SCHEMA_REFERENCE. Schema valid values appear in 4 places. When one is updated, others become stale.

---

## Tensions

### TN1: Completeness vs Approachability

B1 (Code-to-Doc Parity) demands documenting everything — all 9 CLI commands, 20+ flags, evidence system, solver algorithms. B2 (30-Minute Time-to-Value) demands newcomers get value fast. Comprehensive reference overwhelms newcomers; slim quickstart hides power features.

> **Resolution:** Layered documentation architecture: thin README (~300 lines) → quickstart guide → full CLI reference → deep dives. README stays concise, completeness lives in separate reference docs. Aligns with U1 (Progressive Disclosure).

### TN2: CLI Reference Depth vs Single Source of Truth

T3 (CLI Reference Completeness) requires full flag documentation for 9 commands. O3 (Single Source of Truth) says info lives in one place. Currently CLI info is duplicated in README, CLAUDE.md, and command --help. Full CLI docs in README bloats it (violating B2).

> **Resolution:** Create `docs/cli-reference.md` as the canonical CLI reference. README and CLAUDE.md contain a summary table linking to it.

### TN3: Consistent Examples vs Multi-Audience Accessibility

U5 (Consistent Example) wants one example feature throughout docs. B3 (Multi-Audience) needs developer, PM, and non-programming examples. "notification-preferences" is meaningless to PMs and non-programmers.

> **Resolution:** One primary example per audience track: developers use "notification-preferences", PMs use "mobile-checkout", non-programming uses "career-decision". Each track is internally consistent while speaking the right language.

### TN4: Documentation Accuracy vs Release Urgency

T1 (Accuracy) requires verified examples matching current code. B4 (Release-Ready) demands completeness. Documenting 5 undocumented features with verified examples is resource-intensive. Rushing risks inaccuracies.

> **Resolution:** Prioritized waves — high-impact features first (CLI reference, evidence system) with verified examples. Lower-impact (shell completion, graph export deep-dives) follows. Ship wave 1 for release. 80% docs at 100% accuracy beats 100% docs at 80% accuracy.

### TN5: Drift Detection vs Contribution Friendliness

O1 (Drift Detection) wants CI to catch stale docs. O2 (Contribution-Friendly) wants easy contribution. Strict CI (fail on missing flag docs) blocks code-only PRs. Loose CI lets docs drift again. O1 requires a doc-code mapping that depends on O2's structure being clear first.

> **Resolution:** Warning-level drift detection (CI warns, doesn't fail) + PR template checklist. Escalate to fail-level once doc structure stabilizes. Creates mechanism (satisfying O1) without blocking contributors (supporting O2).

### TN6: Visual Diagrams vs Maintenance Burden

U4 (Visual Learning) wants diagrams for complex concepts. O1 (Drift Detection) can't lint images for staleness. Diagrams go stale faster than text.

> **Resolution:** Mermaid-in-Markdown only — text-based, greppable, diffable. Leverage existing CLI `--mermaid` output (from `graph`, `show`, `status` commands) as source of truth. No image files. Diagrams can eventually auto-generate from the same code path.

---

## Required Truths

### RT-1: Layered Information Architecture Exists

A clear doc hierarchy must exist: README (overview, 5 min) → Quickstart (hands-on, 15 min) → Walkthrough (deep, 30 min) → Reference docs (as-needed) → Advanced topics (deep dives). Each layer must link to the next without overlap.

**Maps to:** B2, U1, U2, TN1
**Current status:** NOT_SATISFIED — README is 578 lines trying to be everything. No `docs/quickstart.md` exists. Walkthrough exists but uses stale YAML format. No reference layer. Navigation between docs is inconsistent.
**Gap:** Need to restructure README (slim to ~300 lines), create quickstart, update walkthrough to JSON+MD, create reference layer.

### RT-2: Complete CLI Reference Document Exists

A single `docs/cli-reference.md` must document all 9 CLI commands with: purpose, full syntax, every flag (with types and defaults), exit codes, and at least one verified example each.

**Maps to:** T3, O3, TN2
**Current status:** NOT_SATISFIED — No `docs/cli-reference.md` exists. README documents 4 of 9 commands. Five commands (`graph`, `show`, `completion`, `migrate`, `solve`) are completely undocumented. Documented commands are missing 20+ flags.
**Gap:** Create the full reference from scratch. Source data exists in CLI command source files (`cli/commands/*.ts`).

### RT-3: Evidence System Is Documented

Users must understand: what evidence types exist (5 types), how to attach evidence to constraints, how verification works, and how to check staleness. This is a core v3 feature that's invisible.

**Maps to:** B1, B4
**Current status:** NOT_SATISFIED — `cli/lib/evidence.ts` (357 LOC) is fully implemented. m5-verify skill mentions evidence. No standalone user documentation exists. Users cannot discover or use the evidence system.
**Gap:** Create evidence system guide explaining types, workflow, and CLI flags (`--verify-evidence`, `--run-tests`).

### RT-4: Walkthrough Uses Current Default Format

The practical walkthrough (`docs/walkthrough/README.md`) must use JSON+MD hybrid format (current default) with accurate command output, so new users learn the format they'll actually use.

**Maps to:** T1, T2, U5
**Current status:** NOT_SATISFIED — Walkthrough references `.yaml` files throughout (e.g., "Created: `.manifold/notification-preferences.yaml`"). Since schema v3, JSON+MD is the default. Users following the walkthrough will be confused when their output doesn't match.
**Gap:** Update walkthrough to use JSON+MD format, update all output examples.

### RT-5: README Is Restructured as Entry Point

README must serve as a concise entry point (~300 lines) that: explains the value prop, shows install, gives a taste of the workflow, and links to deeper docs. It must NOT be a comprehensive reference.

**Maps to:** B2, U1, TN1
**Current status:** PARTIAL — README exists at 578 lines, has good content, but tries to cover everything. The Ralph integration section (75 lines), full schema docs, and detailed CLI section should move to dedicated pages. Navigation to deeper docs is present but inconsistent.
**Gap:** Restructure: trim to ~300 lines, move detailed sections to their own docs, add clear "Learning Path" section at top.

### RT-6: Stale Information Is Corrected

All currently inaccurate information across existing docs must be fixed: wrong tension statuses, missing CLI commands, YAML-default references, incorrect valid values tables.

**Maps to:** T1, T2
**Current status:** NOT_SATISFIED — Known inaccuracies: README `tension.status` shows `detected, resolved, accepted` (should be `resolved, unresolved`). README CLI section shows 4 commands (should be 9). GLOSSARY says manifold is "a single YAML file" (should mention JSON+MD). Walkthrough uses YAML format.
**Gap:** Systematic audit and correction pass across all 17 existing doc files.

### RT-7: Installation Is Transparent and Verifiable

Install docs must explain: what the install script creates, where files go, what permissions are needed, how to verify installation succeeded, and exactly what uninstall removes.

**Maps to:** S2, B2
**Current status:** PARTIAL — Install command exists in README. Binary download instructions exist. Missing: what-gets-installed manifest, verification steps (`manifold --version`), permission requirements, detailed uninstall inventory.
**Gap:** Expand install section with transparency details.

### RT-8: Troubleshooting Guide Exists

A `docs/troubleshooting.md` must cover: common validation errors with fixes, schema migration issues, phase transition problems, "how do I undo/reset" scenarios, and format detection issues.

**Maps to:** U3
**Current status:** NOT_SATISFIED — 0% coverage. No troubleshooting documentation exists anywhere. When users hit `exit code 2` from validate, they have no guidance.
**Gap:** Create from scratch. Source common errors from the validation logic in `cli/commands/validate.ts` and `cli/lib/schema.ts`.

### RT-9: Template Catalog Is Complete and Navigable

All 28 templates (15 core + 13 PM) must be discoverable from the main docs with: when-to-use guidance, constraint counts, and links to detailed template docs.

**Maps to:** T5, B3
**Current status:** PARTIAL — `install/templates/README.md` exists with a good table of all templates. README mentions 4 templates. PM templates have a separate README. But: main README doesn't link to the full template catalog effectively, and the "when to use which template" decision tree is missing.
**Gap:** Add template decision tree, improve cross-linking from README.

### RT-10: Audience Entry Points Are Clear

README must have a visible "Start Here" section that routes users to the right path: developers → quickstart, PMs → PM guide, non-programmers → non-programming guide.

**Maps to:** B3, U2, TN3
**Current status:** PARTIAL — PM and non-programming sections exist in README but are buried at lines 500+. No prominent routing section at the top.
**Gap:** Add "Who is this for?" routing section near top of README.

### RT-11: Mermaid Diagrams Illustrate Key Concepts

At minimum, diagrams must exist for: (1) phase progression flow, (2) constraint graph example, (3) parallel execution architecture. All in Mermaid format.

**Maps to:** U4, TN6
**Current status:** PARTIAL — README has ASCII phase flow diagram. No Mermaid constraint graph example. No parallel execution architecture diagram. The CLI generates Mermaid but docs don't show output or explain usage.
**Gap:** Add Mermaid diagrams to key docs. Can generate from existing CLI commands.

### RT-12: Contribution Guide Exists

A `CONTRIBUTING.md` must explain: doc structure map, style guide, how to add/update docs, PR process, and the drift detection mechanism.

**Maps to:** O2, TN5
**Current status:** NOT_SATISFIED — No CONTRIBUTING.md exists. README has 3 lines about conventional commits. No PR template. No doc style guide.
**Gap:** Create CONTRIBUTING.md with doc structure map and contributor workflow.

---

## Solution Space

### Option A: Full Restructure + New Docs (Recommended)

Create the complete layered architecture from scratch:

**Wave 1 — Critical Path (release-blocking)**
1. Restructure README to ~300 lines entry point (RT-5, RT-10)
2. Create `docs/quickstart.md` — 5-minute install-to-value guide (RT-1)
3. Create `docs/cli-reference.md` — all 9 commands, all flags (RT-2)
4. Fix all stale information across existing docs (RT-6)
5. Update walkthrough to JSON+MD format (RT-4)

**Wave 2 — High Value**
6. Create `docs/evidence-system.md` — evidence types and workflow (RT-3)
7. Create `docs/troubleshooting.md` — common errors and fixes (RT-8)
8. Expand install transparency (RT-7)
9. Add Mermaid diagrams to key docs (RT-11)

**Wave 3 — Completeness**
10. Complete template catalog with decision tree (RT-9)
11. Create `CONTRIBUTING.md` (RT-12)
12. Add navigation links across all docs (RT-1 completion)

- Satisfies: All 12 required truths
- Complexity: High (12 doc deliverables across 3 waves)
- Risk: Wave 1 achieves release-readiness; waves 2-3 can follow

### Option B: Minimal Viable Documentation

Fix only the most critical gaps without restructuring:

1. Add missing CLI commands to README
2. Fix stale information
3. Update walkthrough format
4. Add evidence system mention to CLAUDE.md

- Satisfies: RT-2 (partial), RT-4, RT-6
- Gaps: RT-1, RT-3, RT-5, RT-7, RT-8, RT-9, RT-10, RT-11, RT-12
- Complexity: Low
- Risk: Doesn't solve the structural navigation problem. Docs remain flat.

### Option C: README-Centric Approach

Keep README as the single comprehensive doc, just make it accurate and complete:

1. Expand README with all CLI commands and flags
2. Add evidence system section to README
3. Fix stale info
4. Add troubleshooting section to README

- Satisfies: RT-2, RT-3, RT-6, RT-8
- Gaps: RT-1, RT-4, RT-5, RT-9, RT-10, RT-11, RT-12
- Complexity: Medium
- Risk: README grows to 1000+ lines, violating B2 and U1. Aggravates TN1.

### RECOMMENDATION: Option A (Full Restructure + New Docs)

**Rationale:**
- Only option that satisfies all 12 required truths
- Wave structure (from TN4 resolution) lets us ship wave 1 for release
- Aligns with all 6 tension resolutions (layered architecture, single source CLI ref, audience routing)
- Medium-high complexity but decomposable into independent deliverables
- Wave 1 alone (5 deliverables) achieves release-readiness for B4
