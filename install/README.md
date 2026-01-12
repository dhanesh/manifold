# Manifold Installer

One-line installer for Manifold.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
```

## What Gets Installed

The installer:
1. Detects Claude Code and/or AMP on your system
2. Installs the Manifold skill to each detected agent
3. Makes 7 commands available: `/m0-init` through `/m5-verify` + `/m-status`

## Supported Agents

| Agent | Skills Directory |
|-------|-----------------|
| Claude Code | `~/.claude/skills/manifold/` |
| AMP | `~/.amp/skills/manifold/` |

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

Or manually:
```bash
rm -rf ~/.claude/skills/manifold ~/.amp/skills/manifold
```

## Local Install (Development)

```bash
cd manifold/install
./install.sh
```

## Files

```
install/
├── install.sh       # Main installer
├── uninstall.sh     # Uninstaller
├── manifold/
│   └── SKILL.md     # Skill definition (all 7 commands)
└── README.md        # This file
```
