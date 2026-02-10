# Manifold - Claude Code Plugin

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

## Installation

### Local plugin (development)

```bash
claude --plugin-dir /path/to/manifold/plugin
```

### From repository

```bash
# Add to your project's .claude/settings.json
{
  "plugins": ["github:dhanesh/manifold#plugin"]
}
```

## Prerequisites

- **Bun** runtime (required for PreCompact hook)
- **Claude Code** v1.0+

## What's Included

### Commands (12)

| Command | Purpose |
|---------|---------|
| `/manifold:m0-init` | Initialize a constraint manifold |
| `/manifold:m1-constrain` | Interview-driven constraint discovery |
| `/manifold:m2-tension` | Surface and resolve conflicts |
| `/manifold:m3-anchor` | Backward reasoning from outcome |
| `/manifold:m4-generate` | Generate ALL artifacts simultaneously |
| `/manifold:m5-verify` | Validate against constraints |
| `/manifold:m6-integrate` | Wire artifacts together |
| `/manifold:m-status` | Show current state and next action |
| `/manifold:m-solve` | Generate parallel execution plan |
| `/manifold:m-quick` | Light mode: 3-phase workflow for simple changes |
| `/manifold:parallel` | Execute tasks in parallel worktrees |
| `/manifold:setup` | Install/update the native CLI binary |

### Skill (1)

- `/manifold` - Overview skill with quick start guide

### Hooks (2)

- **SessionStart** - Injects schema quick reference into session context
- **PreCompact** - Preserves manifold state across context compaction

### Templates

Pre-built constraint patterns for common scenarios:
- `auth` - Authentication systems
- `crud` - CRUD operations
- `api` - API endpoints
- `payment` - Payment processing
- PM templates: feature-launch, experiment, deprecation, and more

## Quick Start

```
/manifold:m0-init my-feature --outcome="Success criteria here"
/manifold:m1-constrain my-feature
/manifold:m2-tension my-feature
/manifold:m3-anchor my-feature
/manifold:m4-generate my-feature
/manifold:m5-verify my-feature
```

## Native CLI (Recommended)

The native CLI provides fast (<100ms) deterministic operations and is used by several commands for post-step validation. The plugin detects whether the CLI is installed at session start.

### Install via plugin command

```
/manifold:setup
```

This downloads the pre-compiled binary for your platform from GitHub releases and installs it to `/usr/local/bin/manifold` (or `~/.local/bin/manifold` as fallback).

### Install manually

```bash
# Direct download
bash /path/to/plugin/bin/install-cli.sh

# Or via curl from GitHub
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

### CLI Commands

```bash
manifold status [feature]      # Show state (<100ms)
manifold validate [feature]    # Validate schema + linking
manifold verify [feature]      # Verify artifacts exist
manifold show [feature]        # Combined JSON+MD view
manifold graph [feature]       # Constraint dependency graph
manifold init <feature>        # Initialize new manifold
manifold migrate <feature>     # Convert YAML to JSON+MD
```

## File Storage

Manifold data is stored in your project's `.manifold/` directory:

```
.manifold/
├── <feature>.json          # Structure (IDs, types, phases)
├── <feature>.md            # Content (statements, rationale)
└── <feature>.verify.json   # Verification results
```

## Documentation

- [Full Documentation](https://github.com/dhanesh/manifold)
- [Schema Reference](https://github.com/dhanesh/manifold/blob/main/install/commands/SCHEMA_REFERENCE.md)
- [Walkthrough](https://github.com/dhanesh/manifold/blob/main/docs/walkthrough/README.md)
