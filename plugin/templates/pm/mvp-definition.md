# MVP Definition Constraint Template

Use: `/manifold:m0-init <product> --template=pm/mvp-definition`
Covers: Minimum viable product scoping, MoSCoW prioritization, build-measure-learn cycle definition

## Outcome

[CUSTOMIZE: e.g., 'Shippable MVP that solves the core user problem and validates key business assumptions within timeline']

### Framework Mapping

This template combines Atlassian's MVP planning with Lean Startup's build-measure-learn methodology. MoSCoW prioritization drives T1 (scope). Learning objectives (B2) connect to Lean Startup's hypothesis validation. Quality vs speed tensions (TN1-TN3) are the core MVP trade-offs.

---

## Constraints

### Business

#### B1: Core Problem Solved
MVP solves the #1 user problem completely — not partially, not approximately, but well enough that a user would choose it over their current workaround.
> **Rationale:** An MVP that partially solves many problems validates nothing. Complete solution of one problem validates product-market fit.

#### B2: Learning Objectives
Validates [CUSTOMIZE: e.g., 3] key assumptions with specific success/failure criteria defined before launch.
> **Rationale:** The purpose of an MVP is to learn, not to ship. Every MVP must have explicit hypotheses it tests.

#### B3: Launch Timeline
MVP launches within [CUSTOMIZE: e.g., 12] weeks from start of development.
> **Rationale:** Time-boxing forces scope discipline. An MVP that takes 6 months is not minimal.

### Technical

#### T1: Scope Boundary
Only features above the MoSCoW "Must Have" line are included. "Should Have" features are documented but deferred.
> **Rationale:** Scope creep is the primary killer of MVPs. The MoSCoW boundary is a hard line, not a suggestion.

#### T2: Technical Debt Budget
Acceptable technical debt documented with specific payback plan and timeline for each debt item.
> **Rationale:** MVPs incur debt by design. Undocumented debt becomes permanent. A payback plan makes debt a conscious choice.

#### T3: Quality Minimum
Core user flows have zero critical bugs and zero data-loss scenarios. Non-core flows may have known limitations.
> **Rationale:** Users tolerate missing features but not broken features. Quality on the core path is non-negotiable.

### User Experience

#### U1: Core Workflow Complete
End-to-end core workflow functions from first action to desired outcome without dead ends or workarounds.
> **Rationale:** An incomplete workflow is not viable. Users must be able to accomplish their primary goal entirely within the product.

#### U2: Onboarding Simplicity
New user productive within [CUSTOMIZE: e.g., 5] minutes without external documentation or support.
> **Rationale:** MVP users are evaluators. If onboarding is painful, they leave before experiencing the core value.

#### U3: Feedback Loop
Built-in mechanism for users to provide feedback, report issues, and request features.
> **Rationale:** The MVP's learning objectives require user input. A feedback mechanism is infrastructure for learning, not a feature.

### Security

#### S1: Data Protection
User data protected per [CUSTOMIZE: e.g., applicable regulatory standard] even in MVP. No security shortcuts on user data.
> **Rationale:** Data breaches in MVP phase are still data breaches. Users trust the product with their data regardless of the product's maturity stage.

#### S2: Auth Basics
Authentication meets minimum security bar: [CUSTOMIZE: e.g., hashed passwords, HTTPS, session management].
> **Rationale:** Authentication is a trust gate. Weak auth in MVP creates a security debt that is expensive and embarrassing to fix post-launch.

### Operational

#### O1: Deployment Path
Deployable to production environment with [CUSTOMIZE: e.g., a single command or CI/CD pipeline].
> **Rationale:** An MVP that cannot be deployed is not viable. Deployment infrastructure is part of the minimum.

#### O2: Monitoring Basics
Core metrics (uptime, error rate, response time, key business metrics) observable from day one.
> **Rationale:** Operating blind prevents learning. Monitoring is the infrastructure that enables the "Measure" step of build-measure-learn.

#### O3: Support Plan
Early adopter support process defined with response time commitments and escalation path.
> **Rationale:** Early adopters are investors in the product's future. Poor support experience in MVP phase loses the most valuable users.

---

## Tensions

### TN1: Scope Completeness vs Timeline
Including all "Must Have" features (T1) may push beyond the launch timeline (B3). The tension is between delivering a complete core experience and shipping on time.
> **Resolution:** [CUSTOMIZE: Re-evaluate the MoSCoW line. If Must Haves exceed timeline, either the timeline or the definition of "must" is wrong. Challenge both].

### TN2: Quality Bar vs Speed to Market
Achieving zero critical bugs on core flows (T3) requires testing time that competes with the launch timeline (B3).
> **Resolution:** [CUSTOMIZE: Define the core flows explicitly and limit quality investment to those flows. Accept known limitations on non-core paths].

### TN3: Onboarding Polish vs Timeline Pressure
A smooth onboarding experience (U2) requires design and iteration time that the timeline (B3) may not accommodate.
> **Resolution:** [CUSTOMIZE: Define the minimum viable onboarding — the simplest path that gets a user to first value. Defer polish to post-MVP].

### TN4: Monitoring Requires Scope Decisions
Knowing what to monitor (O2) depends on knowing what is in scope (T1). Monitoring design cannot be finalized until scope is locked.
> **Resolution:** [CUSTOMIZE: Define monitoring for the core workflow first. Add monitoring for other flows as scope decisions are finalized].

---

## Required Truths

### RT-1: Scope Achieves Core Value
The scoped feature set (Must Haves only) is sufficient to solve the core user problem completely.
**Maps to:** T1, B1

### RT-2: User Can Complete Core Task
A real user can complete the core workflow from start to finish without assistance.
**Maps to:** U1, B1

### RT-3: Shippable with Known Debt
The MVP is deployable to production with all technical debt documented, accepted, and scheduled for payback.
**Maps to:** T2, O1

### RT-4: Learning Goals Fit Timeline
The learning objectives are achievable within the launch timeline with the defined scope.
**Maps to:** B2, B3

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific context
- Define the #1 user problem explicitly in B1 — if you cannot state it, scope is unclear
- List the specific key assumptions to validate in B2
- Create the MoSCoW list and draw the "Must Have" line for T1
- Document acceptable technical debt items in T2 with payback dates

### Optional Additions
- Add analytics constraints if learning objectives require specific instrumentation
- Add performance constraints if the core workflow has latency sensitivity
- Add accessibility constraints if the target users require assistive technology support
- Add localization constraints if MVP targets non-English-speaking markets

### Common Removals
- Remove U3 if using external feedback tools (surveys, interviews) instead of in-product feedback
- Remove O3 if the MVP is for internal users with direct access to the development team
- Remove O2 if the MVP is a one-time experiment that will not be operated long-term

---

**See Also:** Previous -> [Lean Canvas](./lean-canvas.md) | After MVP -> use [Feature Launch](./feature-launch.md) for individual features | [Greenfield Workflow Guide](../../docs/pm/guide.md#greenfield-workflow)
