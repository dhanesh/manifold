---
description: "Verify ALL artifacts against ALL constraints. Produces a verification matrix showing coverage and gaps"
---

# /m5-verify - Constraint Verification

Verify ALL artifacts against ALL constraints.

## Usage

```
/m5-verify <feature-name> [--strict]
```

## Verification Matrix

Every constraint must be verifiable in:
- **Code** - Is it implemented?
- **Test** - Is it validated?
- **Docs** - Is it documented?
- **Ops** - Is it monitored?

## Verification Statuses

| Status | Symbol | Meaning |
|--------|--------|---------|
| SATISFIED | ✓ | Fully implemented and verified |
| PARTIAL | ◐ | Partially addressed, gaps remain |
| MISSING | ✗ | Not addressed in this artifact |
| N/A | - | Not applicable to this artifact |

## Strictness Levels

**Default Mode:**
- All INVARIANTs must be ✓ in Code + Test
- All BOUNDARIEs must be ✓ in Code
- GOALs can be ◐ or ✓

**Strict Mode (`--strict`):**
- All constraints must be ✓ across all applicable artifacts
- No ◐ allowed
- Verification fails on any gap

## Example

```
/m5-verify payment-retry

CONSTRAINT VERIFICATION: payment-retry

VERIFICATION MATRIX:

| Constraint | Type | Code | Test | Docs | Ops | Status |
|------------|------|------|------|------|-----|--------|
| B1: No duplicates | INVARIANT | ✓ | ✓ | ✓ | ✓ | SATISFIED |
| B2: 95% success | GOAL | ✓ | ◐ | ✓ | ✓ | PARTIAL |
| B3: ≤72h window | BOUNDARY | ✓ | ✓ | ✓ | - | SATISFIED |
| T1: <200ms | BOUNDARY | ✓ | ◐ | ✓ | ✓ | PARTIAL |
| T2: 10K concurrent | GOAL | ✓ | ✗ | ✓ | ✓ | PARTIAL |

COVERAGE SUMMARY:

By Type:
- INVARIANTS: 4/4 (100%) ✓
- GOALS: 3/5 (60%) ◐
- BOUNDARIES: 2/3 (67%) ◐

By Artifact:
- Code: 11/11 (100%) ✓
- Tests: 7/9 (78%) ◐
- Docs: 11/11 (100%) ✓
- Ops: 8/8 (100%) ✓

GAPS IDENTIFIED:

Gap G1: B2 (95% success) - Test coverage incomplete
├── Missing: Load test validating success rate under stress
└── Action: Add test in PaymentRetryClient.test.ts

Gap G2: T1 (<200ms) - Test coverage incomplete
├── Missing: Performance test measuring p99 latency
└── Action: Add benchmark test

Gap G3: T2 (10K concurrent) - No test coverage
├── Missing: Concurrency stress test
└── Action: Add load test in integration.test.ts

VERIFICATION RESULT: PARTIAL (3 gaps)

Updated: .manifold/payment-retry.verify.yaml
```

## Task Tracking

Verification updates `.manifold/<feature>.verify.yaml` with comprehensive tracking:

```yaml
verification:
  timestamp: <ISO timestamp>
  result: PARTIAL | SATISFIED | FAILED
  matrix:
    - constraint: B1
      type: INVARIANT
      code: true
      test: true
      docs: true
      ops: true
      status: SATISFIED
    - constraint: T2
      type: GOAL
      code: true
      test: false
      docs: true
      ops: true
      status: PARTIAL
      gap: "Missing load test for 10K concurrent operations"
      action: "Add concurrency test to integration.test.ts"
  coverage:
    invariants: { satisfied: 4, total: 4, percentage: 100 }
    goals: { satisfied: 3, total: 5, percentage: 60 }
    boundaries: { satisfied: 2, total: 3, percentage: 67 }
  gaps:
    - id: G1
      constraint: T2
      issue: "No test coverage"
      action: "Add load test in integration.test.ts"
```

This enables:
- **Programmatic verification** - CI/CD can check `.verify.yaml`
- **Gap tracking** - Each gap has an action item
- **Progress monitoring** - Coverage improves as gaps are addressed

## Execution Instructions

1. Read manifold from `.manifold/<feature>.yaml`
2. Read generation data from manifold (artifacts list)
3. **Verify each declared artifact exists** on disk
4. Scan all artifacts for constraint references (comments like `// Satisfies: B1`)
5. Build verification matrix comparing declared vs actual coverage
6. Calculate coverage percentages by type and artifact
7. Identify specific gaps with actionable items
8. If `--strict` mode, fail verification on any gaps
9. **Update `.manifold/<feature>.verify.yaml`** with full results
10. Set phase to VERIFIED (or keep GENERATED if gaps exist)
