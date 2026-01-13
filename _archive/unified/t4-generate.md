# /t4-generate

Generate ALL artifacts simultaneously from the constraint manifold.

## Usage
```
/t4-generate <feature-name> [--option=<selected-option>] [--artifacts=<list>]
```

## What It Does

From the constraint manifold, generates:

1. **Code** - Implementation with constraint traceability comments
2. **Tests** - Test cases derived from constraints (not code)
3. **Documentation** - Explains constraints and design decisions
4. **Runbooks** - Operational procedures for failure modes
5. **Dashboards** - Monitoring for goals and invariants
6. **Alerts** - Notifications when constraints are violated

## Why All At Once?

Traditional: Code → Tests → Docs → Ops artifacts (often forgotten)
Temporal: All artifacts derive from SAME source (constraint manifold)

Benefits:
- No drift between code and docs
- Tests verify constraints, not implementation details
- Runbooks exist BEFORE the first incident
- Alerts are defined with the feature, not after

## Output

```
✅ Generated artifacts for payment-retry-v2 (Option B)

📁 src/
   └── retry/
       └── payment-retry.ts        # Implementation
       └── payment-retry.test.ts   # Constraint-derived tests

📁 docs/
   └── payment-retry-v2.md         # Design doc with constraints

📁 ops/
   └── runbooks/
       └── payment-retry-failure.md # Incident response
   └── dashboards/
       └── payment-retry.json      # Grafana dashboard
   └── alerts/
       └── payment-retry.yaml      # PagerDuty rules

All artifacts trace back to:
.temporal/manifolds/payment-retry-v2.cms.yaml

Next: Run /t5-verify <feature-name> to validate constraints
```

## Artifact Traceability

Each generated artifact includes:
```typescript
/**
 * @constraint B1: No duplicate payments (INVARIANT)
 * @constraint T1: API response < 200ms (GOAL)
 * @manifold .temporal/manifolds/payment-retry-v2.cms.yaml
 */
```
