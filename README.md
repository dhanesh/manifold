# Manifold

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

## Philosophy

```
TRADITIONAL                          MANIFOLD
─────────────────────────────────    ─────────────────────────────────
Spec → Design → Build → Test         All constraints exist NOW
Discover problems during build       Problems visible before build
Sequential planning                  Constraint satisfaction
Forward reasoning                    Backward from outcome
```

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

Supports: **Claude Code** and **AMP**

## Commands

| Command | Purpose |
|---------|---------|
| `/m0-init` | Initialize constraint manifold |
| `/m1-constrain` | Discover constraints (interview-driven) |
| `/m2-tension` | Surface constraint conflicts |
| `/m3-anchor` | Backward reasoning from outcome |
| `/m4-generate` | Create all artifacts |
| `/m5-verify` | Validate against constraints |
| `/m-status` | Show current state |

## Quick Start

```bash
/m0-init payment-retry --outcome="95% retry success"
/m1-constrain payment-retry        # Discovers constraints across 5 categories
/m2-tension payment-retry          # Surfaces conflicts: latency vs idempotency
/m3-anchor payment-retry           # Generates solution options via backward reasoning
/m4-generate payment-retry         # Creates code, tests, docs, runbooks, alerts
/m5-verify payment-retry           # Validates all artifacts against constraints
```

## Command Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: INITIALIZE & CONSTRAIN                   │
├─────────────────────────────────────────────────────────────────────┤
│  /m0-init feature-name --outcome="Success criteria"                 │
│      └─→ Creates constraint manifold                                │
│                                                                     │
│  /m1-constrain feature-name                                         │
│      └─→ Interview-driven constraint discovery                      │
│      └─→ 5 categories: Business, Technical, UX, Security, Ops      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: TENSION ANALYSIS                       │
├─────────────────────────────────────────────────────────────────────┤
│  /m2-tension feature-name --resolve                                 │
│      └─→ Surfaces constraint conflicts                              │
│      └─→ Types: Direct, Resource, Trade-off, Hidden                │
│      └─→ Suggests resolutions                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: OUTCOME ANCHORING                      │
├─────────────────────────────────────────────────────────────────────┤
│  /m3-anchor feature-name --outcome="Success criteria"               │
│      └─→ Reasons BACKWARD from desired outcome                      │
│      └─→ Derives required truths                                    │
│      └─→ Identifies gaps                                            │
│      └─→ Generates solution space                                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: GENERATE & VERIFY                       │
├─────────────────────────────────────────────────────────────────────┤
│  /m4-generate feature-name --option=A                               │
│      └─→ Generates ALL artifacts simultaneously:                    │
│          • Code (with constraint traceability)                      │
│          • Tests (verify constraints, not code)                     │
│          • Documentation (explains constraints)                     │
│          • Runbooks (handles failure modes)                         │
│          • Dashboards & Alerts (monitors constraints)               │
│                                                                     │
│  /m5-verify feature-name                                            │
│      └─→ Verifies ALL artifacts against ALL constraints             │
│      └─→ Reports coverage and gaps                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Why Manifold?

### 1. Surface Conflicts Before Coding

Requirements are rarely consistent. Manifold finds the tensions:

```
TENSION DETECTED:
- "API response < 200ms"
- "No duplicate payments" — idempotency check adds ~50ms

Resolution: Cache recent transaction IDs
```

### 2. Backward Reasoning

Instead of forward planning (spec → design → build), reason backward from the outcome:

```
For 95% retry success, what MUST be true?
- Can distinguish transient from permanent failures
- Retries are idempotent
- Sufficient retry budget

Current state: Partial, Unknown, Undefined
→ Clear gaps identified BEFORE coding
```

### 3. All Artifacts at Once

Traditional: Code → Tests → Docs → Ops (often forgotten)

Manifold: All artifacts derive from the SAME constraint source:
- Code with constraint traceability
- Tests derived from constraints, not code
- Docs explaining decisions
- Runbooks for failure modes
- Dashboards and alerts

## Constraint Types

| Type | Meaning | Example |
|------|---------|---------|
| **INVARIANT** | Must NEVER be violated | "No duplicate payments" |
| **GOAL** | Should be optimized | "95% retry success rate" |
| **BOUNDARY** | Hard limits | "Retry window ≤ 72 hours" |

## Constraint Categories

| Category | Focus | Example Questions |
|----------|-------|-------------------|
| **Business** | Revenue, compliance, stakeholders | What's the cost of failure? |
| **Technical** | Performance, integration, data | What are the SLAs? |
| **User Experience** | Response times, errors, accessibility | How should errors be communicated? |
| **Security** | Data protection, auth, audit | What data needs protection? |
| **Operational** | Monitoring, incidents, deployment | What needs monitoring? |

## Verification Status

| Status | Symbol | Meaning |
|--------|--------|---------|
| SATISFIED | ✓ | Constraint fully satisfied |
| PARTIAL | ◐ | Some evidence, gaps remain |
| NOT SATISFIED | ✗ | Constraint not addressed |

## Storage

```
.manifold/
├── <feature>.yaml           # Constraint manifold
├── <feature>.anchor.yaml    # Outcome anchoring
└── <feature>.verify.yaml    # Verification results
```

## Key Principles

1. **All constraints exist simultaneously** — business, technical, UX, security, operational are all present-tense constraints
2. **Surface conflicts early** — what fails in tension analysis won't surprise you in production
3. **Reason backward from outcomes** — if outcome X is true, what must be true?
4. **Generate all artifacts at once** — all artifacts derive from same manifold, no drift

## Context Preservation

To preserve manifold state across context compaction, add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreCompact": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bun run ~/.claude/hooks/manifold-context.ts"
      }]
    }]
  }
}
```

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

## License

MIT
