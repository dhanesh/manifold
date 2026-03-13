---
description: "Verify ALL artifacts against ALL constraints. Produces a verification matrix showing coverage and gaps"
argument-hint: "<feature-name> [--actions] [--strict]"
---

# /manifold:m5-verify - Constraint Verification

Verify ALL artifacts against ALL constraints.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/manifold:m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/manifold:m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/manifold:m5-verify <feature>`"
4. **STOP AND WAIT** for user command

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `VERIFIED` |
| **Next Phase** | Return to `INITIALIZED` for iteration, or workflow complete |
| **Convergence Statuses** | `NOT_STARTED`, `IN_PROGRESS`, `CONVERGED` |
| **Verification Symbols** | `✓` (SATISFIED), `◐` (PARTIAL), `✗` (MISSING), `-` (N/A) |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new phases or statuses.

## Usage

```
/manifold:m5-verify <feature-name> [--strict] [--actions] [--verify-evidence] [--run-tests] [--execute] [--levels]
```

**Flags:**
- `--strict` - Fail on any gaps
- `--actions` - Generate copy-paste executable actions for gaps (v2)
- `--verify-evidence` - Verify concrete evidence for required truths (v3)
- `--run-tests` - Execute test evidence verification (requires --verify-evidence) (v3)
- `--execute` - Run configured test_runner subprocess for real pass/fail results (v3.1, GAP-01). Requires `.manifold/config.json` with `test_runner` field
- `--levels` - Show satisfaction level breakdown: DOCUMENTED → IMPLEMENTED → TESTED → VERIFIED (v3.1, GAP-05)

## Satisfaction Levels (v3.1)

Constraints are classified by verification depth, not just pass/fail:

| Level | Meaning | Evidence Required |
|-------|---------|-------------------|
| `DOCUMENTED` | Constraint acknowledged in docs/specs | manual_review evidence |
| `IMPLEMENTED` | Code exists that addresses constraint | file_exists evidence |
| `TESTED` | Tests verify constraint behavior | test_passes evidence with VERIFIED or STALE status |
| `VERIFIED` | Automated verification confirms | test_passes + status VERIFIED |

**Invariant-type constraints SHOULD reach at least TESTED level.** The `--levels` flag shows this breakdown.

**Critical distinction for test_passes status:**
- A `test_passes` evidence item with status `PENDING` means the test file exists and contains the named test, but the test has NOT been executed. This counts as `IMPLEMENTED`, not `TESTED`.
- Only `test_passes` evidence with status `VERIFIED` or `STALE` counts toward the `TESTED` level, because those statuses confirm the test was actually run and passed.
- This prevents inflating satisfaction scores for tests that have not actually been executed.

## Test Tier Classification (v3.1, GAP-02)

Evidence items can declare their test tier: `unit`, `integration`, or `e2e`.

Constraints involving external systems (databases, APIs, message queues) should require at least `integration` tier evidence. Mocked unit tests prove code structure, not runtime behavior.

```json
{
  "type": "test_passes",
  "path": "tests/kafka.integration.ts",
  "test_name": "produces message to real Kafka",
  "test_tier": "integration"
}
```

## Drift Detection (v3.1, GAP-07)

After verification, use `manifold drift <feature>` to detect post-verification changes:

```bash
manifold drift my-feature          # Check for changes since last verify
manifold drift my-feature --json   # Machine-readable output
manifold drift my-feature --update # Recompute and store current hashes
```

File hashes are stored at verify time. When files change after verification, drift is flagged with affected constraint IDs.

## Configuration (v3.1)

Create `.manifold/config.json` to configure test execution:

```json
{
  "test_runner": "bun test",
  "test_args": ["--timeout", "30000"],
  "test_tier_patterns": {
    "unit": ["*.test.ts", "*.spec.ts"],
    "integration": ["*.integration.ts"],
    "e2e": ["*.e2e.ts"]
  },
  "drift_hooks": {
    "on_drift": "echo 'Drift detected!'"
  }
}
```

## Traceability Matrix (v3.1, GAP-12)

Annotate test functions with constraint IDs for automatic traceability:

```typescript
// In your test files:
describe('IdempotencyService', () => {
  // @constraint B1
  it('rejects duplicate payment attempts', async () => {
    // Satisfies: B1 (no duplicates)
  });
});
```

The verify command parses `@constraint` and `// Satisfies:` annotations to build a matrix: `{constraint_id → [test_file:test_function]}`.

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
/manifold:m5-verify payment-retry

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

Updated: .manifold/payment-retry.verify.json
```

## Task Tracking

Verification updates `.manifold/<feature>.verify.json` with comprehensive tracking:

```json
{
  "verification": {
    "timestamp": "<ISO timestamp>",
    "result": "PARTIAL",
    "matrix": [
      {
        "constraint": "B1",
        "type": "INVARIANT",
        "code": true,
        "test": true,
        "docs": true,
        "ops": true,
        "status": "SATISFIED"
      },
      {
        "constraint": "T2",
        "type": "GOAL",
        "code": true,
        "test": false,
        "docs": true,
        "ops": true,
        "status": "PARTIAL",
        "gap": "Missing load test for 10K concurrent operations",
        "action": "Add concurrency test to integration.test.ts"
      }
    ],
    "coverage": {
      "invariants": { "satisfied": 4, "total": 4, "percentage": 100 },
      "goals": { "satisfied": 3, "total": 5, "percentage": 60 },
      "boundaries": { "satisfied": 2, "total": 3, "percentage": 67 }
    },
    "gaps": [
      {
        "id": "G1",
        "constraint": "T2",
        "issue": "No test coverage",
        "action": "Add load test in integration.test.ts"
      }
    ]
  }
}
```

This enables:
- **Programmatic verification** - CI/CD can check `.verify.json`
- **Gap tracking** - Each gap has an action item
- **Progress monitoring** - Coverage improves as gaps are addressed

## Gap-to-Action Automation (v2)

With `--actions`, gaps are converted to executable tasks:

### Action Generation Rules

| Gap Type | Generated Action |
|----------|------------------|
| Missing test | Test file path + test function skeleton |
| Missing integration | Wiring command (see /manifold:m6-integrate) |
| Missing docs | Documentation section template |
| Missing feature flag | Cargo.toml edit command |
| Missing import | Import statement to add |

### Example: Gap Actions

```
/manifold:m5-verify graph-d-validation --actions

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
└── Next: Fix blocking actions, then re-run /manifold:m5-verify
```

## Evidence Auto-Verification (v3)

With `--verify-evidence`, each required truth's evidence is automatically verified:

### Evidence Types

| Type | Verification Method |
|------|---------------------|
| `file_exists` | Check file exists on disk |
| `content_match` | Grep for pattern in file content |
| `test_passes` | Run test and check exit code (requires `--run-tests`) |
| `metric_value` | Check runtime metric meets threshold |
| `manual_review` | Skip (requires human verification) |

### Example: Evidence Verification

```
/manifold:m5-verify payment-retry --verify-evidence

EVIDENCE VERIFICATION: payment-retry

REQUIRED TRUTH EVIDENCE:

RT-1: Idempotency key preserved across retries
├── ✓ [file_exists] src/idempotency.ts
│   └── Verified: File exists (2.4KB, modified 2h ago)
├── ✓ [content_match] src/idempotency.ts
│   └── Verified: Pattern "idempotency_key.*uuid" found (3 matches)
└── ⏳ [test_passes] tests/idempotency.test.ts
    └── Pending: Use --run-tests to execute

RT-2: Error classification distinguishes transient from permanent
├── ✓ [file_exists] src/error-classifier.ts
│   └── Verified: File exists (1.8KB)
├── ✓ [content_match] src/error-classifier.ts
│   └── Verified: Pattern "TransientError|PermanentError" found (12 matches)
└── ✓ [content_match] src/error-classifier.ts
    └── Verified: Pattern "isRetryable.*boolean" found (2 matches)

RT-3: Retry budget configured via environment
├── ✓ [file_exists] .env.example
│   └── Verified: File exists
├── ✓ [content_match] .env.example
│   └── Verified: Pattern "MAX_RETRY_ATTEMPTS" found
└── ✗ [content_match] src/config.ts
    └── Failed: Pattern "RETRY_BUDGET" not found

EVIDENCE SUMMARY:
├── Verified: 8/10 evidence items
├── Pending: 1 (test_passes - use --run-tests)
├── Failed: 1 (see details above)
└── Coverage: 80%

FAILED EVIDENCE:
├── RT-3: [content_match] src/config.ts - "RETRY_BUDGET" not found
└── Action: Add RETRY_BUDGET configuration to src/config.ts
```

### With Test Execution

```
/manifold:m5-verify payment-retry --verify-evidence --run-tests

EVIDENCE VERIFICATION: payment-retry (with test execution)

RT-1: Idempotency key preserved across retries
├── ✓ [file_exists] src/idempotency.ts
├── ✓ [content_match] src/idempotency.ts
└── ✓ [test_passes] tests/idempotency.test.ts
    └── Verified: Test "preserves_key_across_retries" passed (0.8s)

EVIDENCE SUMMARY:
├── Verified: 10/10 evidence items
├── Tests run: 3 (all passed)
└── Coverage: 100% ✓
```

### CLI Integration

The evidence verification is also available via the CLI:

```bash
# Verify evidence without running tests
manifold verify payment-retry --verify-evidence

# Verify evidence and run tests
manifold verify payment-retry --verify-evidence --run-tests

# JSON output for CI/CD
manifold verify payment-retry --verify-evidence --json
```

### Evidence Propagation: RT to Constraint

Evidence lives on Required Truths, not directly on constraints. The verification chain flows from evidence through required truths to constraints via `maps_to` mappings.

**The chain:** `RT.evidence` --> `RT.maps_to` --> Constraint satisfaction

**Example:**

```
RT-1 has evidence: [file_exists src/auth.ts, test_passes tests/auth.test.ts]
RT-1 maps_to: [B1, T1]
--> B1 inherits RT-1's evidence for satisfaction level computation
--> T1 inherits RT-1's evidence for satisfaction level computation
```

A constraint's satisfaction level is determined by the COMBINED evidence from all RTs that map to it. When multiple RTs map to the same constraint, aggregate their evidence before computing the level.

| Evidence combination | Satisfaction Level | Meaning |
|---------------------|-------------------|---------|
| No evidence | DOCUMENTED | Constraint stated but not implemented |
| file_exists or content_match | IMPLEMENTED | Code exists but not test-verified |
| test_passes (PENDING) | IMPLEMENTED | Test exists but has not been executed |
| test_passes (VERIFIED or STALE) | TESTED | Test has been executed and passed |
| All evidence VERIFIED + test passed | VERIFIED | Fully verified with evidence |

**Critical rule:** A `test_passes` evidence item with `PENDING` status means the test FILE exists and contains the test name, but the test has not been executed. This is `IMPLEMENTED`, not `TESTED`. Only `VERIFIED` or `STALE` statuses on `test_passes` evidence count toward the `TESTED` level. This distinction is essential to prevent reporting a constraint as tested when the test has never actually run.

**Propagation algorithm:**

1. For each constraint, collect all RTs where `maps_to` includes that constraint ID
2. Gather all evidence items from those RTs
3. Apply the satisfaction level table above using the highest applicable level
4. If any RT mapped to the constraint has failed evidence, the constraint cannot exceed `IMPLEMENTED`

### Post-Verification: Drift Baseline

After successful verification, capture file hashes for drift detection:

```bash
manifold drift <feature> --update
```

This records SHA-256 hashes of all artifacts referenced in `.manifold/<feature>.verify.json`. Subsequent `manifold drift <feature>` commands compare current hashes against the baseline to detect post-verification changes.

When drift is detected, the output shows:
- Which files changed since the baseline was captured
- Which constraint IDs are affected (via artifact `satisfies` arrays)
- Recommendation to re-verify affected constraints

**Include drift baseline capture in the verification workflow:**

1. Run `manifold verify <feature> --verify-evidence` to verify all evidence
2. Fix any failed evidence items
3. Re-run verification until all evidence passes
4. Run `manifold drift <feature> --update` to capture the baseline
5. Phase set to VERIFIED

Skipping the drift baseline step means post-verification changes will go undetected until the next full verification cycle. Always capture the baseline immediately after a successful verify pass.

## Execution Instructions

### For JSON+Markdown Format (Default)

1. Read structure from `.manifold/<feature>.json`
2. Read content from `.manifold/<feature>.md`
3. **Validate linking** between JSON IDs and Markdown headings
4. Read generation data from JSON (artifacts list)
5. **Verify each declared artifact exists** on disk
6. Scan all artifacts for constraint references (comments like `// Satisfies: B1`)
7. Build verification matrix comparing declared vs actual coverage
8. Calculate coverage percentages by type and artifact
9. Identify specific gaps with actionable items
10. **If `--verify-evidence` (v3)**, verify concrete evidence for each required truth:
    - `file_exists`: Check file exists on disk
    - `content_match`: Grep for pattern in file content
    - `test_passes`: Run test if `--run-tests` flag is set
    - `metric_value`: Check runtime metric threshold
    - `manual_review`: Skip, mark as pending
11. Compute satisfaction levels for each constraint by propagating evidence from required truths via `maps_to` mappings (see "Evidence Propagation: RT to Constraint")
12. **If `--levels` flag**: display satisfaction level breakdown (DOCUMENTED/IMPLEMENTED/TESTED/VERIFIED) for each constraint using the propagated evidence
13. **If `--actions` (v2)**, generate executable actions for each gap
14. If `--strict` mode, fail verification on any gaps or failed evidence
15. **Record iteration** in JSON `iterations[]` (v2)
16. **Calculate convergence status** (v2)
17. **Update `.manifold/<feature>.verify.json`** with full results including evidence status
18. Capture drift baseline: record file hashes for all artifacts via `manifold drift <feature> --update`
19. Set phase to VERIFIED in JSON (or keep GENERATED if gaps exist)

### Linking Validation

When verifying JSON+Markdown manifolds, check:
- All constraint IDs in JSON have matching `#### ID: Title` in Markdown
- All tension IDs in JSON have matching `### ID: Title` in Markdown
- All required truth IDs in JSON have matching `### ID: Title` in Markdown
- `tension.between` references exist as constraint IDs
- `required_truth.maps_to` references exist

Use `manifold validate <feature>` for automatic linking validation.

### For Legacy YAML Format

1. Read manifold from `.manifold/<feature>.yaml`
2. Read generation data from manifold (artifacts list)
3. **Verify each declared artifact exists** on disk
4. Scan all artifacts for constraint references (comments like `// Satisfies: B1`)
5. Build verification matrix comparing declared vs actual coverage
6. Calculate coverage percentages by type and artifact
7. Identify specific gaps with actionable items
8. **If `--verify-evidence` (v3)**, verify concrete evidence for each required truth:
   - `file_exists`: Check file exists on disk
   - `content_match`: Grep for pattern in file content
   - `test_passes`: Run test if `--run-tests` flag is set
   - `metric_value`: Check runtime metric threshold
   - `manual_review`: Skip, mark as pending
9. Compute satisfaction levels for each constraint by propagating evidence from required truths via `maps_to` mappings (see "Evidence Propagation: RT to Constraint")
10. **If `--levels` flag**: display satisfaction level breakdown (DOCUMENTED/IMPLEMENTED/TESTED/VERIFIED) for each constraint using the propagated evidence
11. **If `--actions` (v2)**, generate executable actions for each gap
12. If `--strict` mode, fail verification on any gaps or failed evidence
13. **Record iteration** in `iterations[]` (v2)
14. **Calculate convergence status** (v2)
15. **Update `.manifold/<feature>.verify.json`** with full results including evidence status
16. Capture drift baseline: record file hashes for all artifacts via `manifold drift <feature> --update`
17. Set phase to VERIFIED (or keep GENERATED if gaps exist)

## Quality Gate: Schema Validation

**Before running /manifold:m5-verify**, always validate the manifold schema:

```bash
# CLI validation (instant, no AI required)
manifold validate <feature>

# For JSON+Markdown format, this validates:
# - JSON structure against Zod schema
# - Markdown content parsing
# - Linking between JSON IDs and Markdown headings
# - Reference integrity (tension.between, maps_to)

# For legacy YAML format, this catches:
# - Invalid phase values (e.g., CONVERGED instead of VERIFIED)
# - Invalid constraint types
# - Invalid tension types
# - Invalid required_truth statuses
```

**Why?** Schema validation and constraint verification are different:
- `manifold validate` = "Is the structure correct and linked?"
- `/manifold:m5-verify` = "Do artifacts satisfy constraints?"

Run `manifold validate` after every manifold modification to catch schema/linking errors immediately


## Interaction Rules (MANDATORY)
<!-- Satisfies: RT-1 (next-step templates), RT-3 (structured input), U1 (suggest next), U2 (AskUserQuestion) -->

1. **Questions → AskUserQuestion**: When you need user input during this phase, use the `AskUserQuestion` tool with structured options. NEVER ask questions as plain text without options.
2. **Phase complete → Suggest next**: After completing this phase, ALWAYS include the concrete next command (`/manifold:mN-xxx <feature>`) and a one-line explanation of what the next phase does.
3. **Trade-offs → Labeled options**: When presenting alternatives, use `AskUserQuestion` with labeled choices (A, B, C) and descriptions.
