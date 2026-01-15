# Scenario: Research/Analysis Decision

**Domain**: Research
**Decision**: What methodology should we use for our market research study?

## Constraints Discovered

### Goals (What outcomes matter?)

| ID | Type | Statement |
|----|------|-----------|
| G1 | invariant | Results must be statistically significant |
| G2 | goal | Actionable insights for product decisions |
| G3 | goal | Findings publishable in industry report |

### Feasibility (What's practically achievable?)

| ID | Type | Statement |
|----|------|-----------|
| F1 | boundary | Budget: $15,000 |
| F2 | boundary | Timeline: 6 weeks |
| F3 | boundary | Team: 2 researchers |

### Experience (How should stakeholders feel?)

| ID | Type | Statement |
|----|------|-----------|
| E1 | goal | Executives should trust the methodology |
| E2 | goal | Findings should be easy to communicate |
| E3 | invariant | No stakeholder should feel misrepresented |

### Risks (What could go wrong?)

| ID | Type | Statement |
|----|------|-----------|
| R1 | invariant | No sampling bias that invalidates results |
| R2 | boundary | Response rate must exceed 20% for validity |
| R3 | goal | Methodology must withstand peer scrutiny |

### Logistics (How will this work day-to-day?)

| ID | Type | Statement |
|----|------|-----------|
| L1 | boundary | Data collection complete by week 4 |
| L2 | goal | Automated data pipeline where possible |
| L3 | goal | Daily progress tracking |

## Tensions Identified

### TN1: Rigor vs Speed
- **Between**: G1 (statistical significance) ↔ F2 (6-week timeline)
- **Type**: Trade-off
- **Resolution**: Focus on key hypotheses only; broader exploration in follow-up study

### TN2: Sample Size vs Budget
- **Between**: R2 (20% response rate) ↔ F1 ($15K budget)
- **Type**: Resource tension
- **Resolution**: Incentivize responses ($10 gift cards); reduces sample pool cost

### TN3: Depth vs Breadth
- **Between**: G2 (actionable insights) ↔ G3 (publishable findings)
- **Type**: Trade-off
- **Resolution**: Prioritize actionability; academic rigor is secondary for industry research

### TN4: Methodology Dependencies
- **Between**: L1 (data by week 4) ↔ R1 (no sampling bias)
- **Type**: Hidden dependency
- **Resolution**: Proper sampling design BEFORE outreach; rushing recruitment introduces bias

## Evaluation

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Constraint Discovery | ✓ Strong | "Risks" prompted thinking about validity threats (R1, R2) |
| Tension Analysis | ✓ Strong | TN4 surfaced a critical dependency often overlooked |
| Decision Quality | ✓ Improved | Framework prevented common research shortcuts |
| Time Efficiency | ✓ Met | Completed in ~7 minutes |
| Terminology | ✓ Natural | All categories mapped well to research context |

## Verdict

**Framework Applicability**: HIGH

The framework is exceptionally well-suited for research methodology decisions. The structured approach mirrors how rigorous research should be designed. Key insight: the "Risks" category naturally maps to validity threats - a concept researchers understand deeply.

**Why it works so well**:
- Research already thinks in constraints (sample size, budget, timeline)
- Validity threats are essentially "security" for research
- Methodology selection is a constraint satisfaction problem

**Recommendation**: Research and analysis may be the strongest non-programming use case for Manifold.
