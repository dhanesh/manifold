---
name: manifold
description: Constraint-first development framework overview. USE WHEN learning about Manifold or checking available commands. Individual commands are separate skills - use /manifold:m0-init, /manifold:m1-constrain, etc. directly.
---

# Manifold

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

> **Individual command files are the authoritative source.** This overview is for orientation only.

## Quick Start

Each command is a separate skill. Use them directly:

```
/manifold:m0-init my-feature           # Initialize manifold
/manifold:m1-constrain my-feature      # Discover constraints
/manifold:m2-tension my-feature        # Surface conflicts
/manifold:m3-anchor my-feature         # Backward reasoning
/manifold:m4-generate my-feature       # Create all artifacts
/manifold:m5-verify my-feature         # Validate constraints
/manifold:m6-integrate my-feature      # Wire artifacts together
/manifold:m-status                     # Show current state
/manifold:m-quick my-feature           # Light mode (simple changes)
/manifold:parallel "task1" "task2"     # Parallel execution
```

**Available Skills:**
- `/manifold:m0-init` - Initialize a constraint manifold (JSON+Markdown hybrid)
- `/manifold:m1-constrain` - Interview-driven constraint discovery (5 categories + GAP checklists)
- `/manifold:m2-tension` - Surface and resolve conflicts (`--auto-deps` for dependency detection, TRIZ classification)
- `/manifold:m3-anchor` - Backward reasoning from outcome (recursive backward chaining, binding constraint)
- `/manifold:m4-generate` - Generate all artifacts (code, tests, docs, runbooks, alerts, dashboards)
- `/manifold:m5-verify` - Verify constraints coverage (`--actions` for gap automation, `--levels` for depth)
- `/manifold:m6-integrate` - Wire artifacts together (`--check-only`, `--auto-wire`)
- `/manifold:m-status` - Show current state (`--history` for iteration tracking)
- `/manifold:m-quick` - Light mode for simple changes (3-phase workflow)
- `/manifold:parallel` - Execute tasks in parallel using git worktrees
- `/manifold:m-solve` - Generate parallel execution plan from constraint network

## Commands

### /manifold:m0-init

Initialize a constraint manifold for a feature.

**Usage:** `/manifold:m0-init <feature-name> [--outcome="<desired outcome>"] [--domain=software|non-software]`

**What it does:**
- Creates TWO files: `.manifold/<feature>.json` (structure) + `.manifold/<feature>.md` (content)
- JSON: IDs, types, phases only. NO text content.
- Markdown: outcome, constraint statements, rationale
- Schema version 3 (v3 features: evidence, constraint_graph, iterations)

**Example:**
```
/manifold:m0-init payment-retry --outcome="95% retry success for transient failures"
```

---

### /manifold:m1-constrain

Interview-driven constraint discovery across 5 categories.

**Usage:** `/manifold:m1-constrain <feature-name> [--category=<category>]`

**Constraint Categories:**
1. **Business** (B1, B2...) - Revenue, compliance, stakeholders
2. **Technical** (T1, T2...) - Performance, integration, data
3. **User Experience** (U1, U2...) - Response times, errors, accessibility
4. **Security** (S1, S2...) - Data protection, auth, audit
5. **Operational** (O1, O2...) - Monitoring, SLAs, incidents

**Constraint Types:**
- **INVARIANT** - Must NEVER be violated (highest priority)
- **BOUNDARY** - Hard limits (medium priority)
- **GOAL** - Should be optimized (lowest priority)

**Features:** GAP checklists (6 mandatory checks), pre-mortem pass, constraint quality scoring, draft required truths seeding, constraint genealogy tagging.

**Example:**
```
/manifold:m1-constrain payment-retry

Discovered:
- B1: No duplicate payments (INVARIANT)
- B2: 95% success rate (GOAL)
- B3: Retry window ≤ 72 hours (BOUNDARY)
```

---

### /manifold:m2-tension

Surface and resolve constraint conflicts.

**Usage:** `/manifold:m2-tension <feature-name> [--resolve] [--auto-deps]`

**Tension Types:**
- `trade_off` - Competing constraints requiring balance
- `resource_tension` - Resource limits constraining options
- `hidden_dependency` - Non-obvious relationships

**Features:** TRIZ contradiction classification, directional constraint propagation, constructive relaxation suggestions, failure cascade analysis (GAP-06), blocking dependency export for m3.

**Example:**
```
/manifold:m2-tension payment-retry

TENSION DETECTED:
- TN1: T1 "API response < 200ms" vs B1 "No duplicates" (idempotency adds ~50ms)
- Resolution: Cache recent transaction IDs
```

---

### /manifold:m3-anchor

Backward reasoning from desired outcome.

**Usage:** `/manifold:m3-anchor <feature-name> [--outcome="<statement>"] [--depth=N]`

**Process:**
1. Start with desired outcome
2. Ask: "What must be TRUE?"
3. Derive required conditions (recursive backward chaining up to depth 4)
4. Identify binding constraint (Theory of Constraints)
5. Generate solution space with reversibility tagging

**Example:**
```
/manifold:m3-anchor payment-retry --outcome="95% retry success"

BINDING CONSTRAINT: RT-1 (error classification)

For 95% success, what MUST be true?
- RT-1: Can distinguish transient from permanent failures
- RT-2: Retries are idempotent
- RT-3: Sufficient retry budget

SOLUTION SPACE:
A. Client-side exponential backoff (TWO_WAY)
B. Server-side queue with workflow engine (REVERSIBLE_WITH_COST)
C. Hybrid approach (TWO_WAY) ← Recommended
```

---

### /manifold:m4-generate

Generate ALL artifacts simultaneously from the constraint manifold.

**Usage:** `/manifold:m4-generate <feature-name> [--option=<A|B|C>] [--prd] [--stories]`

**Artifacts Generated:**
- **Code** - Implementation with constraint traceability (`// Satisfies: B1`)
- **Tests** - Derived from constraints, not code
- **Docs** - Design decisions with constraint rationale
- **Runbooks** - Operational procedures for failure modes
- **Dashboards** - Monitoring for goals and invariants
- **Alerts** - Notifications for constraint violations
- **PRD** (`--prd`) - Product Requirements Document from constraints
- **Stories** (`--stories`) - User stories with acceptance criteria

**Why all at once?** Traditional: Code → Tests → Docs → Ops (often forgotten). Manifold: All artifacts derive from the SAME source.

**Example:**
```
/manifold:m4-generate payment-retry --option=C

Generated:
- lib/retry/PaymentRetryClient.ts       Satisfies: RT-1, RT-3
- lib/retry/IdempotencyService.ts        Satisfies: B1, RT-2
- tests/retry/PaymentRetryClient.test.ts Validates: B1, B2, T1
- docs/payment-retry/README.md
- ops/runbooks/payment-retry-failure.md
- ops/dashboards/payment-retry.json
- ops/alerts/payment-retry.yaml
```

---

### /manifold:m5-verify

Verify ALL artifacts against ALL constraints.

**Usage:** `/manifold:m5-verify <feature-name> [--strict] [--actions] [--levels] [--verify-evidence] [--run-tests] [--execute]`

**Flags:**
- `--actions` - Generate actionable fix commands for gaps
- `--levels` - Show satisfaction levels (DOCUMENTED → IMPLEMENTED → TESTED → VERIFIED)
- `--verify-evidence` - Check evidence items against disk
- `--run-tests` - Execute test_passes evidence
- `--execute` - Run all verifiable evidence (file_exists, content_match, test_passes)

**Verification Matrix:**
| Constraint | Code | Test | Docs | Ops | Status |
|------------|------|------|------|-----|--------|
| B1: No duplicates | ✓ | ✓ | ✓ | ✓ | SATISFIED |
| T1: <200ms | ✓ | ◐ | ✓ | ✓ | PARTIAL |

---

### /manifold:m6-integrate

Wire generated artifacts together.

**Usage:** `/manifold:m6-integrate <feature-name> [--check-only] [--auto-wire]`

Identifies integration points (imports, feature flags, config) and produces actionable checklists.

---

### /manifold:m-status

Show current Manifold state and next recommended action.

**Usage:** `/manifold:m-status [<feature-name>] [--history] [--diff]`

---

### /manifold:m-quick

Light mode for simple changes that don't need full constraint analysis.

**Usage:** `/manifold:m-quick <feature-name> --outcome="<description>"`

3-phase workflow: Constrain (3 constraints) → Generate → Verify. Use for bug fixes, small features, quick iterations.

---

## Storage

All data stored in `.manifold/` using **JSON+Markdown hybrid format** (schema v3):

```
.manifold/
├── <feature>.json           # Structure (IDs, types, phases) — machine-readable
├── <feature>.md             # Content (statements, rationale) — human-readable
└── <feature>.verify.json    # Verification results
```

**Why two files?** JSON has NO text fields — this eliminates `statement` vs `description` confusion. IDs and types live in JSON; all prose lives in Markdown. Linking is by ID: JSON `"id": "B1"` maps to Markdown heading `#### B1: Title`.

> **Legacy YAML format** (`.yaml` files) is supported for existing manifolds only. New manifolds MUST use JSON+Markdown. Use `manifold migrate <feature>` to convert.

## Native CLI

Fast commands (<100ms, no AI required):

```bash
manifold status [feature]      # Show state
manifold validate [feature]    # Validate schema + linking
manifold verify [feature]      # Verify artifacts exist
manifold drift [feature]       # Detect post-verification changes
manifold solve [feature]       # Generate parallel execution plan
manifold show [feature]        # Combined JSON+MD view
manifold migrate [feature]     # Convert YAML → JSON+MD
```

## Philosophy

Manifold treats development as **constraint satisfaction**, not feature building:

1. **All constraints exist simultaneously** — business, technical, UX, security, operational
2. **Surface conflicts early** — find tensions before they become bugs
3. **Reason backward** — from outcome to requirements, not spec to implementation
4. **Single source of truth** — all artifacts derive from the constraint manifold
