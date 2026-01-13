---
description: "Surface and resolve constraint conflicts. Identifies direct conflicts, resource tensions, and trade-offs"
---

# /m2-tension - Conflict Resolution

Surface and resolve constraint conflicts.

## Usage

```
/m2-tension <feature-name> [--resolve]
```

## Tension Types

1. **Direct Conflicts** - Contradictory constraints that cannot both be satisfied
2. **Resource Tensions** - Constraints competing for the same resources
3. **Trade-off Pairs** - Goals that require balancing (improving one degrades the other)
4. **Hidden Dependencies** - Implicit relationships between constraints

## Common Tension Patterns

| Tension | Example |
|---------|---------|
| Speed vs Safety | "Fast response" vs "Comprehensive validation" |
| UX vs Security | "User-friendly errors" vs "Security through obscurity" |
| Availability vs Consistency | "High availability" vs "Strong consistency" |
| Cost vs Performance | "Minimize infrastructure" vs "Handle peak load" |

## Resolution Strategies

- **Prioritize** - Decide which constraint takes precedence
- **Partition** - Apply different constraints in different contexts
- **Transform** - Find a solution that satisfies both differently
- **Accept** - Document the trade-off and move forward
- **Invalidate** - Remove a constraint if it's not actually required

## Example

```
/m2-tension payment-retry

TENSION ANALYSIS: payment-retry

TENSIONS DETECTED:

Tension T1: Performance vs Safety
├── T1: API response < 200ms (BOUNDARY)
├── B1: No duplicate payments (INVARIANT)
└── Conflict: Idempotency check adds ~50ms

    Resolution Options:
    A. Cache recent transaction IDs (adds memory cost)
    B. Async idempotency check (eventual consistency)
    C. Accept 250ms budget (relax T1)

    Recommended: A - Cache recent transaction IDs
    Rationale: B1 is INVARIANT, cannot be violated

TENSION SUMMARY:
- Direct Conflicts: 1 (resolved)
- Resource Tensions: 1 (pending)
- Trade-offs: 0
- Hidden Dependencies: 0

Updated: .manifold/payment-retry.yaml

Next: /m3-anchor payment-retry
```

## Execution Instructions

1. Read manifold from `.manifold/<feature>.yaml`
2. For each pair of constraints, check for conflicts
3. For each tension found:
   - Describe the conflict
   - Generate resolution options (A, B, C)
   - Recommend based on constraint types (INVARIANT > BOUNDARY > GOAL)
4. If `--resolve` flag, prompt user to choose resolutions
5. Update manifold with tensions and resolutions
6. Set phase to TENSIONED
7. Display summary and next step
