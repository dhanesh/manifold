# manifold-v2

## Outcome

Manifold framework with iteration tracking, integration phase, and automatic dependency detection

---

## Context

---

## Constraints

### Business

#### B1: Backward compatibility with existing manifolds

Backward compatibility with existing manifolds

> **Rationale:** graph-d-validation and framework-consolidation must continue to work

#### B2: Reduce iteration friction by 50%

Reduce iteration friction by 50%

> **Rationale:** graph-d required 4 manual iterations; target 2 or automated

#### B3: Enable automated CI/CD integration

Enable automated CI/CD integration

> **Rationale:** Verification results should be programmatically consumable

### Technical

#### T1: Schema must be YAML-compatible and human-readable

Schema must be YAML-compatible and human-readable

> **Rationale:** Existing tooling and hooks depend on YAML parsing

#### T2: All /m* command syntax preserved

All /m* command syntax preserved

> **Rationale:** Install script and existing users depend on current syntax

#### T3: New features must be additive, not breaking

New features must be additive, not breaking

> **Rationale:** Existing manifolds in .manifold/ must remain valid

#### T4: Dependency detection should run in O(n) on constraint count

Dependency detection should run in O(n) on constraint count

> **Rationale:** Performance should not degrade with large manifolds

#### T5: Integration phase should auto-detect wiring points

Integration phase should auto-detect wiring points

> **Rationale:** Reduce manual artifact connection

### User Experience

#### U1: /manifold:m-status should show iteration history and convergence

/manifold:m-status should show iteration history and convergence

> **Rationale:** Visibility into multi-pass progress

#### U2: New commands should follow existing /m* naming pattern

New commands should follow existing /m* naming pattern

> **Rationale:** Consistency with established mental model

#### U3: Gap-to-action output should be copy-paste executable

Gap-to-action output should be copy-paste executable

> **Rationale:** Reduce interpretation overhead

### Security

#### S1: No execution of arbitrary code in constraint analysis

No execution of arbitrary code in constraint analysis

> **Rationale:** Dependency detection must be static analysis only

### Operational

#### O1: PreCompact hook should preserve iteration state

PreCompact hook should preserve iteration state

> **Rationale:** Context compaction must not lose iteration history

#### O2: Documentation must be updated with each new feature

Documentation must be updated with each new feature

> **Rationale:** Self-documenting framework principle

#### O3: Examples should demonstrate new features

Examples should demonstrate new features

> **Rationale:** Learn by example pattern

---

## Tensions

### TN1: Reducing iteration friction may require schema changes that affect existing manifolds

Reducing iteration friction may require schema changes that affect existing manifolds

> **Resolution:** Version field in schema; new features in optional sections; existing sections unchanged

### TN2: Auto-detecting wiring points requires code analysis; could exceed O(n) constraint count

Auto-detecting wiring points requires code analysis; could exceed O(n) constraint count

> **Resolution:** Scope auto-detection to generated artifacts only (known structure); fallback to hints

### TN3: Copy-paste executable actions may require shell syntax that clutters YAML

Copy-paste executable actions may require shell syntax that clutters YAML

> **Resolution:** Actions stored in separate 'actions' section with YAML multiline strings; human-readable summary in main flow

### TN4: /manifold:m6-integrate needs iteration context to know what was generated when

/manifold:m6-integrate needs iteration context to know what was generated when

> **Resolution:** Iteration tracking (U1) must be implemented BEFORE integration phase (T5)

### TN5: Auto-detecting wiring points could involve AST parsing or code execution

Auto-detecting wiring points could involve AST parsing or code execution

> **Resolution:** Static pattern matching only (grep/regex); no AST parsing or code execution; explicit opt-in for deeper analysis

---

## Required Truths

### RT-1: Iteration state MUST be tracked in manifold schema

Iteration state MUST be tracked in manifold schema

**Evidence:** iterations[] section in m0-init.md, example.yaml

### RT-2: Integration points MUST be identifiable from generated artifacts

Integration points MUST be identifiable from generated artifacts

**Evidence:** m6-integrate.md detection patterns

### RT-3: Constraint dependencies MUST be auto-detected

Constraint dependencies MUST be auto-detected

**Evidence:** m2-tension.md --auto-deps flag

### RT-4: Gaps MUST convert to actionable tasks automatically

Gaps MUST convert to actionable tasks automatically

**Evidence:** m5-verify.md --actions flag

### RT-5: Existing manifolds MUST remain valid

Existing manifolds MUST remain valid

**Evidence:** framework-consolidation.yaml works, hook handles both schemas

### RT-6: New commands MUST follow /m* pattern

New commands MUST follow /m* pattern

**Evidence:** /manifold:m6-integrate follows pattern
