# Scenario: Personal Life Decision

**Domain**: Personal
**Decision**: Should I relocate to a new city for a job opportunity?

## Constraints Discovered

### Goals (What outcomes matter?)

| ID | Type | Statement |
|----|------|-----------|
| G1 | goal | Advance career trajectory (senior role) |
| G2 | goal | Increase compensation by 25%+ |
| G3 | invariant | Maintain close family relationships |

### Feasibility (What's practically achievable?)

| ID | Type | Statement |
|----|------|-----------|
| F1 | boundary | Must decide within 2 weeks |
| F2 | boundary | Partner's job is remote-flexible |
| F3 | goal | Find housing within budget ($2,500/month) |

### Experience (How should life feel?)

| ID | Type | Statement |
|----|------|-----------|
| E1 | goal | New city should offer good quality of life |
| E2 | invariant | Must not negatively impact mental health |
| E3 | goal | Maintain hobbies and social connections |

### Risks (What could go wrong?)

| ID | Type | Statement |
|----|------|-----------|
| R1 | boundary | Job must have 6-month stability guarantee |
| R2 | goal | Have exit strategy if relocation doesn't work |
| R3 | invariant | Cannot take on unsustainable debt |

### Logistics (How will this work day-to-day?)

| ID | Type | Statement |
|----|------|-----------|
| L1 | goal | Commute under 30 minutes |
| L2 | boundary | Visit family at least quarterly |
| L3 | goal | Establish new social network within 6 months |

## Tensions Identified

### TN1: Career vs Family
- **Between**: G1 (career advancement) ↔ G3 (family relationships)
- **Type**: Trade-off
- **Resolution**: L2 (quarterly visits) plus regular video calls; accept some trade-off

### TN2: Timeline vs Housing
- **Between**: F1 (2-week decision) ↔ F3 (find housing in budget)
- **Type**: Resource tension
- **Resolution**: Temporary housing for first 2 months; proper search after arrival

### TN3: Social Life Dependency
- **Between**: E3 (maintain social connections) ↔ L3 (build new network)
- **Type**: Hidden dependency
- **Resolution**: E3 cannot be fully satisfied until L3 is achieved - plan for 6-month adjustment period

### TN4: Compensation vs Cost of Living
- **Between**: G2 (25% raise) ↔ F3 (housing budget)
- **Type**: Hidden dependency
- **Resolution**: Calculate net gain after cost-of-living adjustment; 25% gross may only be 10% net

## Evaluation

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Constraint Discovery | ✓ Strong | "Risks" category prompted exit strategy thinking (R2) |
| Tension Analysis | ✓ Strong | TN4 revealed that gross salary increase isn't the real metric |
| Decision Quality | ✓ Improved | Framework prevented emotional decision; surfaced hidden costs |
| Time Efficiency | ✓ Met | Completed in ~7 minutes |
| Terminology | ◐ Mostly | "Feasibility" felt slightly technical for personal decisions |

## Verdict

**Framework Applicability**: HIGH

The framework translated well to personal decisions. Key insight: the "Risks" category, which maps from Security, was unexpectedly valuable for life decisions - it prompted thinking about exit strategies and financial safeguards that emotional decision-making often overlooks.

**Terminology Note**: "Feasibility" works but "Practicalities" might feel more natural for personal contexts.
