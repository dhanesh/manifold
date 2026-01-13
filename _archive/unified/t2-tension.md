# /t2-tension

Surface and resolve constraint conflicts. **UNIQUE to Temporal Dev Kit.**

## Usage
```
/t2-tension <feature-name> [--resolve]
```

## What It Does

Analyzes the constraint manifold to identify:

1. **Direct Conflicts** - Constraints that contradict each other
2. **Resource Tensions** - Constraints competing for same resources
3. **Trade-off Pairs** - Goals that must be balanced
4. **Hidden Dependencies** - Implicit relationships between constraints

## Why This Matters

Neither spec-kit nor quint-code surfaces constraint tensions. They assume requirements are consistent. In reality, constraints often conflict:

- "Fast response times" vs "Comprehensive validation"
- "User-friendly errors" vs "Security through obscurity"
- "High availability" vs "Strong consistency"

## Output

```yaml
# Updated manifold with tensions
tensions:
  - id: "TENSION-1"
    type: "trade-off"
    between: ["T1-fast-response", "S1-full-validation"]
    description: "Full validation adds latency"
    resolution: "Async validation with optimistic response"
    decision_needed: true
```

## Example
```
/t2-tension payment-retry-v2

⚠️ 2 TENSIONS DETECTED

TENSION-1: Trade-off
  - T1: "API response < 200ms"
  - B1: "No duplicate payments" (requires idempotency check)
  - Conflict: Idempotency lookup adds ~50ms
  - Suggested resolution: Cache recent transaction IDs

TENSION-2: Resource competition
  - O1: "Retry immediately on transient failure"
  - O2: "Don't overwhelm downstream services"
  - Conflict: Immediate retries can cause cascading failures
  - Suggested resolution: Exponential backoff with jitter

Resolve tensions now? [Y/n]
```
