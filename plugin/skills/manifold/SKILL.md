---
name: manifold
description: Constraint-first development framework overview. USE WHEN learning about Manifold or checking available commands. Individual commands are separate skills - use /manifold:m0-init, /manifold:m1-constrain, etc. directly.
---

# Manifold

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

## Quick Start

Each command is a separate skill. Use them directly:

```
/manifold:m0-init my-feature           # Initialize manifold
/manifold:m1-constrain my-feature      # Discover constraints
/manifold:m2-tension my-feature        # Surface conflicts
/manifold:m3-anchor my-feature         # Backward reasoning
/manifold:m4-generate my-feature       # Create all artifacts
/manifold:m5-verify my-feature         # Validate constraints
/manifold:m-status                     # Show current state
```

**Available Skills:**
- `/manifold:m0-init` - Initialize a constraint manifold
- `/manifold:m1-constrain` - Interview-driven constraint discovery
- `/manifold:m2-tension` - Surface and resolve conflicts (`--auto-deps` for v2 dependency detection)
- `/manifold:m3-anchor` - Backward reasoning from outcome
- `/manifold:m4-generate` - Generate all artifacts
- `/manifold:m6-integrate` - Wire artifacts together (v2)
- `/manifold:m5-verify` - Verify constraints coverage (`--actions` for v2 gap automation)
- `/manifold:m-status` - Show current state (`--history` for v2 iteration tracking)

## Commands

### /manifold:m0-init

Initialize a constraint manifold for a feature.

**Usage:** `/manifold:m0-init <feature-name> [--outcome="<desired outcome>"]`

**What it does:**
- Creates `.manifold/<feature-name>.yaml`
- Initializes empty constraint categories (business, technical, UX, security, operational)

**Example:**
```
/manifold:m0-init payment-retry --outcome="95% retry success for transient failures"
```

---

### /manifold:m1-constrain

Interview-driven constraint discovery across 5 categories.

**Usage:** `/manifold:m1-constrain <feature-name> [--category=<category>]`

**Constraint Categories:**
1. **Business** - Revenue, compliance, stakeholders
2. **Technical** - Performance, integration, data
3. **User Experience** - Response times, errors, accessibility
4. **Security** - Data protection, auth, audit
5. **Operational** - Monitoring, SLAs, incidents

**Constraint Types:**
- **INVARIANT** - Must NEVER be violated
- **GOAL** - Should be optimized
- **BOUNDARY** - Hard limits

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

**Usage:** `/manifold:m2-tension <feature-name> [--resolve]`

**Tension Types:**
1. **Direct Conflicts** - Contradictory constraints
2. **Resource Tensions** - Competing for same resources
3. **Trade-off Pairs** - Goals requiring balance
4. **Hidden Dependencies** - Implicit relationships

**Why this matters:** Requirements are rarely consistent. Real constraints often conflict:
- "Fast response times" vs "Comprehensive validation"
- "User-friendly errors" vs "Security through obscurity"
- "High availability" vs "Strong consistency"

**Example:**
```
/manifold:m2-tension payment-retry

TENSION DETECTED:
- T1: "API response < 200ms"
- B1: "No duplicates" (idempotency check adds ~50ms)
- Resolution: Cache recent transaction IDs
```

---

### /manifold:m3-anchor

Backward reasoning from desired outcome.

**Usage:** `/manifold:m3-anchor <feature-name> [--outcome="<statement>"]`

**Process:**
1. Start with desired outcome
2. Ask: "What must be TRUE?"
3. Derive required conditions
4. Identify gaps between current state and requirements
5. Generate solution space

**Why backward reasoning?** Forward planning misses implicit requirements. Backward reasoning surfaces them:

**Forward:** "Build a retry system" → might miss edge cases

**Backward:** "95% retry success" → REQUIRES:
- Accurate failure classification
- Sufficient retry budget
- Stable downstream services
- Idempotent operations

**Example:**
```
/manifold:m3-anchor payment-retry --outcome="95% retry success"

For 95% success, what MUST be true?
- RT-1: Can distinguish transient from permanent failures
- RT-2: Retries are idempotent
- RT-3: Sufficient retry budget

SOLUTION SPACE:
A. Client-side exponential backoff
B. Server-side queue with workflow engine
C. Hybrid approach
```

---

### /manifold:m4-generate

Generate ALL artifacts simultaneously from the constraint manifold.

**Usage:** `/manifold:m4-generate <feature-name> [--option=<A|B|C>] [--artifacts=<list>]`

**Artifacts Generated:**
- **Code** - Implementation with constraint traceability
- **Tests** - Derived from constraints, not code
- **Docs** - Design decisions with constraint rationale
- **Runbooks** - Operational procedures for failure modes
- **Dashboards** - Monitoring for goals and invariants
- **Alerts** - Notifications for constraint violations

**Why all at once?** Traditional: Code → Tests → Docs → Ops (often forgotten). Manifold: All artifacts derive from the SAME source.

**Example:**
```
/manifold:m4-generate payment-retry --option=B

Generated:
- src/retry/payment-retry.ts
- src/retry/payment-retry.test.ts
- docs/payment-retry.md
- ops/runbooks/payment-retry-failure.md
- ops/dashboards/payment-retry.json
- ops/alerts/payment-retry.yaml
```

---

### /manifold:m5-verify

Verify ALL artifacts against ALL constraints.

**Usage:** `/manifold:m5-verify <feature-name> [--strict]`

**Verification Matrix:**
| Constraint | Code | Test | Docs | Ops | Status |
|------------|------|------|------|-----|--------|
| B1: No duplicates | ✓ | ✓ | ✓ | ✓ | SATISFIED |
| T1: <200ms | ✓ | ◐ | ✓ | ✓ | PARTIAL |

**Example:**
```
/manifold:m5-verify payment-retry

Constraint Coverage:
- INVARIANTS: 3/3 (100%)
- GOALS: 4/5 (80%)
- BOUNDARIES: 2/4 (50%)

Gaps: Add test for ErrorClassifier.classify()
```

---

### /manifold:m6-integrate (v2)

Wire generated artifacts together.

**Usage:** `/manifold:m6-integrate <feature-name> [--check-only] [--auto-wire]`

**Flags:**
- `--check-only` - Show integration checklist without making changes
- `--auto-wire` - Attempt automatic integration where safe

**Why this exists:** `/manifold:m4-generate` creates artifacts in isolation. Integration (wiring modules together, adding feature flags, updating imports) was manual and error-prone. This command identifies integration points and produces actionable checklists.

**Example:**
```
/manifold:m6-integrate graph-d-validation

INTEGRATION CHECKLIST:

[1] Wire WAL into Storage
    ├── Source: src/storage/wal.rs
    ├── Target: src/storage/mod.rs
    ├── Action: Add `pub mod wal;`
    └── Satisfies: RT-1, T3

[2] Add WAL feature flag
    ├── Target: Cargo.toml
    ├── Action: Add `wal = []` to [features]
    └── Satisfies: T3
```

---

### /manifold:m-status

Show current Manifold state and next recommended action.

**Usage:** `/manifold:m-status [<feature-name>] [--history] [--diff]`

**Flags (v2):**
- `--history` - Show full iteration history
- `--diff` - Show changes since last iteration

**Example:**
```
/manifold:m-status

MANIFOLD STATUS

Feature: payment-retry
Phase: ANCHORED (3/5)

Constraint Summary:
- Constraints: 12 discovered
  - Invariants: 3
  - Goals: 5
  - Boundaries: 4
- Tensions: 2 identified, 1 resolved
- Solution Space: 3 options

Workflow Progress:
[✓] /manifold:m0-init
[✓] /manifold:m1-constrain
[✓] /manifold:m2-tension
[✓] /manifold:m3-anchor
[ ] /manifold:m4-generate
[ ] /manifold:m5-verify

Next: /manifold:m4-generate payment-retry --option=B
```

---

## Storage

All data stored in `.manifold/` using JSON+Markdown hybrid format:

```
.manifold/
├── <feature>.json           # Structure (IDs, types, phases)
├── <feature>.md             # Content (statements, rationale)
└── <feature>.verify.json    # Verification results
```

> **Legacy YAML format** (`.yaml` files) is still supported for backwards compatibility.

## Task Tracking

Manifold ensures tasks are completed through **constraint traceability**:

### Generation Tracking (`/manifold:m4-generate`)
Every generated artifact is recorded with the constraints it satisfies:
```json
{
  "generation": {
    "artifacts": [
      {
        "path": "src/retry/PaymentRetryClient.ts",
        "satisfies": ["RT-1", "RT-3"],
        "status": "generated"
      }
    ],
    "coverage": {
      "constraints_addressed": 12,
      "constraints_total": 12
    }
  }
}
```

### Verification Matrix (`/manifold:m5-verify`)
Each constraint is checked across all artifacts:
```json
{
  "verification": {
    "matrix": [
      {
        "constraint": "B1",
        "code": true,
        "test": true,
        "docs": true,
        "status": "SATISFIED"
      }
    ],
    "gaps": [
      {
        "id": "G1",
        "constraint": "T2",
        "action": "Add load test"
      }
    ]
  }
}
```

This enables:
- **Programmatic CI/CD checks** - Validate `.verify.json` in pipelines
- **Gap tracking** - Each gap has an actionable item
- **Progress monitoring** - Coverage improves as gaps are addressed

---

## Context Preservation

When installed as a plugin, manifold state is automatically preserved across context compaction via the included PreCompact hook. No manual configuration needed.

The hook injects `.manifold/` state before compaction, so Claude remembers:
- Current phase for each feature
- Constraint counts and coverage
- Next recommended action

---

## Philosophy

Manifold treats development as **constraint satisfaction**, not feature building:

1. **All constraints exist simultaneously** — business, technical, UX, security, operational, and future failure modes are all present-tense constraints
2. **Surface conflicts early** — find tensions before they become bugs
3. **Reason backward** — from outcome to requirements, not spec to implementation
4. **Single source of truth** — all artifacts derive from the constraint manifold
