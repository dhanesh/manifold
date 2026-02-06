# example-feature

Example demonstrating Manifold Schema v2 features.
This file shows the new iteration tracking and convergence detection.

## Outcome

Demonstrate Manifold v2 schema with iteration tracking

---

## Constraints

### Business

#### B1: Example Business Constraint
Example business constraint.
> **Rationale:** Demonstrates constraint structure.

### Technical

#### T1: Example Technical Goal
Example technical goal.
> **Rationale:** Demonstrates goal type.

### User Experience

#### U1: Example UX Boundary
Example UX boundary.
> **Rationale:** Demonstrates boundary type.

### Security

#### S1: Example Security Invariant
Example security invariant.
> **Rationale:** Demonstrates security category.

### Operational

#### O1: Example Operational Goal
Example operational goal.
> **Rationale:** Demonstrates operational category.

---

## Tensions

### TN1: Technical Goal vs UX Boundary
Example tension between technical goal and UX boundary.
> **Resolution:** Example resolution demonstrating tension structure.

---

## Required Truths

### RT-1: Example Required Truth
Example required truth.

---

## Iteration History

This example demonstrates the v2 iteration tracking feature:

1. **Iteration 1** (generate): 5 artifacts created
2. **Iteration 2** (verify): 3 gaps found
3. **Iteration 3** (generate): 2 artifacts created, 3 gaps resolved
4. **Iteration 4** (verify): PASS - all gaps resolved

## Convergence

Status: CONVERGED after 4 iterations.
- All invariants satisfied
- Test pass rate: 100%
- No blocking gaps

## Generation

Option A selected. Coverage: 5/5 constraints (100%).

### Artifacts
- `src/example.ts` (code) - Satisfies RT-1

## Integration

1 integration point completed:
- INT-1: Add export from `src/example.ts` to `src/index.ts` (satisfies RT-1)
