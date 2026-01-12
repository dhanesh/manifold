# Manifold

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

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
/m1-constrain payment-retry        # Discovers 12 constraints across 5 categories
/m2-tension payment-retry          # Surfaces conflicts: latency vs idempotency
/m3-anchor payment-retry           # Generates solution options via backward reasoning
/m4-generate payment-retry         # Creates code, tests, docs, runbooks, alerts
/m5-verify payment-retry           # Validates all artifacts against constraints
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

| Type | Meaning |
|------|---------|
| **INVARIANT** | Must NEVER be violated |
| **GOAL** | Should be optimized |
| **BOUNDARY** | Hard limits |

## Storage

```
.manifold/
├── <feature>.yaml           # Constraint manifold
├── <feature>.anchor.yaml    # Outcome anchoring
└── <feature>.verify.yaml    # Verification results
```

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

## License

MIT
