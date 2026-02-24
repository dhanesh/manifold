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

## See Also

- [CLI Reference — verify command](cli-reference.md#manifold-verify-feature) — Full flag documentation
- [Glossary](GLOSSARY.md) — Terminology explanations
- [Walkthrough](walkthrough/README.md) — End-to-end example with evidence
