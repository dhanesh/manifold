# Lean Canvas Constraint Template

Use: `/manifold:m0-init <product> --template=pm/lean-canvas`
Covers: Lean startup canvas, business model validation, early-stage product definition

## Outcome

[CUSTOMIZE: e.g., 'Complete lean canvas with validated problem-customer fit and viable unit economics']

### Framework Mapping

This template maps Ash Maurya's Lean Canvas 9 blocks to Manifold's constraint model. Problem -> B1; Customer Segments -> U1; Unique Value Proposition -> U2; Solution -> T1; Channels -> U3; Revenue Streams -> B2; Cost Structure -> B3; Key Metrics -> O1; Unfair Advantage -> S1. Existing Alternatives (O2) extends the canvas.

---

## Constraints

### Business

#### B1: Problem Clarity
Top 3 problems articulated and ranked by severity, each validated with evidence from target customers.
> **Rationale:** Lean Canvas starts with the problem, not the solution. Ranking forces prioritization; validation prevents building for imagined problems.

#### B2: Revenue Streams
At least 1 revenue stream identified with pricing model and willingness-to-pay evidence.
> **Rationale:** Revenue is the ultimate validation of value. Even pre-revenue products need a plausible path to monetization.

#### B3: Cost Structure
Monthly burn rate under [CUSTOMIZE: e.g., a reasonable threshold for your stage] with key cost drivers identified.
> **Rationale:** Unit economics must work at scale. Understanding cost structure early prevents building unprofitable products.

### Technical

#### T1: Solution Feasibility
Proposed solution buildable with available resources within [CUSTOMIZE: e.g., a reasonable timeframe for your stage].
> **Rationale:** The solution block of the canvas must be grounded in reality. Technical feasibility constrains which solutions are viable.

### User Experience

#### U1: Customer Segments
Target segments defined with early adopter subset identified, including specific characteristics that distinguish them.
> **Rationale:** Lean Canvas requires knowing your customer before your solution. Early adopters are the first validation target.

#### U2: Unique Value Proposition
Single differentiating sentence that explains why a customer should choose this over any alternative.
> **Rationale:** The UVP is the center of the Lean Canvas. If it cannot be stated clearly, the product concept is not ready.

#### U3: Channels
[CUSTOMIZE: e.g., 3] acquisition channels identified with at least one validated or low-risk channel.
> **Rationale:** A product without a path to customers is an idea, not a business. Channel identification grounds the canvas in distribution reality.

### Security

#### S1: Unfair Advantage
Defensibility documented with specific advantages that cannot be easily copied or bought by competitors.
> **Rationale:** The Lean Canvas unfair advantage block is intentionally hard to fill. Honest assessment prevents overconfidence in defensibility.

### Operational

#### O1: Key Metrics
[CUSTOMIZE: e.g., 3] actionable (not vanity) metrics defined that indicate real progress toward product-market fit.
> **Rationale:** Vanity metrics (total signups, page views) mislead. Actionable metrics (activation rate, retention, revenue per user) drive real decisions.

#### O2: Existing Alternatives
Current alternatives documented with specific gaps, including "do nothing" as a valid alternative.
> **Rationale:** Understanding alternatives reveals the true competitive landscape and the minimum bar the product must clear.

---

## Tensions

### TN1: Problem Breadth vs Customer Specificity
Addressing more problems (B1) attracts a broader market but conflicts with targeting specific customer segments (U1).
> **Resolution:** [CUSTOMIZE: Consider starting with the narrowest segment that has the most acute problem, then expanding].

### TN2: Revenue Model Complexity vs Channel Simplicity
Sophisticated revenue models (B2) may require complex sales channels that conflict with simple acquisition paths (U3).
> **Resolution:** [CUSTOMIZE: Match the revenue model to the channel. Self-serve pricing for self-serve channels, sales-assisted for enterprise channels].

### TN3: UVP Depends on Technical Feasibility
The unique value proposition (U2) may promise capabilities that are constrained by technical feasibility (T1).
> **Resolution:** [CUSTOMIZE: Validate the UVP against what can actually be built. Adjust the proposition to match deliverable capability].

---

## Required Truths

### RT-1: Problem-Customer Fit Validated
Evidence confirms the target customers experience the identified problems and are actively seeking solutions.
**Maps to:** B1, U1

### RT-2: Differentiation Defensible
The unique value proposition is both compelling to customers and defensible against competitive copying.
**Maps to:** U2, S1

### RT-3: Unit Economics Viable
Revenue streams can cover cost structure at achievable scale within a reasonable timeframe.
**Maps to:** B2, B3

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific context
- Rank the top 3 problems in B1 with real user evidence
- Define your pricing model in B2 (freemium, subscription, transaction, etc.)
- Identify your early adopter subset in U1 with specific characteristics
- Write a single-sentence UVP in U2 that passes the "so what?" test

### Optional Additions
- Add partnership constraints if the business model depends on partners
- Add regulatory constraints if the market is regulated
- Add data constraints if data collection is core to the product
- Add network effect constraints if value increases with users

### Common Removals
- Remove S1 if the product is too early to have a defensible advantage (but document this honestly)
- Remove B3 if the product is bootstrapped with negligible costs
- Remove U3 if the product has a single obvious distribution channel

---

**See Also:** Previous -> [Product Vision](./product-vision.md) | Next -> [MVP Definition](./mvp-definition.md) | [Greenfield Workflow Guide](../../docs/pm/guide.md#greenfield-workflow)
