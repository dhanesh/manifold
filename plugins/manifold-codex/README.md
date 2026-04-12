# Manifold for Codex

This plugin packages Manifold as a Codex-native distribution unit.

It is designed for install paths that want more than loose skills:
- bundled `commands/` for command-style entrypoints
- bundled `skills/` generated from the canonical `install/commands/*.md`
- compatibility with the global Codex install path managed by `install/install.sh`

## Included Surfaces

- `commands/` - command-style markdown entrypoints for Manifold phases
- `skills/` - Codex skills generated from the canonical Manifold command source
- `.codex-plugin/plugin.json` - plugin manifest

## Installation Modes

- Repo-local: add this plugin to `.agents/plugins/marketplace.json`
- Personal/global: `install.sh` copies this bundle to `~/.codex/plugins/manifold-codex` and adds a personal marketplace entry

## Notes

- The command and skill files in this plugin are generated from `install/commands/`.
- Global hooks and custom agents are installed separately into `~/.codex/` by `install.sh`.
- The plugin is a Codex distribution surface; the canonical workflow source remains under `install/`.
