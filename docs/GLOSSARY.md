# Manifold Glossary

Plain-language explanations of Manifold concepts with alternative terminology.

## Quick Reference

| Manifold Term | Also Known As | Plain Language |
|---------------|---------------|----------------|
| Constraint | Requirement | A rule that must be followed |
| Tension | Trade-off, Conflict | When two requirements compete |
| Anchor | Requirement Derivation | Working backward from the goal |
| Required Truth | Precondition | What MUST be true for success |
| Manifold | Constraint Document | The file tracking all requirements |
| Convergence | Completion | When all requirements are met |
| Drift | File Change Detection | Post-verification change tracking via SHA-256 |
| Satisfaction Level | Constraint Maturity | DOCUMENTED → IMPLEMENTED → TESTED → VERIFIED |
| Test Annotation | Traceability Tag | Code comments linking tests to constraints |

---

## Core Concepts

### Manifold
**Also known as**: Constraint document, requirements specification, design document

**Plain language**: A pair of files (JSON for structure + Markdown for content) that capture everything needed to build a feature correctly. Legacy YAML single-file format is also supported.

**Why this name**: In mathematics, a manifold is a space where constraints can be satisfied. The feature "lives" in this constraint space.

---

### Constraint
**Also known as**: Requirement, rule, specification

**Plain language**: Something that must be true about your feature.

**Types**:
- **Invariant** = "Must ALWAYS be true, no exceptions" (e.g., "No duplicate payments")
- **Boundary** = "Hard limit that cannot be crossed" (e.g., "Response time < 200ms")
- **Goal** = "Should be optimized toward" (e.g., "Maximize user satisfaction")

---

### Tension
**Also known as**: Trade-off, conflict, competing requirement

**Plain language**: When two requirements pull in opposite directions and you need to decide how to balance them.

**Example**:
- Requirement A: "Make it fast"
- Requirement B: "Make it thorough"
- Tension: You can't do both perfectly, so how do you balance?

**Types**:
- **Trade-off** = Competing goals (security vs usability)
- **Resource tension** = Limited resources (memory vs CPU)
- **Hidden dependency** = One thing must happen before another

---

### Anchor / Anchoring
**Also known as**: Requirement derivation, backward reasoning, outcome-first planning

**Plain language**: Starting from your desired outcome and asking "For this to work, what MUST be true?" Working backward instead of forward.

**Traditional approach**:
"Let's build X, then Y, then Z" → Discover problems at Z

**Anchoring approach**:
"For our goal, Z must be true. For Z, Y must be true. For Y, X must be true." → Problems visible immediately

---

### Required Truth
**Also known as**: Precondition, prerequisite, necessary condition

**Plain language**: Something that MUST be true before your feature can work. If this isn't true, nothing else matters.

**Example**: "User can be authenticated" is a required truth for "User can make a payment"

---

### Convergence
**Also known as**: Completion, done-ness, satisfiability

**Plain language**: The point where all requirements are satisfied and the feature is truly complete.

**Convergence status**:
- `NOT_STARTED` = Haven't begun checking requirements
- `IN_PROGRESS` = Working toward satisfaction
- `CONVERGED` = All requirements met

---

### Phase
**Also known as**: Workflow step, stage

**Plain language**: Where you are in the constraint discovery and implementation process.

| Phase | Plain Name | What Happens |
|-------|------------|--------------|
| INITIALIZED | Started | Feature named, empty manifold |
| CONSTRAINED | Requirements Gathered | All constraints documented |
| TENSIONED | Trade-offs Resolved | Conflicts identified and decided |
| ANCHORED | Path Planned | Required truths derived |
| GENERATED | Built | Code, tests, docs created |
| VERIFIED | Complete | Everything validated |

---

### Drift / Drift Detection
**Also known as**: File change detection, post-verification change tracking

**Plain language**: After you verify a feature, files can change — either intentionally (new commits) or accidentally (formatting, refactoring). Drift detection compares SHA-256 hashes of verified files against their current state to catch these changes.

**How it works**: During `manifold verify`, file hashes are recorded. Later, `manifold drift` compares current hashes against those records. Changed files are flagged as "drifted."

**Commands**:
- `manifold drift` — Check for drifted files
- `manifold drift --update` — Accept current file state as the new baseline

See [CLI Reference — drift](cli-reference.md#manifold-drift-feature) and [Evidence System — Drift Detection](evidence-system.md#drift-detection).

---

### Satisfaction Level
**Also known as**: Constraint maturity, verification depth

**Plain language**: How thoroughly a constraint has been checked. Progresses through four tiers:

| Level | Meaning |
|-------|---------|
| **DOCUMENTED** | The constraint exists in the manifold |
| **IMPLEMENTED** | Code satisfying the constraint exists |
| **TESTED** | Tests covering the constraint exist |
| **VERIFIED** | All evidence for the constraint passes |

Levels are cumulative — VERIFIED implies all prior levels are met.

See [Evidence System — Satisfaction Levels](evidence-system.md#satisfaction-levels).

---

### Test Annotation
**Also known as**: Traceability tag, constraint link

**Plain language**: A code comment that links a test or implementation to a specific constraint. Two formats:

- **`@constraint B1`** — In test code, links a test to constraint B1
- **`// Satisfies: B1, T2`** — In implementation code, declares which constraints a function satisfies

These annotations are parsed by the evidence engine to build traceability matrices and determine satisfaction levels.

See [Evidence System — Test Annotations](evidence-system.md#test-annotations).

---

## Why These Names?

Manifold uses precise terminology because:

1. **"Constraint" vs "Requirement"**: Constraints are mathematical; they either hold or don't. Requirements can be vague.

2. **"Tension" vs "Trade-off"**: Tension emphasizes that the pull exists even when resolved. Trade-offs might imply one-time decisions.

3. **"Anchor" vs "Backward Reasoning"**: Anchoring suggests fixing a point and building toward it. More evocative than procedural description.

4. **"Required Truth"**: Emphasizes binary nature - either true or not. "Precondition" sounds optional.

---

## Common Confusions

### "What's the difference between a constraint and a required truth?"

- **Constraint**: A rule imposed by the domain (business, technical, security, etc.)
- **Required Truth**: A condition derived from constraints that must hold for the outcome

Example:
- Constraint (B1): "No duplicate payments" ← Domain rule
- Required Truth (RT-1): "Idempotency key preserved across retries" ← Derived from B1

### "When is something a tension vs just two constraints?"

- **Two constraints**: Can both be satisfied independently
- **Tension**: Satisfying one makes satisfying the other harder

Example:
- Two constraints: "Must be secure" + "Must be documented" → No conflict
- Tension: "Must be fast" + "Must be thorough" → Can't maximize both

### "Why INITIALIZED, not just 'NEW'?"

Initialized implies the structure is set up and ready. NEW could mean anything. The manifold is created and "initialized" with empty constraint categories.

---

## Translation Guide

When explaining Manifold to different audiences:

### Quick Translation Table

| Audience | constraints | tensions | required truths | outcome |
|----------|-------------|----------|-----------------|---------|
| **Developers** | requirements | trade-offs | preconditions | success criteria |
| **Product Managers** | requirements | trade-offs | acceptance criteria | success metric |
| **Executives** | rules | priorities | must-haves | business objective |
| **Design** | specifications | competing goals | validation points | design target |

### For Developers
Use: constraints, trade-offs, preconditions
"The manifold tracks constraints and their trade-offs."

### For Product Managers
Use: requirements, trade-offs, acceptance criteria, success metrics
"The manifold captures all requirements, documents trade-off decisions, and generates acceptance criteria."

See [PM Adaptation Guide](pm/guide.md) for detailed PM workflows.

### For Executives
Use: rules, priorities, success criteria
"The manifold ensures we know all the rules upfront and have prioritized the inevitable trade-offs."

### For New Team Members
Use: the full plain-language descriptions above
"A tension is when two requirements compete—like wanting something fast AND thorough."
