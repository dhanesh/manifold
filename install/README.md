# Manifold Installer

One-line installer for Manifold.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

## What Gets Installed

The installer:
1. Detects Claude Code and/or AMP on your system
2. Installs the `/manifold` skill (overview command) to `~/.claude/skills/manifold/`
3. Installs 7 command files to `~/.claude/commands/` for individual commands

## Installation Locations

| Agent | Location | What |
|-------|----------|------|
| Claude Code | `~/.claude/skills/manifold/` | `/manifold` overview skill |
| Claude Code | `~/.claude/commands/` | `/m0-init`, `/m1-constrain`, etc. |
| AMP | `~/.amp/skills/manifold/` | `/manifold` overview skill |
| AMP | `~/.amp/commands/` | `/m0-init`, `/m1-constrain`, etc. |

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
| `/m-status` | Show current state |

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

Or manually:
```bash
# Claude Code
rm -rf ~/.claude/skills/manifold
rm ~/.claude/commands/m0-init.md ~/.claude/commands/m1-constrain.md \
   ~/.claude/commands/m2-tension.md ~/.claude/commands/m3-anchor.md \
   ~/.claude/commands/m4-generate.md ~/.claude/commands/m5-verify.md \
   ~/.claude/commands/m-status.md

# AMP
rm -rf ~/.amp/skills/manifold
rm ~/.amp/commands/m*.md
```

## Local Install (Development)

```bash
cd manifold/install
./install.sh
```

## Files

```
install/
├── install.sh           # Main installer
├── uninstall.sh         # Uninstaller
├── manifold/
│   └── SKILL.md         # Overview skill (/manifold)
├── commands/
│   ├── m0-init.md       # /m0-init command
│   ├── m1-constrain.md  # /m1-constrain command
│   ├── m2-tension.md    # /m2-tension command
│   ├── m3-anchor.md     # /m3-anchor command
│   ├── m4-generate.md   # /m4-generate command
│   ├── m5-verify.md     # /m5-verify command
│   └── m-status.md      # /m-status command
└── README.md            # This file
```
