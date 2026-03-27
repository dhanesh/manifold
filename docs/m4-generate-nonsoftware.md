# Non-Software Artifact Generation Templates

When `--domain=non-software` is set, m4-generate produces these artifacts instead of code, tests, and ops artifacts. All artifacts maintain full constraint traceability.

## Artifact Mapping

| Non-Software Artifact | Software Equivalent | Purpose |
|----------------------|---------------------|---------|
| Decision Brief | Implementation code | Decision with full constraint traceability |
| Scenario Stress-Tests | Test suite | Verifies decision holds under adversarial conditions |
| Narrative Guide | Documentation | Reasoning survives time and personnel changes |
| Recovery Playbook | Runbooks | Pre-decided responses to watch-list risks |
| Risk Watch List | Dashboards + Alerts | What to monitor; when to reopen the decision |

---

## 1. Decision Brief

**Output:** `docs/<feature>/DECISION_BRIEF.md`

### Template

```markdown
# Decision Brief: [Feature Name]

**Date:** [timestamp]
**Decision maker:** [role/name]
**Manifold:** `.manifold/<feature>.json`

## Decision Statement

[One paragraph stating the decision clearly. Must trace to outcome.]

## Constraint Satisfaction

| Constraint | Type | Status | How Addressed |
|-----------|------|--------|---------------|
| [ID]: [Title] | invariant/goal/boundary | Satisfied/Partial | [Explanation] |

## Options Considered

### Option A: [Title] <- Selected
- **Satisfies:** [constraint IDs]
- **Reversibility:** [TWO_WAY / REVERSIBLE_WITH_COST / ONE_WAY]
- **Key advantage:** [one line]

### Option B: [Title]
- **Satisfies:** [constraint IDs]
- **Reversibility:** [tag]
- **Why not chosen:** [one line]

## What This Decision Closes (ONE_WAY consequences)

- [Consequence 1 -- what becomes unavailable]
- [Consequence 2]

## Binding Constraint

**[RT-ID]:** [statement]
**Why binding:** [reason this is the bottleneck]
**Dependency chain:** [which other truths depend on this]

## Open Assumptions

| Assumption | Challenger | Confirmation Method | Deadline |
|-----------|-----------|-------------------|----------|
| [from challenger: assumption constraints] | assumption | [how to verify] | [date] |
```

---

## 2. Scenario Stress-Tests

**Output:** `docs/<feature>/STRESS_TESTS.md`

### Template

```markdown
# Scenario Stress-Tests: [Feature Name]

These scenarios verify the decision holds under adversarial conditions.
Each scenario derives from a constraint or tension.

## Scenario 1: [Title] (from [constraint/tension ID])

**Setup:** [Describe the adversarial condition]
**Expected behavior:** [What should happen under this condition]
**Constraint tested:** [ID] -- [brief statement]
**Pass criteria:** [Measurable or observable outcome]

### Pre-mortem connection
[If this scenario came from a pre-mortem failure story, reference it]

## Scenario 2: [Title]
...

## Scenario Matrix

| # | Scenario | Source | Type | Pass Criteria | Status |
|---|----------|--------|------|---------------|--------|
| 1 | [title] | [ID] | Invariant violation | [criteria] | Pending |
| 2 | [title] | [ID] | Boundary breach | [criteria] | Pending |
| 3 | [title] | [TN-ID] | Tension resurface | [criteria] | Pending |
```

---

## 3. Narrative Guide

**Output:** `docs/<feature>/NARRATIVE_GUIDE.md`

### Template

```markdown
# Narrative Guide: [Feature Name]

This document captures the reasoning chain so it survives time and personnel changes.
Read this before revisiting, extending, or reversing the decision.

## Why This Decision Was Made

[Narrative prose -- not bullet points. Tell the story of how constraints led to this decision.
Include: what problem was being solved, what constraints were discovered, which tensions
were hardest to resolve, and why the selected option won.]

## The Constraints That Shaped It

### Immovable (Invariants)
[List invariant constraints and explain WHY they cannot be challenged.
Reference challenger tags: regulation, technical-reality.]

### Negotiable (Goals and Boundaries)
[List goal/boundary constraints. Note which were stretched or relaxed
during tension resolution.]

## Key Tensions and How They Were Resolved

### [TN-ID]: [Title]
[Describe the tension in plain language. Explain the resolution choice
and its propagation effects on other constraints.]

## What We Explicitly Chose NOT To Do

[List rejected options with their reasons. Future readers need to know
why these were ruled out -- otherwise they will re-propose them.]

## When to Revisit This Decision

- If [assumption from challenger: assumption] turns out to be false
- If [boundary constraint] becomes more/less restrictive
- If [external dependency] changes materially
- Review trigger: [specific date or event]
```

---

## 4. Recovery Playbook

**Output:** `docs/<feature>/RECOVERY_PLAYBOOK.md`

### Template

```markdown
# Recovery Playbook: [Feature Name]

Pre-decided responses to watch-list risks. Each procedure maps to a specific
constraint violation or tension resurfacing.

## Procedure 1: [Risk Title]

**Trigger:** [Observable condition that activates this procedure]
**Related constraint:** [ID] -- [brief statement]
**Severity:** Critical / High / Medium
**Reversibility of response:** [TWO_WAY / REVERSIBLE_WITH_COST / ONE_WAY]

### Steps
1. [Immediate action]
2. [Assessment step]
3. [Escalation if needed]
4. [Resolution or rollback]

### Escalation Path
- **Level 1:** [Who handles first]
- **Level 2:** [Who to escalate to]
- **Level 3:** [Decision authority for ONE_WAY responses]

## Procedure 2: [Risk Title]
...

## Quick Reference

| Trigger | Procedure | Severity | First Responder |
|---------|-----------|----------|-----------------|
| [condition] | Procedure 1 | Critical | [role] |
| [condition] | Procedure 2 | High | [role] |
```

---

## 5. Risk Watch List

**Output:** `docs/<feature>/RISK_WATCH_LIST.md`

### Template

```markdown
# Risk Watch List: [Feature Name]

Active monitoring items and review triggers for this decision.

## Active Risks

### Risk 1: [Title]

**Source:** [Constraint ID or Tension ID]
**Current status:** Active / Monitoring / Dormant
**Probability:** High / Medium / Low
**Impact if realized:** [one line]

**Monitoring method:** [How to detect this risk materializing]
**Review trigger:** [Specific event or date that triggers reassessment]
**Owner:** [Role responsible for monitoring]

### Risk 2: [Title]
...

## Assumption Watch

| Assumption | From Constraint | Challenger | Status | Last Verified |
|-----------|----------------|-----------|--------|---------------|
| [text] | [ID] | assumption | Unverified | - |

## Review Schedule

| Review Type | Frequency | Next Date | Participants |
|-------------|-----------|-----------|-------------|
| Assumption check | Monthly | [date] | [roles] |
| Full reassessment | Quarterly | [date] | [roles] |
| Trigger-based | On event | N/A | [roles] |

## Decision Reversal Criteria

This decision should be reversed if:
- [ ] [Specific condition 1]
- [ ] [Specific condition 2]
- [ ] [Specific condition 3]
```

---

## Generation Rules

1. **Every artifact traces to constraints** -- no free-standing content
2. **Invariant constraints appear in ALL artifacts** -- they shape everything
3. **Tension resolutions appear in Narrative Guide and Stress-Tests** -- they are the key design decisions
4. **ONE_WAY decisions get special treatment** -- listed explicitly in Decision Brief, covered in Recovery Playbook
5. **Assumptions must be visible** -- challenger: assumption constraints appear in Decision Brief and Risk Watch List
6. **Pre-mortem findings inform Stress-Tests** -- source: pre-mortem constraints become scenarios
7. **Binding constraint is front-and-center** -- appears in Decision Brief with dependency chain
