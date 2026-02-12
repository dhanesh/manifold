# schema-enforcement

## Outcome

All YAML manifold generation follows v3 schema templates with automatic validation, conflict detection between features/prompts, and incorporation of Claude Code team + bcherny best practices

---

## Context

### Motivation

- Schema v3 exists but enforcement is manual and error-prone
- Conflicting features/prompts can cause inconsistent behavior
- Best practices from Claude Code team (Anthropic) and bcherny evolve but aren't systematically captured
- YAML generation across commands may drift from templates
- No automated validation that generated manifolds match schema

---

## Constraints

### Business

#### B1: All manifold commands (/m0-m6) MUST generate schema v3 compliant YAML

All manifold commands (/m0-m6) MUST generate schema v3 compliant YAML

> **Rationale:** Schema drift causes validation failures in CI, breaking user trust

#### B2: Conflicting constraints across features MUST be detected before GENERATED phase

Conflicting constraints across features MUST be detected before GENERATED phase

> **Rationale:** Undetected conflicts lead to contradictory implementations that waste developer time

#### B3: Best practices from Claude Code team and bcherny should be incorporated within 30 days of publication

Best practices from Claude Code team and bcherny should be incorporated within 30 days of publication

> **Rationale:** Stale practices reduce framework value and competitive positioning

#### B4: Migration path must exist from v1 to v2 to v3 (no mandatory version jumps)

Migration path must exist from v1 to v2 to v3 (no mandatory version jumps)

> **Rationale:** Breaking existing manifolds loses user trust and adoption

#### B5: 100% of existing manifolds must remain valid after schema updates

100% of existing manifolds must remain valid after schema updates

> **Rationale:** Backward compatibility ensures frictionless upgrades

### Technical

#### T1: CLI validate command must support schema v3 evidence and constraint_graph validation

CLI validate command must support schema v3 evidence and constraint_graph validation

> **Rationale:** Current CLI only validates v1/v2; v3 features are silently ignored

#### T2: Validation must complete in less than 100ms for single manifold

Validation must complete in less than 100ms for single manifold

> **Rationale:** Matches existing CLI performance contract (sub-100ms)

#### T3: Constraint ID references (e

Constraint ID references (e.g., [B1, T2] in tensions) must resolve to existing constraints

> **Rationale:** Dangling references indicate broken manifolds

#### T4: Cross-feature conflict detection should identify overlapping constraint IDs

Cross-feature conflict detection should identify overlapping constraint IDs

> **Rationale:** Two features with same B1 causes confusion in references

#### T5: YAML templates in SCHEMA_REFERENCE

YAML templates in SCHEMA_REFERENCE.md must match actual validation rules

> **Rationale:** Template/validator divergence causes false confidence

#### T6: Schema validation errors must be actionable (include field path, expected values)

Schema validation errors must be actionable (include field path, expected values)

> **Rationale:** Vague errors like 'invalid' waste debugging time

#### T7: Evidence verification should run in parallel where possible

Evidence verification should run in parallel where possible

> **Rationale:** File existence and content match checks are independent

### User Experience

#### U1: Validation errors must include the exact field path (e

Validation errors must include the exact field path (e.g., constraints.business[2].type)

> **Rationale:** Users need to locate and fix the exact problem location

#### U2: Error messages should suggest valid alternatives (e

Error messages should suggest valid alternatives (e.g., 'Must be: invariant, goal, boundary')

> **Rationale:** Reduces lookup time for users unfamiliar with schema

#### U3: No more than 20 validation errors displayed before truncation

No more than 20 validation errors displayed before truncation

> **Rationale:** Wall of errors is overwhelming; focus on first issues

#### U4: Conflict detection should explain WHY constraints conflict, not just THAT they do

Conflict detection should explain WHY constraints conflict, not just THAT they do

> **Rationale:** 'B1 and T3 conflict' is less useful than 'B1 requires X but T3 prohibits X'

#### U5: AI commands (/m0-m6) must not generate YAML that fails validation

AI commands (/m0-m6) must not generate YAML that fails validation

> **Rationale:** Generated content should be correct by construction

### Security

#### S1: YAML parsing must use safe loader (no arbitrary code execution)

YAML parsing must use safe loader (no arbitrary code execution)

> **Rationale:** YAML deserialization can execute code if not sanitized

#### S2: Evidence file paths must be validated against path traversal (no 

Evidence file paths must be validated against path traversal (no ../)

> **Rationale:** Malicious evidence paths could read arbitrary files

#### S3: Best practices changes should be tracked in version control with attribution

Best practices changes should be tracked in version control with attribution

> **Rationale:** Audit trail for why rules changed and who approved them

### Operational

#### O1: CI must validate all manifolds on every PR

CI must validate all manifolds on every PR

> **Rationale:** Prevents schema violations from reaching main branch

#### O2: Schema version upgrade guide must be published with each major version

Schema version upgrade guide must be published with each major version

> **Rationale:** Users need migration path documentation

#### O3: Best practices documentation must live in a single canonical location (SCHEMA_REFERENCE

Best practices documentation must live in a single canonical location (SCHEMA_REFERENCE.md)

> **Rationale:** Multiple sources of truth causes inconsistency

#### O4: Validation errors should be tracked as metrics (count by error type)

Validation errors should be tracked as metrics (count by error type)

> **Rationale:** Identifies common user mistakes for documentation improvement

---

## Tensions

### TN1: v3 compliance requirement vs backward compatibility with v1/v2 manifolds

v3 compliance requirement vs backward compatibility with v1/v2 manifolds

> **Resolution:** Version-aware generation: Commands output v3, validator accepts v1/v2/v3

### TN2: 100ms performance budget vs comprehensive v3 evidence verification with file I/O

100ms performance budget vs comprehensive v3 evidence verification with file I/O

> **Resolution:** Lazy evidence verification: 'validate' = schema only (<100ms), 'verify' = evidence (may be slower)

### TN3: Single canonical location (SCHEMA_REFERENCE

Single canonical location (SCHEMA_REFERENCE.md) vs integrating external best practices with provenance

> **Resolution:** Reference + inline: SCHEMA_REFERENCE.md includes practices with source citations for audit trail

### TN4: 20-error display limit vs providing complete validation feedback

20-error display limit vs providing complete validation feedback

> **Resolution:** Summary + detail: Show 20 errors with message 'Run with --all to see all N errors'

### TN5: Template/validator sync (T5) requires v3 validator support (T1) to be implemented first

Template/validator sync (T5) requires v3 validator support (T1) to be implemented first

> **Resolution:** Implement T1 before T5. Cannot verify template match until validator supports v3.

### TN6: Conflict detection scope unclear - B2 says 'across features' but T4 (cross-feature) is only a goal

Conflict detection scope unclear - B2 says 'across features' but T4 (cross-feature) is only a goal

> **Resolution:** Phased approach: v1 = within-feature detection (B2), v2 = cross-feature detection (T4)

### TN7: Path traversal validation (S2) only relevant when evidence verification (T1) is implemented

Path traversal validation (S2) only relevant when evidence verification (T1) is implemented

> **Resolution:** Implement S2 path validation as part of T1 evidence support implementation

---

## Required Truths

### RT-1: v3 schema must be fully specified with all evidence types, statuses, and constraint graph structures

v3 schema must be fully specified with all evidence types, statuses, and constraint graph structures

### RT-2: CLI validator must support v3 features (evidence[], constraint_graph)

CLI validator must support v3 features (evidence[], constraint_graph)

**Evidence:** cli/lib/schema.ts, cli/lib/schema.ts

### RT-3: Constraint ID references must be validated (no dangling references)

Constraint ID references must be validated (no dangling references)

**Evidence:** cli/lib/schema.ts, cli/__tests__/schema.test.ts

### RT-4: Within-feature conflict detection must identify contradictory constraints

Within-feature conflict detection must identify contradictory constraints

**Evidence:** cli/lib/solver.ts, cli/lib/solver.ts, cli/__tests__/solver-conflicts.test.ts

### RT-5: AI commands (/m0-m6) must generate valid v3 YAML

AI commands (/m0-m6) must generate valid v3 YAML

**Evidence:** install/commands/manifold:m1-constrain.md, install/commands/manifold:m3-anchor.md

### RT-6: Best practices must be documented with source attribution

Best practices must be documented with source attribution

**Evidence:** install/commands/SCHEMA_REFERENCE.md

### RT-7: CI must validate all manifolds on every PR

CI must validate all manifolds on every PR

### RT-8: Evidence file paths must be protected against path traversal

Evidence file paths must be protected against path traversal

**Evidence:** cli/lib/schema.ts, cli/__tests__/schema.test.ts
