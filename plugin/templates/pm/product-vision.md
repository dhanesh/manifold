# Product Vision & Strategy Constraint Template

Use: `/m0-init <product> --template=pm/product-vision`
Covers: New product foundations, product strategy, vision documentation

## Outcome

[CUSTOMIZE: e.g., 'Validated product vision with confirmed problem-solution fit and defined path to early traction']

### Framework Mapping

This template synthesizes product vision frameworks from Product School, Miro, and Smartsheet. Business = market opportunity; Technical = feasibility; UX = user validation; Security = compliance & IP; Operational = team & funding.

---

## Constraints

### Business

#### B1: Market Problem Validation
Target market problem validated with evidence from [CUSTOMIZE: e.g., 20 user interviews or survey data].
> **Rationale:** Building on assumptions rather than evidence is the top cause of product failure. Validation evidence must exist before committing resources.

#### B2: Revenue Model Viability
Achieves break-even within [CUSTOMIZE: e.g., 24 months] with documented unit economics assumptions.
> **Rationale:** A product without a viable business model is a project, not a business. Revenue model viability bounds the solution space.

#### B3: Competitive Differentiation
[CUSTOMIZE: e.g., 3] specific differentiators vs. incumbent solutions, each validated with target users.
> **Rationale:** Differentiation that users do not value is not differentiation. Each differentiator must map to a user need.

### Technical

#### T1: Technical Feasibility
Core product buildable within [CUSTOMIZE: e.g., 12 months] with available or acquirable skills.
> **Rationale:** Feasibility bounds ambition. A vision that cannot be built within resource constraints is a fantasy, not a strategy.

#### T2: Platform Strategy
Platform decisions enable future scalability and are documented with rationale for key technology choices.
> **Rationale:** Early platform decisions compound. Explicit choices now prevent costly re-architecture later.

### User Experience

#### U1: Target User Clarity
Target persona specific and validated with real users, not assumed or generalized.
> **Rationale:** A product for everyone is a product for no one. Persona clarity drives every subsequent design and prioritization decision.

#### U2: Core Value Proposition
Single-sentence value proposition that resonates with target users, validated through [CUSTOMIZE: e.g., landing page tests, user interviews].
> **Rationale:** If the value proposition cannot be stated in one sentence, it is not clear enough to build toward.

#### U3: Early Adopter Path
Acquisition path defined for [CUSTOMIZE: e.g., 100] early adopters with specific channels and tactics.
> **Rationale:** Early adopters validate the product and generate word-of-mouth. A plan to reach them is as important as the product itself.

### Security

#### S1: Regulatory Compliance
Comply with [CUSTOMIZE: e.g., GDPR, CCPA, or industry-specific regulations] applicable to the target market.
> **Rationale:** Regulatory non-compliance can shut down a product entirely. Compliance requirements constrain the solution space.

#### S2: IP Protection
Key differentiators protected via [CUSTOMIZE: e.g., trade secrets, patents, network effects, or data moats].
> **Rationale:** Without defensibility, successful products attract competitors. IP strategy preserves long-term value.

### Operational

#### O1: Team Capability
Core team covers primary technology stack with identified gaps and hiring/contracting plan.
> **Rationale:** A vision without the team to execute it is aspirational. Honest capability assessment prevents underestimation.

#### O2: Funding Runway
Runway covers [CUSTOMIZE: e.g., 18] months of development at projected burn rate.
> **Rationale:** Running out of money is the most common reason startups die. Runway must exceed time-to-revenue with margin.

---

## Tensions

### TN1: Revenue Timeline vs Technical Build Time
Achieving break-even (B2) within the target window requires the product to be built and adopted, but the technical build (T1) consumes a significant portion of that timeline.
> **Resolution:** [CUSTOMIZE: Consider phased monetization, pre-sales, or reducing scope to shorten time-to-revenue].

### TN2: Differentiation Scope vs Feasibility
More differentiators (B3) increase competitive advantage but expand the build scope beyond feasibility constraints (T1).
> **Resolution:** [CUSTOMIZE: Rank differentiators by user impact and implement the highest-value subset within feasibility bounds].

### TN3: Value Proposition Depends on Revenue Model
The core value proposition (U2) may need to change based on the revenue model (B2), since pricing affects perceived value.
> **Resolution:** [CUSTOMIZE: Validate the value proposition with the intended pricing model, not in isolation].

---

## Required Truths

### RT-1: Problem-Solution Fit Validated
Evidence confirms the target market has the problem and the proposed solution addresses it.
**Maps to:** B1, U2

### RT-2: Early Traction Path Defined
A specific path to early adopters exists with a revenue model that can sustain the product.
**Maps to:** U3, B2

### RT-3: Team Can Execute on Problem
The team has the skills and resources to build a solution for the validated problem.
**Maps to:** O1, B1

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific context
- Define the evidence threshold for B1 (interviews, survey size, etc.)
- Set the break-even timeline in B2 based on your funding situation
- Specify the regulatory environment in S1
- Define your team gaps honestly in O1

### Optional Additions
- Add partnership constraints if go-to-market depends on partners
- Add market timing constraints if a window is closing
- Add internationalization constraints if targeting multiple markets from launch
- Add data strategy constraints if data is a core differentiator

### Common Removals
- Remove S2 if the product is open-source or the market does not reward defensibility
- Remove T2 if the product is a single-use tool with no platform ambitions
- Remove O2 if the product is funded by an existing business unit

---

**See Also:** Previous -> [Opportunity Assessment](./opportunity-assessment.md) | Next -> [Lean Canvas](./lean-canvas.md) | [Greenfield Workflow Guide](../../docs/pm/guide.md#greenfield-workflow)
