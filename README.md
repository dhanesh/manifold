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
- **Constraint Templates** - Pre-built patterns for auth, CRUD, API, and payment flows
- **Light Mode** - Simplified 3-phase workflow for quick changes
- **PM Workflows** - Generate PRDs and user stories with constraint traceability
- **Parallel Execution** - Run independent tasks concurrently using git worktrees
- **Native CLI** - Fast, deterministic operations (<100ms) for CI/CD
- **Multi-Agent Support** - Works with Claude Code and AMP

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

This installs:
- **Slash commands** (`/manifold:m0-init`, `/manifold:m1-constrain`, etc.) for Claude Code and AMP
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
| `/manifold:m0-init` | Initialize constraint manifold | INITIALIZED |
| `/manifold:m1-constrain` | Discover constraints (interview-driven) | CONSTRAINED |
| `/manifold:m2-tension` | Surface constraint conflicts | TENSIONED |
| `/manifold:m3-anchor` | Backward reasoning from outcome | ANCHORED |
| `/manifold:m4-generate` | Create all artifacts simultaneously | GENERATED |
| `/manifold:m5-verify` | Validate against constraints | VERIFIED |
| `/manifold:m6-integrate` | Wire artifacts together | - |
| `/manifold:m-status` | Show current state | - |
| `/manifold:m-solve` | Generate parallel execution plan | - |
| `/manifold:m-quick` | Light mode: 3-phase workflow for simple changes | - |
| `/manifold:parallel` | Execute tasks in parallel worktrees | - |

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
/manifold:m0-init payment-retry --outcome="95% retry success"
/manifold:m1-constrain payment-retry        # Discovers constraints across 5 categories
/manifold:m2-tension payment-retry          # Surfaces conflicts: latency vs idempotency
/manifold:m3-anchor payment-retry           # Generates solution options via backward reasoning
/manifold:m4-generate payment-retry         # Creates code, tests, docs, runbooks, alerts
/manifold:m5-verify payment-retry           # Validates all artifacts against constraints
```

### Using Templates

Pre-built constraint patterns for common scenarios:

```bash
/manifold:m0-init user-auth --template=auth        # Authentication flows
/manifold:m0-init user-crud --template=crud        # CRUD operations
/manifold:m0-init payment-flow --template=payment  # Payment processing
/manifold:m0-init api-endpoint --template=api      # API endpoints
```

See [Constraint Templates](install/templates/README.md) for all available templates.

### Light Mode (Quick Changes)

For simple changes that don't need full constraint analysis:

```bash
/manifold:m-quick fix-login-bug --outcome="Fix 504 timeout on login"
```

Light mode uses 3 phases: Constrain → Generate → Verify. See [When NOT to Use Manifold](docs/WHEN_NOT_TO_USE.md) for guidance on when simpler approaches work better.

## Command Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: INITIALIZE & CONSTRAIN                  │
├─────────────────────────────────────────────────────────────────────┤
│  /manifold:m0-init feature-name --outcome="Success criteria"                 │
│      └─→ Creates constraint manifold                                │
│                                                                     │
│  /manifold:m1-constrain feature-name                                         │
│      └─→ Interview-driven constraint discovery                      │
│      └─→ 5 categories: Business, Technical, UX, Security, Ops       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: TENSION ANALYSIS                      │
├─────────────────────────────────────────────────────────────────────┤
│  /manifold:m2-tension feature-name --resolve                                 │
│      └─→ Surfaces constraint conflicts                              │
│      └─→ Types: Direct, Resource, Trade-off, Hidden                 │
│      └─→ Suggests resolutions                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: OUTCOME ANCHORING                     │
├─────────────────────────────────────────────────────────────────────┤
│  /manifold:m3-anchor feature-name --outcome="Success criteria"               │
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
│  /manifold:m4-generate feature-name --option=A                               │
│      └─→ Generates ALL artifacts simultaneously:                    │
│          • Code (with constraint traceability)                      │
│          • Tests (verify constraints, not code)                     │
│          • Documentation (explains constraints)                     │
│          • Runbooks (handles failure modes)                         │
│          • Dashboards & Alerts (monitors constraints)               │
│                                                                     │
│  /manifold:m5-verify feature-name                                            │
│      └─→ Verifies ALL artifacts against ALL constraints             │
│      └─→ Reports coverage and gaps                                  │
│                                                                     │
│  /manifold:m6-integrate feature-name                                         │
│      └─→ Identifies integration points                              │
│      └─→ Produces wiring checklist                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Parallel Execution

Run independent tasks concurrently using isolated git worktrees:

```bash
/manifold:parallel "implement auth module" "add logging middleware" "create user tests"
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

The `/manifold:m4-generate` command automatically suggests parallel execution when generating 3+ artifacts across different modules.

## Autonomous Development with Ralph

Manifold integrates seamlessly with the [Ralph Wiggum technique](https://ghuntley.com/ralph/)—an autonomous loop methodology that runs AI agents for hours, not minutes.

### Prerequisites

Install the Ralph Wiggum plugin:
```bash
/plugin install ralph-wiggum@claude-plugins-official
```

### Why Manifold + Ralph?

| Traditional Ralph | Manifold Ralph |
|-------------------|----------------|
| Vague "done" criteria | Constraint-defined completion |
| Hope tests pass | Constraints derive tests |
| Iteration finds requirements | Constraints known upfront |
| Manual success checking | `manifold verify` automation |

Manifold's constraint-first approach provides exactly what Ralph needs: **clear, verifiable, programmatic completion criteria**.

### The Manifold Ralph Prompt

```markdown
# MANIFOLD_RALPH_PROMPT.md

## Objective
Build <FEATURE> with constraint satisfaction.

## Constraint Source
Study `.manifold/<FEATURE>.yaml` for all requirements.
Every constraint must be SATISFIED before completion.

## Workflow
1. Run `/manifold:m-status <FEATURE>` to understand current phase
2. Execute the next phase command based on status:
   - INITIALIZED → `/manifold:m1-constrain <FEATURE>`
   - CONSTRAINED → `/manifold:m2-tension <FEATURE> --resolve`
   - TENSIONED → `/manifold:m3-anchor <FEATURE>`
   - ANCHORED → `/manifold:m4-generate <FEATURE>`
   - GENERATED → `/manifold:m5-verify <FEATURE>`
3. After each phase, commit changes
4. If VERIFIED phase with gaps, run `/manifold:m4-generate` to fix gaps, then re-verify

## Completion Criteria
Run: `manifold verify <FEATURE> --json`

Complete when ALL of:
- All INVARIANT constraints: SATISFIED
- Test coverage ≥ 80%
- Zero blocking gaps
- convergence.status = CONVERGED

Output: <promise>MANIFOLD_COMPLETE</promise>

## If Stuck After 15 Iterations
- Document blocking constraints in `.manifold/<FEATURE>.yaml`
- List what was attempted
- Output: <promise>MANIFOLD_BLOCKED</promise>
```

### Running It

```bash
# Initialize the feature first
/manifold:m0-init payment-retry --outcome="95% retry success rate"

# Then let Ralph handle the rest
/ralph-loop "Build payment-retry following Manifold workflow.
Study .manifold/payment-retry.yaml for constraints.
Run /manifold:m-status payment-retry, execute next phase.
Repeat until VERIFIED with CONVERGED status.
Output <promise>MANIFOLD_COMPLETE</promise> when done." \
  --max-iterations 50 \
  --completion-promise "MANIFOLD_COMPLETE"
```

### What Happens

1. **Phase 1-3**: Claude discovers constraints, surfaces tensions, anchors to outcome
2. **Phase 4**: Generates ALL artifacts (code, tests, docs, runbooks)
3. **Phase 5**: Verifies against constraints, finds gaps
4. **Iteration**: Fixes gaps, re-verifies until CONVERGED
5. **Completion**: Outputs `<promise>MANIFOLD_COMPLETE</promise>`

### Why This Works

| Ralph Principle | Manifold Implementation |
|-----------------|-------------------------|
| Iteration > Perfection | Generate → Verify → Fix gaps → Re-verify |
| Clear completion | `convergence.status: CONVERGED` |
| Failures are data | Gaps identify exactly what to fix |
| Persistence wins | Loop until all constraints SATISFIED |

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

Manifold uses JSON+Markdown hybrid format stored in `.manifold/`:

```
.manifold/
├── <feature>.json           # Structure (IDs, types, phases)
├── <feature>.md             # Content (statements, rationale)
└── <feature>.verify.json    # Verification results
```

> **Legacy YAML format** (`.yaml` files) is still supported for backwards compatibility.

### Schema Version 3 (Current)

**JSON structure file** (`.manifold/<feature>.json`):
```json
{
  "schema_version": 3,
  "feature": "payment-retry",
  "phase": "INITIALIZED",
  "constraints": {
    "business": [],
    "technical": [],
    "user_experience": [],
    "security": [],
    "operational": []
  },
  "tensions": [],
  "anchors": { "required_truths": [] },
  "iterations": [],
  "convergence": { "status": "NOT_STARTED" }
}
```

**Markdown content file** (`.manifold/<feature>.md`):
```markdown
# payment-retry

## Outcome
95% retry success rate

## Constraints
### Business
<!-- #### B1: Title -->
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

## Product Manager Workflow

Manifold can generate PRDs and user stories with constraint traceability:

```bash
/manifold:m0-init mobile-checkout --template=pm/feature-launch
/manifold:m1-constrain mobile-checkout
/manifold:m2-tension mobile-checkout
/manifold:m3-anchor mobile-checkout
/manifold:m4-generate mobile-checkout --prd --stories
```

**Outputs:**
- `docs/mobile-checkout/PRD.md` — Structured PRD with constraint traceability
- `docs/mobile-checkout/STORIES.md` — User stories with acceptance criteria

**PM Templates:**
- `pm/feature-launch` — New feature launches
- `pm/experiment` — A/B tests and experiments
- `pm/deprecation` — Feature deprecation planning

See [PM Adaptation Guide](docs/pm/guide.md) for detailed workflows.

## Documentation

| Document | Description |
|----------|-------------|
| [Glossary](docs/GLOSSARY.md) | Plain-language terminology explanations |
| [When NOT to Use](docs/WHEN_NOT_TO_USE.md) | Know when simpler approaches work better |
| [Scientific Foundations](docs/research/phase-scientific-foundations.md) | Research supporting each phase |
| [Constraint Templates](install/templates/README.md) | Pre-built patterns (auth, CRUD, API, payment) |
| [PM Guide](docs/pm/guide.md) | Product Manager workflows |

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
