---
name: manifold-m5-verify
description: "Verify ALL artifacts against ALL constraints. Produces a verification matrix showing coverage and gaps"
---

# /manifold:m5-verify

# /manifold:m5-verify - Constraint Verification

Verify ALL artifacts against ALL constraints.

## Scope Guard (MANDATORY)

**This phase ONLY reads existing artifacts and creates/updates `.manifold/<feature>.verify.json`.** It verifies what exists — it does not create what's missing.

**DO NOT** do any of the following during m5-verify:
- Create implementation code, tests, or documentation to fill gaps
- Spawn background agents or sub-agents to fix verification failures
- Modify source files, test files, or any files outside `.manifold/`
- Auto-fix gaps — only REPORT them with actionable descriptions

**Gaps are FINDINGS, not work orders.** Document gaps in the verification matrix and gap list. The user decides whether to fix them. **After creating/updating .verify.json: display verification matrix, list gaps, suggest next step, STOP.**

> **Discipline:** This command follows [`references/execution-discipline.md`](references/execution-discipline.md) — the Iron Law of verification (no SATISFIED claim without fresh evidence) and the Red Flags below.

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

| Flag | Purpose |
|------|---------|
| `--strict` | Fail on any gaps |
| `--actions` | Generate copy-paste executable actions for gaps (v2) |
| `--verify-evidence` | Verify concrete evidence for required truths (v3) |
| `--run-tests` | Execute test evidence verification (requires --verify-evidence) (v3) |
| `--execute` | Run configured test_runner subprocess (v3.1). Requires `.manifold/config.json` with `test_runner` |
| `--levels` | Show satisfaction level breakdown: DOCUMENTED / IMPLEMENTED / TESTED / VERIFIED (v3.1) |

## Verification Matrix

Every constraint is checked across four artifact dimensions:

| Dimension | Question |
|-----------|----------|
| **Code** | Is it implemented? |
| **Test** | Is it validated? |
| **Docs** | Is it documented? |
| **Ops** | Is it monitored? |

**Verification statuses:**

| Status | Symbol | Meaning |
|--------|--------|---------|
| SATISFIED | ✓ | Fully implemented and verified |
| PARTIAL | ◐ | Partially addressed, gaps remain |
| MISSING | ✗ | Not addressed in this artifact |
| N/A | - | Not applicable to this artifact |

## Strictness Levels

**Default:** INVARIANTs must be ✓ in Code + Test. BOUNDARIEs must be ✓ in Code. GOALs can be ◐ or ✓.

**Strict (`--strict`):** All constraints must be ✓ across all applicable artifacts. No ◐ allowed.

## SATISFIED Floor (evidence minimum)

A constraint MUST NOT be marked `✓ SATISFIED` on `file_exists` evidence alone.
`file_exists` proves only that a file is on disk — not that it satisfies the
constraint.

| Evidence available for the constraint | Maximum status |
|---|---|
| `file_exists` only | `◐ PARTIAL` |
| `manual_review` only | `◐ PARTIAL` until a human sets its evidence `status` to `VERIFIED` |
| `file_exists` + `content_match` | `✓ SATISFIED` (non-invariant constraints) |
| `test_passes` with status `VERIFIED` or `STALE` | `✓ SATISFIED` (any constraint type) |

Invariant constraints still require `test_passes` evidence to reach
`SATISFIED` (unchanged — see Strictness Levels above). When only `file_exists`
is present, cap the status at `◐ PARTIAL` and record the gap: "needs
content_match or test_passes evidence".

This floor governs the **`✓`/`◐` matrix status** only. It is a separate,
orthogonal axis from the **satisfaction levels** (`DOCUMENTED` / `IMPLEMENTED`
/ `TESTED` / `VERIFIED`) computed by Evidence Propagation below — the two do
not override each other. `VERIFIED` above is an evidence-item `status` value
(the schema defines `VERIFIED` / `PENDING` / `FAILED` / `STALE` for every
evidence type, not just `test_passes`) — so a human-verified `manual_review`
item can support `✓ SATISFIED` on the matrix axis even while the constraint
stays at the `DOCUMENTED` satisfaction level.

## Constraint Scope Coverage

`✓ SATISFIED` means the artifacts cover the constraint's **full stated scope** —
not merely the behavior the implementation happens to have.

- **Read the whole constraint statement.** If it enumerates cases (a list,
  "and"/"or"/"/", multiple file types or conditions), confirm each case is
  both implemented AND has test coverage. A constraint whose tests exercise
  only a subset of its statement is `◐ PARTIAL` — gap: "tests cover
  implementation behavior, not the constraint's full scope".
- **Do NOT infer `✓ SATISFIED` from a green test suite.** A green suite proves
  the tests that exist pass — not that they cover the constraint. Confirm the
  specific tests exercise what the constraint *states*. Verifying the
  implementation against itself is not verification.
- **A `// Satisfies:` comment is a claim, not evidence.** When an artifact
  asserts `// Satisfies: X`, confirm the code actually satisfies X before
  counting it. A false traceability comment must be reported as a gap.

## Satisfaction Levels (v3.1)

Constraints are classified by verification depth when `--levels` is used:

| Level | Meaning | Evidence Required |
|-------|---------|-------------------|
| `DOCUMENTED` | Constraint acknowledged in docs/specs | manual_review evidence |
| `IMPLEMENTED` | Code exists that addresses constraint | file_exists evidence |
| `TESTED` | Tests verify constraint behavior | test_passes with VERIFIED or STALE status |
| `VERIFIED` | Automated verification confirms | test_passes + status VERIFIED |

**Invariant-type constraints SHOULD reach at least TESTED level.**

**Critical:** A `test_passes` evidence item with status `PENDING` means the test file exists but has NOT been executed. This counts as `IMPLEMENTED`, not `TESTED`. Only `VERIFIED` or `STALE` statuses count toward `TESTED`.

## Test Tier Classification (v3.1)

Evidence items can declare `test_tier`: `unit`, `integration`, or `e2e`. Constraints involving external systems should require at least `integration` tier. Example evidence:

```json
{ "id": "E1", "type": "test_passes", "path": "tests/kafka.integration.ts", "test_name": "produces message to real Kafka", "test_tier": "integration" }
```

## Evidence Verification (v3)

With `--verify-evidence`, each required truth's evidence is checked:

| Type | Verification Method |
|------|---------------------|
| `file_exists` | Check file exists on disk |
| `content_match` | Grep for pattern in file content |
| `test_passes` | Run test and check exit code (requires `--run-tests`) |
| `metric_value` | Check runtime metric meets threshold |
| `manual_review` | Skip (requires human verification) |

### Evidence Propagation: RT to Constraint

Evidence lives on Required Truths, not directly on constraints. The chain: `RT.evidence` --> `RT.maps_to` --> Constraint satisfaction.

When multiple RTs map to the same constraint, aggregate their evidence before computing the level:

| Evidence combination | Satisfaction Level |
|---------------------|-------------------|
| No evidence | DOCUMENTED |
| file_exists or content_match | IMPLEMENTED |
| test_passes (PENDING) | IMPLEMENTED |
| test_passes (VERIFIED or STALE) | TESTED |
| All evidence VERIFIED + test passed | VERIFIED |

**Propagation algorithm:**
1. For each constraint, collect all RTs where `maps_to` includes that constraint ID
2. Gather all evidence items from those RTs
3. Apply the satisfaction level table using the highest applicable level
4. If any RT mapped to the constraint has failed evidence, the constraint cannot exceed `IMPLEMENTED`

## Drift Detection (v3.1)

```bash
manifold drift <feature>          # Check for changes since last verify
manifold drift <feature> --update # Recompute and store current hashes
```

File hashes are stored at verify time. After successful verification, capture baseline with `manifold drift <feature> --update`. Skipping this means post-verification changes go undetected.

## Configuration (v3.1)

Create `.manifold/config.json` to configure test execution:

```json
{
  "test_runner": "bun test",
  "test_args": ["--timeout", "30000"],
  "test_tier_patterns": { "unit": ["*.test.ts"], "integration": ["*.integration.ts"], "e2e": ["*.e2e.ts"] },
  "drift_hooks": { "on_drift": "echo 'Drift detected!'" }
}
```

## Traceability Matrix (v3.1)

Annotate test functions with constraint IDs for automatic traceability:

```typescript
describe('IdempotencyService', () => {
  // @constraint B1
  it('rejects duplicate payment attempts', async () => {
    // Satisfies: B1 (no duplicates)
  });
});
```

The verify command parses `@constraint` and `// Satisfies:` annotations to build a matrix: `{constraint_id -> [test_file:test_function]}`.

## Enhancement Verification Checks

### Genealogy Verification (Enhancement 2)

- Flag INVARIANT constraints with `challenger: assumption` as a **convergence risk**
- Flag constraints with `source: assumption` not confirmed by m4-generate
- Verify `challenger: regulation` constraints were never traded off in tension resolution

### Statistical Verification (Enhancement 6)

| Constraint kind | SATISFIED means |
|----------------|-----------------|
| `deterministic` | Artifact provably does not exceed the ceiling |
| `statistical` | Artifact addresses the distribution — test coverage includes percentile cases |

Flag any statistical constraint verified with a single deterministic test.

### Reversibility Verification (Enhancement 4)

- All `ONE_WAY` entries in `reversibility_log` must have a corresponding risk watch list entry
- ONE_WAY steps must have been explicitly acknowledged during m4-generate

### Propagation Verification (Enhancement 8)

- `VIOLATED` propagation effects mean the tension resolution is invalid
- `TIGHTENED` constraints with `challenger: assumption` must be confirmed before acceptance

### Binding Constraint Verification (Enhancement 5)

- If `anchors.binding_constraint` exists, verify the referenced required truth was addressed
- Flag if binding constraint remains NOT_SATISFIED after generation

## Gap-to-Action Automation (v2)

With `--actions`, gaps are converted to executable tasks:

| Gap Type | Generated Action |
|----------|------------------|
| Missing test | Test file path + test function skeleton |
| Missing integration | Wiring command (see /manifold:m6-integrate) |
| Missing docs | Documentation section template |
| Missing feature flag | Config edit command |
| Missing import | Import statement to add |

Actions are grouped as **blocking** vs **non-blocking**. Fix blocking actions first, then re-run `/manifold:m5-verify`.

## Example

```
/manifold:m5-verify payment-retry

CONSTRAINT VERIFICATION: payment-retry

VERIFICATION MATRIX:
| Constraint | Type | Code | Test | Docs | Ops | Status |
|------------|------|------|------|------|-----|--------|
| B1: No duplicates | INVARIANT | ✓ | ✓ | ✓ | ✓ | SATISFIED |
| B2: 95% success | GOAL | ✓ | ◐ | ✓ | ✓ | PARTIAL |
| T1: <200ms | BOUNDARY | ✓ | ◐ | ✓ | ✓ | PARTIAL |

COVERAGE SUMMARY:
- INVARIANTS: 4/4 (100%) ✓
- GOALS: 3/5 (60%) ◐
- BOUNDARIES: 2/3 (67%) ◐

GAPS IDENTIFIED:
Gap G1: B2 (95% success) - Missing load test validating success rate
Gap G2: T1 (<200ms) - Missing performance test measuring p99 latency

VERIFICATION RESULT: PARTIAL (2 gaps)
Updated: .manifold/payment-retry.verify.json
```

## verify.json Output

Verification writes `.manifold/<feature>.verify.json`:

```json
{
  "verification": {
    "timestamp": "<ISO timestamp>",
    "result": "PARTIAL",
    "matrix": [
      { "constraint": "B1", "type": "INVARIANT", "code": true, "test": true, "docs": true, "ops": true, "status": "SATISFIED" },
      { "constraint": "T2", "type": "GOAL", "code": true, "test": false, "docs": true, "ops": true, "status": "PARTIAL", "gap": "Missing load test", "action": "Add concurrency test" }
    ],
    "coverage": {
      "invariants": { "satisfied": 4, "total": 4, "percentage": 100 },
      "goals": { "satisfied": 3, "total": 5, "percentage": 60 },
      "boundaries": { "satisfied": 2, "total": 3, "percentage": 67 }
    },
    "gaps": [
      { "id": "G1", "constraint": "T2", "issue": "No test coverage", "action": "Add load test in integration.test.ts" }
    ]
  }
}
```

## Execution Instructions

> **Always emit `.manifold/<feature>.verify.json`, regardless of result.** SATISFIED, PARTIAL, or blocked — the artifact is always written. Blockers keep the phase at `GENERATED` (not advanced to `VERIFIED`) but do NOT suppress the artifact. `.verify.json` presence is the signal that m5 ran; phase is the signal of whether it converged.

1. Read structure from `.manifold/<feature>.json` and content from `.manifold/<feature>.md`
2. **Validate linking** between JSON IDs and Markdown headings
3. Read generation data from JSON (artifacts list)
4. **Verify each declared artifact exists** on disk
5. Scan all artifacts for constraint references (`// Satisfies: B1`)
6. Build verification matrix comparing declared vs actual coverage
7. Calculate coverage percentages by type and artifact
8. Identify specific gaps with actionable items
9. **If `--verify-evidence`**: verify evidence for each required truth (file_exists, content_match, test_passes if `--run-tests`, metric_value, manual_review)
10. Compute satisfaction levels by propagating evidence from RTs via `maps_to` mappings
11. **If `--levels`**: display satisfaction level breakdown per constraint
12. **If `--actions`**: generate executable actions for each gap
13. If `--strict`, fail on any gaps or failed evidence
14. Record iteration in JSON `iterations[]` and calculate convergence status
15. **Update `.manifold/<feature>.verify.json`** with full results
16. Capture drift baseline via `manifold drift <feature> --update`
17. Set phase to VERIFIED in JSON (or keep GENERATED if gaps exist)

### Linking Validation

When verifying JSON+Markdown manifolds, check:
- All constraint IDs in JSON have matching `#### ID: Title` in Markdown
- All tension IDs in JSON have matching `### ID: Title` in Markdown
- All required truth IDs in JSON have matching `### ID: Title` in Markdown
- `tension.between` references exist as constraint IDs
- `required_truth.maps_to` references exist

## User Interaction (MANDATORY)

m5-verify is mostly read-only — its output is a verification matrix + `.verify.json` artifact + suggested next steps. The verify report itself does NOT need `AskUserQuestion` (it is a status report, end with "Waiting for your command"). However, two interactive paths can arise:

- `--strict` failures: when blocking gaps appear, the model may need to ask the user how to proceed (e.g., "open a follow-up", "amend the manifold", "accept and re-verify"). Those questions MUST use `AskUserQuestion`, not prose.
- Tension `REOPENED` findings during solution-tension validation: the user must decide accept / change option / modify, per the spec. That decision MUST use `AskUserQuestion`.

If your reply contains a question soliciting a user response → use `AskUserQuestion`. Markdown options ending in "which one?" are the anti-pattern. See `install/agents/interaction-rules.md`; the `prompt-enforcer.ts` hook reinforces at runtime.

## Red Flags

| Thought | Reality |
|---|---|
| "The file exists, mark it SATISFIED" | `file_exists` alone caps the status at `◐ PARTIAL`. See the SATISFIED Floor. |
| "I'll fix the gaps I found" | m5-verify only REPORTS gaps. Fixing them is a separate, user-decided step. |
| "Tests probably pass, mark TESTED" | `test_passes` with status `PENDING` counts as `IMPLEMENTED`, not `TESTED`. Run the tests. |
| "The suite is green, mark it SATISFIED" | A green suite proves the tests that exist pass — not that they cover the constraint's full stated scope. Check scope, not just exit code. |
| "The code says `// Satisfies: X`, so it does" | A traceability comment is a claim to verify, not evidence. Read the code. |
| "verify.json from the last run is fine" | Always emit a fresh `.verify.json` — stale results are not evidence. |

Run `manifold validate <feature>` after updates. Shared directives (output format, interaction rules, validation) injected by phase-commons hook.
