# Evidence System

<!-- Satisfies: RT-3 (Evidence Documented), B1 (Code-to-Doc Parity), B4 (Release-Ready) -->

The evidence system (v3) provides concrete, verifiable proof that constraints are satisfied. Evidence moves development from "we think this is done" to "here is proof."

> **Prerequisites:** Familiarity with [constraint types](GLOSSARY.md#constraint) and [required truths](GLOSSARY.md#required-truth).

## Evidence Types

| Type | Checks | Speed | Use When |
|------|--------|-------|----------|
| `file_exists` | File is on disk | Fast | Artifact was created |
| `content_match` | File contains regex pattern | Fast | Implementation detail exists |
| `test_passes` | Test file + name exist (or pass) | Varies | Test coverage for a constraint |
| `metric_value` | Runtime metric meets threshold | N/A | Performance/reliability targets |
| `manual_review` | Human verified | Instant | Architecture decisions, audits |

### file_exists

```json
{
  "type": "file_exists",
  "path": "lib/retry/PaymentRetryService.ts",
  "status": "PENDING"
}
```

### content_match

```json
{
  "type": "content_match",
  "path": "lib/retry/PaymentRetryService.ts",
  "pattern": "class PaymentRetryService",
  "status": "PENDING"
}
```

The `pattern` field uses JavaScript regex syntax (with `gm` flags applied automatically).

### test_passes

```json
{
  "type": "test_passes",
  "path": "tests/retry/payment.test.ts",
  "test_name": "rejects duplicate payment attempts",
  "status": "PENDING"
}
```

By default, only checks the test file exists and contains the test name string. Add `--run-tests` to actually execute the test.

### manual_review

```json
{
  "type": "manual_review",
  "verified_by": "security_team",
  "verified_at": "2026-02-25T14:30:00Z",
  "status": "VERIFIED"
}
```

## Evidence Status

| Status | Symbol | Meaning |
|--------|--------|---------|
| `PENDING` | ⏳ | Awaiting verification |
| `VERIFIED` | ✓ | Passed |
| `FAILED` | ✗ | Verification failed |
| `STALE` | ⚠️ | File modified after verification |

Evidence becomes **STALE** when the underlying file is modified after `verified_at`. Re-run verification to update.

## Attaching Evidence

Add evidence to required truths in your `.manifold/<feature>.json`:

```json
{
  "anchors": {
    "required_truths": [
      {
        "id": "RT-1",
        "status": "SATISFIED",
        "maps_to": ["B1", "T1"],
        "evidence": [
          {
            "id": "EV-1",
            "type": "file_exists",
            "path": "lib/IdempotencyService.ts",
            "status": "PENDING"
          },
          {
            "id": "EV-2",
            "type": "test_passes",
            "path": "tests/IdempotencyService.test.ts",
            "test_name": "rejects duplicate payment attempts",
            "status": "PENDING"
          }
        ]
      }
    ]
  }
}
```

## Running Verification

```bash
# Check evidence for a feature
manifold verify payment-retry --verify-evidence

# Also run actual tests
manifold verify payment-retry --verify-evidence --run-tests

# Strict mode: fail if anything is pending
manifold verify payment-retry --verify-evidence --strict

# JSON output for CI
manifold verify payment-retry --verify-evidence --json
```

**Example output:**
```
EVIDENCE VERIFICATION

  ✓ [file_exists]     File exists: lib/IdempotencyService.ts
  ✓ [content_match]   Pattern matched: "class IdempotencyService" (1 occurrence)
  ✗ [content_match]   Pattern not found: "dedupKey" in lib/IdempotencyService.ts
  ⏳ [test_passes]    Test verification skipped (use --run-tests)
  ✓ [manual_review]   Verified by security_team at 2026-02-25T10:00:00Z

Evidence: 3/5 verified, 1 failed, 1 pending
```

## Best Practices

1. **Start minimal** — Begin with `file_exists`, add `content_match` as you refine
2. **Be specific** — Match `"class PaymentRetryService {"` not just `"PaymentRetry"`
3. **Plan during anchoring** — Define evidence when creating required truths, not after
4. **Run in CI** — Add `manifold verify --verify-evidence --strict` to your pipeline
5. **Use `manual_review` for non-code** — Architecture decisions, security audits, compliance

## Drift Detection

After verification, source files can change — introducing **drift** between verified state and current state. The drift detection system uses SHA-256 file hashing to detect post-verification changes.

### How It Works

1. During `manifold verify`, file hashes are recorded in `.manifold/<feature>.verify.json`
2. `manifold drift` compares current file hashes against recorded hashes
3. Files with changed hashes are reported as **drifted**

### Usage

```bash
# Check for drift across all features
manifold drift

# Check a single feature
manifold drift payment-retry

# JSON output for CI
manifold drift --json

# Update recorded hashes to current state (resets drift baseline)
manifold drift --update
```

### When to Use

- **Before releases** — Ensure verified artifacts haven't changed since verification
- **In CI/CD** — Add `manifold drift --json` as a pipeline step after verification
- **After refactoring** — Detect which verified features were affected by changes

See [CLI Reference — drift command](cli-reference.md#manifold-drift-feature) for full flag documentation.

## Satisfaction Levels

Constraints progress through four satisfaction levels, representing increasing confidence:

| Level | Meaning | How Determined |
|-------|---------|----------------|
| **DOCUMENTED** | Constraint exists in the manifold | Constraint has a statement in `.manifold/<feature>.md` |
| **IMPLEMENTED** | Code artifact exists | `file_exists` or `content_match` evidence is VERIFIED |
| **TESTED** | Test coverage exists | `test_passes` evidence is VERIFIED |
| **VERIFIED** | Full verification complete | All evidence for the constraint is VERIFIED |

Levels are cumulative — a VERIFIED constraint has also been DOCUMENTED, IMPLEMENTED, and TESTED. The satisfaction level is determined automatically by the evidence engine based on which evidence types have passed.

## Test Annotations

Test annotations create traceability links between test code and constraints. Two formats are supported:

### `@constraint` Tag (In Test Names)

```typescript
describe('PaymentRetryService', () => {
  // @constraint B1
  it('rejects duplicate payment attempts', async () => {
    // ...
  });
});
```

### `Satisfies:` Comment (In Implementation)

```typescript
/**
 * Classify error as transient or permanent
 * Satisfies: RT-1, T2
 */
classifyError(error: Error): ErrorType {
  // ...
}
```

Both formats are parsed by the evidence engine during verification. The `@constraint` tag in tests links test cases to specific constraint IDs, while `Satisfies:` comments in implementation code establish code-to-constraint traceability.

These annotations feed into:
- **Verification reports** — Which constraints have test coverage
- **Satisfaction levels** — Moving constraints from IMPLEMENTED to TESTED
- **Traceability matrices** — End-to-end mapping from constraint to code to test

## See Also

- [CLI Reference — verify command](cli-reference.md#manifold-verify-feature) — Full flag documentation
- [CLI Reference — drift command](cli-reference.md#manifold-drift-feature) — Drift detection documentation
- [Glossary](GLOSSARY.md) — Terminology explanations
- [Walkthrough](walkthrough/README.md) — End-to-end example with evidence
