# Manifold for Product Management

A guide to using constraint-first development from a Product Manager's perspective.

## Executive Summary

Manifold's constraint-first approach maps naturally to product management workflows. The framework helps PMs:

| PM Challenge | Manifold Solution |
|--------------|-------------------|
| Unclear requirements | Constraint discovery surfaces ALL requirements upfront |
| Competing priorities | Tension analysis makes trade-offs explicit |
| Scope creep | Invariant constraints define non-negotiable boundaries |
| Stakeholder alignment | Shared manifold document creates single source of truth |
| Acceptance criteria gaps | Required truths become verifiable acceptance criteria |

## Category Mapping

Manifold's five constraint categories translate directly to PM concepts:

| Manifold Category | PM Interpretation | Key Questions |
|-------------------|-------------------|---------------|
| **business** | Product Goals | Revenue impact? Market fit? Compliance? KPIs? |
| **technical** | Feasibility | Eng effort? Dependencies? Technical debt? Platform limits? |
| **user_experience** | User Value | Pain points solved? JTBD? Adoption risk? Usability? |
| **security** | Risk | Legal? Competitive? Reputational? Data sensitivity? |
| **operational** | Go-to-Market | Support readiness? Training? Rollout plan? Monitoring? |

### Deep Dive: Each Category

#### Business -> Product Goals

*What business outcomes does this serve?*

| Constraint Type | PM Example |
|-----------------|------------|
| **invariant** | "Must not cannibalize existing product revenue" |
| **boundary** | "Launch within Q3 to hit annual targets" |
| **goal** | "Increase DAU by 15%" |

Questions to ask:
- What's the revenue/growth impact?
- Which OKRs does this support?
- Are there compliance requirements?
- What's the competitive positioning?

#### Technical -> Feasibility

*What's practically achievable?*

| Constraint Type | PM Example |
|-----------------|------------|
| **invariant** | "Must work with existing authentication system" |
| **boundary** | "Engineering capacity: 2 sprints max" |
| **goal** | "Reuse existing component library" |

Questions to ask:
- What's the engineering estimate?
- What dependencies exist?
- What technical debt would this create?
- What platform limitations apply?

#### User Experience -> User Value

*What value does this deliver to users?*

| Constraint Type | PM Example |
|-----------------|------------|
| **invariant** | "Must not break existing user workflows" |
| **boundary** | "Maximum 3 clicks to complete core action" |
| **goal** | "Reduce task completion time by 50%" |

Questions to ask:
- What user problem does this solve?
- What's the job-to-be-done?
- What's the adoption risk?
- How does this affect user satisfaction?

#### Security -> Risk

*What could go wrong?*

| Constraint Type | PM Example |
|-----------------|------------|
| **invariant** | "Must not expose PII without consent" |
| **boundary** | "Legal review required before launch" |
| **goal** | "Minimize competitive response risk" |

Questions to ask:
- What are the legal/regulatory risks?
- What's the competitive exposure?
- What's the reputational risk?
- What data sensitivity applies?

#### Operational -> Go-to-Market

*How will this be launched and maintained?*

| Constraint Type | PM Example |
|-----------------|------------|
| **invariant** | "Support team must be trained before launch" |
| **boundary** | "Feature flag for gradual rollout" |
| **goal** | "95% adoption within first month" |

Questions to ask:
- What's the rollout strategy?
- How will support handle this?
- What training is needed?
- What success metrics will we track?

## PM Workflow with Manifold

### Standard Workflow

```
1. /m0-init feature-name --template=pm/feature-launch
2. /m1-constrain feature-name    # Discover all requirements
3. /m2-tension feature-name      # Surface trade-offs
4. /m3-anchor feature-name       # Define success criteria
5. /m4-generate feature-name --prd --stories
   └── Outputs: PRD.md + STORIES.md
```

### Quick Reference: Commands for PMs

| Command | PM Purpose |
|---------|------------|
| `/m0-init --template=pm/*` | Start with PM-focused constraints |
| `/m1-constrain` | Requirements gathering session |
| `/m2-tension` | Priority and trade-off decisions |
| `/m4-generate --prd` | Generate PRD from constraints |
| `/m4-generate --stories` | Generate user stories |
| `/m-status` | Track feature progress |

## Terminology Translation

When communicating with different audiences:

| Manifold Term | For Stakeholders | For Engineering | For Design |
|---------------|------------------|-----------------|------------|
| Constraint | Requirement | Spec | Requirement |
| Tension | Trade-off | Dependency conflict | Design constraint |
| Required Truth | Acceptance criterion | Precondition | Design validation |
| Invariant | Non-negotiable | Hard requirement | Must-have |
| Boundary | Limit | Threshold | Constraint |
| Goal | Objective | Optimization target | Success metric |
| Manifold | Requirements doc | Constraint file | Spec |

## Constraint Types for PMs

### Invariant (Must NEVER violate)

Use for:
- Compliance requirements
- Security/privacy non-negotiables
- Brand guidelines
- Contractual obligations

Example:
```yaml
- id: B1
  type: invariant
  statement: "User data must not be shared without explicit consent"
  rationale: "GDPR compliance and user trust"
```

### Boundary (Hard limits)

Use for:
- Timeline constraints
- Budget limits
- Performance thresholds
- Resource caps

Example:
```yaml
- id: T2
  type: boundary
  statement: "Page load time must be under 3 seconds on 3G"
  rationale: "Mobile-first user base; slower = abandonment"
```

### Goal (Should optimize)

Use for:
- Success metrics
- User satisfaction targets
- Business KPIs
- Nice-to-haves

Example:
```yaml
- id: U3
  type: goal
  statement: "Increase feature adoption to 80% of eligible users"
  rationale: "Primary success metric for this release"
```

## Tension Analysis for PMs

Tensions are where PM judgment adds the most value. Common tension patterns:

### Scope vs Timeline
```yaml
- id: TN1
  type: trade_off
  between: [B2, T1]
  description: "Full feature set (B2) vs Q3 deadline (T1)"
  resolution: "MVP for Q3, full feature in Q4"
  status: resolved
```

### User Value vs Technical Feasibility
```yaml
- id: TN2
  type: resource_tension
  between: [U1, T2]
  description: "Ideal UX (U1) requires 4 sprints; capacity is 2 (T2)"
  resolution: "Simplified UX that delivers 80% of value"
  status: resolved
```

### Growth vs Stability
```yaml
- id: TN3
  type: trade_off
  between: [B1, B3]
  description: "Aggressive growth (B1) risks existing user satisfaction (B3)"
  resolution: "Phased rollout with satisfaction monitoring"
  status: resolved
```

## Output Artifacts

### PRD Generation (`--prd` flag)

When you run `/m4-generate feature --prd`, the framework generates a structured PRD:

```
docs/feature/PRD.md
├── Problem Statement (from outcome + business constraints)
├── Success Metrics (from GOAL constraints)
├── Requirements
│   ├── Must Have (INVARIANT constraints)
│   ├── Should Have (BOUNDARY constraints)
│   └── Nice to Have (GOAL constraints)
├── Out of Scope (from _customization.common_removals)
├── Risks & Mitigations (from tensions + security)
├── Dependencies (from technical constraints)
└── Open Questions (from unresolved tensions)
```

### User Stories Generation (`--stories` flag)

When you run `/m4-generate feature --stories`:

```
docs/feature/STORIES.md
├── Epic: [Outcome statement]
├── User Stories (from user_experience constraints)
│   ├── US-1: [From U1]
│   │   ├── As a / I want / So that
│   │   ├── Acceptance Criteria (from required truths)
│   │   └── Constraint traces
│   ├── US-2: [From U2]
│   └── ...
└── Story Map (priority/dependency view)
```

## Greenfield Workflow

For brand new software products (not features within existing products), use this recommended template progression:

```
┌─────────────────────────┐
│ 1. opportunity-assessment│  "Should we build this?"
│    (SVPG framework)      │  Go/no-go with market sizing
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 2. product-vision        │  "What are we building?"
│    (Product School)      │  Vision, market, team
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 3. lean-canvas           │  "Is the model viable?"
│    (Lean Startup)        │  9-block business model
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 4. mvp-definition        │  "What's the minimum?"
│    (Atlassian/Lean)      │  MoSCoW scope + quality bar
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 5. feature-launch        │  "Ship individual features"
│    (per feature)         │  Standard feature workflow
└─────────────────────────┘
```

**Alternative path:** Use `pm/pr-faq` (Amazon Working Backwards) instead of `pm/product-vision` when customer empathy is the primary driver.

### When to Use Greenfield Templates

| Signal | Template to Start With |
|--------|----------------------|
| "Should we even build this?" | `pm/opportunity-assessment` |
| "We're building this, need a vision doc" | `pm/product-vision` |
| "Need to validate the business model" | `pm/lean-canvas` |
| "What's the MVP scope?" | `pm/mvp-definition` |
| "Want to write it as a press release" | `pm/pr-faq` |

### Greenfield Usage Example

```
/m0-init wellness-app --template=pm/opportunity-assessment
/m1-constrain wellness-app   # Validate the opportunity
/m2-tension wellness-app     # Surface go/no-go tensions
/m3-anchor wellness-app      # Required truths for the decision
# -> Decision: GO

/m0-init wellness-app-vision --template=pm/product-vision
/m1-constrain wellness-app-vision
# ... continue through workflow

/m0-init wellness-app-mvp --template=pm/mvp-definition
# ... scope the MVP
```

## Templates for PMs

Thirteen PM-focused templates are available:

### Existing Product Templates

| Template | Use Case | Constraints |
|----------|----------|-------------|
| `pm/feature-launch` | New features, product launches | 15-18 |
| `pm/experiment` | A/B tests, experiments | 12-14 |
| `pm/deprecation` | Feature sunset, migrations | 14-16 |

### Greenfield / New Product Templates

| Template | Use Case | Constraints |
|----------|----------|-------------|
| `pm/opportunity-assessment` | Go/no-go decision (SVPG) | 10 |
| `pm/product-vision` | Vision & strategy foundation | 12 |
| `pm/lean-canvas` | Business model canvas | 10 |
| `pm/pr-faq` | Working Backwards PR/FAQ | 12 |
| `pm/mvp-definition` | MVP scope definition | 14 |

### General PM Templates

| Template | Use Case | Constraints |
|----------|----------|-------------|
| `pm/competitive-analysis` | Competitive landscape | 12 |
| `pm/user-persona` | Persona with JTBD | 10 |
| `pm/go-to-market` | GTM launch strategy | 14 |
| `pm/product-roadmap` | Now-Next-Later roadmap | 12 |
| `pm/shape-up-pitch` | Shape Up pitch | 10 |

Usage:
```
/m0-init mobile-checkout --template=pm/feature-launch
/m0-init pricing-test --template=pm/experiment
/m0-init legacy-removal --template=pm/deprecation
/m0-init new-product --template=pm/opportunity-assessment
/m0-init product-strategy --template=pm/product-vision
```

## Best Practices

### 1. Start with Outcome

Always define a clear, measurable outcome before constraints:

```yaml
outcome: "Increase checkout conversion by 15% while maintaining support ticket volume"
```

### 2. Involve Stakeholders in Constraint Discovery

Run `/m1-constrain` as a collaborative session:
- Engineering: Technical constraints
- Design: UX constraints
- Legal: Security/compliance constraints
- Sales: Business constraints
- Ops: Operational constraints

### 3. Make Trade-offs Explicit

Don't hide tensions - document them:

```yaml
tensions:
  - id: TN1
    description: "We chose X over Y because..."
    resolution: "Documented decision with rationale"
```

### 4. Use Constraint IDs in Communication

Reference constraints when discussing decisions:

> "We're deprioritizing the advanced filters (U4) to meet the Q3 deadline (T1), per tension TN2."

### 5. Keep Manifold Updated

The manifold is a living document. Update it as:
- Requirements change
- New tensions emerge
- Decisions are made

## Example: Feature Launch

See [scenario-feature-prioritization.md](scenario-feature-prioritization.md) for a complete walkthrough of using Manifold for a feature prioritization decision.

See [scenario-product-launch.md](scenario-product-launch.md) for a product launch planning example.

## When NOT to Use Manifold for PM Work

Skip Manifold when:
- Simple bug fix or minor enhancement
- Single-owner decision with clear path
- Time-sensitive with <1 day turnaround
- Exploratory research (no implementation planned)

See [When NOT to Use](../WHEN_NOT_TO_USE.md) for the full decision tree.

## Quick Start Checklist

- [ ] Define outcome in one measurable sentence
- [ ] Initialize manifold with PM template
- [ ] Run constraint discovery across all 5 categories
- [ ] Identify tensions between competing constraints
- [ ] Resolve tensions with documented decisions
- [ ] Generate PRD and/or user stories
- [ ] Share manifold with stakeholders for alignment
