# pm-templates-greenfield

## Outcome

Add 10 new PM templates (5 greenfield, 5 general PM) + a greenfield workflow guide, bringing total PM templates from 3 to 13. Extend the PM template system to cater to brand new software projects (not just features/experiments in existing products), helping product managers capture more of the requirement creation cycle. Templates sourced from industry frameworks: Atlassian, Perforce, SVPG (Cagan), Amazon Working Backwards, Lean Startup, Shape Up, ProductPlan, and Product School.

---

## Constraints

### Business

#### B1: Greenfield Coverage
At least 5 templates must specifically target new-product/greenfield scenarios where no existing product exists.
> **Rationale:** The current 3 PM templates (feature-launch, experiment, deprecation) ALL assume an existing product. PMs building brand new software have zero starting points.

#### B2: Industry Framework Alignment
Templates must be grounded in established PM frameworks (SVPG Opportunity Assessment, Amazon Working Backwards, Lean Canvas, etc.) rather than invented from scratch.
> **Rationale:** Industry-standard frameworks have battle-tested constraint patterns. PMs recognize and trust established methodologies, reducing adoption friction.

#### B3: Opportunity-to-MVP Lifecycle
Templates must collectively cover the full greenfield lifecycle: opportunity evaluation, vision definition, business modeling, and MVP scoping.
> **Rationale:** PMs working on new products need templates that chain together — from "should we build this?" through "what's the MVP?" — not just isolated documents.

#### B4: PM Adoption Without Training
A product manager unfamiliar with Manifold should be able to use any template after reading only the template's own content (no external documentation required).
> **Rationale:** Templates are the entry point for PM adoption of Manifold. If they require training, PMs will default to Google Docs.

### Technical

#### T1: Schema Compatibility
Every new template must pass `manifold validate <name>` when copied to `.manifold/`. JSON structure must conform to the v3 Zod schema in `cli/lib/structure-schema.ts`.
> **Rationale:** Invalid templates break the CLI pipeline. Schema validation is the quality gate.

#### T2: Format Consistency
All templates must use JSON+MD hybrid format matching the exact conventions of existing templates: `$schema` field, `template` metadata field, `template_version`, same heading levels, same section order.
> **Rationale:** Consistency enables tooling. The CLI parser, linker, and validator all depend on predictable format patterns.

#### T3: Cross-Reference Integrity
Every tension's `between` array must reference constraint IDs that exist in the same template. Every required truth's `maps_to` array must reference valid constraint IDs. No dangling references.
> **Rationale:** Broken cross-references cause validation failures and confuse PMs about which constraints are related.

#### T4: Shell Completion Coverage
All 10 new template names must appear in bash, zsh, and fish completion scripts in `cli/commands/completion.ts` (lines 51, 133, 249).
> **Rationale:** Tab completion is how users discover available templates. Missing entries make templates invisible.

### User Experience

#### U1: CUSTOMIZE Markers
Every user-editable value in every template markdown file must have a `[CUSTOMIZE: ...]` marker with guidance text.
> **Rationale:** PMs need to know exactly which values to change. Unmarked values get left as defaults, producing meaningless constraints.

#### U2: Customization Notes
Each template markdown file must include a Customization Notes section with three subsections: Required Changes, Optional Additions, and Common Removals.
> **Rationale:** Existing templates (feature-launch, experiment, deprecation) all follow this pattern. Consistency helps PMs learn the system once.

#### U3: Self-Explanatory Templates
Template purpose, use case, and "best for" guidance must be clear from the template content alone. Each MD file header must state the use case and list "Best for" scenarios.
> **Rationale:** PMs browse templates to find the right starting point. Self-explanatory headers eliminate trial-and-error.

### Security

#### S1: No Sensitive Example Data
Template `[CUSTOMIZE: ...]` examples must not include real company names, real financial figures, actual API keys, or other sensitive patterns that could be accidentally left in production manifolds.
> **Rationale:** Templates are checked into version control. Example values with realistic-looking sensitive data create false positive security alerts and accidental data exposure risk.

### Operational

#### O1: Documentation Coverage
All 4 documentation touchpoints must be updated: `install/templates/pm/README.md`, `install/templates/README.md`, `docs/pm/guide.md`, and `install/commands/manifold:m0-init.md` argument hint.
> **Rationale:** Undocumented templates don't exist for users. The docs are the discovery mechanism.

#### O2: Greenfield Workflow Guide
A new section in `docs/pm/guide.md` must show the recommended template progression for new products: opportunity-assessment -> product-vision -> lean-canvas -> mvp-definition -> then feature-launch for individual features.
> **Rationale:** Individual templates are useful but the real power is the chain. PMs need to see how templates connect across the product lifecycle.

---

## Tensions

### TN1: Industry Fidelity vs Manifold Format
**Type:** trade_off | **Between:** B2 (Industry Framework Alignment) ↔ T2 (Format Consistency)
> Established frameworks (Lean Canvas 9-block, SVPG 10-question, Amazon PR/FAQ) have their own native structures that don't map 1:1 to Manifold's 5-category constraint model.

**Resolution:** Adapt industry frameworks to Manifold's 5 constraint categories. Each template includes a brief "Framework Mapping" note explaining how the original framework's elements map to Manifold categories. Preserves framework intent while maintaining tooling compatibility.

### TN2: Template Breadth vs Depth
**Type:** resource_tension | **Between:** B1 (Greenfield Coverage) ↔ U2 (Customization Notes)
> Delivering 10 fully detailed templates (each with complete Customization Notes: Required Changes, Optional Additions, Common Removals) is a significant content effort. Cutting corners on customization notes would reduce quality.

**Resolution:** Full depth for all 10 templates. Every template gets complete Customization Notes with all three subsections. No shortcuts — each template is a first-class citizen with the same quality bar as existing templates.

### TN3: Self-Explanatory vs Lifecycle Chain
**Type:** trade_off | **Between:** B4 (PM Adoption Without Training) ↔ B3 (Opportunity-to-MVP Lifecycle)
> Each template must be standalone (B4: no external docs required), yet templates should chain together across the greenfield lifecycle (B3: opportunity → vision → canvas → MVP). These goals pull in opposite directions — chaining implies sequencing knowledge, standalone implies no prerequisites.

**Resolution:** Each template is fully standalone with a "See Also" footer suggesting previous/next templates in the lifecycle progression. PMs can use any template independently, but the cross-links reveal the recommended flow for those who want it.

### TN4: Realistic Examples vs Sensitive Data
**Type:** hidden_dependency | **Between:** U1 (CUSTOMIZE Markers) ↔ S1 (No Sensitive Example Data)
> CUSTOMIZE markers need illustrative examples so PMs understand what to fill in, but realistic-looking examples (real company names, actual financial figures) could trigger security alerts or be accidentally left in production manifolds.

**Resolution:** Use generic but illustrative examples like `[CUSTOMIZE: e.g., 10,000 MAU target]`, `[CUSTOMIZE: e.g., 18 months]`, `[CUSTOMIZE: e.g., 3 key differentiators]`. Examples are specific enough to guide PMs but use placeholder patterns that are obviously not real data.

---

## Required Truths

### RT-1: Template Content Exists
10 JSON+MD template pairs must exist in `install/templates/pm/` with correct v3 schema structure and full markdown content (constraints, tensions, required truths, customization notes).
**Maps to:** B1 (Greenfield Coverage), T1 (Schema Compatibility), T2 (Format Consistency)
**Gap:** 0 of 10 templates exist. All 20 files must be created from scratch following `feature-launch` conventions.

### RT-2: Framework Fidelity Maintained
Each template must faithfully represent its source industry framework (SVPG, Amazon Working Backwards, Lean Canvas, Shape Up, etc.) while conforming to Manifold's 5-category constraint model.
**Maps to:** B2 (Industry Framework Alignment), T2 (Format Consistency)
**Gap:** No framework-to-Manifold mappings exist. Each template needs a "Framework Mapping" note (per TN1 resolution) explaining how original framework elements map to Manifold categories.

### RT-3: Lifecycle Coherence
The 5 greenfield templates must form a logical progression from opportunity evaluation to MVP definition, with cross-links enabling PMs to follow the chain.
**Maps to:** B3 (Opportunity-to-MVP Lifecycle), O2 (Greenfield Workflow Guide)
**Gap:** No workflow guide exists in `docs/pm/guide.md`. Template "See Also" cross-links (per TN3 resolution) don't exist. Recommended progression: opportunity-assessment → product-vision → lean-canvas → mvp-definition → feature-launch.

### RT-4: Self-Service Usability
Every template must be usable by a PM with zero Manifold training — complete with use-case header, "Best for" scenarios, `[CUSTOMIZE: ...]` markers on all editable values, and full Customization Notes (Required Changes, Optional Additions, Common Removals).
**Maps to:** B4 (PM Adoption Without Training), U1 (CUSTOMIZE Markers), U2 (Customization Notes), U3 (Self-Explanatory Templates)
**Gap:** Templates don't exist yet. When created, each must include all four usability elements. CUSTOMIZE examples must be generic but illustrative (per TN4 resolution).

### RT-5: Cross-Reference Integrity
All constraint IDs referenced in tensions' `between` arrays and required truths' `maps_to` arrays must be valid within each template. No dangling references.
**Maps to:** T3 (Cross-Reference Integrity), T1 (Schema Compatibility)
**Gap:** No templates exist. Each template must be internally consistent and pass `manifold validate`.

### RT-6: Discoverability
All 10 new templates must be discoverable via shell tab-completion (bash, zsh, fish) and documented in all 4 documentation touchpoints.
**Maps to:** T4 (Shell Completion Coverage), O1 (Documentation Coverage)
**Gap:** `completion.ts` hard-coded lists need 10 new entries. `install/templates/pm/README.md`, `install/templates/README.md`, `docs/pm/guide.md`, and `install/commands/manifold:m0-init.md` all need updates.

---

## Solution Space

### Option A: Sequential Creation
Create one template at a time, validate each before moving to the next.
- **Satisfies:** RT-1, RT-2, RT-5
- **Gaps:** Slow execution, no parallelism opportunity
- **Complexity:** Low risk, high effort

### Option B: Batch by Tier (Recommended)
Create all 5 greenfield templates → validate batch → create all 5 general PM templates → validate batch → update all documentation.
- **Satisfies:** RT-1, RT-2, RT-3, RT-4, RT-5, RT-6
- **Gaps:** None with implementation
- **Complexity:** Medium — matches plan's Phase 1/2/3 structure
- **Why recommended:** Natural grouping (greenfield share lifecycle coherence, general PM are independent), catches cross-template issues within each tier, documentation updates happen last when all template names are finalized.

### Option C: Full Parallel Creation
Create all 10 templates simultaneously, then all documentation at once.
- **Satisfies:** RT-1, RT-2, RT-5
- **Gaps:** Harder to maintain consistency between templates (RT-3 lifecycle links, RT-4 style consistency)
- **Complexity:** High risk of cross-template inconsistencies
