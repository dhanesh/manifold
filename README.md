# Manifold

[![Release](https://img.shields.io/github/v/release/dhanesh/manifold)](https://github.com/dhanesh/manifold/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

```
TRADITIONAL                          MANIFOLD
─────────────────────────────────    ─────────────────────────────────
Spec → Design → Build → Test         All constraints exist NOW
Discover problems during build       Problems visible before build
Sequential planning                  Constraint satisfaction
Forward reasoning                    Backward from outcome
```

## Start Here

| I want to... | Go to |
|---------------|-------|
| Get running in 15 minutes | [Quickstart](docs/quickstart.md) |
| See a full feature walkthrough | [Walkthrough](docs/walkthrough/README.md) |
| Look up a CLI command | [CLI Reference](docs/cli-reference.md) |
| Understand the terminology | [Glossary](docs/GLOSSARY.md) |
| Use pre-built constraint patterns | [Templates](install/templates/README.md) |
| Generate PRDs and user stories | [PM Guide](docs/pm/guide.md) |
| Use Manifold for non-software decisions | [Non-Programming Guide](docs/non-programming/guide.md) |
| Fix something that's broken | [Troubleshooting](docs/troubleshooting.md) |
| Contribute to Manifold | [Contributing](CONTRIBUTING.md) |

## Features

- **Constraint-First Development** -- Surface all constraints before writing code
- **Backward Reasoning** -- Reason from desired outcomes to required truths, with recursive decomposition for multi-level dependency chains
- **Tension Detection** -- Find conflicts between constraints early, with TRIZ-guided resolution and directional propagation checks
- **Pre-mortem Stress Testing** -- Mandatory failure-story pass in constraint discovery surfaces assumptions single-pass elicitation misses
- **Constraint Genealogy** -- Track constraint origins (`source`) and challengeability (`challenger`) to guide tension resolution direction
- **Probabilistic Bounds** -- Express metric constraints as statistical targets (p99, p50, failure rates) rather than only deterministic thresholds
- **Bottleneck Identification** -- Theory of Constraints integration surfaces the binding constraint before solution generation
- **Reversibility Tagging** -- Every action step tagged as TWO_WAY, REVERSIBLE_WITH_COST, or ONE_WAY with explicit acknowledgment for irreversible decisions
- **Non-Software Domain Support** -- `--domain=non-software` activates universal categories (Obligations, Desires, Resources, Risks, Dependencies) and decision-focused artifacts
- **All-at-Once Generation** -- Generate code, tests, docs, runbooks, and alerts from a single source
- **Evidence System** -- Verify constraints with [concrete proof](docs/evidence-system.md)
- **Drift Detection** -- Detect post-verification file changes using SHA-256 hashing
- **Guided Workflow** -- Structured next-step suggestions guide you through each phase
- **Constraint Templates** -- Pre-built patterns for [auth, CRUD, API, payment, and 13 PM templates](install/templates/README.md)
- **Light Mode** -- Simplified 3-phase workflow for quick changes
- **PM Workflows** -- Generate PRDs and user stories with constraint traceability
- **Parallel Execution** -- Run independent tasks concurrently using git worktrees
- **Native CLI** -- Fast, deterministic operations (<100ms) for CI/CD
- **Multi-Agent Support** -- Works with Claude Code, AMP, Gemini CLI, and Codex CLI

## Install

### Claude Code Plugin (Recommended for Claude Code users)

```bash
claude plugin:install github:dhanesh/manifold#plugin
```

This installs Manifold as a native Claude Code plugin, giving you:
- 13 slash commands (`/manifold:m0-init` through `/manifold:parallel`, including `m4-prd` and `m4-stories` for PM workflows)
- 4 hooks (context preservation, schema validation, interaction rules, phase context injection) plus a `SessionStart` script
- Constraint templates (auth, CRUD, API, payment, + 13 PM templates)
- `/manifold:setup` command to install the native CLI binary

After installing the plugin, run `/manifold:setup` inside Claude Code to get the fast CLI binary.

### Shell Installer (All Agents)

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

The installer auto-detects which AI agents you have and installs per-agent:

| Agent | What Gets Installed | Location |
|-------|-------------------|----------|
| **Claude Code** | 13 slash commands (`.md`), parallel library, hooks, schema snippet in `CLAUDE.md` | `~/.claude/commands/`, `lib/`, `hooks/` |
| **AMP** | Same as Claude Code | `~/.amp/commands/`, `lib/`, `hooks/` |
| **Gemini CLI** | Translated `.toml` commands, parallel bundle (`.js`), schema snippet in `GEMINI.md` | `~/.gemini/commands/`, `lib/` |
| **Codex CLI** | `SKILL.md` skill dirs, hook skills, parallel bundle, schema snippet in `AGENTS.md` | `~/.agents/skills/manifold-*/`, `~/.codex/lib/` |
| **CLI binary** | `manifold` binary for your platform (darwin/linux/windows, arm64/x64) | `/usr/local/bin/`, `~/.local/bin/`, or `%LOCALAPPDATA%\manifold\bin\` |

**Specifically, the installer creates:**
- `commands/` -- 13 Manifold slash command files (m0-init through parallel, plus `m4-prd`, `m4-stories`, and SCHEMA_REFERENCE)
- `lib/parallel/` -- TypeScript modules + pre-built bundle for git worktree-based parallel execution (including the `AutoSuggester` library that powers `/manifold:parallel`)
- `hooks/` -- 4 compiled hook handlers dispatched via `manifold hook <name>`: `context` (PreCompact — context preservation), `schema-guard` (PostToolUse — schema validation), `prompt-enforcer` (UserPromptSubmit — interaction rules), `phase-commons` (UserPromptSubmit — injects live manifold state before phase commands). A cross-platform `session-start.sh` / `session-start.ps1` script is also wired to the `SessionStart` event.
- `skills/manifold/SKILL.md` -- Overview skill for `/manifold` command
- Schema snippet appended to your agent's instruction file (CLAUDE.md, GEMINI.md, or AGENTS.md)

The installer is idempotent -- running it again updates existing files without duplication. Run `install.sh --validate` to check what was installed. See [Uninstall](#uninstall) to remove.

Verify it worked:

```bash
manifold --version
```

### CLI Binary (Standalone)

Download platform-specific binaries from [Releases](https://github.com/dhanesh/manifold/releases):

**macOS / Linux:**

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

**Windows (PowerShell):**

```powershell
# Download and install via PowerShell
Invoke-WebRequest -Uri "https://github.com/dhanesh/manifold/releases/latest/download/manifold-windows-x64.exe" -OutFile "$env:LOCALAPPDATA\manifold\bin\manifold.exe"

# Or use the install script (handles PATH setup automatically)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/dhanesh/manifold/main/plugin/bin/install-cli.ps1" -OutFile "$env:TEMP\install-manifold.ps1"
powershell -ExecutionPolicy Bypass -File "$env:TEMP\install-manifold.ps1"
```

The Windows binary is a standalone `.exe` -- no runtime (Bun/Node) required.

## Quick Start

```bash
/manifold:m0-init payment-retry --outcome="95% retry success"
/manifold:m1-constrain payment-retry        # Discover constraints across 5 categories
/manifold:m2-tension payment-retry          # Surface conflicts: latency vs idempotency
/manifold:m3-anchor payment-retry           # Backward reasoning -> solution options
/manifold:m4-generate payment-retry         # Create code, tests, docs, runbooks, alerts
/manifold:m5-verify payment-retry           # Validate all artifacts against constraints
```

For simple changes that don't need full constraint analysis:

```bash
/manifold:m-quick fix-login-bug --outcome="Fix 504 timeout on login"
```

See [Quickstart](docs/quickstart.md) for a complete 15-minute guide, or [When NOT to Use](docs/WHEN_NOT_TO_USE.md) for when simpler approaches work better.

## Commands

### AI Agent Commands (Claude Code / AMP)

| Command | Purpose | Phase |
|---------|---------|-------|
| `/manifold:m0-init` | Initialize constraint manifold | INITIALIZED |
| `/manifold:m1-constrain` | Discover constraints (interview-driven) | CONSTRAINED |
| `/manifold:m2-tension` | Surface constraint conflicts | TENSIONED |
| `/manifold:m3-anchor` | Backward reasoning from outcome | ANCHORED |
| `/manifold:m4-generate` | Create all artifacts simultaneously | GENERATED |
| `/manifold:m4-prd` | Generate a PRD document from the manifold (PM workflow) | - |
| `/manifold:m4-stories` | Generate user stories with acceptance criteria (PM workflow) | - |
| `/manifold:m5-verify` | Validate against constraints | VERIFIED |
| `/manifold:m6-integrate` | Wire artifacts together | - |
| `/manifold:m-status` | Show current state | - |
| `/manifold:m-solve` | Generate parallel execution plan | - |
| `/manifold:m-quick` | Light mode: 3-phase workflow | - |
| `/manifold:parallel` | Execute tasks in parallel worktrees | - |

### Native CLI

The CLI provides instant operations without AI round-trips. See [CLI Reference](docs/cli-reference.md) for complete documentation.

```bash
manifold status [feature]          # Show manifold state
manifold validate [feature]        # Validate schema (exit 2 = invalid)
manifold init <feature>            # Initialize new manifold
manifold verify [feature]          # Verify artifacts exist
manifold graph [feature]           # Visualize constraint network
manifold show [feature]            # Combined JSON+MD view
manifold solve [feature]           # Parallel execution plan
manifold migrate [feature]         # Convert YAML -> JSON+MD
manifold drift [feature]          # Detect post-verification file changes
manifold completion [shell]        # Shell completions (bash/zsh/fish)
manifold hook <name>               # Compiled hook handlers for Claude Code events
                                   # Subcommands: context | schema-guard | prompt-enforcer | phase-commons
```

**When to use CLI vs AI commands:**
- **CLI**: Status checks, CI/CD validation, visualization, quick verification
- **AI**: Constraint discovery, tension analysis, code generation

## Phase Workflow

```
INITIALIZED -> CONSTRAINED -> TENSIONED -> ANCHORED -> GENERATED -> VERIFIED
     ^                                                              |
     +----------------------- (iteration) --------------------------+
```

Each phase builds on the previous:

1. **Initialize** -- Name the feature, state the outcome
2. **Constrain** -- Interview-driven discovery across 5 categories (business, technical, UX, security, operational), with pre-mortem stress testing and constraint genealogy tagging
3. **Tension** -- Find and resolve conflicts between constraints, with TRIZ principle lookup and directional propagation checks
4. **Anchor** -- Reason backward from outcome to derive required truths, with recursive decomposition and bottleneck identification
5. **Generate** -- Create ALL artifacts (code, tests, docs, runbooks, alerts) simultaneously, with reversibility tagging per action step
6. **Verify** -- Validate every artifact against every constraint with evidence

See the [Walkthrough](docs/walkthrough/README.md) for a real example with actual outputs.

## Constraint System

### Types

| Type | Meaning | Priority | Example |
|------|---------|----------|---------|
| **invariant** | Must NEVER be violated | Highest | "No duplicate payments" |
| **boundary** | Hard limits | Medium | "Retry window <= 72 hours" |
| **goal** | Should be optimized | Lowest | "95% retry success rate" |

### Categories

| Category | ID Prefix | Focus |
|----------|-----------|-------|
| Business | B1, B2... | Revenue, compliance, stakeholders |
| Technical | T1, T2... | Performance, integration, data |
| User Experience | U1, U2... | Response times, errors, accessibility |
| Security | S1, S2... | Data protection, auth, audit |
| Operational | O1, O2... | Monitoring, incidents, deployment |

## Schema

Manifold uses JSON+Markdown hybrid format stored in `.manifold/`:

```
.manifold/
+-- <feature>.json           # Structure (IDs, types, phases)
+-- <feature>.md             # Content (statements, rationale)
+-- <feature>.verify.json    # Verification results
```

> Legacy YAML format (`.yaml` files) is still supported. Use `manifold migrate` to convert.

### Valid Values

| Field | Valid Values |
|-------|--------------|
| `phase` | INITIALIZED, CONSTRAINED, TENSIONED, ANCHORED, GENERATED, VERIFIED |
| `constraint.type` | invariant, goal, boundary |
| `tension.type` | trade_off, resource_tension, hidden_dependency |
| `tension.status` | resolved, unresolved |
| `required_truth.status` | SATISFIED, PARTIAL, NOT_SATISFIED, SPECIFICATION_READY |
| `convergence.status` | NOT_STARTED, IN_PROGRESS, CONVERGED |

See [Schema Reference](install/commands/SCHEMA_REFERENCE.md) for complete documentation.

## Using Templates

Pre-built constraint patterns for common scenarios:

```bash
/manifold:m0-init user-auth --template=auth        # Authentication flows
/manifold:m0-init user-crud --template=crud        # CRUD operations
/manifold:m0-init payment-flow --template=payment  # Payment processing
/manifold:m0-init api-endpoint --template=api      # API endpoints
```

See [Constraint Templates](install/templates/README.md) for all 17 templates including PM-specific patterns.

## CI/CD Integration

```bash
# Validate manifolds (exit 2 = validation failure)
manifold validate --json

# Verify artifacts exist
manifold verify --json

# Evidence verification (strict mode for CI)
manifold verify --verify-evidence --strict --json

# Check for post-verification drift (exit 2 = drift detected)
manifold drift --json
```

### GitHub Action

```yaml
# .github/workflows/ci.yml
jobs:
  manifold:
    uses: dhanesh/manifold/.github/workflows/manifold-verify.yml@main
    with:
      fail-on-gaps: false  # Set true to fail on non-blocking gaps
```

## Parallel Execution

Run independent tasks concurrently using isolated git worktrees:

```bash
/manifold:parallel "implement auth module" "add logging middleware" "create user tests"
```

See [Parallel Agents Guide](docs/parallel-agents/README.md) for configuration and advanced usage.

## Product Manager Workflow

Generate PRDs and user stories with constraint traceability:

```bash
/manifold:m0-init mobile-checkout --template=pm/feature-launch
/manifold:m1-constrain mobile-checkout
/manifold:m2-tension mobile-checkout
/manifold:m3-anchor mobile-checkout
/manifold:m4-generate mobile-checkout --prd --stories
```

See [PM Guide](docs/pm/guide.md) for detailed workflows and [PM Templates](install/templates/pm/README.md) for all 13 PM-specific templates.

## Non-Programming Use Cases

Manifold's constraint-first approach extends beyond software. Use `--domain=non-software` to activate universal categories and decision-focused artifacts:

```bash
/manifold:m0-init career-change --domain=non-software --outcome="Make the right career move"
```

| Domain | Best For |
|--------|----------|
| Research/Analysis | Methodology design, study planning |
| Business | Strategic decisions, expansion planning |
| Personal | Major life decisions, career choices |
| Creative | Project planning (not creative direction) |

Non-software mode uses five universal categories (Obligations, Desires, Resources, Risks, Dependencies) and generates decision artifacts (decision brief, scenario stress-tests, narrative guide, recovery playbook, risk watch list) instead of code.

See [Non-Programming Guide](docs/non-programming/guide.md) for full details, universal category definitions, and examples.

## Documentation

| Document | Description |
|----------|-------------|
| [Quickstart](docs/quickstart.md) | Get started in 15 minutes |
| [CLI Reference](docs/cli-reference.md) | Complete CLI command documentation |
| [Evidence System](docs/evidence-system.md) | Evidence types and verification |
| [Walkthrough](docs/walkthrough/README.md) | End-to-end feature example |
| [Glossary](docs/GLOSSARY.md) | Plain-language terminology |
| [Troubleshooting](docs/troubleshooting.md) | Common errors and fixes |
| [When NOT to Use](docs/WHEN_NOT_TO_USE.md) | Know when simpler approaches work |
| [TRIZ Principles](docs/triz-principles.md) | 40 inventive principles for tension resolution |
| [Non-Programming Guide](docs/non-programming/guide.md) | Using Manifold for non-software decisions |
| [Scientific Foundations](docs/research/phase-scientific-foundations.md) | Research supporting each phase |
| [Contributing](CONTRIBUTING.md) | How to contribute |

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

## License

MIT
