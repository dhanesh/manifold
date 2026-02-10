# User Persona Constraint Template

Use: `/m0-init <feature> --template=pm/user-persona`
Covers: User persona definition, jobs-to-be-done analysis, behavioral pattern documentation

## Outcome

[CUSTOMIZE: e.g., 'Research-backed user persona with validated jobs-to-be-done, pain points, and behavioral patterns adopted across product teams']

### Framework Mapping

This template synthesizes Roman Pichler's persona lifecycle approach with Clayton Christensen's Jobs-to-be-Done (JTBD) framework and Product School's persona validation practices. Persona Grounding (B1) enforces Pichler's research-first principle. JTBD (U1) is the core framework. Pain Points (U2) and Behavioral Patterns (U3) map to standard persona attributes. Persona Refresh (U4) implements Pichler's living persona concept.

---

## Constraints

### Business

#### B1: Persona Grounding
Persona based on real user research, not assumptions. Every attribute must trace to a specific research artifact (interview, survey, analytics data).
> **Rationale:** Assumption-based personas confirm biases rather than revealing reality. Research-grounded personas prevent building products for imaginary users.

#### B2: Market Sizing
Addressable market for each persona quantified with methodology documented.
> **Rationale:** Understanding the size of the user segment a persona represents informs prioritization decisions. A well-defined persona serving a tiny market may not justify investment.

### Technical

#### T1: Data Sources
Persona informed by [CUSTOMIZE: e.g., 10] user interviews minimum, supplemented with quantitative behavioral data.
> **Rationale:** Small sample sizes produce unreliable personas. Combining qualitative depth (interviews) with quantitative breadth (analytics) creates robust, defensible personas.

### User Experience

#### U1: Jobs-to-Be-Done
[CUSTOMIZE: e.g., 3] core jobs-to-be-done articulated per persona, each with context, motivation, and desired outcome.
> **Rationale:** JTBD framing captures what users are trying to accomplish rather than demographic attributes. It drives product decisions that address real needs.

#### U2: Pain Points
Top [CUSTOMIZE: e.g., 5] pain points ranked by severity, frequency, and current workaround effort.
> **Rationale:** Ranked pain points directly inform feature prioritization. Understanding severity and frequency prevents solving low-impact problems first.

#### U3: Behavioral Patterns
Usage patterns documented with frequency data including peak usage times, session duration, and feature adoption curves.
> **Rationale:** Behavioral patterns reveal how users actually interact with products, often diverging from self-reported behavior. This data grounds design decisions in reality.

#### U4: Persona Lifecycle
Persona refresh triggered by [CUSTOMIZE: e.g., quarterly] review or upon significant market/product changes.
> **Rationale:** User needs evolve as markets shift and products mature. Stale personas lead to stale products. Regular refresh ensures continued relevance.

### Security

#### S1: PII Handling
No real user PII in persona documents. All examples use anonymized, composite, or synthetic data.
> **Rationale:** Persona documents are widely shared across teams. Including real PII creates privacy risk and potential regulatory violations regardless of internal access controls.

### Operational

#### O1: Stakeholder Validation
Persona validated by [CUSTOMIZE: e.g., 3] cross-functional stakeholders (product, engineering, design, support).
> **Rationale:** Personas that only product managers believe in do not influence decisions. Cross-functional validation builds shared understanding and adoption.

#### O2: Adoption
Persona referenced in [CUSTOMIZE: e.g., all] PRDs, design docs, and user story acceptance criteria.
> **Rationale:** A persona that exists only in a research report has zero impact. Measuring reference frequency in downstream artifacts validates actual adoption.

---

## Tensions

### TN1: Research Rigor vs Research Resource Cost
High-confidence personas (B1) require significant interview and analysis investment (T1). Research rigor competes with team capacity and timeline.
> **Resolution:** [CUSTOMIZE: Consider phased research starting with existing data analysis, then targeted interviews to fill gaps, rather than comprehensive primary research upfront].

### TN2: JTBD Depth vs Behavioral Pattern Breadth
Deep jobs-to-be-done analysis (U1) and comprehensive behavioral pattern documentation (U3) both require research time. Depth in one area may mean breadth sacrificed in the other.
> **Resolution:** [CUSTOMIZE: Prioritize JTBD for new personas and behavioral patterns for established personas with existing product data].

### TN3: Persona Refresh vs Re-Validation
Refreshing personas on schedule (U4) requires re-validation by stakeholders (O1). Frequent refreshes increase the validation burden on cross-functional teams.
> **Resolution:** [CUSTOMIZE: Define lightweight refresh (data update only) vs full refresh (stakeholder re-validation) and when each is appropriate].

---

## Required Truths

### RT-1: Research-Backed Persona
Persona attributes are traceable to specific research artifacts, not organizational assumptions or inherited beliefs.
**Maps to:** B1, T1

### RT-2: User Needs Understood
Jobs-to-be-done and pain points are documented with sufficient depth to directly inform product prioritization and design decisions.
**Maps to:** U1, U2

### RT-3: Persona Adopted Organization-Wide
Persona is validated by cross-functional stakeholders and actively referenced in downstream product artifacts.
**Maps to:** O1, O2

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Set the minimum interview count in T1 appropriate for your research capacity
- Define the number of core JTBD in U1 based on persona complexity
- Set pain point count in U2 based on problem space breadth
- Define refresh cadence in U4 based on market velocity
- Specify cross-functional stakeholders for validation in O1

### Optional Additions
- Add demographic constraints if target demographics are critical to positioning
- Add technographic constraints for technical product personas
- Add geographic/cultural constraints for international products
- Add accessibility constraints for inclusive persona definitions
- Add competitive context constraints to map personas against competitor user bases

### Common Removals
- Remove B2 if market sizing is handled in a separate analysis
- Remove U3 if behavioral data is not yet available (pre-product stage)
- Remove O2 if adoption tracking is not feasible in current tooling
