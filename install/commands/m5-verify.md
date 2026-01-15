---
description: "Verify ALL artifacts against ALL constraints. Produces a verification matrix showing coverage and gaps"
---

# /m5-verify - Constraint Verification

Verify ALL artifacts against ALL constraints.

## Usage

```
/m5-verify <feature-name> [--strict] [--actions]
```

**Flags (v2):**
- `--strict` - Fail on any gaps
- `--actions` - Generate copy-paste executable actions for gaps (v2)

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

## Gap-to-Action Automation (v2)

With `--actions`, gaps are converted to executable tasks:

### Action Generation Rules

| Gap Type | Generated Action |
|----------|------------------|
| Missing test | Test file path + test function skeleton |
| Missing integration | Wiring command (see /m6-integrate) |
| Missing docs | Documentation section template |
| Missing feature flag | Cargo.toml edit command |
| Missing import | Import statement to add |

### Example: Gap Actions

```
/m5-verify graph-d-validation --actions

GAPS WITH EXECUTABLE ACTIONS:

Gap G1: GAP-11 - WAL not wired into storage layer
├── Type: integration
├── Constraint: RT-1
├── Severity: blocking
└── ACTION (copy-paste ready):

    # In src/storage/mod.rs, add:
    pub mod wal;

    # In MmapStorage::open(), add:
    let wal = Wal::open(&config.wal_path)?;

    # In MmapStorage struct, add field:
    wal: Option<Wal>,

Gap G2: GAP-7 - No unit tests for mvcc.rs
├── Type: test_coverage
├── Constraint: RT-2
├── Severity: non-blocking
└── ACTION (copy-paste ready):

    # Create tests/mvcc_tests.rs with:
    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_mvcc_read_your_own_writes() {
            // TODO: Implement
        }

        #[test]
        fn test_mvcc_isolation_levels() {
            // TODO: Implement
        }
    }

ACTIONS SUMMARY:
├── Blocking actions: 3
├── Non-blocking actions: 4
├── Total estimated lines: ~120
└── Next: Fix blocking actions, then re-run /m5-verify
```

## Execution Instructions

1. Read manifold from `.manifold/<feature>.yaml`
2. Read generation data from manifold (artifacts list)
3. **Verify each declared artifact exists** on disk
4. Scan all artifacts for constraint references (comments like `// Satisfies: B1`)
5. Build verification matrix comparing declared vs actual coverage
6. Calculate coverage percentages by type and artifact
7. Identify specific gaps with actionable items
8. **If `--actions` (v2)**, generate executable actions for each gap
9. If `--strict` mode, fail verification on any gaps
10. **Record iteration** in `iterations[]` (v2)
11. **Calculate convergence status** (v2)
12. **Update `.manifold/<feature>.verify.yaml`** with full results
13. Set phase to VERIFIED (or keep GENERATED if gaps exist)

## Quality Gate: Schema Validation

**Before running /m5-verify**, always validate the manifold schema:

```bash
# CLI validation (instant, no AI required)
manifold validate <feature>

# This catches:
# - Invalid phase values (e.g., CONVERGED instead of VERIFIED)
# - Invalid constraint types
# - Invalid tension types
# - Invalid required_truth statuses
```

**Why?** Schema validation and constraint verification are different:
- `manifold validate` = "Is the YAML structure correct?"
- `/m5-verify` = "Do artifacts satisfy constraints?"

Run `manifold validate` after every manifold modification to catch schema errors immediately
