# Manifold Installer

One-line installer for Manifold — supports Claude Code, AMP, Gemini CLI, and Codex CLI.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

## What Gets Installed

The installer auto-detects which AI coding agents are present and installs Manifold in each agent's native format:

| Agent | Commands | Hooks | Parallel Library | Instruction File |
|-------|----------|-------|------------------|------------------|
| Claude Code | `.md` files (canonical) | `.ts` hooks | `.ts` source files | `~/.claude/CLAUDE.md` |
| AMP | `.md` files (canonical) | `.ts` hooks | `.ts` source files | `~/.amp/CLAUDE.md` |
| Gemini CLI | `.toml` files (translated) | `.ts` hook | `parallel.bundle.js` | `~/.gemini/GEMINI.md` |
| Codex CLI | `SKILL.md` files (translated) | Skills-as-hooks | `parallel.bundle.js` | `~/.codex/AGENTS.md` |

## Installation Locations

| Agent | Location | What |
|-------|----------|------|
| Claude Code | `~/.claude/commands/` | 12 command files (`.md`) |
| Claude Code | `~/.claude/skills/manifold/` | `/manifold` overview skill |
| Claude Code | `~/.claude/hooks/` | Context & auto-suggest hooks |
| Claude Code | `~/.claude/lib/parallel/` | Parallel execution library (`.ts`) |
| AMP | `~/.amp/commands/` | 12 command files (`.md`) |
| AMP | `~/.amp/skills/manifold/` | `/manifold` overview skill |
| AMP | `~/.amp/hooks/` | Context & auto-suggest hooks |
| AMP | `~/.amp/lib/parallel/` | Parallel execution library (`.ts`) |
| Gemini CLI | `~/.gemini/commands/` | 11 command files (`.toml`) |
| Gemini CLI | `~/.gemini/hooks/` | Context hook (`.ts`) |
| Gemini CLI | `~/.gemini/lib/parallel/` | Parallel library bundle (`.js`) |
| Codex CLI | `~/.agents/skills/manifold-*/` | 13 skill directories (`SKILL.md`) |
| Codex CLI | `~/.codex/lib/parallel/` | Parallel library bundle (`.js`) |

## Available Commands After Install

| Command | Description |
|---------|-------------|
| `/manifold` | Show framework overview |
| `/m0-init` | Initialize constraint manifold |
| `/m1-constrain` | Discover constraints (interview-driven) |
| `/m2-tension` | Surface constraint conflicts |
| `/m3-anchor` | Backward reasoning from outcome |
| `/m4-generate` | Create all artifacts |
| `/m5-verify` | Validate against constraints |
| `/m6-integrate` | Wire artifacts together |
| `/m-status` | Show current state |
| `/m-solve` | Generate parallel execution plan |
| `/m-quick` | Light mode (3-phase workflow) |
| `/parallel` | Execute tasks in parallel worktrees |

## Build Pipeline

Canonical `.md` commands are translated to agent-specific formats at build time:

```bash
# Rebuild Gemini .toml + Codex SKILL.md from canonical .md source
bun run build:commands

# Rebuild Node.js-compatible parallel library bundle
bun run build:parallel-bundle

# Rebuild everything
bun run build:all
```

A CI diff guard (`.github/workflows/manifold-diff-guard.yml`) ensures pre-built artifacts stay in sync with canonical source.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

## Validate Installation

```bash
# Run health checks for all detected agents
./install.sh --validate
```

## Local Install (Development)

```bash
cd manifold/install
./install.sh
```

## Files

```
install/
├── install.sh                          # Main installer (4-agent support)
├── uninstall.sh                        # Uninstaller (4-agent cleanup)
├── README.md                           # This file
├── SCHEMA_SNIPPET.md                   # Schema reference for instruction files
├── manifold/
│   └── SKILL.md                        # /manifold overview skill
├── commands/                           # Canonical .md command source
│   ├── m0-init.md ... m6-integrate.md  # Phase commands
│   ├── m-status.md, m-solve.md, m-quick.md
│   ├── parallel.md                     # Parallel execution command
│   ├── SCHEMA_REFERENCE.md             # Full schema reference
│   └── SCHEMA_QUICK_REFERENCE.md       # Quick reference card
├── hooks/                              # Claude Code / AMP hooks
│   ├── manifold-context.ts             # Context preservation
│   └── auto-suggester.ts               # Workflow auto-suggestions
├── lib/
│   ├── build-commands.ts               # Build-time command translator
│   ├── config-merger.ts                # Idempotent config merging
│   └── parallel/                       # Parallel execution library
│       ├── index.ts                    # Module entry (Bun)
│       ├── bundle-entry.ts             # Bundle entry (Node.js)
│       ├── parallel.bundle.js          # Pre-built Node.js bundle
│       └── *.ts                        # Library source files
├── agents/
│   ├── gemini/
│   │   ├── commands/*.toml             # Pre-built Gemini commands (11)
│   │   └── hooks/manifold-context.ts   # Gemini-specific context hook
│   └── codex/
│       └── skills/                     # Pre-built Codex skills
│           ├── manifold-context/       # Context preservation skill
│           ├── manifold-suggest/       # Auto-suggestion skill
│           └── manifold-m*/            # Command skills (11)
└── templates/                          # Constraint templates
    ├── auth.md, crud.md, api.md, payment.md
    └── pm/                             # PM templates
```
