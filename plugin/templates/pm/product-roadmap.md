# Product Roadmap Constraint Template

Use: `/m0-init <feature> --template=pm/product-roadmap`
Covers: Now-Next-Later roadmaps, outcome-based planning, strategic alignment

## Outcome

[CUSTOMIZE: e.g., 'Outcome-based roadmap with strategic alignment, stakeholder buy-in, and review cadence that keeps planning current']

### Framework Mapping

This template adapts ProdPad's Now-Next-Later roadmap methodology with Product School's outcome-based planning principles. Strategic Alignment (B1) and Outcome-Based Items (B2) implement ProdPad's outcome-over-output philosophy. Capacity Alignment (T1) draws from agile capacity planning. Communication Plan (O1) and Review Cadence (O2) implement Product School's stakeholder management practices. Progress Tracking (O3) ensures roadmap items remain living commitments.

---

## Constraints

### Business

#### B1: Strategic Alignment
Every roadmap item traces to a company objective or strategic theme. No orphan items without business justification.
> **Rationale:** Roadmap items without strategic alignment consume resources without advancing the business. Traceability ensures every item has a purpose and a sponsor.

#### B2: Outcome-Based Items
Items expressed as outcomes (measurable results), not features (specific implementations). Each item has a success metric.
> **Rationale:** Feature-based roadmaps lock teams into solutions before understanding problems. Outcome-based items preserve solution flexibility and focus teams on impact.

#### B3: Stakeholder Buy-In
Roadmap approved by [CUSTOMIZE: e.g., executive team] with documented agreement on priorities and resource allocation.
> **Rationale:** A roadmap without stakeholder alignment is a wish list. Formal approval creates organizational commitment and reduces mid-cycle priority changes.

### Technical

#### T1: Capacity Alignment
"Now" items fit within current sprint capacity with [CUSTOMIZE: e.g., 20%] buffer for unplanned work and technical debt.
> **Rationale:** Overcommitting the roadmap guarantees missed deadlines. Capacity-aware planning with buffer for the unexpected produces reliable delivery.

#### T2: Technical Dependencies
Cross-team dependencies for "Now" and "Next" items mapped and agreed with dependency owners.
> **Rationale:** Unmapped dependencies are the primary cause of roadmap slippage. Explicit dependency agreements prevent surprises and enable proactive coordination.

### User Experience

#### U1: User Value Focus
Every item articulates user value, not just business value. Items without clear user benefit require explicit justification.
> **Rationale:** Business-only items erode user trust and product quality over time. Requiring user value articulation keeps the product user-centered even under business pressure.

#### U2: Research Backing
"Now" items backed by user research, customer feedback data, or usage analytics. Evidence type documented per item.
> **Rationale:** Committing current resources to items without evidence is speculation. Research backing ensures the team works on validated problems.

#### U3: User Feedback Integration
Feedback loop established so that user feedback informs "Next" and "Later" item prioritization on [CUSTOMIZE: e.g., monthly] cadence.
> **Rationale:** Roadmaps that ignore ongoing user feedback become disconnected from reality. Systematic feedback integration keeps planning grounded in actual user needs.

### Security

#### S1: Risk Assessment
"Now" items have risk assessment completed covering technical risk, business risk, and user impact risk.
> **Rationale:** Committing to items without understanding their risk profile leads to costly surprises. Pre-assessment enables informed trade-offs and contingency planning.

### Operational

#### O1: Communication Plan
Roadmap shared with all stakeholders on [CUSTOMIZE: e.g., monthly] cadence through a consistent channel and format.
> **Rationale:** A roadmap that stakeholders do not see cannot align the organization. Regular communication prevents information asymmetry and misaligned expectations.

#### O2: Review Cadence
Roadmap reviewed and updated [CUSTOMIZE: e.g., every 2 weeks] with documented decisions on additions, removals, and priority changes.
> **Rationale:** Static roadmaps become fiction. Regular review with documented changes maintains the roadmap as a living document that reflects current reality.

#### O3: Progress Tracking
Completion metrics visible for "Now" items with clear definition of done and progress indicators.
> **Rationale:** Without visible progress tracking, roadmap items exist in a binary state of "not done" until suddenly "done." Progress visibility enables early intervention when items stall.

---

## Tensions

### TN1: Business Priorities vs User Value
Strategic alignment (B1) may push items that serve business objectives but lack clear user value (U1). Both are required for every item.
> **Resolution:** [CUSTOMIZE: Require dual justification (business AND user) for all "Now" items; allow business-only justification for "Next" items if user value path is documented].

### TN2: Outcome Ambition vs Capacity Reality
Outcome-based items (B2) may describe ambitious results that exceed current capacity (T1). The gap between desired outcomes and delivery capacity creates tension.
> **Resolution:** [CUSTOMIZE: Size outcomes to capacity for "Now" items; allow aspirational outcomes for "Next" and "Later" with explicit capacity assumptions].

### TN3: Communication Cadence vs Stakeholder Alignment
Effective communication (O1) requires stakeholders to be aligned (B3), but alignment may not be achievable before each communication cycle.
> **Resolution:** [CUSTOMIZE: Distinguish between alignment reviews (less frequent, decision-focused) and update communications (more frequent, information-focused)].

---

## Required Truths

### RT-1: Items Serve Both Business and Users
Every roadmap item has documented business alignment and user value articulation.
**Maps to:** B1, U1

### RT-2: "Now" Items Validated and Feasible
Current-cycle items are backed by research evidence and fit within team capacity with realistic buffer.
**Maps to:** T1, U2

### RT-3: Roadmap Is Living Document
Communication and review processes are active, ensuring the roadmap reflects current priorities and decisions.
**Maps to:** O1, O2

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Define the approving body for stakeholder buy-in in B3
- Set capacity buffer percentage in T1 appropriate for your team's interrupt rate
- Define review cadence in O2 based on your planning cycle
- Set communication cadence in O1 based on stakeholder expectations
- Define feedback integration frequency in U3

### Optional Additions
- Add competitive timing constraints for market-sensitive items
- Add regulatory deadline constraints for compliance-driven items
- Add platform/infrastructure constraints for technical foundation work
- Add hiring/team growth constraints if roadmap depends on future capacity
- Add customer commitment constraints for items promised to specific customers

### Common Removals
- Remove B4/partnership constraints if roadmap is internal-only
- Remove S1 if risk assessment is handled in a separate process
- Remove O3 if progress tracking is managed in a separate tool (e.g., Jira)
