---
name: manifold-m4-prd
description: "PRD generation module for m4-generate — loaded on demand when --prd flag is used"
---

# /manifold:m4-prd

# PRD Generation (`--prd` flag)

> **Module**: Loaded by `/manifold:m4-generate` when `--prd` flag is specified.
> Do not invoke directly.

When `--prd` is specified, generate an industry-standard Product Requirements Document from the manifold.

## PRD Output Location

```
docs/<feature>/PRD.md
```

## PRD Structure (13 Sections + Appendices)

```markdown
# PRD: [Feature Name]

| Field | Value |
|-------|-------|
| **Author** | [From manifold meta or "Product Manager"] |
| **Status** | Draft / In Review / Approved |
| **Created** | [timestamp] |
| **Last Updated** | [timestamp] |
| **Manifold** | `.manifold/<feature>.json` |

## 1. Problem Statement
[Generated from: outcome + business constraint rationale]
**Who is affected:** [from UX constraints context]
**Current impact:** [from business constraints with baselines]
**Why now:** [from timeline/boundary constraints]

## 2. Business Objectives
[Generated from: business GOAL constraints + outcome]
- **Strategic alignment:** [from B-constraints rationale]
- **Success criteria:** [measurable targets from GOALs]

## 3. Success Metrics

| Metric | Target | Baseline | Constraint |
|--------|--------|----------|------------|
| [name] | [target] | [current] | [ID] |

[Generated from: GOAL type constraints with measurable criteria]

## 4. Target Users & Personas
[Generated from: user_experience constraints context + "As a" patterns]

### Persona 1: [User Type]
- **Needs:** [from UX constraint statements]
- **Pain Points:** [from UX constraint rationale]
- **Key Workflows:** [from UX boundaries]

## 5. Assumptions & Constraints
**Assumptions:**
[Generated from: technical constraints with "assumes", security compliance refs]

**Constraints:**
[Generated from: ALL boundary-type constraints across categories]

## 6. Requirements (MoSCoW)

### Must Have (Invariants)
[All constraints.*.type: invariant]
- **[statement]** ([ID]) — [rationale]
  - _Traces to: [related IDs]_

### Should Have (Boundaries)
[All constraints.*.type: boundary]
- **[statement]** ([ID]) — [rationale]

### Could Have (Goals)
[All constraints.*.type: goal, excluding success metrics]
- **[statement]** ([ID]) — [rationale]

### Won't Have (This Release)
[Generated from: _customization.common_removals]

## 7. User Flows & Design
[Generated from: UX constraints describing workflows + required truths about user journeys]

## 8. Out of Scope
[Generated from: _customization.common_removals + explicit exclusions]

## 9. Risks & Mitigations

| Risk | Severity | Source | Mitigation |
|------|----------|--------|------------|
| [description] | High/Med/Low | [ID] | [resolution] |

[Generated from: resolved tensions + security constraints]

## 10. Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| [description] | Internal/External | [team] | Pending/Ready |

[Generated from: technical constraints with "depends on", "requires", "integrates with"]

## 11. Timeline & Milestones

| Milestone | Date | Dependencies |
|-----------|------|--------------|
| [name] | [date] | [items] |

[Generated from: boundary constraints with timeline + operational constraints]

## 12. Open Questions

| # | Question | Impact | Decision Needed By |
|---|----------|--------|-------------------|
| 1 | [question] | [constraint IDs] | [date] |

[Generated from: unresolved tensions + anchors.open_questions]

---

## Appendix A: Constraint Traceability Matrix

| PRD Section | Constraint IDs |
|-------------|---------------|
| Problem Statement | B1, B2 |
| Success Metrics | B2, B4 |
| Must Have | B1, T2, S1, ... |
| ... | ... |

## Appendix B: Manifold Reference
_Generated from `.manifold/<feature>.json` + `.manifold/<feature>.md`_
_Schema version: [version]_
_Phase: [phase]_
_Constraint coverage: [X]/[Y] constraints addressed_
```

## Constraint-to-PRD Mapping Rules

| Constraint Source | PRD Section | Logic |
|-------------------|-------------|-------|
| `outcome` | Problem Statement + Business Objectives | Direct inclusion |
| `constraints.*.type: goal` with metric | Success Metrics | Extract measurable targets |
| `constraints.*.type: invariant` | Must Have | All invariants are non-negotiable |
| `constraints.*.type: boundary` | Should Have + Assumptions & Constraints | Boundaries define limits |
| `constraints.*.type: goal` (non-metric) | Could Have | Optimization targets |
| `constraints.user_experience` | Target Users & Personas + User Flows | UX context derives personas |
| `_customization.common_removals` | Won't Have + Out of Scope | Explicitly excluded |
| `tensions.status: resolved` | Risks & Mitigations | Documented decisions |
| `tensions.status: unresolved` | Open Questions | Needs decision |
| `constraints.security.*` | Assumptions & Constraints + Risks | Compliance requirements |
| `constraints.technical` with deps | Dependencies | Extract dependency refs |
| `constraints` with timeline | Timeline & Milestones | Date-bearing constraints |

## PRD Generation Example

Input manifold (JSON+MD):

**`.manifold/checkout-redesign.json`**:
```json
{
  "constraints": {
    "business": [
      { "id": "B1", "type": "invariant" },
      { "id": "B2", "type": "goal" }
    ],
    "user_experience": [
      { "id": "U1", "type": "boundary" }
    ]
  },
  "tensions": [
    { "id": "TN1", "type": "trade_off", "between": ["B2", "T1"], "status": "resolved" }
  ]
}
```

**`.manifold/checkout-redesign.md`**:
```markdown
## Outcome
Increase checkout conversion by 15%

### Business
#### B1: Protect Existing Checkout
Must not disrupt existing checkout.
> **Rationale:** Revenue protection during transition.

#### B2: Conversion Target
Increase conversion by 15%.
> **Rationale:** Mobile is 60% of traffic.

### User Experience
#### U1: Checkout Steps
Maximum 3 clicks to complete.
> **Rationale:** Each step adds abandonment risk.

## Tensions
### TN1: Conversion Goal vs Capacity
> **Resolution:** Phased rollout.
```

Generated PRD excerpt:
```markdown
## 1. Problem Statement
Increase checkout conversion by 15% while maintaining existing checkout stability.
**Who is affected:** Mobile shoppers (60% of traffic)
**Why now:** Revenue protection during transition period

## 6. Requirements (MoSCoW)

### Must Have (Invariants)
- **Must not disrupt existing checkout** (B1) — Revenue protection during transition
  - _Traces to: B1_

### Should Have (Boundaries)
- **Maximum 3 clicks to complete** (U1) — Each step adds abandonment risk
  - _Traces to: U1_

## 9. Risks & Mitigations
| Risk | Severity | Source | Mitigation |
|------|----------|--------|------------|
| Conversion goal vs capacity | Medium | TN1 | Phased rollout |
```

## PRD Artifact Tracking

After PRD generation, update `.manifold/<feature>.json`:

```json
{
  "generation": {
    "artifacts": [
      {
        "path": "docs/<feature>/PRD.md",
        "type": "prd",
        "satisfies": ["B1", "B2", "T1", "U1", "S1", "O1"],
        "status": "generated"
      }
    ]
  }
}
```
