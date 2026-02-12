# mobile-checkout-redesign

Product Management Example - Feature Launch Workflow.
This example shows how PMs can use Manifold for PRD and user story generation.
Template: pm/feature-launch

## Outcome

Increase mobile checkout conversion by 15% while maintaining system stability

---

## Constraints

### Business

#### B1: Conversion Protection
Must not cause conversion regression exceeding 2%.
> **Rationale:** Protect existing revenue while pursuing improvements.

#### B2: Conversion Improvement
Increase mobile checkout conversion by 15%.
> **Rationale:** Primary success metric; mobile is 60% of traffic.

#### B3: Launch Deadline
Launch before September 15 for back-to-school traffic.
> **Rationale:** Seasonal opportunity window; delays reduce ROI.

#### B4: Revenue Target
Generate $500K incremental revenue in first 30 days.
> **Rationale:** Financial justification for Q4 budget approval.

### Technical

#### T1: Engineering Capacity
Engineering effort must not exceed 3 sprints.
> **Rationale:** Team capacity constraint; competing priorities.

#### T2: Payment Gateway Integration
Must integrate with existing payment gateway.
> **Rationale:** No infrastructure changes approved this quarter.

#### T3: Mobile Performance
Page load time must remain under 3 seconds on 3G.
> **Rationale:** Performance regression hurts mobile conversion.

#### T4: Feature Flag Infrastructure
Feature flag infrastructure for gradual rollout.
> **Rationale:** Risk mitigation through controlled release.

### User Experience

#### U1: Workflow Continuity
Must not break existing user checkout workflows.
> **Rationale:** Returning users have learned current flow.

#### U2: Checkout Steps
Checkout must complete in 3 steps or fewer.
> **Rationale:** Each step adds abandonment risk.

#### U3: First-Time Success
First-time user success rate above 90%.
> **Rationale:** Self-service checkout reduces support burden.

#### U4: Cart Abandonment Reduction
Reduce cart abandonment by 20% at payment step.
> **Rationale:** Payment step has highest drop-off; primary opportunity.

### Security

#### S1: PCI-DSS Compliance
PCI-DSS compliance must be maintained.
> **Rationale:** Payment processing requirement; non-negotiable.

#### S2: Legal Review
Legal review must approve before GA rollout.
> **Rationale:** Terms of service and privacy policy implications.

#### S3: Chargeback Monitoring
No increase in chargeback rate.
> **Rationale:** Fraud risk with new flow needs monitoring.

### Operational

#### O1: Support Training
Support team trained before any user exposure.
> **Rationale:** Untrained support damages launch success.

#### O2: Rollback Capability
Rollback capability within 1 hour of issue detection.
> **Rationale:** Safety net for production issues.

#### O3: Real-Time Dashboard
Real-time dashboard for conversion and error monitoring.
> **Rationale:** Data-driven decision making during rollout.

#### O4: Marketing Coordination
Marketing campaign coordinated with rollout phases.
> **Rationale:** Maximize impact of launch announcement.

---

## Tensions

### TN1: September Deadline vs Sprint Capacity
September deadline vs 3-sprint capacity.
> **Resolution:** MVP scope for Sept 15; Phase 2 features in October.

### TN2: Big Marketing Push vs Gradual Rollout
Big marketing push vs gradual rollout.
> **Resolution:** Soft launch Aug 15; marketing campaign at 50% rollout.

### TN3: Legal Review vs September Deadline
Legal review (2 weeks) vs September deadline.
> **Resolution:** Submit for review Aug 25; contingency plan if delayed.

### TN4: Support Training vs Feature Stability
Support training requires stable feature; feature finalizing late.
> **Resolution:** Training Aug 28-Sept 5 on staging environment.

---

## Required Truths

### RT-1: Metrics Instrumented
Success metrics are instrumented and dashboards operational.
**Maps to:** B2, O3
**Status:** SATISFIED
**Evidence:**
- Analytics events deployed: checkout_started, payment_submitted, order_completed
- Grafana dashboard PR merged: #1234

### RT-2: Purchase Completion
User can complete purchase without regression in conversion.
**Maps to:** U1, U2, B1
**Status:** PARTIAL
**Evidence:**
- User testing: 8/10 completed successfully
- A/A test shows 0.5% variance (within tolerance)
**Gaps:**
- Need larger sample A/B test before full rollout

### RT-3: Rollback Tested
Rollback path tested and documented.
**Maps to:** O2, T4
**Status:** SATISFIED
**Evidence:**
- Feature flag tested in staging
- Runbook reviewed by on-call team

### RT-4: Stakeholder Alignment
All stakeholders aligned on success criteria and timeline.
**Maps to:** B2, B3, B4
**Status:** SATISFIED
**Evidence:**
- Stakeholder sign-off meeting Aug 10
- OKR alignment documented in confluence

---

## Customization Applied

**Changes Made:**
- Set primary metric to 15% conversion improvement (B2)
- Set timeline to September 15 (B3)
- Set engineering capacity to 3 sprints (T1)
- Added PCI-DSS compliance (S1)

**Additions:**
- Added marketing coordination constraint (O4)
- Added chargeback monitoring (S3)

---

## Generation

Artifacts generated via `/manifold:m4-generate --prd --stories`:
- `docs/mobile-checkout-redesign/PRD.md` — Structured PRD (covers 14 constraints)
- `docs/mobile-checkout-redesign/STORIES.md` — User stories (covers U1-U4)
- Coverage: 17/17 constraints (100%)
