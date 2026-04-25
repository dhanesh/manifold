# Decision: Skill-first canonical, Claude Code plugin as wrapper

**Status**: Validated, ready for migration  
**Date**: 2026-04-25  
**Branch of origin**: `ideate/skill-vs-plugin`  
**Reference artifact**: [`./skill-vs-plugin-example/manifold-status/`](./skill-vs-plugin-example/manifold-status/)

## Context

Manifold is currently distributed as a Claude Code plugin (`plugin/` synced from `install/`) with per-agent translation shims for Codex (`install/agents/codex/skills/manifold-*/SKILL.md`) and Gemini (`install/agents/gemini/commands/*.toml`). The question: should Manifold move toward **skill-first** distribution so it ships across all coding agents through one common format, with the Claude Code plugin becoming a thin wrapper rather than the canonical packaging?

Motivations:
1. Reach other coding agents (Codex, Gemini, Cursor, Copilot, Amp, etc.)
2. Reduce maintenance burden of per-agent translations
3. Simpler install (drop into `~/.claude/skills/` or equivalent)
4. Future-proof against further fragmentation

---

## Key finding that reframes the question

**Agent Skills (agentskills.io) is now a real cross-agent open standard with 35+ adopters as of April 2026.**

Confirmed adopters (from agentskills.io/home, all link to their own SKILL.md docs):

- Anthropic: Claude Code, Claude (web)
- OpenAI: Codex
- Google: Gemini CLI
- Microsoft: GitHub Copilot, VS Code
- Cursor, Amp (Sourcegraph), Goose (Block), OpenHands, OpenCode, Junie (JetBrains), Roo Code, Kiro, Factory, Letta, Firebender, Trae (ByteDance), Mistral Vibe, Snowflake Cortex Code, Databricks Genie Code, Spring AI, Laravel Boost, Workshop, Emdash, Mux, Autohand, Piebald, Ona, Qodo, VT Code, Command Code, fast-agent, nanobot, pi, Google AI Edge Gallery, Agentman

Standard structure (canonical):

```
my-skill/
├── SKILL.md          # Required: name + description frontmatter + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: docs loaded on demand
├── assets/           # Optional: templates
```

Loading model: progressive disclosure — discovery (name + description), activation (full SKILL.md), execution (referenced files on demand). Anthropic-developed, open governance, GitHub repo at `agentskills/agentskills`.

There *is* a converged folder convention, and it is broadly adopted. Per-agent translation (Manifold's current `install/agents/codex/...` and `install/agents/gemini/*.toml`) is largely redundant work today — most agents now consume SKILL.md folders directly.

---

## Current state of Manifold

| Component | Location | Portable? | Claude-only? |
|---|---|---|---|
| Canonical skill content | `install/commands/*.md` (flat .md) | Yes (hand-authored) | No |
| Claude Code plugin wrapper | `plugin/` (synced from `install/`) | — | Yes (plugin.json, marketplace) |
| **Hooks** | `install/hooks/hooks.json` + 4 TS hooks | — | **Yes** |
| CLI binary | `cli/` → 4 platform binaries | Yes | No |
| Codex translation | `install/agents/codex/skills/manifold-*/SKILL.md` | Yes (already SKILL.md format) | No |
| Gemini translation | `install/agents/gemini/commands/*.toml` | Obsolete (Gemini CLI now supports SKILL.md) | No |
| Build pipeline | `install/lib/build-commands.ts` + `scripts/sync-plugin.ts` | — | — |

**Hooks in active use** (the load-bearing Claude-only feature):
- `SessionStart` — auto-updates CLI binary if plugin version is ahead
- `PostToolUse` (Edit/Write/MultiEdit) — runs `manifold hook schema-guard` to validate JSON manifold edits
- `UserPromptSubmit` — runs `manifold hook prompt-enforcer` to enforce phase rules
- `PreCompact` — runs `manifold hook context` to preserve manifold state across compaction

The CLI binary already implements the underlying logic (`manifold hook <name>`); hooks just trigger them automatically. The *capability* is in the CLI; hooks are *invocation glue*.

---

## Options considered

### Option A — Status quo (Plugin-first, .md commands, per-agent shims)
Keep `install/commands/*.md` flat; keep Gemini TOML + Codex SKILL.md generated translations.
- Pro: Zero work today.
- Con: Misses the standard convergence. Continues maintaining translation shims that are now obsolete for most agents. Authoring in flat `.md` files diverges from the standard layout (no `scripts/`, `references/`, `assets/` discipline).

### Option B — Skill-first canonical, Plugin as thin wrapper *(recommended)*
Restructure `install/commands/*.md` into `install/skills/<skill-name>/SKILL.md` folders matching the agentskills.io spec. Claude Code plugin becomes a wrapper that bundles those skills + hooks + CLI binary + marketplace metadata. Other agents consume the skill folders directly with no translation step.
- Pro: Aligns with the cross-agent standard. Eliminates Gemini TOML translation. Simplifies authoring (one folder per skill, with room for `references/` and `assets/`). Plugin still exists for hooks + marketplace + CLI bundling on Claude Code.
- Con: One-time restructure.

### Option C — Skill-only (drop the plugin entirely)
Distribute as pure SKILL.md folders only.
- Pro: Maximum simplicity.
- Con: Loses all four hooks. Loses marketplace install/upgrade UX. Loses CLI binary auto-update via SessionStart. Schema-guard and prompt-enforcer hooks catch invalid manifold edits at the moment of edit — moving them to "user must run `manifold validate` manually" is a real regression. **Not recommended.**

### Option D — Hybrid with per-feature classification
Classify each piece by portability and ship each on its native channel: skills via SKILL.md, hooks via plugin, CLI via binary releases. This is essentially Option B reframed; folded into B.

---

## Recommendation: Option B

**Skill-first canonical authoring, Claude Code plugin as wrapper.**

Rationale:
1. The standard exists and is broadly adopted — aligning now is a small move with compounding payoff.
2. Manifold is already most of the way there: `install/agents/codex/skills/manifold-*/SKILL.md` is generated SKILL.md, and `install/commands/*.md` content is essentially SKILL.md without the folder wrapper.
3. Hooks are non-portable but they're invocation glue, not capability. Keep them in the Claude Code plugin. Other agents lose only auto-update and auto-validation — both have manual CLI fallbacks (`manifold validate`, `manifold drift`).
4. The Gemini TOML translation becomes deletable. Net negative code — pure win.
5. Claude Code priority preserved: plugin still ships, marketplace still works, hooks still run, CLI auto-updates.

**Shape of the destination state:**

```
install/
├── skills/                              # NEW canonical location
│   ├── manifold-m0-init/
│   │   ├── SKILL.md
│   │   └── references/                  # long examples lifted out
│   ├── manifold-m1-constrain/
│   │   └── SKILL.md
│   └── ... (one folder per current command)
├── hooks/                               # Claude Code plugin only
├── cli/                                 # Unchanged
└── plugin.json                          # Plugin manifest

plugin/                                  # Auto-synced; bundles skills + hooks + CLI for Claude Code

install/agents/gemini/                   # Deletable after migration
install/agents/codex/                    # Deletable; Codex now reads skills/ directly
```

---

# Verification report (run 2026-04-25)

Verification work executed on branch `ideate/skill-vs-plugin`.

## Test artifact

Hand-authored a project-scope skill matching the agentskills.io spec exactly. Lives at [`./skill-vs-plugin-example/manifold-status/`](./skill-vs-plugin-example/manifold-status/) in this repo:

```
manifold-status/
├── SKILL.md                              # name, description, argument-hint, metadata
└── references/
    └── output-templates.md               # demonstrates progressive disclosure pattern
```

Frontmatter authored against the spec: `name`, `description` (required), plus optional `argument-hint` (Claude extension), `metadata.short-description`, `metadata.source`.

## Documentation findings

**agentskills.io spec (`/specification`):**
- Required: `name` (max 64 chars, lowercase + hyphens, **must match parent directory name**, no consecutive hyphens, no leading/trailing hyphens), `description` (max 1024 chars).
- Optional: `license`, `compatibility`, `metadata` (free-form key/value), `allowed-tools` (experimental).
- Folder layout: `SKILL.md` required at root; optional `scripts/`, `references/`, `assets/`.
- Recommended: SKILL.md body under 500 lines; long content moves to `references/`.
- Validator: `skills-ref` reference library on `github.com/agentskills/agentskills`.

**Claude Code skills (`code.claude.com/docs/en/skills`):**
- Critical finding: "Custom commands have been merged into skills." A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy`. Claude Code accepts the agentskills.io standard plus extensions.
- Skill `name` becomes the `/slash-command` directly. So a skill named `manifold-status` exposes `/manifold-status`.
- Plugin skills are namespaced as `/<plugin-name>:<skill-name>`. A skill named `manifold-status` bundled inside the `manifold` plugin exposes as `/manifold:manifold-status` — redundant prefix; see Naming below.
- Claude-specific frontmatter extensions: `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context: fork`, `agent`, **`hooks`** (skill-scoped lifecycle hooks), `paths`, `shell`.
- The `hooks` field on skill frontmatter is a real capability — Claude Code supports per-skill lifecycle hooks. This *partially unblocks* moving hook logic out of the plugin into individual skills (still Claude-only; other agents will ignore it).
- Live change detection: editing/adding skills under an existing skills root takes effect mid-session. Creating a top-level skills directory mid-session requires Claude Code restart.
- 1,536-character cap on combined `description` + `when_to_use` per skill in the discovery listing — front-load keywords.

**Gemini CLI (`geminicli.com/docs/cli/skills`) — verified empirically:**
- Loads from `.gemini/skills/`, `.agents/skills/` (workspace) and `~/.gemini/skills/`, `~/.agents/skills/` (user). `.agents/` takes priority over `.gemini/`.
- Accepts agentskills.io standard SKILL.md format unmodified — confirmed via `gemini skills install <local-path> --consent`.
- Has a real CLI: `gemini skills install|list|enable|disable|uninstall`. Install copies the entire skill directory (including `references/`).
- No direct slash-command invocation — only progressive disclosure via description matching.
- Ignores unknown frontmatter (Claude's `argument-hint` did not cause errors).

**Codex CLI (`developers.openai.com/codex/skills`) — verified empirically:**
- Loads from `.agents/skills/` (repo + parents), `~/.agents/skills/`, `~/.codex/skills/`, `/etc/codex/skills`.
- Accepts agentskills.io standard SKILL.md format unmodified — confirmed via `~/.agents/skills/manifold-status` symlink + `codex exec` discovery test.
- Bundled system skills (`~/.codex/skills/.system/`) use the exact same format — `name`, `description`, optional `metadata.short-description`.
- Slash-command-style invocation via `$skill-name` mention or progressive activation; no `/skill-name` syntax.

## Empirical compatibility matrix

| Agent | SKILL.md format | Discovered | Listed correctly | Slash command | Notes |
|-------|----------------|------------|------------------|---------------|-------|
| Claude Code | Verified per docs | Pending fresh-session test | Per docs | `/manifold-status` | Plugin-bundled becomes `/manifold:manifold-status` |
| Gemini CLI | Installed via `gemini skills install` | `gemini skills list --all` confirmed | Full description | Progressive only | Description-driven trigger confirmed via `gemini -p` |
| Codex CLI | Read via `~/.agents/skills/` symlink | `codex exec` enumerated it | Path + name | `$manifold-status` mention | Same format as bundled `.system` skills |

End-to-end probe in Gemini (`gemini -p "List the names of all agent skills currently available"`) returned: `skill-creator, manifold-status` — confirming the skill loaded into the system prompt.

## Open questions — resolutions

1. **Slash-command exposure under skill-only mode** — RESOLVED. `name` field directly becomes `/slash-command` in Claude Code at any scope. Plugin namespacing is `/<plugin>:<skill>`, applied automatically when the skill ships inside a plugin.
2. **Gemini SKILL.md compatibility** — RESOLVED. Standard format works unmodified; Gemini ignores unknown frontmatter.
3. **Codex SKILL.md compatibility** — RESOLVED. Standard format works unmodified; matches Codex's bundled skill format.
4. **Per-agent slash-command UX** — RESOLVED with caveat. Real divergence exists: Claude uses `/`, Codex uses `$`, Gemini uses progressive disclosure only. Manifold's slash-command-driven workflow is non-uniform across agents. Mitigation: rely on strong, keyword-rich `description` fields so progressive activation works on Gemini; document the per-agent invocation syntax in Manifold's README.
5. **Skill name collisions** — RESOLVED. Each agent namespaces by folder name. Using a `manifold-` prefix on every skill name is sufficient.

## New decisions surfaced by verification

### Skill naming: prefix with `manifold-`, drop the lone `m-` on utility commands

The current `m-` prefix on every command was a manifold marker. Once names are prefixed with `manifold-` to satisfy cross-agent namespacing, the lone `m-` on utility commands becomes redundant. The numbered phase prefix (`m0`–`m6`) is *not* redundant — it's the phase index, part of the workflow vocabulary.

Naming rule:
- Numbered phase commands: keep `mN-`. → `manifold-m0-init`, `manifold-m1-constrain`, …, `manifold-m6-integrate`, `manifold-m4-prd`, `manifold-m4-stories`
- Utility commands with leading `m-`: drop the `m-`. → `manifold-status`, `manifold-solve`, `manifold-quick`
- Utility commands without `m-`: just prefix. → `manifold-parallel`, `manifold-setup`
- Schema reference docs: rename to spec-compliant kebab-case. → `manifold-schema-reference`, `manifold-schema-quick-reference`

Full mapping:

| Current `install/commands/<name>.md` | New `install/skills/<name>/SKILL.md` |
|---|---|
| `m0-init` | `manifold-m0-init` |
| `m1-constrain` | `manifold-m1-constrain` |
| `m2-tension` | `manifold-m2-tension` |
| `m3-anchor` | `manifold-m3-anchor` |
| `m4-generate` | `manifold-m4-generate` |
| `m4-prd` | `manifold-m4-prd` |
| `m4-stories` | `manifold-m4-stories` |
| `m5-verify` | `manifold-m5-verify` |
| `m6-integrate` | `manifold-m6-integrate` |
| `m-status` | `manifold-status` |
| `m-solve` | `manifold-solve` |
| `m-quick` | `manifold-quick` |
| `parallel` | `manifold-parallel` |
| `setup` | `manifold-setup` |
| `SCHEMA_REFERENCE` | `manifold-schema-reference` |
| `SCHEMA_QUICK_REFERENCE` | `manifold-schema-quick-reference` |

Cross-agent invocation under this naming:
- Claude Code, skill-only install: `/manifold-status`, `/manifold-m0-init`
- Claude Code, plugin install: `/manifold:manifold-status`, `/manifold:manifold-m0-init` (redundant prefix is ugly but unambiguous; not worth a build-time rewrite)
- Codex CLI: `$manifold-status`, `$manifold-m0-init`
- Gemini CLI: progressive activation only — descriptions must include keywords like "manifold status" so the agent triggers reliably

Why not strip the prefix on plugin sync to get `/manifold:status`? Because that introduces build-time name mutation, doubles the source of truth for the skill name, and breaks the principle that the same SKILL.md folder works identically in any install location. The cosmetic gain does not justify the divergence.

Existing muscle memory of `/manifold:m-status` and `/manifold:m0-init` is a one-time migration cost, signposted in CHANGELOG and the README.

### Hooks-on-skill is now an option (Claude-only)

Claude Code's `hooks` field on skill frontmatter lets a skill declare its own lifecycle hooks. This means schema-guard and prompt-enforcer logic could partially migrate from `plugin/hooks/hooks.json` (plugin-global) into individual skill frontmatter (skill-scoped). Three of the four hooks are scoped naturally:

- `PostToolUse` schema-guard → could move into m0/m1/m2/m3/m4 skills (only fires when those skills are active)
- `UserPromptSubmit` prompt-enforcer → could move into individual skills (only enforces when skill is active)
- `PreCompact` context-save → still wants to be plugin-level (always-on)
- `SessionStart` CLI auto-update → must be plugin-level (skill not yet activated at session start)

Scope-correct hook placement is a nice clean-up. But this is a follow-up refinement, not a migration prerequisite. Surface in the migration plan, defer the actual move.

### Untestable in this session

Claude Code itself was not directly tested because creating the project's `.claude/skills/` directory mid-session means Claude Code is not yet watching it. Verification path: restart Claude Code in this repo, then `/manifold-status` should be discoverable and invokable. Documentation is explicit that the format works; the gap is empirical confirmation, not specification confidence.

## Cleanup

- Removed Gemini install (`gemini skills uninstall manifold-status`).
- Removed `~/.agents/skills/manifold-status` symlink.
- Test artifact relocated from `.claude/skills/manifold-status/` (gitignored) to `docs/decisions/skill-vs-plugin-example/manifold-status/` so the example travels with the decision.

## Verdict

The 5 open questions in the original decision are resolved. **Option B (skill-first canonical authoring, Claude Code plugin as wrapper) is validated for production.** Cross-agent compatibility is empirically confirmed for Codex and Gemini; Claude Code compatibility is documentation-confirmed and trivially testable on next restart.

Ready to commit to the migration. The follow-up implementation plan should:

1. Restructure `install/commands/*.md` → `install/skills/manifold-<name>/SKILL.md` folders per the naming rule above
2. Update `scripts/sync-plugin.ts` to copy from `install/skills/` into `plugin/skills/`
3. Delete or simplify `install/lib/build-commands.ts` — Codex/Gemini SKILL.md generation is no longer needed
4. Delete `install/agents/gemini/commands/*.toml` and `install/agents/codex/skills/*` — both agents now consume `install/skills/` directly via documented install paths
5. Document per-agent install in README: Claude Code (plugin or `~/.claude/skills/`), Gemini (`gemini skills install`), Codex (drop in `~/.agents/skills/` or `~/.codex/skills/`)
6. Optional follow-up: migrate appropriate hooks from `install/hooks/hooks.json` to skill-scoped `hooks` frontmatter
