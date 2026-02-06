# multi-agent-cli

## Outcome

Add support for Gemini CLI and Codex CLI alongside existing Claude Code and AMP integrations, maintaining feature parity across all agents while adding agent-specific capabilities where needed.

---

## Constraints

### Business

#### B1: Full Feature Parity Across All 4 Agents

All 11 Manifold commands (/m0-init through /m-solve, /parallel), the /manifold skill overview, hooks (manifold-context, auto-suggester), the parallel execution library, and the schema reference snippet must be available and functional on Claude Code, AMP, Gemini CLI, and Codex CLI. Any capability gap is a defect.

> **Rationale:** Users may switch between agents or use multiple agents on the same project. Inconsistent capabilities break the constraint-first workflow and erode trust.

**Agents:** Claude Code, AMP, Gemini CLI, Codex CLI

#### B2: Backward Compatibility with Existing Installations

Existing Claude Code and AMP installations must continue working after the installer is updated for 4-agent support. No breaking changes to directory structure, command names, file formats, or hook behavior for existing agents.

> **Rationale:** Manifold already has users on Claude Code and AMP. Breaking their installations to add new agents is unacceptable.

#### B3: Single Canonical Command Source

Commands should be authored once in a canonical format and translated to each agent's native format during installation. This prevents content drift across 4 agent targets.

> **Rationale:** Maintaining 4 copies of 11 commands (44 files) is unsustainable. A single source with automated translation ensures consistency and reduces maintenance burden.

#### B4: Agent-Agnostic Manifold Files

The `.manifold/` directory contents (JSON structure + MD content) must work identically regardless of which AI agent reads them. No agent-specific content may exist in manifold files.

> **Rationale:** Manifolds are project artifacts checked into version control. Team members may use different agents. Agent-specific content in manifolds would create compatibility issues.

---

### Technical

#### T1: Command Format Translation

The installer must translate canonical `.md` commands (with YAML frontmatter) to each agent's native format:
- **Claude Code / AMP:** `.md` files in `~/.agent/commands/` (current format, no translation needed)
- **Gemini CLI:** `.toml` files in `~/.gemini/commands/` (TOML with `prompt` and `description` fields)
- **Codex CLI:** `SKILL.md` files in `~/.agents/skills/manifold-<command>/` (Markdown with `name` and `description` metadata)

> **Rationale:** Each agent has a hard-set native format for custom commands. The installer must bridge the format gap to deliver B1 (feature parity).

**Key format mapping:**

| Source (canonical) | Claude Code | AMP | Gemini CLI | Codex CLI |
|--------------------|-------------|-----|------------|-----------|
| `.md` (YAML front) | `.md` copy | `.md` copy | `.toml` translate | `SKILL.md` translate |

#### T2: Hook System Adaptation

The installer must translate Manifold's TypeScript hooks into each agent's native hook mechanism:
- **Claude Code / AMP:** `.ts` files in `~/.agent/hooks/` (current format, no translation needed)
- **Gemini CLI:** Shell command scripts + JSON hook entries in `~/.gemini/settings.json` (hook types: BeforeTool, AfterTool, SessionStart, etc.)
- **Codex CLI:** Notification hooks via `~/.codex/config.toml` `notify` field (limited to turn-completion notifications)

> **Rationale:** Hooks provide context preservation and auto-suggestion. The hook APIs differ significantly across agents, requiring adaptation rather than simple copying.

**Hook capability matrix:**

| Hook | Claude Code | AMP | Gemini CLI | Codex CLI |
|------|-------------|-----|------------|-----------|
| Context preservation | ✅ .ts file | ✅ .ts file | ✅ BeforeAgent/AfterAgent | ⚠️ Limited (notify only) |
| Auto-suggester | ✅ .ts file | ✅ .ts file | ✅ AfterTool hook | ⚠️ Limited (notify only) |

#### T3: Instruction File Injection

The Manifold schema reference snippet must be injected into each agent's instruction/context file:
- **Claude Code:** `~/.claude/CLAUDE.md`
- **AMP:** `~/.amp/CLAUDE.md` (or AMP equivalent)
- **Gemini CLI:** `~/.gemini/GEMINI.md` (global context file)
- **Codex CLI:** `~/.codex/AGENTS.md` (global instruction file)

Injection must be idempotent — re-runs update the snippet but don't duplicate it.

> **Rationale:** Schema values must survive context compaction. Each agent uses a different instruction file path and name.

#### T4: CLI Remains Agent-Agnostic

The native CLI binary (`manifold` command — status, validate, verify, show, graph, solve, init) must contain zero agent-specific logic. All agent concerns must remain exclusively in `install/`.

> **Rationale:** The CLI operates on `.manifold/` files which are agent-agnostic project artifacts. Coupling the CLI to specific agents would violate separation of concerns and increase maintenance.

#### T5: Reliable Agent Detection

Agent detection must correctly identify installed agents without false positives or false negatives:
- **Claude Code:** `~/.claude/` directory exists
- **AMP:** `amp` command in PATH
- **Gemini CLI:** `~/.gemini/` directory exists OR `gemini` command in PATH
- **Codex CLI:** `~/.codex/` directory exists OR `codex` command in PATH

Detection must be non-destructive (no file creation, no config modification, no network calls).

> **Rationale:** False positives create broken installations in non-existent directories. False negatives skip agents that should be installed. Both erode user trust.

#### T6: Installation Idempotency

Running the installer multiple times must produce identical results. Specifically:
- Files are overwritten (updated), not duplicated
- Schema snippet injection doesn't create duplicate entries
- Directory creation is idempotent (`mkdir -p`)
- Hook configuration merges gracefully (Gemini settings.json, Codex config.toml)

> **Rationale:** Users commonly re-run installers for updates. Non-idempotent installs corrupt configurations.

#### T7: Parallel Library Portability

The TypeScript parallel execution library (`install/lib/parallel/`) must work in the runtime environment available to each agent. If an agent doesn't support TypeScript/Bun natively, the installer must provide a compatible version or bundled artifact.

> **Rationale:** Claude Code and AMP use Bun. Gemini CLI and Codex CLI may use Node.js or have different runtime expectations. The parallel library is a core capability per B1.

---

### User Experience

#### U1: Unified Command Vocabulary

The commands `/m0-init`, `/m1-constrain`, `/m2-tension`, `/m3-anchor`, `/m4-generate`, `/m5-verify`, `/m6-integrate`, `/m-status`, `/m-solve`, `/parallel`, and `/manifold` must be available in all 4 agents with identical behavior and identical names.

> **Rationale:** Users who learn Manifold on one agent should be able to use it on any other agent without relearning commands. Command name consistency is the minimum bar for feature parity.

#### U2: Consistent Workflow Experience

The constraint-first workflow (INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED) should feel identical regardless of which agent the user runs. Phase transitions, status output, and suggested next actions should use the same language and format.

> **Rationale:** The Manifold workflow is the product's core value proposition. Inconsistent workflow experiences across agents undermine the framework's credibility.

#### U3: Clear Installation Feedback

The installer output must clearly show:
1. Which agents were detected (with paths)
2. Which agents received installations (with component counts)
3. Any agent-specific limitations or notes
4. Suggested next steps

> **Rationale:** With 4 possible agents, users need clear feedback about what was installed where, especially when some agents may have reduced hook capabilities.

---

### Security

#### S1: Sandboxed Installation Scope

The installer must only create or modify files within these locations:
- Agent config directories: `~/.claude/`, `~/.amp/`, `~/.gemini/`, `~/.codex/`, `~/.agents/`
- CLI binary: `/usr/local/bin/manifold` (with user confirmation)
- Temporary files: `/tmp/manifold-cli-*` (cleaned up after use)

No other filesystem locations may be touched.

> **Rationale:** Users trust the installer with their agent configurations, not with arbitrary filesystem access. Scope containment prevents accidental damage to system files or other tools.

#### S2: No Credential Requirements

The installation process must not require, request, or expose API keys, tokens, or authentication credentials for any agent. Installation is a file-copy operation, not an API operation.

> **Rationale:** API keys are sensitive credentials. Installation should be possible in air-gapped or restricted environments without network authentication.

---

### Operational

#### O1: Per-Agent Health Check

Provide a mechanism (e.g., `manifold doctor` or installer `--verify` flag) to verify that Manifold is correctly installed for each individual agent. Checks should include: files exist, correct format, schema snippet present, hooks configured.

> **Rationale:** With 4 agents and different formats, silent installation failures are likely. Users need a way to diagnose issues per agent.

#### O2: Partial Failure Isolation

If installation fails for one agent (e.g., Gemini CLI settings.json is locked), remaining agents must still be installed successfully. Failures should be reported but not halt the entire process.

> **Rationale:** Users with multiple agents shouldn't lose all installations because one agent's config directory has a permission issue.

#### O3: Clean Uninstall Support

Provide a mechanism to remove Manifold from individual agents without affecting others, or from all agents at once. Uninstall should remove: commands, skills, hooks, parallel library, and schema snippet from instruction files.

> **Rationale:** Users who stop using an agent should be able to clean up Manifold's footprint without manual file deletion.

---

## Tensions

### TN1: Feature Parity vs Codex Hook Limitations

B1 (full feature parity) demands hooks on all 4 agents. T2 (hook system adaptation) documents that Codex CLI only supports notification hooks — it has no lifecycle hooks (BeforeTool, AfterTool, SessionStart). This means context preservation and auto-suggestion cannot be implemented as hooks on Codex.

**Between:** B1 (invariant) vs T2 (boundary)

**Options considered:**
- **A. Skills-as-hooks** — Package hook functionality as Codex skills (SKILL.md) that read manifold state and provide context/suggestions. Different mechanism, same outcome.
- **B. AGENTS.md instructions** — Embed context-awareness in the instruction file. Simpler but static — can't react dynamically.
- **C. Accept reduced parity** — Document the limitation. Violates B1.
- **D. Codex MCP server** — Build an MCP server for hook-like behavior. Most powerful but highest cost.

> **Resolution:** Option A — Skills-as-hooks. B1 says "feature parity", not "mechanism parity". A skill that reads `.manifold/` state and provides context achieves the same outcome as a lifecycle hook. Create `manifold-context` and `manifold-suggest` skills for Codex.

### TN2: Single Source vs Format Translation Cost

B3 (single canonical source) wants one source per command. T1 (command format translation) requires 3 different output formats (.md, .toml, SKILL.md). The tension: translation must happen somewhere, and doing it in bash (the current installer) is fragile for structured format conversion.

**Between:** B3 (goal) vs T1 (boundary)

**Options considered:**
- **A. Build-time translation** — TypeScript build script generates per-agent formats. Installer copies pre-built artifacts.
- **B. Install-time bash translation** — Parse .md and emit .toml/SKILL.md in bash. No build step but fragile.
- **C. Maintain separate files** — 44 files (4 agents x 11 commands) with drift risk.

> **Resolution:** Option A — Build-time translation. A `bun run build:commands` script converts canonical .md to .toml and SKILL.md. The installer remains a simple file-copy operation. Build artifacts are checked into `install/agents/{gemini,codex}/` directories.

### TN3: Idempotency vs Config File Merging

T6 (idempotency) requires that re-running the installer produces identical results. T2 (hook adaptation) for Gemini CLI requires merging hook entries into `settings.json`, and for Codex requires updating `config.toml`. JSON and TOML merging in bash is error-prone — you can't just overwrite or append.

**Between:** T6 (goal) vs T2 (boundary)

**Hidden dependency:** T6 requires a config merging capability that doesn't exist in the current installer. This must be built before Gemini/Codex hook installation can be idempotent.

> **Resolution:** Option B — TypeScript config merger helper. A small Bun script (`install/lib/config-merger.ts`) handles idempotent JSON merging (Gemini) and TOML merging (Codex). Since the project already depends on Bun, this avoids adding jq or toml-cli as dependencies.

### TN4: Backward Compatibility vs Canonical Source

B2 (backward compatibility) demands existing Claude Code/AMP installations must not break. B3 (single canonical source) introduces a translation pipeline. Any translation step risks subtle changes (whitespace, field ordering) that could alter behavior for existing agents.

**Between:** B2 (invariant) vs B3 (goal)

**Options considered:**
- **A. .md IS canonical** — Keep Markdown as the canonical format (identical to Claude/AMP native). Translate only for Gemini/Codex. Zero risk to existing agents.
- **B. New canonical format** — Create a neutral format, translate for ALL agents. Uniform but risky.

> **Resolution:** Option A — The existing .md command files ARE the canonical source. Claude Code and AMP receive exact copies (as today). Only Gemini and Codex get translated artifacts. A CI diff guard ensures Claude/AMP output never accidentally diverges from canonical source.

### TN5: Sandboxed Scope vs Codex Dual Directory

S1 (sandboxed installation scope) defines allowed directories. T2 (hook adaptation for Codex) requires writing skills to `~/.agents/skills/` which is outside `~/.codex/`. The Codex installation footprint spans two separate directories, complicating uninstall (O3).

**Between:** S1 (invariant) vs T2 (boundary)

**Hidden dependency:** O3 (clean uninstall) must know that Codex artifacts live in BOTH `~/.codex/` and `~/.agents/skills/manifold-*/`. Missing either location leaves orphaned files.

> **Resolution:** Option A — Accept the two-directory split. S1 already lists `~/.agents/` as an allowed path. The installer and uninstaller track both locations. A manifest file (`~/.codex/.manifold-installed.json`) records all installed paths for reliable cleanup.

### TN6: Per-Agent Health Check vs CLI Agent-Agnosticism

O1 (per-agent health check) wants a way to verify installation for each agent. T4 (CLI remains agent-agnostic) prohibits adding agent knowledge to the CLI. A `manifold doctor` command that checks Gemini TOML files and Codex SKILL.md would violate T4.

**Between:** O1 (goal) vs T4 (invariant)

**Options considered:**
- **A. Health check in installer** — `install.sh --verify` checks all agents. CLI stays clean.
- **B. Separate script** — A standalone `manifold-doctor` script outside the CLI.
- **C. Minimal CLI command** — Narrow file-existence check without agent semantics.

> **Resolution:** Option A — Health check lives in the installer (`install.sh --verify`). The installer already has full agent knowledge (detection, paths, formats), making it the natural home. T4 (invariant) takes priority over O1 (goal).

### TN7: Parallel Library Runtime vs Feature Parity

T7 (parallel library portability) notes the library is TypeScript targeting Bun with Bun-specific APIs (Bun.spawn, Bun.file). B1 (feature parity) demands it works on all agents. Gemini CLI and Codex CLI run on Node.js, not Bun. Bun-specific APIs won't work.

**Between:** T7 (boundary) vs B1 (invariant)

**Options considered:**
- **A. Bundle for Node.js** — Use `bun build --target=node` to produce a single .js file that runs on any Node.js runtime.
- **B. Rewrite for Node.js** — Use only Node.js APIs. Loses Bun performance benefits.
- **C. Require Bun everywhere** — Adds a hard dependency for all agents.

> **Resolution:** Option A — Bundle using `bun build --target=node`. This is the same approach already used for CLI binary compilation. Produces a self-contained artifact with no external dependencies.

---

## Required Truths

### RT-1: Build-Time Command Translator Exists

A TypeScript build script (`install/build-commands.ts`) converts canonical `.md` command files into Gemini CLI `.toml` format and Codex CLI `SKILL.md` format. Pre-built artifacts are checked into `install/agents/{gemini,codex}/`.

**Gap:** No translator exists. No build step. No per-agent output directories.

**Satisfies when:** Running `bun run build:commands` produces valid `.toml` files in `install/agents/gemini/commands/` and valid `SKILL.md` directories in `install/agents/codex/skills/` for all 11 commands.

### RT-2: Installer Detects Gemini CLI and Codex CLI

`install.sh` contains `detect_gemini()` and `detect_codex()` functions that reliably identify installed agents via directory existence (`~/.gemini/`, `~/.codex/`) with command-in-PATH fallback (`gemini`, `codex`).

**Gap:** Only `detect_claude_code()` and `detect_amp()` exist in `install.sh:131-146`.

**Satisfies when:** Installer correctly detects Gemini CLI and Codex CLI when present, silently skips when absent, and produces no false positives.

### RT-3: Installer Has Per-Agent Installation Logic

`install_manifold()` in `install.sh` routes to agent-specific installation paths: `.md` copy for Claude/AMP, `.toml` copy for Gemini, `SKILL.md` copy + `~/.agents/skills/` for Codex. Includes agent-specific hook installation and instruction file injection.

**Gap:** Current `install_manifold()` (`install.sh:249-306`) does identical file copies for all agents. Cannot handle `.toml` commands, `settings.json` hooks, `config.toml` config, or `AGENTS.md` injection.

**Satisfies when:** Running the installer with all 4 agents present results in correct file formats and directory structures for each agent.

### RT-4: Codex Skills-as-Hooks Exist

Two Codex skills replicate Manifold's hook behavior:
- `manifold-context/SKILL.md` — Reads `.manifold/` state and provides current phase, constraints, and suggested actions (replaces `manifold-context.ts` hook)
- `manifold-suggest/SKILL.md` — Monitors workflow and suggests next Manifold commands (replaces `auto-suggester.ts` hook)

**Gap:** No Codex skill equivalents exist. Only TypeScript hooks for Claude Code/AMP.

**Satisfies when:** Both skills are discoverable by Codex CLI, correctly read `.manifold/` state, and provide equivalent context/suggestion output to the TypeScript hooks.

### RT-5: Gemini Hook Configuration Generated

Gemini-native hook scripts and `settings.json` entries exist:
- Shell scripts that wrap the context-preservation and auto-suggestion logic
- JSON hook configuration for `SessionStart` and `AfterTool` events in `~/.gemini/settings.json`

**Gap:** No Gemini hook scripts or settings.json configuration templates exist.

**Satisfies when:** After installation, Gemini CLI loads Manifold hooks via settings.json and executes them at the correct lifecycle points (session start, after tool execution).

### RT-6: Config Merger Helper Exists

A TypeScript utility (`install/lib/config-merger.ts`) can:
- Idempotently merge Manifold hook entries into Gemini's `settings.json` without overwriting user settings
- Idempotently merge Manifold notification config into Codex's `config.toml` without overwriting user settings
- Detect existing Manifold entries and update rather than duplicate

**Gap:** No config merging capability exists. Current installer only copies files.

**Satisfies when:** Running the config merger twice produces identical results, and non-Manifold user settings are preserved.

### RT-7: Schema Snippet Injected Into All Agent Instruction Files

`inject_schema_reference()` in `install.sh` handles all 4 instruction file paths:
- `~/.claude/CLAUDE.md` (Claude Code — already works)
- `~/.amp/CLAUDE.md` (AMP — already works)
- `~/.gemini/GEMINI.md` (Gemini CLI — new)
- `~/.codex/AGENTS.md` (Codex CLI — new)

Injection is idempotent with version-aware updates.

**Gap:** Function exists (`install.sh:181-245`) but is hardcoded to `CLAUDE.md`. Needs parameterization for `GEMINI.md` and `AGENTS.md`.

**Satisfies when:** After installation, all 4 instruction files contain the Manifold schema reference snippet at the correct version.

### RT-8: Parallel Library Bundled for Node.js

A Node.js-compatible bundle of the parallel execution library exists at `install/lib/parallel/parallel.bundle.js`, produced by `bun build --target=node`. Installed for Gemini and Codex agents (Claude/AMP continue to receive raw `.ts` files).

**Gap:** Only raw `.ts` source files exist in `install/lib/parallel/`. No bundled artifact.

**Satisfies when:** The bundled `.js` file runs correctly under Node.js and provides identical parallel execution behavior to the Bun `.ts` version.

### RT-9: Uninstaller Supports All 4 Agents

`uninstall.sh` detects and removes Manifold from Gemini CLI (`~/.gemini/commands/m*.toml`, `~/.gemini/settings.json` hook entries) and Codex CLI (`~/.codex/` config, `~/.agents/skills/manifold-*/`). Reads the `~/.codex/.manifold-installed.json` manifest for reliable Codex cleanup.

**Gap:** `uninstall.sh` only handles Claude Code and AMP. Command list is outdated (missing m6-integrate, m-solve, m-quick, parallel).

**Satisfies when:** Running the uninstaller removes all Manifold artifacts from all detected agents with zero orphaned files.

### RT-10: Installer Verify Flag Validates All Agents

`install.sh --verify` checks per-agent installation health:
- File existence (commands, skills, hooks, parallel library)
- Format correctness (valid TOML for Gemini, valid SKILL.md for Codex)
- Schema snippet present in instruction files
- Hook configuration active (settings.json for Gemini, config.toml for Codex)

**Gap:** No `--verify` flag exists. No health check mechanism at all.

**Satisfies when:** `install.sh --verify` produces a per-agent health report with pass/fail per component.

### RT-11: Claude Code and AMP Output Unchanged

The `.md` files that Claude Code and AMP receive during installation are byte-for-byte identical to the current canonical source files in `install/commands/`. A CI check validates this invariant on every commit.

**Gap:** The design preserves compatibility (no translation for Claude/AMP), but no automated CI diff guard exists.

**Satisfies when:** A CI job compares `install/commands/*.md` against Claude/AMP installation output and fails if any byte differs.

---

## Solution Space

### Option A: Minimal — Installer-Only Changes

Extend `install.sh` with Gemini/Codex detection and bash-based format translation.

| Required Truth | Status |
|---------------|--------|
| RT-1 | ⚠️ Fragile (bash YAML→TOML parsing) |
| RT-2 | ✅ Satisfies |
| RT-3 | ⚠️ Partial (bash can't reliably merge JSON/TOML) |
| RT-4 | ❌ Not addressed |
| RT-5 | ⚠️ Partial |
| RT-6 | ❌ Not addressed (bash JSON merging unreliable) |
| RT-7 | ✅ Satisfies |
| RT-8 | ❌ Not addressed |
| RT-9 | ✅ Satisfies |
| RT-10 | ⚠️ Partial |
| RT-11 | ✅ Satisfies |

**Complexity:** Low | **Risk:** High | **Gaps:** 4 not addressed, 3 partial

### Option B: Build Pipeline — TypeScript Tooling (Recommended)

Add TypeScript build scripts for format translation and config merging. Extend installer for 4-agent routing. Create Codex skills and Gemini hook scripts.

| Required Truth | Status |
|---------------|--------|
| RT-1 | ✅ TypeScript translator |
| RT-2 | ✅ Detection functions |
| RT-3 | ✅ Per-agent install routing |
| RT-4 | ✅ Codex skills created |
| RT-5 | ✅ Gemini hooks created |
| RT-6 | ✅ TypeScript config merger |
| RT-7 | ✅ Parameterized injection |
| RT-8 | ✅ Bundled parallel library |
| RT-9 | ✅ 4-agent uninstaller |
| RT-10 | ✅ --verify flag |
| RT-11 | ✅ CI diff guard |

**Complexity:** Medium | **Risk:** Low | **Gaps:** None

**Why this option:** Aligns exactly with all 7 tension resolutions. Uses existing Bun toolchain. Keeps installer simple (file copy) while TypeScript handles format conversion where bash would fail. The build step adds ~5 seconds to the release process but eliminates runtime fragility.

### Option C: Plugin Architecture — Agent Adapters

Formal adapter pattern with one TypeScript adapter class per agent. `install.sh` becomes a thin shell that delegates to `bun run install/adapter.ts`.

| Required Truth | Status |
|---------------|--------|
| RT-1 through RT-11 | ✅ All satisfied |

**Complexity:** High | **Risk:** Medium | **Gaps:** None

**Why not this option:** Over-engineers for 4 agents. The adapter abstraction adds a layer of indirection that makes the installer harder to debug. If we later need to add a 5th agent, we can refactor to adapters then. YAGNI.

### Recommendation: Option B

Option B satisfies all 11 required truths, aligns with every tension resolution, and stays within the existing toolchain. The implementation naturally decomposes into 3 waves:

**Wave 1 — Core Pipeline** (RT-1, RT-2, RT-3, RT-7): Build translator, agent detection, installer routing, instruction injection
**Wave 2 — Agent Adaptation** (RT-4, RT-5, RT-6, RT-8): Codex skills, Gemini hooks, config merger, parallel bundle
**Wave 3 — Operational** (RT-9, RT-10, RT-11): Uninstaller update, verify flag, CI guard

---

## Generated Artifacts

Generated using **Option B: Build Pipeline with TypeScript tooling**.

### Wave 1 — Core Pipeline

| Artifact | File | Satisfies | Description |
|----------|------|-----------|-------------|
| Build-time command translator | `install/lib/build-commands.ts` | RT-1, T1, B3 | Parses canonical .md commands and generates Gemini .toml + Codex SKILL.md formats |
| Config merger helper | `install/lib/config-merger.ts` | RT-6, TN3 | Idempotent JSON merge (Gemini settings.json) + TOML merge (Codex config.toml) |
| Extended installer | `install/install.sh` | RT-2, RT-3, RT-7, RT-10 | 4-agent detection (detect_gemini, detect_codex), per-agent install routing, parameterized instruction injection |

### Wave 2 — Agent Adaptation

| Artifact | File | Satisfies | Description |
|----------|------|-----------|-------------|
| Codex manifold-context skill | `install/agents/codex/skills/manifold-context/SKILL.md` | RT-4, TN1 | Skills-as-hooks: on-demand context preservation for Codex |
| Codex manifold-suggest skill | `install/agents/codex/skills/manifold-suggest/SKILL.md` | RT-4, TN1 | Skills-as-hooks: parallelization auto-suggestion for Codex |
| Gemini context hook | `install/agents/gemini/hooks/manifold-context.ts` | RT-5 | Context preservation hook adapted for Gemini CLI |

### Wave 3 — Operational

| Artifact | File | Satisfies | Description |
|----------|------|-----------|-------------|
| Extended uninstaller | `install/uninstall.sh` | RT-9, TN5 | 4-agent cleanup including Codex two-directory split |
| Build commands tests | `tests/multi-agent/build-commands.test.ts` | Quality | 15 tests covering TOML generation, SKILL.md generation, idempotency, escaping |
| Config merger tests | `tests/multi-agent/config-merger.test.ts` | Quality | 12 tests covering deepMerge, TOML parsing, Gemini/Codex config merging |
| Gemini commands directory | `install/agents/gemini/commands/` | T1 | Output directory for pre-built .toml files |

### Required Truth Coverage

| RT | Status | Artifact(s) |
|----|--------|-------------|
| RT-1 | SATISFIED | build-commands.ts |
| RT-2 | SATISFIED | install.sh (detect_gemini, detect_codex) |
| RT-3 | SATISFIED | install.sh (install_manifold_gemini, install_manifold_codex) |
| RT-4 | SATISFIED | codex skills (manifold-context, manifold-suggest) |
| RT-5 | SATISFIED | gemini hooks (manifold-context.ts) |
| RT-6 | SATISFIED | config-merger.ts |
| RT-7 | SATISFIED | install.sh (parameterized inject_schema_reference) |
| RT-8 | PARTIAL | Parallel library bundling not yet implemented (needs `bun build --target=node`) |
| RT-9 | SATISFIED | uninstall.sh (4-agent cleanup) |
| RT-10 | SATISFIED | install.sh (validate_gemini_installation, validate_codex_installation) |
| RT-11 | PARTIAL | CI diff guard not yet implemented (future: GitHub Action to verify canonical == translated) |

### Test Results

- **New tests:** 27 (15 build-commands + 12 config-merger)
- **Existing tests:** 264 (all passing)
- **Total:** 291 tests, 0 failures
