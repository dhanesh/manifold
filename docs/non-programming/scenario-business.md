# Scenario: Business Decision

**Domain**: Business
**Decision**: Should our startup expand to a second city?

## Constraints Discovered

### Goals (What outcomes matter?)

| ID | Type | Statement |
|----|------|-----------|
| G1 | goal | Increase revenue by 40% within 18 months |
| G2 | invariant | Must not jeopardize current market position |
| G3 | goal | Establish brand presence in new market |

### Feasibility (What's practically achievable?)

| ID | Type | Statement |
|----|------|-----------|
| F1 | boundary | Available capital: $200K for expansion |
| F2 | boundary | Current team bandwidth: 20% available |
| F3 | goal | Hire local team within 3 months |

### Experience (How should stakeholders feel?)

| ID | Type | Statement |
|----|------|-----------|
| E1 | goal | Existing customers should see no service degradation |
| E2 | goal | New city customers should have equivalent experience |
| E3 | boundary | Response time SLA maintained across both markets |

### Risks (What could go wrong?)

| ID | Type | Statement |
|----|------|-----------|
| R1 | invariant | Cannot expose company to bankruptcy risk |
| R2 | goal | Minimize regulatory compliance gaps |
| R3 | boundary | Maximum acceptable loss: $100K if expansion fails |

### Logistics (How will this work day-to-day?)

| ID | Type | Statement |
|----|------|-----------|
| L1 | goal | Single management structure across cities |
| L2 | boundary | Weekly sync between locations |
| L3 | goal | Unified tooling and processes |

## Tensions Identified

### TN1: Growth vs Stability
- **Between**: G1 (40% revenue growth) ↔ G2 (protect current position)
- **Type**: Trade-off
- **Resolution**: Phased expansion - secure current market first, then gradual rollout

### TN2: Speed vs Budget
- **Between**: F3 (hire in 3 months) ↔ F1 ($200K budget)
- **Type**: Resource tension
- **Resolution**: Start with contractors, convert to full-time after validation

### TN3: Experience Parity vs Resources
- **Between**: E2 (equivalent new-city experience) ↔ F2 (20% bandwidth)
- **Type**: Hidden dependency
- **Resolution**: E2 depends on F3 (local team) - cannot achieve parity without local presence

## Evaluation

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Constraint Discovery | ✓ Strong | Categories surfaced risks (R1, R3) that weren't initially considered |
| Tension Analysis | ✓ Strong | TN3 revealed a hidden dependency between Experience and Feasibility |
| Decision Quality | ✓ Improved | Structured approach prevented overlooking financial safeguards |
| Time Efficiency | ✓ Met | Completed in ~8 minutes |
| Terminology | ✓ Natural | "Goals" and "Feasibility" felt intuitive for business context |

## Verdict

**Framework Applicability**: HIGH

The constraint-first approach translated well to business decisions. The renamed categories (Goals/Feasibility/Experience/Risks/Logistics) mapped naturally to business thinking. Tension analysis was particularly valuable for surfacing the hidden dependency between customer experience goals and hiring feasibility.
