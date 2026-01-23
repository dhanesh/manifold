# Scenario: Feature Prioritization

**Domain**: Product Management
**Decision**: Which features should we prioritize for Q3 roadmap?

## Context

A PM team needs to prioritize five potential features for the Q3 roadmap, but can only deliver two due to engineering capacity constraints. The features are:

1. **Advanced Search** - AI-powered search improvements
2. **Mobile Redesign** - Complete mobile app refresh
3. **API V2** - New API for enterprise integrations
4. **Analytics Dashboard** - Self-service analytics for users
5. **Social Features** - Sharing and collaboration

Using Manifold, we'll make constraints explicit and surface tensions to guide the decision.

## Constraints Discovered

### Business (Product Goals)

| ID | Type | Statement |
|----|------|-----------|
| B1 | invariant | Must support Q3 revenue target of +15% |
| B2 | goal | Increase enterprise segment revenue |
| B3 | goal | Improve user retention (reduce churn by 10%) |
| B4 | boundary | Available engineering: 2 features max |

### Technical (Feasibility)

| ID | Type | Statement |
|----|------|-----------|
| T1 | boundary | Mobile Redesign requires iOS + Android teams (6 weeks) |
| T2 | boundary | API V2 requires security review (adds 2 weeks) |
| T3 | goal | Prefer features that leverage existing infrastructure |
| T4 | boundary | Advanced Search needs ML team involvement |

### User Experience (User Value)

| ID | Type | Statement |
|----|------|-----------|
| U1 | invariant | Must not degrade existing user workflows |
| U2 | goal | Address top user feedback theme (search complaints) |
| U3 | goal | Improve mobile NPS from 32 to 45 |
| U4 | boundary | Analytics must be self-service (no support burden) |

### Security (Risk)

| ID | Type | Statement |
|----|------|-----------|
| S1 | boundary | API V2 requires SOC2 compliance validation |
| S2 | goal | Minimize competitive exposure during development |
| S3 | invariant | Social features must pass privacy review |

### Operational (Go-to-Market)

| ID | Type | Statement |
|----|------|-----------|
| O1 | boundary | Support team capacity: can handle 1 major launch |
| O2 | goal | Launch with minimal marketing spend |
| O3 | goal | Features should have measurable success criteria |

## Feature → Constraint Mapping

| Feature | Supports | Conflicts With | Net Score |
|---------|----------|----------------|-----------|
| **Advanced Search** | B3, U2, T3 | T4 (ML team) | +2 |
| **Mobile Redesign** | U3, B3 | T1 (6 weeks), O1 (support) | 0 |
| **API V2** | B1, B2 | T2, S1 (compliance) | +1 |
| **Analytics** | B3, O2, O3, U4 | None | +4 |
| **Social Features** | B3 | S3 (privacy), T3 | -1 |

## Tensions Identified

### TN1: Revenue vs Retention

- **Between**: B1 (revenue +15%) ↔ B3 (retention focus)
- **Type**: Trade-off
- **Analysis**: API V2 directly supports enterprise revenue (B2→B1), while Search/Analytics support retention (B3)
- **Resolution**: Prioritize one from each category

### TN2: User Feedback vs Feasibility

- **Between**: U2 (search complaints) ↔ T4 (ML team required)
- **Type**: Resource tension
- **Analysis**: Users want better search, but ML team is committed elsewhere
- **Resolution**: Phase Advanced Search to Q4 when ML team available

### TN3: Mobile Value vs Launch Capacity

- **Between**: U3 (mobile NPS) ↔ O1 (support capacity)
- **Type**: Resource tension
- **Analysis**: Mobile Redesign would maximize NPS but exceeds support capacity
- **Resolution**: Defer Mobile Redesign; address with targeted improvements instead

### TN4: Hidden Dependency

- **Between**: B2 (enterprise revenue) → API V2 → S1 (compliance)
- **Type**: Hidden dependency
- **Analysis**: Enterprise deals require API V2, which requires SOC2 validation
- **Resolution**: Start compliance process now to enable Q3 delivery

## Decision Framework

Given constraints and tensions, scoring matrix:

| Feature | Revenue (B1,B2) | Retention (B3) | Feasibility | Risk | Total |
|---------|-----------------|----------------|-------------|------|-------|
| **Analytics** | 1 | 3 | 3 (easy) | 0 | **7** |
| **API V2** | 3 | 1 | 2 (compliance) | -1 | **5** |
| **Advanced Search** | 1 | 3 | 1 (ML team) | 0 | **5** |
| **Mobile Redesign** | 1 | 3 | 1 (complex) | -1 | **4** |
| **Social Features** | 0 | 2 | 2 | -2 | **2** |

## Recommendation

**Selected for Q3:**
1. **Analytics Dashboard** (Score: 7)
   - Supports retention (B3)
   - Self-service reduces support burden (U4, O2)
   - Leverages existing infrastructure (T3)
   - Clear success metrics (O3)

2. **API V2** (Score: 5)
   - Critical for enterprise revenue (B1, B2)
   - Required dependency: Start SOC2 now (S1)
   - Enables strategic partnerships

**Deferred:**
- **Advanced Search** → Q4 (waiting for ML team)
- **Mobile Redesign** → Q4 (waiting for support capacity)
- **Social Features** → Backlog (privacy concerns unresolved)

## Evaluation

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Constraint Discovery | ✓ Strong | Surfaced hidden SOC2 dependency (S1→API V2→B2) |
| Tension Analysis | ✓ Strong | TN1 revealed revenue/retention balance needed |
| Decision Quality | ✓ Improved | Data-driven selection vs gut feel |
| Time Efficiency | ✓ Met | Completed in ~15 minutes |
| Stakeholder Alignment | ✓ Strong | Constraints provide defensible rationale |

## Verdict

**Framework Applicability**: HIGH

Manifold's constraint-first approach transformed a contentious prioritization discussion into a structured analysis. The tension analysis (TN1-TN4) surfaced hidden dependencies and resource conflicts that would have emerged as blockers mid-quarter. The constraint mapping provided a defensible rationale for stakeholder communication.

## Generated Artifacts

Using `/m4-generate --prd`, this prioritization produces:

```
docs/q3-roadmap/PRD.md
├── Problem Statement: "Select Q3 features to balance revenue and retention"
├── Success Metrics: +15% revenue, -10% churn
├── Selected Features: Analytics, API V2
├── Deferred Features: Search, Mobile, Social (with rationale)
├── Dependencies: SOC2 compliance timeline
└── Risks: ML team availability for Q4
```
