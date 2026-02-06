# Feature Launch Constraint Template

Use: `/m0-init <feature> --template=pm/feature-launch`
Covers: New features, product launches, major enhancements

## Outcome

[CUSTOMIZE: e.g., 'Increase checkout conversion by 15% while maintaining support volume']

---

## Constraints

### Business

#### B1: Revenue Protection
Feature must not negatively impact existing revenue streams.
> **Rationale:** Protect core business while pursuing growth.
> **CUSTOMIZE:** Add specific revenue protection requirements.

#### B2: Primary Success Metric
[CUSTOMIZE: Primary success metric, e.g., 'Increase DAU by 15%'].
> **Rationale:** Primary KPI that defines feature success.

#### B3: Launch Timeline
Launch must occur within [CUSTOMIZE: Q3 2025] to meet business objectives.
> **Rationale:** Timeline tied to annual planning, competitive pressure, or market window.

#### B4: Adoption Target
Feature adoption target: [CUSTOMIZE: 60%] of eligible users within 30 days.
> **Rationale:** Adoption rate indicates product-market fit.

### Technical

#### T1: Engineering Capacity
Engineering effort must not exceed [CUSTOMIZE: 2 sprints] of capacity.
> **Rationale:** Capacity constraint based on team availability and competing priorities.

#### T2: System Integration
Must integrate with existing [CUSTOMIZE: authentication/payments/etc.] system.
> **Rationale:** Avoid duplicate infrastructure; leverage existing investments.

#### T3: Mobile Performance
Page load time must remain under [CUSTOMIZE: 3s] on mobile networks.
> **Rationale:** Performance regression would hurt overall user experience.

#### T4: Design System Reuse
Reuse existing design system components where possible.
> **Rationale:** Faster development, consistent UX, reduced testing burden.

### User Experience

#### U1: Workflow Preservation
Must not break existing user workflows or learned behaviors.
> **Rationale:** Protect existing user satisfaction and reduce retraining burden.

#### U2: Task Simplicity
Core task must complete in [CUSTOMIZE: 3] clicks or fewer.
> **Rationale:** Simplicity drives adoption and satisfaction.

#### U3: NPS Improvement
Target NPS improvement of [CUSTOMIZE: +5 points] post-launch.
> **Rationale:** User satisfaction metric tied to feature value.

#### U4: Friction Reduction
Reduce user-reported friction by [CUSTOMIZE: 25%] for this workflow.
> **Rationale:** Addresses known pain points from user research.

### Security

#### S1: Regulatory Compliance
Must comply with [CUSTOMIZE: GDPR/CCPA/HIPAA] for user data handling.
> **Rationale:** Legal compliance is non-negotiable.

#### S2: Legal Review
Legal review must approve feature before public launch.
> **Rationale:** Mitigate regulatory and liability risks.

#### S3: Competitive Protection
Minimize competitive exposure by [CUSTOMIZE: avoiding public preview].
> **Rationale:** Protect competitive advantage until launch.

### Operational

#### O1: Support Training
Support team must be trained before launch.
> **Rationale:** Poor support experience damages feature adoption and brand.

#### O2: Gradual Rollout
Feature must support gradual rollout (feature flag).
> **Rationale:** Risk mitigation through controlled release.

#### O3: Monitoring Dashboard
Dashboard ready for monitoring [CUSTOMIZE: key metrics] at launch.
> **Rationale:** Data-driven decision making requires observability.

#### O4: Documentation
Documentation and help content published before GA.
> **Rationale:** Self-service support reduces ticket volume.

---

## Tensions

### TN1: Feature Scope vs Engineering Capacity
Full feature scope (B2) vs engineering capacity (T1).
> **Resolution:** [CUSTOMIZE: Consider MVP approach or phased delivery].

### TN2: Timeline vs User Experience
Timeline pressure (B3) vs user experience quality (U3).
> **Resolution:** [CUSTOMIZE: Define must-have vs nice-to-have UX elements].

### TN3: Optimal UX vs Component Reuse
Optimal UX (U4) may require new components vs reuse goal (T4).
> **Resolution:** [CUSTOMIZE: Evaluate new component ROI].

### TN4: Support Training vs Timeline
Support training (O1) requires feature stability before deadline (B3).
> **Resolution:** [CUSTOMIZE: Build training buffer into timeline].

---

## Required Truths

### RT-1: Measurable Success
Success metric is measurable and instrumented.
**Maps to:** B2, O3

### RT-2: Self-Service Workflow
User can complete core workflow without assistance.
**Maps to:** U1, U2, U4

### RT-3: Rollback Path
Rollback path exists if critical issues emerge.
**Maps to:** O2, B1

### RT-4: Stakeholder Alignment
Stakeholders aligned on success criteria and timeline.
**Maps to:** B2, B3, B4

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Define primary success metric in B2
- Set realistic timeline in B3
- Adjust engineering capacity in T1
- Specify compliance requirements in S1

### Optional Additions
- Add competitive constraints if market timing matters
- Add integration constraints for third-party dependencies
- Add localization constraints for international launches
- Add accessibility constraints (WCAG compliance)
- Add pricing constraints if monetization involved

### Common Removals
- Remove S3 if feature is not competitively sensitive
- Remove U4 if not addressing existing pain points
- Remove O4 if documentation not required for launch
