# Shape Up Pitch Constraint Template

Use: `/manifold:m0-init <feature> --template=pm/shape-up-pitch`
Covers: Shaped pitches for betting table decisions, fixed-appetite projects, de-risked solutions

## Outcome

[CUSTOMIZE: e.g., 'Shaped pitch ready for betting table with problem defined, solution sketched, risks identified, and appetite set']

### Framework Mapping

This template adapts Basecamp's Shape Up methodology to Manifold's constraint model. Problem (B1) = 'Raw Idea' refined into a clear problem statement. Appetite (B2) = fixed time budget, not an estimate. Shaped Solution (T1) = breadboard or fat-marker sketch at the right abstraction level. Rabbit Holes (T2) = identified technical risks with mitigations. No-Gos (U2) = explicit scope exclusion. Betting Table (O1) = decision process format.

---

## Constraints

### Business

#### B1: Problem Definition
Problem articulated from user perspective, not solution perspective. Describes what users struggle with, not what the team wants to build.
> **Rationale:** Solution-first thinking skips the most important step: understanding whether the problem is worth solving. A well-defined problem constrains the solution space to things that actually help users.

#### B2: Appetite
Fixed time budget of [CUSTOMIZE: e.g., 6 weeks] maximum. This is a budget, not an estimate. The team must find a solution that fits within the appetite.
> **Rationale:** Appetite inverts the typical estimation dynamic. Instead of asking "how long will this take?" it asks "how much time is this problem worth?" This prevents scope creep and forces creative constraint.

### Technical

#### T1: Shaped Solution
Solution shaped at the right level of abstraction: detailed enough to show feasibility, abstract enough to leave room for implementation decisions. Uses breadboard (flow/connections) or fat-marker (visual concept) sketches.
> **Rationale:** Over-specified solutions remove agency from the build team. Under-specified solutions create ambiguity that wastes the appetite on discovery. The right abstraction level communicates intent without dictating implementation.

#### T2: Rabbit Holes Identified
[CUSTOMIZE: e.g., 3] potential rabbit holes flagged with specific mitigations or explicit decisions to avoid them.
> **Rationale:** Rabbit holes are the primary risk to fixed-appetite projects. Identifying them during shaping prevents the build team from discovering them mid-cycle when options are limited.

### User Experience

#### U1: Core Flow Defined
Core user flow sketched showing the primary path through the solution. Not pixel-perfect design, but clear enough to evaluate the approach.
> **Rationale:** The core flow is the backbone of the shaped solution. Without it, the pitch describes a concept but not an experience. The sketch proves the solution works for the user, not just on paper.

#### U2: No-Gos Listed
Explicitly excluded scope documented with rationale for each exclusion. What this project deliberately does NOT do.
> **Rationale:** No-gos are as important as the solution itself. They prevent scope creep, set expectations, and free the build team from debating what is out of scope mid-cycle.

#### U3: Appetite Fit
Solution fits within the appetite without cutting core value. If the solution cannot deliver its core value within the appetite, it needs reshaping.
> **Rationale:** A solution that technically fits the appetite but delivers a hollow experience is worse than no solution. Appetite fit means the core value is preserved, not just the timeline.

### Security

#### S1: Risk Level
Risk assessed as low, medium, or high with justification based on technical unknowns, integration complexity, and team familiarity.
> **Rationale:** Risk level informs the betting table decision. High-risk pitches may need additional shaping, smaller appetite, or a spike before committing. Transparent risk assessment enables informed bets.

### Operational

#### O1: Betting Table Ready
Pitch formatted for betting table decision with clear problem, appetite, solution sketch, rabbit holes, and no-gos. Decision-makers can evaluate without additional context.
> **Rationale:** The betting table is a time-constrained decision forum. Pitches that require lengthy explanation or additional research waste the table's time and reduce decision quality.

#### O2: Team Sizing
Suggested team size and composition documented with rationale for the recommended configuration.
> **Rationale:** Team sizing affects both the quality of the solution and the opportunity cost. Documenting the recommendation enables the betting table to evaluate resource allocation alongside the pitch itself.

---

## Tensions

### TN1: Fixed Appetite vs Solution Completeness
The fixed time budget (B2) may not accommodate the full solution needed to preserve core value (U3). Appetite constrains what can be built; user value demands what must be built.
> **Resolution:** [CUSTOMIZE: If the solution cannot fit the appetite, reshape rather than extend. Consider splitting into multiple pitches, reducing scope via no-gos, or increasing appetite with explicit justification].

### TN2: Solution Detail vs Rabbit Hole Avoidance
Shaping the solution in sufficient detail (T1) requires exploring areas that could become rabbit holes (T2). More detail increases clarity but also increases the risk of over-specification.
> **Resolution:** [CUSTOMIZE: Shape to the breadboard/fat-marker level only. If deeper detail is needed to assess a rabbit hole, do a focused spike rather than shaping the entire solution deeper].

### TN3: Core Flow Definition vs Scope Exclusion
Defining the core flow (U1) inherently clarifies what is excluded (U2). Changes to the core flow may invalidate previous no-go decisions, and vice versa.
> **Resolution:** [CUSTOMIZE: Define the core flow first, then derive no-gos from it. Review no-gos whenever the core flow changes to ensure consistency].

---

## Required Truths

### RT-1: Problem Worth Solving
The problem is articulated from the user perspective with evidence that it is significant enough to justify the proposed appetite.
**Maps to:** B1, U1

### RT-2: Solution Shaped and De-Risked
The solution is at the right abstraction level with major rabbit holes identified and mitigated, giving the build team a clear starting point.
**Maps to:** T1, T2

### RT-3: Pitch Ready for Betting Table
The pitch is complete with appetite, formatted for decision-making, and can be evaluated without additional context or research.
**Maps to:** B2, O1

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Set the appetite in B2 based on the problem's worth (typically 2 or 6 weeks in Shape Up)
- Identify the specific rabbit holes for T2 based on your technical context
- Define the core flow in U1 with breadboard or fat-marker sketches
- List the explicit no-gos in U2 based on appetite constraints

### Optional Additions
- Add customer demand constraints if the pitch addresses specific customer requests
- Add competitive urgency constraints if market timing is a factor
- Add technical debt constraints if the pitch addresses infrastructure improvements
- Add learning objective constraints if the pitch includes experimental elements
- Add cross-team coordination constraints if the build requires other teams

### Common Removals
- Remove O2 if team sizing is determined by the betting table, not the pitch
- Remove S1 if risk assessment is standard/low for your context
- Remove B4 if the pitch does not involve partnership dependencies
