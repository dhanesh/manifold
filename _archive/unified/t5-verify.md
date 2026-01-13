# /t5-verify

Verify ALL artifacts against ALL constraints.

## Usage
```
/t5-verify <feature-name> [--artifacts=<path>] [--strict]
```

## What It Does

For each constraint in the manifold, checks:

1. **Code Coverage** - Is this constraint addressed in implementation?
2. **Test Coverage** - Is there a test that verifies this constraint?
3. **Documentation** - Is this constraint documented?
4. **Operational Coverage** - Are there runbooks/alerts for violations?

## Verification Matrix

```
| Constraint | Code | Test | Docs | Ops | Status |
|------------|------|------|------|-----|--------|
| ⛔ B1: No duplicates | ✓ | ✓ | ✓ | ✓ | ✅ SATISFIED |
| 🎯 T1: <200ms | ✓ | ◐ | ✓ | ✓ | ⚠️ PARTIAL |
| 🚧 B3: ≤72h window | ✓ | ✓ | ✓ | ✗ | ⚠️ PARTIAL |
```

## Status Meanings

| Status | Symbol | Meaning |
|--------|--------|---------|
| SATISFIED | ✅ | Constraint fully covered |
| PARTIAL | ⚠️ | Some coverage, gaps remain |
| NOT SATISFIED | ❌ | Constraint not addressed |
| NOT VERIFIED | ❓ | Can't determine (needs human) |

## Output

```
/t5-verify payment-retry-v2

📊 VERIFICATION REPORT

Constraint Coverage:
- INVARIANTS: 3/3 (100%) ✅
- GOALS: 4/5 (80%) ⚠️
- BOUNDARIES: 2/4 (50%) ⚠️

Gaps Identified:

1. T3: "Distinguish transient vs permanent"
   - Code: ✓ Implemented
   - Test: ✗ MISSING - No test for error classification
   - Docs: ✓ Documented
   - Action: Add test for ErrorClassifier.classify()

2. B4: "Audit trail for all retry attempts"
   - Code: ✓ Implemented
   - Test: ✓ Covered
   - Docs: ✓ Documented
   - Ops: ✗ MISSING - No alert for audit failures
   - Action: Add alert rule

Overall: 78% constraint satisfaction
Target: 100% for INVARIANTS, 90% for GOALS

Next steps:
- Fix 2 identified gaps
- Re-run /t5-verify to confirm
```
