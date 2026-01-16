# Manifold

[![Release](https://img.shields.io/github/v/release/dhanesh/manifold)](https://github.com/dhanesh/manifold/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

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

## Features

- **Constraint-First Development** - Surface all constraints before writing code
- **Backward Reasoning** - Reason from desired outcomes to required truths
- **Tension Detection** - Find conflicts between constraints early
- **All-at-Once Generation** - Generate code, tests, docs, runbooks, and alerts from a single source
- **Parallel Execution** - Run independent tasks concurrently using git worktrees
- **Native CLI** - Fast, deterministic operations (<100ms) for CI/CD
- **Multi-Agent Support** - Works with Claude Code and AMP

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

This installs:
- **Slash commands** (`/m0-init`, `/m1-constrain`, etc.) for Claude Code and AMP
- **Parallel execution library** for git worktree-based concurrency
- **Context preservation hooks** for session continuity
- **Native CLI** (`manifold`) for fast, deterministic operations

### CLI Binary

Download platform-specific binaries from [Releases](https://github.com/dhanesh/manifold/releases):

```bash
# macOS (Apple Silicon)
curl -fsSL https://github.com/dhanesh/manifold/releases/latest/download/manifold-darwin-arm64 -o manifold

# macOS (Intel)
curl -fsSL https://github.com/dhanesh/manifold/releases/latest/download/manifold-darwin-x64 -o manifold

# Linux (x64)
curl -fsSL https://github.com/dhanesh/manifold/releases/latest/download/manifold-linux-x64 -o manifold

# Linux (ARM64)
curl -fsSL https://github.com/dhanesh/manifold/releases/latest/download/manifold-linux-arm64 -o manifold

chmod +x manifold
```

## Commands

### AI Agent Commands (Claude Code / AMP)

| Command | Purpose | Phase |
|---------|---------|-------|
| `/m0-init` | Initialize constraint manifold | INITIALIZED |
| `/m1-constrain` | Discover constraints (interview-driven) | CONSTRAINED |
| `/m2-tension` | Surface constraint conflicts | TENSIONED |
| `/m3-anchor` | Backward reasoning from outcome | ANCHORED |
| `/m4-generate` | Create all artifacts simultaneously | GENERATED |
| `/m5-verify` | Validate against constraints | VERIFIED |
| `/m6-integrate` | Wire artifacts together | - |
| `/m-status` | Show current state | - |
| `/m-solve` | Generate parallel execution plan | - |
| `/parallel` | Execute tasks in parallel worktrees | - |

### Native CLI

The CLI provides instant operations without AI round-trips:

```bash
manifold status [feature]      # Show manifold state
manifold validate [feature]    # Validate schema (exit code 2 = invalid)
manifold init <feature>        # Initialize new manifold
manifold verify [feature]      # Verify artifacts exist

# Options
--json                         # Machine-readable output for CI/CD
--no-color                     # Disable colored output
```

**When to use CLI vs AI commands:**
- **CLI**: Status checks, CI/CD validation, quick verification
- **AI**: Constraint discovery, tension analysis, code generation

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
│                    PHASE 1: INITIALIZE & CONSTRAIN                  │
├─────────────────────────────────────────────────────────────────────┤
│  /m0-init feature-name --outcome="Success criteria"                 │
│      └─→ Creates constraint manifold                                │
│                                                                     │
│  /m1-constrain feature-name                                         │
│      └─→ Interview-driven constraint discovery                      │
│      └─→ 5 categories: Business, Technical, UX, Security, Ops       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: TENSION ANALYSIS                      │
├─────────────────────────────────────────────────────────────────────┤
│  /m2-tension feature-name --resolve                                 │
│      └─→ Surfaces constraint conflicts                              │
│      └─→ Types: Direct, Resource, Trade-off, Hidden                 │
│      └─→ Suggests resolutions                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: OUTCOME ANCHORING                     │
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
│                     PHASE 4: GENERATE & VERIFY                      │
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
│                                                                     │
│  /m6-integrate feature-name                                         │
│      └─→ Identifies integration points                              │
│      └─→ Produces wiring checklist                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Parallel Execution

Run independent tasks concurrently using isolated git worktrees:

```bash
/parallel "implement auth module" "add logging middleware" "create user tests"
```

The parallel system:
1. **Analyzes tasks** - Predicts which files each task will modify
2. **Detects overlaps** - Identifies potential file conflicts
3. **Forms safe groups** - Groups tasks with no file overlap
4. **Executes concurrently** - Creates isolated worktrees for each group
5. **Merges results** - Automatically merges back to main worktree

### Configuration

Create `.parallel.yaml` in your project root:

```yaml
enabled: true
autoSuggest: true
autoParallel: false
maxParallel: 4
maxDiskUsagePercent: 90
maxMemoryUsagePercent: 85
timeout: 300000
cleanupOnComplete: true
mergeStrategy: sequential  # sequential, squash, rebase
```

### Auto-Suggestion

The `/m4-generate` command automatically suggests parallel execution when generating 3+ artifacts across different modules.

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

## Constraint System

### Constraint Types

| Type | Meaning | Example |
|------|---------|---------|
| **INVARIANT** | Must NEVER be violated | "No duplicate payments" |
| **GOAL** | Should be optimized | "95% retry success rate" |
| **BOUNDARY** | Hard limits | "Retry window ≤ 72 hours" |

### Constraint Categories

| Category | Focus | Example Questions |
|----------|-------|-------------------|
| **Business** | Revenue, compliance, stakeholders | What's the cost of failure? |
| **Technical** | Performance, integration, data | What are the SLAs? |
| **User Experience** | Response times, errors, accessibility | How should errors be communicated? |
| **Security** | Data protection, auth, audit | What data needs protection? |
| **Operational** | Monitoring, incidents, deployment | What needs monitoring? |

### Verification Status

| Status | Symbol | Meaning |
|--------|--------|---------|
| SATISFIED | ✓ | Constraint fully satisfied |
| PARTIAL | ◐ | Some evidence, gaps remain |
| NOT SATISFIED | ✗ | Constraint not addressed |

## Schema

Manifold uses YAML files stored in `.manifold/`:

```
.manifold/
├── <feature>.yaml           # Constraint manifold
├── <feature>.anchor.yaml    # Outcome anchoring
└── <feature>.verify.yaml    # Verification results
```

### Schema Version 3 (Current)

```yaml
schema_version: 3
feature: payment-retry
outcome: "95% retry success rate"
phase: INITIALIZED

constraints:
  business: []
  technical: []
  user_experience: []
  security: []
  operational: []

tensions: []
anchors: []
iterations: []
convergence:
  status: NOT_STARTED
```

### Valid Values

| Field | Valid Values |
|-------|--------------|
| `phase` | INITIALIZED, CONSTRAINED, TENSIONED, ANCHORED, GENERATED, VERIFIED |
| `constraint.type` | invariant, goal, boundary |
| `tension.type` | trade_off, resource_tension, hidden_dependency |
| `tension.status` | detected, resolved, accepted |
| `required_truth.status` | SATISFIED, PARTIAL, NOT_SATISFIED, SPECIFICATION_READY |
| `convergence.status` | NOT_STARTED, IN_PROGRESS, CONVERGED |

## CI/CD Integration

### GitHub Action

Add Manifold verification to your CI pipeline:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  manifold:
    uses: dhanesh/manifold/.github/workflows/manifold-verify.yml@main
    with:
      fail-on-gaps: false  # Set true to fail on non-blocking gaps
```

The action will:
1. Validate all manifold schemas in `.manifold/`
2. Verify artifact coverage
3. Report status in PR checks

### Manual CI Integration

```bash
# Validate manifolds (exit 2 = validation failure)
manifold validate --json

# Verify artifacts exist
manifold verify --json
```

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

## Non-Programming Use Cases

Manifold's constraint-first approach extends beyond software engineering:

| Domain | Applicability | Best For |
|--------|--------------|----------|
| **Research/Analysis** | HIGH | Methodology design, study planning |
| **Business** | HIGH | Strategic decisions, expansion planning |
| **Personal** | HIGH | Major life decisions, career choices |
| **Creative** | MODERATE | Project planning (not creative direction) |

### Adapted Categories

| Original | Adapted | Focus Question |
|----------|---------|----------------|
| Business | **Goals** | What outcomes matter? |
| Technical | **Feasibility** | What's practically achievable? |
| User Experience | **Experience** | How should this feel? |
| Security | **Risks** | What could go wrong? |
| Operational | **Logistics** | How will this work day-to-day? |

See [Non-Programming Guide](docs/non-programming/guide.md) for detailed documentation.

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and automated releases.

```bash
# Install dependencies (includes commit validation)
bun install

# Your commits will be validated automatically
git commit -m "feat: add new feature"   # Creates MINOR release
git commit -m "fix: resolve bug"        # Creates PATCH release
```

See [Release Automation Guide](docs/release-automation/README.md) for details.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

## License

MIT
