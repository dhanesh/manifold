# Manifold Schema Quick Reference

> **PURPOSE**: This file exists to prevent field name confusion between AI commands.
> Embed this reference in prompts when generating manifold YAML.

## Field Names - CRITICAL

| Structure | Text Field | Use | Memory Aid |
|-----------|------------|-----|------------|
| **Constraint** | `statement` | What must be true | Constraints _state_ requirements |
| **Tension** | `description` | What the conflict is | Tensions _describe_ conflicts |
| **RequiredTruth** | `statement` | What must be verified | Truths _state_ conditions |
| **Iteration** | `result` | What was accomplished | Iterations report _results_ |

### The Rule

```
NEVER use 'description' for Constraints or RequiredTruths
NEVER use 'statement' for Tensions
```

## Valid Values Reference

### Phases
```
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
```

### Constraint Types
```yaml
type: invariant  # Must NEVER be violated
type: goal       # Should be optimized
type: boundary   # Hard limits
```

### Tension Types
```yaml
type: trade_off           # Competing constraints
type: resource_tension    # Resource limits
type: hidden_dependency   # Non-obvious relationships
```

### Statuses
```yaml
# Tension statuses
status: resolved
status: unresolved

# Required truth statuses
status: SATISFIED
status: PARTIAL
status: NOT_SATISFIED
status: SPECIFICATION_READY

# Convergence statuses
status: NOT_STARTED
status: IN_PROGRESS
status: CONVERGED

# Evidence statuses (v3)
status: VERIFIED
status: PENDING
status: FAILED
status: STALE
```

### Constraint ID Prefixes
```yaml
B1, B2, ...  # Business constraints
T1, T2, ...  # Technical constraints
U1, U2, ...  # User experience constraints
S1, S2, ...  # Security constraints
O1, O2, ...  # Operational constraints
TN1, TN2, ...  # Tension IDs
RT-1, RT-2, ... # Required truth IDs
```

## Correct YAML Templates

### Constraint (uses `statement`)
```yaml
constraints:
  business:
    - id: B1
      statement: "No duplicate payments allowed"  # ← statement
      type: invariant
      rationale: "Duplicates cause chargebacks"
```

### Tension (uses `description`)
```yaml
tensions:
  - id: TN1
    type: trade_off
    description: "Performance vs safety trade-off"  # ← description
    between: [T1, B1]
    status: resolved
    resolution: "Use caching"
```

### Required Truth (uses `statement`)
```yaml
anchors:
  required_truths:
    - id: RT-1
      statement: "Idempotency key preserved across retries"  # ← statement
      status: NOT_SATISFIED
      priority: 1
```

### Iteration (uses `result`)
```yaml
iterations:
  - number: 1
    phase: constrain
    timestamp: "2026-01-29T10:00:00Z"
    result: "Discovered 12 constraints across 5 categories"  # ← result
```

## Validation Commands

```bash
# Validate a feature manifold
bun run cli/index.ts validate <feature>

# Validate with all checks
bun run cli/index.ts validate <feature> --all

# Strict mode (warnings become errors)
bun run cli/index.ts validate <feature> --strict
```

## Common Mistakes

| Wrong | Right | Fix |
|-------|-------|-----|
| `constraint.description` | `constraint.statement` | Constraints state, not describe |
| `tension.statement` | `tension.description` | Tensions describe, not state |
| `required_truth.description` | `required_truth.statement` | Truths state conditions |
| `phase: Initialized` | `phase: INITIALIZED` | Phases are UPPERCASE |
| `type: INVARIANT` | `type: invariant` | Types are lowercase |

---

*For complete schema documentation, see [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md)*
