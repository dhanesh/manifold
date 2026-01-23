# Scenario: Product Launch Planning

**Domain**: Product Management
**Decision**: How should we launch the new mobile checkout feature?

## Context

A fintech company is launching a redesigned mobile checkout flow. The feature has been built, but the launch strategy needs to balance speed-to-market against risk. Key stakeholders include:

- **Product**: Wants to hit Q3 revenue targets
- **Engineering**: Concerned about scaling under load
- **Legal**: Requires compliance sign-off for payment changes
- **Support**: Worried about ticket volume
- **Marketing**: Planning a major campaign

Using Manifold, we'll surface all constraints before committing to a launch strategy.

## Manifold Setup

```bash
/m0-init mobile-checkout-launch --template=pm/feature-launch
```

## Constraints Discovered

### Business (Product Goals)

| ID | Type | Statement |
|----|------|-----------|
| B1 | invariant | Must not disrupt existing checkout conversion (>2% drop = rollback) |
| B2 | goal | Increase mobile conversion by 15% |
| B3 | boundary | Launch before Sept 15 to capture back-to-school traffic |
| B4 | goal | Generate $500K incremental revenue in first 30 days |

### Technical (Feasibility)

| ID | Type | Statement |
|----|------|-----------|
| T1 | invariant | System must handle 3x current peak load |
| T2 | boundary | Feature flag infrastructure supports gradual rollout |
| T3 | goal | Zero downtime during rollout |
| T4 | boundary | Performance monitoring must be in place before launch |

### User Experience (User Value)

| ID | Type | Statement |
|----|------|-----------|
| U1 | invariant | Checkout must complete in <30 seconds on 3G |
| U2 | boundary | Maximum 3 steps to complete purchase |
| U3 | goal | First-time user success rate >90% |
| U4 | goal | Reduce cart abandonment by 20% |

### Security (Risk)

| ID | Type | Statement |
|----|------|-----------|
| S1 | invariant | PCI-DSS compliance maintained |
| S2 | boundary | Legal sign-off required before GA |
| S3 | boundary | Fraud detection rules updated for new flow |
| S4 | goal | No increase in chargeback rate |

### Operational (Go-to-Market)

| ID | Type | Statement |
|----|------|-----------|
| O1 | invariant | Support team trained before any user exposure |
| O2 | boundary | Runbook exists for rollback scenario |
| O3 | goal | Marketing campaign aligned with rollout phases |
| O4 | boundary | Dashboard tracks conversion, errors, and support tickets in real-time |

## Tensions Identified

### TN1: Speed vs Safety

- **Between**: B3 (Sept 15 deadline) ↔ T1 (3x load handling)
- **Type**: Trade-off
- **Resolution**: Gradual rollout with load testing at each phase
- **Status**: Resolved

### TN2: Marketing vs Gradual Rollout

- **Between**: O3 (marketing campaign) ↔ T2 (gradual rollout)
- **Type**: Trade-off
- **Analysis**: Big marketing push conflicts with phased rollout
- **Resolution**: Marketing announces "coming soon" now, full campaign at 100% rollout
- **Status**: Resolved

### TN3: Legal Timeline

- **Between**: B3 (Sept 15) ↔ S2 (legal sign-off)
- **Type**: Hidden dependency
- **Analysis**: Legal review takes 2 weeks; submission deadline is Sept 1
- **Resolution**: Legal review submitted Aug 28; contingency plan if delayed
- **Status**: Resolved

### TN4: Support Readiness vs Speed

- **Between**: O1 (training complete) ↔ B3 (deadline)
- **Type**: Resource tension
- **Analysis**: Support training requires stable feature; feature finalizing Aug 25
- **Resolution**: Training Aug 26-30 on staging environment
- **Status**: Resolved

## Required Truths (Acceptance Criteria)

| ID | Statement | Status | Launch Gate |
|----|-----------|--------|-------------|
| RT-1 | Load test passes at 3x capacity | NOT_SATISFIED | Phase 2 |
| RT-2 | Legal sign-off received | NOT_SATISFIED | Phase 3 |
| RT-3 | Support team achieves 100% training completion | NOT_SATISFIED | Phase 2 |
| RT-4 | Monitoring dashboard operational | NOT_SATISFIED | Phase 1 |
| RT-5 | Rollback tested successfully | NOT_SATISFIED | Phase 1 |

## Launch Plan (Derived from Constraints)

### Phase 1: Internal (Sept 1-3)
- **Audience**: Employees only (0.1% traffic)
- **Gate**: RT-4, RT-5 must be SATISFIED
- **Success criteria**: No critical bugs, rollback tested

### Phase 2: Controlled (Sept 4-8)
- **Audience**: 5% of mobile traffic
- **Gate**: RT-1, RT-3 must be SATISFIED
- **Success criteria**: Conversion within 5% of baseline, error rate <1%

### Phase 3: Expanded (Sept 9-12)
- **Audience**: 25% of mobile traffic
- **Gate**: RT-2 must be SATISFIED
- **Success criteria**: Conversion improving, support tickets manageable

### Phase 4: General Availability (Sept 13-15)
- **Audience**: 100% of mobile traffic
- **Gate**: All required truths SATISFIED
- **Marketing**: Full campaign launch
- **Success criteria**: B2 target (15% conversion improvement) on track

## Risk Mitigation Matrix

| Risk | Constraint | Mitigation | Owner |
|------|------------|------------|-------|
| Load spike on Sept 15 | T1 | CDN scaling + alert on p95 latency | Infra |
| Legal delay | S2 | Parallel track: extend Phase 2 if needed | Legal |
| Support overwhelm | O1 | Temporary staff on standby | Support |
| Fraud increase | S4 | Real-time fraud monitoring, manual review queue | Risk |
| Conversion drop | B1 | Auto-rollback trigger at >2% drop | Product |

## Generated PRD

Using `/m4-generate mobile-checkout-launch --prd`:

```markdown
# PRD: Mobile Checkout Launch

## Problem Statement
Launch redesigned mobile checkout to increase conversion by 15% while maintaining
system stability and compliance.

## Success Metrics
- Mobile conversion: +15% (B2)
- Cart abandonment: -20% (U4)
- Revenue: +$500K in 30 days (B4)
- Error rate: <1%
- Rollback trigger: >2% conversion drop (B1)

## Requirements

### Must Have (Invariants)
- [B1] Conversion protection with auto-rollback
- [T1] 3x load capacity verified
- [U1] Sub-30-second checkout on 3G
- [S1] PCI-DSS compliance maintained
- [O1] Support training complete

### Should Have (Boundaries)
- [T4] Pre-launch monitoring
- [S2] Legal sign-off
- [O2] Rollback runbook
- [O4] Real-time dashboard

### Nice to Have (Goals)
- [B4] $500K revenue target
- [U3] 90% first-time success
- [O3] Marketing alignment

## Out of Scope
- Desktop checkout changes
- International payment methods
- Loyalty program integration

## Dependencies
- Legal review: Submit by Aug 28 (S2)
- Load testing: Complete by Sept 3 (T1)
- Support training: Complete by Aug 30 (O1)

## Risks & Mitigations
See Risk Mitigation Matrix above.

## Open Questions
- Fraud rule tuning: How aggressive? (S3, S4)
- Marketing timing: Soft launch or big bang? (O3) → Resolved: Phased

---
_Generated from `.manifold/mobile-checkout-launch.yaml`_
_Traces: B1-B4, T1-T4, U1-U4, S1-S4, O1-O4_
```

## Generated User Stories

Using `/m4-generate mobile-checkout-launch --stories`:

```markdown
# User Stories: Mobile Checkout Launch

## Epic: Increase mobile checkout conversion by 15%

### US-1: Quick Checkout Flow
**As a** mobile shopper
**I want** to complete checkout in 3 steps or fewer
**So that** I can purchase quickly while on the go

**Acceptance Criteria:**
- [ ] Checkout completes in ≤3 steps (U2)
- [ ] Total time <30 seconds on 3G (U1)
- [ ] First-time users succeed >90% of attempts (U3)

**Traces to:** U1, U2, U3

---

### US-2: Reliable Purchase
**As a** returning customer
**I want** my saved payment methods to work seamlessly
**So that** I don't have to re-enter payment details

**Acceptance Criteria:**
- [ ] Saved cards load within 2 seconds
- [ ] No conversion regression >2% (B1)
- [ ] PCI compliance maintained (S1)

**Traces to:** B1, S1, U4

---

### US-3: Confident Purchase
**As a** first-time buyer
**I want** clear progress indicators and error messages
**So that** I know my purchase will succeed

**Acceptance Criteria:**
- [ ] Progress indicator visible at each step
- [ ] Error messages are actionable
- [ ] Support contact accessible if stuck

**Traces to:** U3, O1

## Story Map

| Priority | Story | Constraints | Status |
|----------|-------|-------------|--------|
| P0 | US-1: Quick Checkout | U1, U2, U3 | Ready |
| P0 | US-2: Reliable Purchase | B1, S1, U4 | Ready |
| P1 | US-3: Confident Purchase | U3, O1 | Ready |
```

## Evaluation

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Constraint Discovery | ✓ Strong | Surfaced legal timeline dependency early |
| Tension Analysis | ✓ Strong | TN2 (marketing vs gradual) required creative resolution |
| Decision Quality | ✓ Improved | Phased launch plan derived from constraints |
| PRD Generation | ✓ Useful | Structured document with clear traceability |
| Story Generation | ✓ Useful | Acceptance criteria from required truths |
| Stakeholder Alignment | ✓ Strong | Each stakeholder's constraints visible |

## Verdict

**Framework Applicability**: HIGH

This scenario demonstrates Manifold's strength in cross-functional launches. The constraint discovery process forced early conversations about legal timeline (TN3) and support readiness (TN4) that typically emerge as blockers mid-launch. The phased rollout plan was derived directly from constraints rather than arbitrary milestones.

The PRD and user story generation (`--prd --stories`) produced artifacts that could be directly shared with stakeholders, with clear traceability back to the constraints they satisfy.
