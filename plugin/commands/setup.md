---
description: "Install or update the Manifold CLI binary. Downloads the pre-compiled binary for your platform from GitHub releases."
argument-hint: "[--install-dir /path/to/bin]"
---

# /setup - Install Manifold CLI

Install the native Manifold CLI binary for fast, deterministic operations (status, validate, verify, show).

## Process

1. **Check current state**: Run `which manifold` to see if CLI is already installed
2. **Run the installer**: Execute the install script bundled with this plugin:
   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/bin/install-cli.sh"
   ```
3. **Verify installation**: Run `manifold --version` to confirm

## What the CLI Provides

The CLI runs fast (<100ms) without AI for:

| Command | Purpose |
|---------|---------|
| `manifold status [feature]` | Show manifold state |
| `manifold validate [feature]` | Validate JSON+MD schema and linking |
| `manifold verify [feature]` | Verify artifacts exist |
| `manifold show [feature]` | Combined JSON+MD view |
| `manifold graph [feature]` | Constraint dependency graph |
| `manifold init <feature>` | Initialize new manifold |
| `manifold migrate <feature>` | Convert YAML to JSON+MD |

## Why It Matters

Several Manifold commands (/manifold:m0-init, /manifold:m1-constrain, /manifold:m2-tension, /manifold:m3-anchor, /manifold:m5-verify, /manifold:m6-integrate) run `manifold validate` as a post-step to catch schema errors immediately. Without the CLI, these validation steps are skipped.

## Manual Installation

If the automated installer doesn't work, users can also install manually:

```bash
# From GitHub releases
curl -fsSL https://github.com/dhanesh/manifold/releases/latest/download/manifold-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/') -o /usr/local/bin/manifold
chmod +x /usr/local/bin/manifold

# Or build from source (requires Bun)
git clone https://github.com/dhanesh/manifold.git
cd manifold/cli && bun run compile
cp manifold /usr/local/bin/
```
