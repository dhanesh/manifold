---
description: "Generate ALL artifacts simultaneously from the constraint manifold - code, tests, docs, runbooks, alerts"
---

# /m4-generate - Artifact Generation

Generate ALL artifacts simultaneously from the constraint manifold.

## Usage

```
/m4-generate <feature-name> [--option=<A|B|C>] [--artifacts=<list>]
```

## Why All At Once?

**Traditional approach:**
```
Code → Tests → Docs → Ops (often forgotten)
```
Each phase loses context. Tests don't cover all constraints.

**Manifold approach:**
```
Constraints → [Code, Tests, Docs, Ops] (simultaneously)
```
All artifacts derive from the SAME source. Every constraint is traced.

## Artifacts Generated

| Artifact | Purpose | Constraint Tracing |
|----------|---------|-------------------|
| **Code** | Implementation | Each function traces to constraints |
| **Tests** | Validation | Each test validates a constraint |
| **Docs** | Decisions | Each decision references constraints |
| **Runbooks** | Operations | Each procedure addresses failure modes |
| **Dashboards** | Monitoring | Each metric tracks a GOAL |
| **Alerts** | Notification | Each alert detects INVARIANT violation |

## Example

```
/m4-generate payment-retry --option=C

ARTIFACT GENERATION: payment-retry

Option: C (Hybrid - Client retry + Server queue)

Generating from 12 constraints + 5 required truths...

ARTIFACTS CREATED:

Code:
├── src/retry/PaymentRetryClient.ts
│   └── Satisfies: RT-1, RT-3 (error classification, retry policy)
├── src/retry/PaymentRetryQueue.ts
│   └── Satisfies: RT-5 (durable queue)
├── src/retry/IdempotencyService.ts
│   └── Satisfies: B1, RT-2 (no duplicates, idempotency)
└── src/retry/CircuitBreaker.ts
    └── Satisfies: RT-4 (downstream recovery)

Tests:
├── src/retry/__tests__/PaymentRetryClient.test.ts
│   └── Validates: B1, B2, T1, U2
├── src/retry/__tests__/IdempotencyService.test.ts
│   └── Validates: B1 (INVARIANT - critical)
└── src/retry/__tests__/integration.test.ts
    └── Validates: End-to-end constraint coverage

Docs:
├── docs/payment-retry/README.md
├── docs/payment-retry/API.md
└── docs/payment-retry/DECISIONS.md

Runbooks:
├── ops/runbooks/payment-retry-queue-overflow.md
├── ops/runbooks/payment-retry-success-drop.md
└── ops/runbooks/payment-retry-rollback.md

Dashboards:
└── ops/dashboards/payment-retry.json

Alerts:
└── ops/alerts/payment-retry.yaml

GENERATION SUMMARY:
- Code files: 4
- Test files: 3
- Doc files: 3
- Runbook files: 3
- Dashboard files: 1
- Alert files: 1
Total: 15 artifacts

Next: /m5-verify payment-retry
```

## Task Tracking

When generating artifacts, update `.manifold/<feature>.yaml` with completion status:

```yaml
generation:
  option: C
  timestamp: <ISO timestamp>
  artifacts:
    - path: src/retry/PaymentRetryClient.ts
      satisfies: [RT-1, RT-3]
      status: generated
    - path: src/retry/__tests__/PaymentRetryClient.test.ts
      validates: [B1, B2, T1, U2]
      status: generated
  coverage:
    constraints_addressed: 12
    constraints_total: 12
    percentage: 100
```

This ensures:
- Every artifact traces to constraints it addresses
- Coverage can be verified programmatically
- `/m5-verify` can check actual files against declared artifacts

## Execution Instructions

1. Read manifold from `.manifold/<feature>.yaml`
2. Read anchoring from `.manifold/<feature>.anchor.yaml`
3. Select solution option (from `--option` or prompt user)
4. For each artifact type:
   - Generate artifact with constraint traceability
   - Add comments linking to constraint IDs: `// Satisfies: B1, T2`
5. Create all files in appropriate directories
6. **Update manifold YAML** with generation tracking (artifacts, coverage)
7. Set phase to GENERATED
8. Display summary with constraint coverage
