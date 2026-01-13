# /t3-anchor

Backward reasoning from desired outcome. **UNIQUE to Temporal Dev Kit.**

## Usage
```
/t3-anchor <feature-name> [--outcome="<statement>"]
```

## What It Does

Instead of forward planning (spec → design → build), reasons BACKWARD:

1. Start with desired outcome
2. Ask: "What must be TRUE for this outcome?"
3. Derive required conditions
4. Identify gaps between current state and requirements
5. Generate solution space (multiple valid approaches)

## Why This Matters

Forward planning misses implicit requirements. Backward reasoning surfaces them:

**Forward:** "Build a retry system" → might miss edge cases
**Backward:** "95% retry success" → REQUIRES:
  - Accurate failure classification
  - Sufficient retry budget
  - Stable downstream services
  - Idempotent operations

## Output

```yaml
# .temporal/outcomes/<feature-name>.anchor.yaml
outcome_anchor: "95% retry success for transient failures"

required_truths:
  - id: "RT-1"
    statement: "Can distinguish transient from permanent failures"
    current_state: "PARTIAL - only HTTP codes, not business errors"
    gap: "Need error taxonomy"

  - id: "RT-2"
    statement: "Retry attempts don't cause side effects"
    current_state: "UNKNOWN - need audit"
    gap: "Idempotency analysis required"

solution_space:
  - option: "A"
    approach: "Client-side retry with exponential backoff"
    satisfies: ["RT-1", "RT-2", "RT-3"]
    trade_offs: "Increased client complexity"

  - option: "B"
    approach: "Server-side retry queue with Temporal.io"
    satisfies: ["RT-1", "RT-2", "RT-3", "RT-4"]
    trade_offs: "Infrastructure dependency"
```

## Example
```
/t3-anchor payment-retry-v2 --outcome="95% retry success for transient failures"

🎯 OUTCOME ANCHOR: "95% retry success for transient failures"

BACKWARD REASONING:

For 95% success, what MUST be true?

1. RT-1: Can distinguish transient from permanent failures
   Current: ⚠️ PARTIAL (HTTP codes only)
   Gap: Error taxonomy needed

2. RT-2: Retries are idempotent
   Current: ❓ UNKNOWN
   Gap: Audit all retry-able operations

3. RT-3: Sufficient retry budget
   Current: ❓ UNKNOWN
   Gap: Define max retries, backoff, timeout

SOLUTION SPACE:

| Option | Approach | Satisfies | Trade-offs |
|--------|----------|-----------|------------|
| A | Client-side exponential backoff | RT-1, RT-3 | Client complexity |
| B | Server-side Temporal.io queue | All | Infrastructure |
| C | Hybrid: client retry → server fallback | All | Complexity |

Select option to proceed: [A/B/C]
```
