# Opportunity Assessment Constraint Template

Use: `/manifold:m0-init <feature> --template=pm/opportunity-assessment`
Covers: Go/no-go decisions, opportunity evaluation, new product exploration

## Outcome

[CUSTOMIZE: e.g., 'Validated go/no-go decision on pursuing the opportunity with documented evidence']

### Framework Mapping

This template adapts Marty Cagan's SVPG Opportunity Assessment framework (10 questions) to Manifold's constraint model. Mapping: Questions 1-3 -> Business, Questions 4-5 -> Technical, Questions 6-7 -> UX, Question 8 -> Security, Questions 9-10 -> Operational.

---

## Constraints

### Business

#### B1: Problem Significance
Total addressable market exceeds [CUSTOMIZE: e.g., 10,000 potential users] threshold with validated evidence.
> **Rationale:** Opportunity must be large enough to justify investment. Without sufficient market size, even a perfect solution yields insufficient returns.

#### B2: Why Now
Market timing justification documented with specific evidence for why this opportunity exists now and may not exist later.
> **Rationale:** Great opportunities have a temporal window. Documenting timing forces honest evaluation of urgency vs. manufactured urgency.

#### B3: Go-to-Market Strategy
Viable distribution path identified with at least one proven channel to reach target users.
> **Rationale:** A product without distribution is not a product. Early GTM thinking prevents building something that cannot reach its audience.

### Technical

#### T1: Why Us
Team's unique capability to solve this problem documented with specific advantages over other potential solvers.
> **Rationale:** If anyone can solve this equally well, the opportunity is commoditized. Unique capability creates defensible advantage.

#### T2: Build Estimate
Effort estimated within [CUSTOMIZE: e.g., +/- 30%] confidence range with key assumptions documented.
> **Rationale:** Order-of-magnitude estimation at opportunity stage prevents committing to efforts that exceed available resources.

### User Experience

#### U1: Target Users
Who benefits and how is clearly articulated with specific user segments, not generic descriptions.
> **Rationale:** Vague user definitions lead to vague products. Specificity enables focused validation and design.

#### U2: Alternatives Assessment
Current user alternatives documented with specific pain points and gaps in existing solutions.
> **Rationale:** Understanding how users solve the problem today reveals whether the opportunity is real and what bar must be cleared.

### Security

#### S1: Critical Risk Factors
Top [CUSTOMIZE: e.g., 5] opportunity-killing risks identified with probability and mitigation strategies.
> **Rationale:** Every opportunity has risks that could invalidate it entirely. Surfacing them early enables informed go/no-go decisions.

### Operational

#### O1: Success Metrics
[CUSTOMIZE: e.g., 3] specific, measurable metrics that would prove the opportunity is worthwhile.
> **Rationale:** Pre-defined success metrics prevent post-hoc rationalization. If you cannot measure success, you cannot validate the opportunity.

#### O2: Recommendation
Go/no-go/investigate-further recommendation with confidence level and key conditions.
> **Rationale:** The assessment must conclude with an actionable recommendation, not an open-ended analysis.

---

## Tensions

### TN1: Market Size vs User Specificity
Large addressable market (B1) may conflict with clearly defined target users (U1). Broader markets are harder to serve with precision.
> **Resolution:** [CUSTOMIZE: Consider whether to target a niche first and expand, or address the broad market from day one].

### TN2: Market Timing vs Accurate Estimation
Urgency of the market window (B2) pressures the team to act before effort estimation (T2) reaches acceptable confidence.
> **Resolution:** [CUSTOMIZE: Define minimum acceptable estimation confidence for a go decision vs. an investigate-further decision].

### TN3: Opportunity Size vs Risk Tolerance
Larger opportunities (B1) tend to carry proportionally larger risks (S1). Pursuing maximum upside may require accepting higher failure probability.
> **Resolution:** [CUSTOMIZE: Define the risk appetite for this opportunity class and whether staged investment can bound downside].

---

## Required Truths

### RT-1: Target Market Validated
Evidence confirms the target market is real, sufficiently large, and underserved by current alternatives.
**Maps to:** B1, U1, U2

### RT-2: Capability Confirmed
The team has both the unique ability and the capacity to pursue this opportunity within acceptable effort bounds.
**Maps to:** T1, T2

### RT-3: Decision Framework Ready
Success metrics, risk factors, and recommendation criteria are defined so the go/no-go decision can be made objectively.
**Maps to:** O1, O2, S1

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific thresholds
- Define the TAM threshold in B1 appropriate for your business scale
- Set the estimation confidence range in T2 for your planning culture
- Identify the actual risk factors for S1 (these are opportunity-specific)
- Define your success metrics in O1

### Optional Additions
- Add regulatory constraints if the opportunity involves regulated industries
- Add partnership constraints if the opportunity requires strategic alliances
- Add funding constraints if capital raise is needed to pursue
- Add competitive timing constraints if first-mover advantage matters

### Common Removals
- Remove B3 if distribution is already solved (e.g., existing user base)
- Remove O2 if the assessment feeds into a broader portfolio decision process
- Remove T2 if the opportunity stage is too early for estimation

---

**See Also:** Next in greenfield workflow -> [Product Vision](./product-vision.md) | [Greenfield Workflow Guide](../../docs/pm/guide.md#greenfield-workflow)
