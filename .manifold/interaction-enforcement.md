# interaction-enforcement

## Outcome

Enforce AskUserQuestion tool use for all user input and auto-suggest next steps for tab completion after each phase across all agents and platforms

---

## Constraints

### Business

#### B1: Single Canonical Source for Interaction Rules

All interaction enforcement rules (AskUserQuestion, next-step suggestions) must be authored once in `install/commands/*.md` and auto-propagated to all agents via build scripts.

> **Rationale:** Manifold's distribution model requires `install/` as the single source of truth. Duplicating rules per-agent creates drift. The existing `build-commands.ts` already translates to Gemini TOML and Codex SKILL.md — interaction rules must flow through this same pipeline.

#### B2: All Four Agents Supported

Interaction enforcement must work across Claude Code (plugin hooks + skills), Gemini CLI (TOML commands), Codex CLI (SKILL.md), and AMP Code (native .md commands).

> **Rationale:** Manifold is agent-agnostic. Users shouldn't get different interaction quality depending on which agent they use. AMP shares Claude Code's native `.md` format, so it gets enforcement for free from `install/commands/`.

#### B3: No External Plugin Dependencies

The implementation must be entirely self-contained within Manifold's `install/` directory. No reliance on hookify, SuperClaude, or any other plugin.

> **Rationale:** Manifold is distributed as a standalone plugin. External dependencies would break installs where those plugins aren't present.

### Technical

#### T1: Cross-Platform Hook Execution

All hooks must run on macOS, Linux, and Windows. No bash-only scripts for new hooks.

> **Rationale:** Bun is Manifold's required runtime and runs on all three platforms. Existing `session-start.sh` is bash-only (pre-existing), but new hooks must use Bun/TypeScript for portability.

#### T2: Hooks Must Not Block Responses

Enforcement mode is advisory-only. Hooks inject reminders via `additionalContext` (UserPromptSubmit) but never return `{"decision": "block"}` from Stop hooks.

> **Rationale:** User explicitly chose advisory enforcement. Blocking creates friction and risks infinite loops via `stop_hook_active`. Advisory nudges improve behavior without disrupting workflow.

#### T3: Hook Execution Under 200ms

All hooks must complete within 200ms to avoid perceptible latency on each prompt submission.

> **Rationale:** `UserPromptSubmit` fires on every user message. Slow hooks degrade the interactive experience. The prompt-enforcer hook is a static JSON output — should be <10ms.

#### T4: Build Pipeline Propagation

Interaction rules added to `install/commands/*.md` must automatically appear in Gemini TOML (`install/agents/gemini/commands/`) and Codex SKILL.md (`install/agents/codex/skills/`) via `bun run build:commands`.

> **Rationale:** The existing `build-commands.ts` script translates canonical `.md` to agent-specific formats. New interaction rules in skill files will automatically propagate without additional build steps.

#### T5: Hook Input/Output Contract Compliance

Hooks must conform to Claude Code's hook JSON contract: read from stdin, write to stdout, use correct `hookSpecificOutput` structure per event type.

> **Rationale:** Non-compliant hooks silently fail. The `UserPromptSubmit` hook must output `{"additionalContext": "..."}`. The Stop hook (if added later) must output `{"decision": "..."}`.

### User Experience

#### U1: Every Phase Completion Must Suggest Next Command

After any Manifold phase completes (m0 through m5), the response MUST include a concrete next command in the format `/manifold:mN-xxx <feature>`.

> **Rationale:** This is the core behavior being enforced. Users need clear, copy-pasteable next steps. Tab completion in Claude Code surfaces these as input suggestions.

#### U2: AskUserQuestion for All Interactive Moments

When the model needs user input during any Manifold command, it should use the `AskUserQuestion` tool (or agent-equivalent structured input) rather than plain-text questions.

> **Rationale:** `AskUserQuestion` provides a structured UI with selectable options, reducing ambiguity and cognitive load. Plain-text questions are harder to parse and respond to.

#### U3: No False Positive Enforcement

The enforcement mechanism must not trigger on rhetorical questions in prose, questions inside code blocks, or questions in examples/documentation sections.

> **Rationale:** Over-aggressive enforcement that flags documentation examples or rhetorical prose would create noise and erode trust in the system.

#### U4: Agent-Appropriate Interaction Patterns

Each agent should use its native structured input mechanism: `AskUserQuestion` for Claude Code/AMP, equivalent prompting patterns for Gemini/Codex.

> **Rationale:** Gemini and Codex don't have `AskUserQuestion`. Their skill/command files should instruct use of their native structured interaction patterns (e.g., numbered options in response text).

### Security

#### S1: Hooks Must Not Leak Conversation Content

Hooks must not log, store, or transmit conversation content. They read stdin for hook metadata only and output context injection — no persistence.

> **Rationale:** Hook scripts have access to `last_assistant_message` and `prompt` fields. Storing or logging these would violate user privacy expectations.

#### S2: No Arbitrary Code Execution in Hooks

Hook scripts must not use `eval()`, `exec()`, or dynamic imports from user-controlled paths.

> **Rationale:** Hooks run automatically on every prompt. Any code injection vector would be exploitable on every interaction.

### Operational

#### O1: Sync Validation in CI

The diff-guard CI workflow must verify that interaction rules in `install/commands/` are properly synced to `plugin/commands/` and agent-specific formats.

> **Rationale:** Existing `.github/workflows/manifold-diff-guard.yml` already validates plugin sync. Interaction rules must be covered by this same validation.

#### O2: Hook Timeout Configuration

All hooks must specify explicit timeouts in `hooks.json`. UserPromptSubmit hooks: 5s max. Stop hooks (future): 10s max.

> **Rationale:** Hung hooks block the entire Claude Code session. Explicit timeouts ensure graceful degradation.

#### O3: Degradation Without CLI

If the `manifold` CLI is not installed, hooks and skill instructions must still function. The CLI is only needed for `manifold validate`.

> **Rationale:** The interaction enforcement is purely instruction/hook-based and doesn't depend on the native CLI binary. Users who haven't run `/manifold:setup` should still get enforcement.

---

## Tensions

### TN1: Advisory-Only vs Must-Suggest Next Command

T2 (advisory-only, no blocking) conflicts with U1 (every phase MUST suggest next command). Without blocking, there's no enforcement if the model ignores the advisory nudge.

> **Resolution:** Strengthen instructions only — no Stop hook. Invest in making skill file instructions impossible to miss: bold, repeated, positioned at both top and bottom of each command file. The UserPromptSubmit hook reinforces via `additionalContext` on every prompt. Accept that compliance is best-effort but highly likely with strong instructions.

### TN2: Single Source vs Agent-Specific Interaction Patterns

B1 (single canonical source) conflicts with U4 (agent-appropriate patterns). Each agent has different structured input mechanisms, but rules should be authored once.

> **Resolution:** Shared + override pattern. The canonical `install/commands/*.md` files contain shared interaction rules. Each agent directory has an interaction-override file that the build script merges in during `build:commands`. This keeps B1 satisfied (single authoring point) while allowing U4 (per-agent customization).

### TN3: Hook Speed vs False Positive Avoidance

T3 (hook < 200ms) conflicts with U3 (no false positives). More sophisticated detection logic to avoid false positives requires more processing time. Simple static output is fast but can't be context-aware.

> **Resolution:** Light detection — check for `.manifold/` directory existence before injecting the reminder. Only inject context when the project uses Manifold. Adds ~20ms for a filesystem check, well within the 200ms budget. No complex parsing needed.

### TN4: Hooks Are Not Universal Across Agents

B2 (all four agents) has a hidden dependency on T1 (cross-platform hooks). Claude Code, Gemini CLI, and AMP Code all support hooks in their own way. Codex CLI does not support hooks.

> **Resolution:** Implement hooks for Claude Code, Gemini, and AMP (each using their native hook mechanism). Codex gets instruction-only enforcement via SKILL.md files. This is acceptable because hooks are advisory — the instruction layer is the primary enforcement mechanism across all agents.

---

## Required Truths

### RT-1: Skill Files Contain Next-Step Templates

Every `install/commands/m*.md` file must contain a standardized "Interaction Rules" section that instructs the model to include the concrete next `/manifold:mN-xxx <feature>` command after phase completion.

**Gap:** Current skill files mention "Next:" in examples but don't have a mandatory, standardized section enforcing it.

### RT-2: Build Pipeline Propagates Interaction Rules

The `build:commands` script (`scripts/build-commands.ts`) must carry the interaction rules section from canonical `.md` files into Gemini TOML and Codex SKILL.md without loss.

**Gap:** Already works — `build-commands.ts` copies the full prompt content. No changes needed. **Status: SATISFIED.**

### RT-3: Skill Files Instruct Structured Input Usage

Every `install/commands/m*.md` file must instruct the model to use `AskUserQuestion` (or agent-equivalent) for all interactive moments rather than plain-text questions.

**Gap:** Current skill files have interview questions listed but don't explicitly instruct use of `AskUserQuestion`.

### RT-4: Agent-Specific Interaction Overrides Exist

Each agent directory must have an interaction override that translates "use AskUserQuestion" into agent-appropriate instructions (e.g., "present numbered options" for Gemini/Codex).

**Gap:** No interaction override files exist yet. Need to create per-agent override patterns.

### RT-5: UserPromptSubmit Hook Injects Advisory Reminders

A `UserPromptSubmit` hook must exist that outputs `additionalContext` reminding the model about interaction rules on every prompt.

**Gap:** No UserPromptSubmit hook exists. Need to create `install/hooks/prompt-enforcer.ts` and register in `hooks.json`.

### RT-6: Hook Only Fires in Manifold Projects

The UserPromptSubmit hook must check for `.manifold/` directory existence before injecting context, to avoid noise in non-Manifold projects.

**Gap:** Hook doesn't exist yet. The `.manifold/` check must be built into the hook.

### RT-7: Hooks for Gemini and AMP

Gemini CLI and AMP Code must receive equivalent advisory hooks via their own hook mechanisms. Codex gets instruction-only enforcement.

**Gap:** Gemini has a hooks directory (`install/agents/gemini/hooks/`) but no prompt-enforcer hook. AMP shares Claude Code's `install_manifold_native()` and gets hooks from `install/hooks/` directly.

### RT-8: Build Pipeline Already Handles Agent Translation

The existing `build:commands` script copies full prompt content to all agent formats. No changes needed to the build pipeline itself.

**Status: SATISFIED** — Verified that `build-commands.ts` translates full `.md` content to TOML and SKILL.md.

---

## Solution Space

### Option A: Instruction-First with Advisory Hooks (Recommended)

Primary enforcement via strengthened skill file instructions. Secondary reinforcement via lightweight advisory `UserPromptSubmit` hooks for Claude Code, Gemini, and AMP.

- **Satisfies:** RT-1, RT-2, RT-3, RT-4, RT-5, RT-6, RT-7, RT-8
- **Gaps:** None (with implementation)
- **Complexity:** Medium
- **Artifacts:**
  - Update 10 skill files in `install/commands/` with interaction rules section
  - Create `install/hooks/prompt-enforcer.ts` (UserPromptSubmit hook)
  - Create `install/agents/gemini/hooks/prompt-enforcer.ts` (Gemini variant)
  - Create agent interaction overrides in `install/agents/*/interaction-rules.md`
  - Update `hooks.json` for Claude Code/AMP
  - Update `install.sh` to install new hook
  - Run `build:commands` + `sync:plugin` to propagate
