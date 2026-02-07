# PR/FAQ Constraint Template

Use: `/m0-init <product> --template=pm/pr-faq`
Covers: Amazon Working Backwards methodology, customer-centric product definition, press release driven development

## Outcome

[CUSTOMIZE: e.g., 'Compelling press release and FAQ that validates customer desirability and organizational readiness']

### Framework Mapping

This template adapts Amazon's Working Backwards PR/FAQ methodology. Press Release sections -> B1 (problem), T1 (solution), U1 (quote), U3 (benefit). Internal FAQ -> S1 (risks), O2 (resources). External FAQ -> S2 (concerns), U2 (getting started). Launch criteria -> B2, O1.

---

## Constraints

### Business

#### B1: Customer Problem
Press release clearly articulates the customer problem in plain language that a non-technical reader would understand.
> **Rationale:** Working Backwards starts with the customer. If the problem statement requires jargon, the team does not understand the customer well enough.

#### B2: Measurable Launch Criteria
Success defined with [CUSTOMIZE: e.g., 3] quantified metrics that will determine if the launch succeeded.
> **Rationale:** Amazon PR/FAQs require measurable outcomes. Ambiguous success criteria lead to ambiguous decisions about whether to continue investing.

#### B3: Business Justification
ROI or strategic value documented with evidence supporting why the organization should invest in this product.
> **Rationale:** The internal FAQ must answer "why should we build this?" with credible business reasoning, not just customer enthusiasm.

### Technical

#### T1: Solution Description
Solution described in customer-friendly terms with no technical jargon, focusing on what it does, not how it works.
> **Rationale:** The PR/FAQ discipline forces clarity. If the solution cannot be explained simply, it is either too complex or not well understood.

#### T2: Implementation Feasibility
Engineering has confirmed buildability with [CUSTOMIZE: e.g., a high-level technical assessment] and identified key technical risks.
> **Rationale:** A press release for an unbuildable product wastes organizational energy. Feasibility check grounds the vision in reality.

### User Experience

#### U1: Customer Quote
Fictional customer quote captures the emotional benefit of the product in the customer's own language.
> **Rationale:** The customer quote is the heart of the Working Backwards PR. It forces empathy and ensures the product delivers emotional, not just functional, value.

#### U2: Getting Started
First-use experience achievable in [CUSTOMIZE: e.g., 3] steps or fewer from first encounter to first value.
> **Rationale:** The external FAQ "How do I get started?" must have a simple answer. Complex onboarding undermines the promise of the press release.

#### U3: Customer Benefit
Quantified improvement over the current state, stated in terms the customer cares about.
> **Rationale:** The PR must state a specific benefit, not a vague improvement. Quantification forces honest assessment of the value delivered.

### Security

#### S1: Internal FAQ: Risks
Top [CUSTOMIZE: e.g., 5] risks identified with specific mitigation strategies for each.
> **Rationale:** The internal FAQ must honestly address what could go wrong. Risk-blind PR/FAQs lead to surprise failures.

#### S2: External FAQ: Concerns
Anticipated customer concerns addressed with specific, honest responses.
> **Rationale:** If the team cannot anticipate and address customer concerns, they do not understand the customer well enough to build the product.

### Operational

#### O1: Launch Readiness
All departments (engineering, marketing, support, legal) have signed off on launch readiness criteria.
> **Rationale:** Amazon's methodology requires organizational alignment. A product is not ready to launch until every supporting function is ready.

#### O2: Internal FAQ: Resources
Team composition, budget, and timeline documented with confidence levels for each.
> **Rationale:** The internal FAQ "What resources do we need?" must have a credible answer. Under-resourcing is a predictable failure mode.

---

## Tensions

### TN1: Ambitious Customer Promise vs Engineering Feasibility
The press release naturally gravitates toward ambitious customer promises (B1) that may exceed what engineering can feasibly deliver (T2).
> **Resolution:** [CUSTOMIZE: Write the press release first, then honestly assess feasibility. Iterate the press release to match achievable scope rather than lowering quality].

### TN2: Simple Onboarding vs Technical Complexity
A simple getting-started experience (U2) may require significant engineering effort to hide underlying technical complexity (T2).
> **Resolution:** [CUSTOMIZE: Define the minimum viable onboarding that delivers first value. Accept backend complexity if the user-facing experience remains simple].

### TN3: Success Metrics Depend on Risk Mitigation
Achieving the measurable launch criteria (B2) depends on successfully mitigating the identified risks (S1). Metrics may be unachievable if key risks materialize.
> **Resolution:** [CUSTOMIZE: Define contingent metrics — primary metrics if risks are mitigated, fallback metrics if key risks materialize].

---

## Required Truths

### RT-1: Customer Story Compelling
The press release, customer quote, and solution description together tell a story that would make a real customer excited.
**Maps to:** B1, U1, T1

### RT-2: FAQ Comprehensive
Both internal and external FAQs address the hard questions honestly, with no hand-waving or deferred answers.
**Maps to:** S1, S2, O2

### RT-3: Organization Aligned
Business justification is accepted and all departments are prepared for launch.
**Maps to:** B3, O1

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific context
- Write the actual press release text as part of filling in B1, T1, U1, and U3
- Write the actual customer quote in U1 (this is the hardest and most important part)
- List specific risks in S1 with real mitigation strategies, not generic risk categories
- Define specific launch metrics in B2

### Optional Additions
- Add pricing constraints if the product has a revenue model
- Add competitive constraints if timing against competitors matters
- Add partnership constraints if launch depends on third parties
- Add localization constraints if launching in multiple markets

### Common Removals
- Remove B3 if the product is a strategic investment without near-term ROI expectations
- Remove S2 if the product is internal-facing with no external customers
- Remove O1 if the launch is soft/beta with no cross-functional dependencies

---

**See Also:** Alternative to [Product Vision](./product-vision.md) — use PR/FAQ when customer empathy is the priority | [Greenfield Workflow Guide](../../docs/pm/guide.md#greenfield-workflow)
