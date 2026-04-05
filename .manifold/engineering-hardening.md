# engineering-hardening

## Outcome

Raise Manifold CLI engineering maturity from 3.1/5 to 3.8/5 by implementing the 7 prioritized improvements from the Engineering Commandments assessment (claudedocs/commandments-report.md). Covers: structured logging (observability L2->L3), test coverage reporting (testing L3->L4), custom error hierarchy (failure design L2->L3), large file splitting (simplicity L3->L4), dependency vulnerability scanning (security L4->L5), command execution metrics (observability L2->L3), and solver caching documentation (documentation L4->L5).

---

## Constraints

### Business

#### B1: No Breaking Changes to CLI Interface

All existing CLI commands, flags, exit codes, and output formats must continue to work identically after hardening changes. Users who depend on `manifold validate`, `manifold status`, etc. must not need to change their scripts or workflows.

> **Rationale:** Manifold has 29 active manifolds and CI integrations (manifold-verify.yml, pre-commit hooks) that depend on current CLI behavior. Breaking changes would undermine the purpose of the hardening effort.

#### B2: All 539 Existing Tests Must Continue to Pass

The existing test suite of 539 tests across 22 files must remain green throughout all changes. Test-to-source ratio must not decrease.

> **Rationale:** The commandments report identified testing as Level 3. Regressing the test suite during a hardening effort would be self-defeating. The < 0.5% failure rate threshold means no more than 2 flaky tests per release.

#### B3: At Most One New Runtime Dependency for Core CLI

The CLI package (`cli/package.json`) may add at most one new runtime dependency (pino for structured logging, per TN1 resolution). All other functionality must use Bun built-ins or the existing dependency set (commander, yaml, beautiful-mermaid). Root-level dev dependencies are acceptable.

> **Rationale:** Originally zero new deps, relaxed via TN1 resolution to allow pino (~30KB). The trade-off: +1 dep for battle-tested structured logging vs. building a custom logger from scratch.

#### B4: CI Pipeline Time Must Not Exceed 3 Minutes

Total CI time (tests + coverage + verification) must remain under 3 minutes. Adding coverage reporting and Dependabot must not push the pipeline past this budget or incur costs beyond the GitHub Actions free tier.

> **Rationale:** (Pre-mortem, relaxed via TN5) Originally 2 minutes, relaxed to 3 minutes to accommodate coverage reporting. The current CI completes in ~30s; a 10x multiplier still leaves generous headroom.

### Technical

#### T1: Structured Logger Must Support Three Output Modes

The logger must support: (1) human-readable colorized output (default TTY), (2) quiet mode (errors only), (3) JSON structured output (machine-readable). Controlled via `--verbose`, `--quiet`, and `--json` flags on the root command.

> **Rationale:** Commandment #4 (Observability) requires structured logging with levels. The three modes serve three audiences: developers (TTY), CI pipelines (quiet), and monitoring tools (JSON).

#### T2: Test Coverage Reported and Enforced in CI

CI must run `bun test --coverage` and report line coverage percentage. Coverage threshold of 70% must be enforced — CI fails if coverage drops below.

> **Rationale:** Commandment #3 (Test Early and Often) Level 4 requires "test coverage metrics drive improvements." Currently no coverage measurement exists. 70% is a pragmatic starting threshold given the 22 existing test files.

#### T3: No Source File Exceeds 500 Lines After Splitting

After refactoring, no TypeScript source file in `cli/lib/` or `cli/commands/` should exceed 500 lines. The three current offenders are: `solver.ts` (1,870), `schema.ts` (1,218), `validate.ts` (1,041).

> **Rationale:** Commandment #2 (Keep It Simple) Level 4 requires complexity budgets. 500 lines is a pragmatic ceiling that forces single-responsibility modules without over-fragmenting.

#### T4: Custom Error Classes Must Preserve Context Chain

Every custom error class must carry: error code (string, e.g. `E_PARSE`), original cause (via `Error.cause`), file path where applicable, and operation name. Stack traces must be preserved through the chain.

> **Rationale:** Commandment #1 (Design for Failure) Level 3 requires "consistent error handling strategy." The current codebase uses 90 try/catch blocks but no custom error classes, making error categorization ad-hoc.

#### T5: Command Timing Overhead Below 1ms

The performance instrumentation added for command execution metrics must add less than 1ms of overhead to any CLI command. Timing should use `performance.now()` and be essentially free.

> **Rationale:** The CLI targets <100ms total response time. Instrumentation that costs >1% of the budget would violate the performance target from the manifold-cli manifold.

#### T6: Split Files Must Re-export All Public Symbols

When `solver.ts`, `schema.ts`, or `validate.ts` are split into submodules, the original module path must re-export all public symbols. No import path in the codebase or tests should need to change. Barrel files (index.ts) must maintain the same public API surface.

> **Rationale:** (Pre-mortem) Splitting solver.ts was the #1 predictable failure. The parallel execution system, plugin sync, and 14 test files import from these modules. Changing import paths would cascade across the codebase and break the plugin sync pipeline.

#### T7: Coverage Tool Must Be Validated Before Enforcement

Before enforcing the 70% coverage threshold in CI, the coverage tool (`bun test --coverage`) must be validated against a known-coverage test file. If Bun's coverage is unreliable (e.g., wrong line counts, missing branch coverage), fall back to warning-only mode rather than blocking PRs.

> **Rationale:** (Pre-mortem) Bun's coverage feature was flagged as a surprise failure risk. Bun is evolving rapidly; the coverage flag may have bugs. Enforcing a broken metric is worse than not measuring at all.

#### T8: Hooks Must Use Compiled Binary, Not TypeScript Runtime

All Claude Code hooks (PostToolUse, PreCompact, UserPromptSubmit) must execute via `manifold hook <name>` subcommands in the compiled CLI binary. No hook may depend on Bun, Node, or any other runtime being installed on the user's machine. The SessionStart hook bootstraps the binary; all other hooks depend on it.

> **Rationale:** Users installing the plugin from Claude Code marketplace don't have Bun. The TS hooks (`bun run hooks/manifold-schema-guard.ts`) fail silently or error on every tool call, causing the PostToolUse webhook errors reported by users.

#### T9: Windows Binary Must Be Compiled and Distributed

The release workflow must compile a `manifold-windows-x64.exe` binary and attach it to GitHub releases. PowerShell equivalents of `install-cli.sh` and `session-start.sh` must be provided. The install script must add the binary to the user's PATH.

> **Rationale:** Windows users currently cannot use Manifold at all. The bash-only install scripts and Unix-only binaries exclude the Windows ecosystem. Claude Code supports Windows, so the plugin must too.

### User Experience

#### U1: Default Output Identical Without New Flags

When no new flags (`--verbose`, `--quiet`, `--json`, `--debug`) are passed, CLI output must be byte-identical to current behavior. Users who never opt in to new features see no change.

> **Rationale:** Principle of least surprise. The 29 existing manifolds and CI integrations rely on current output parsing. Any change to default output is a breaking change per B1.

#### U2: Error Messages Include Actionable Fix Guidance

Custom error classes must produce user-facing messages that include: what went wrong, which file/constraint caused it, and a suggested fix command. Example: "Schema validation failed for B1 in .manifold/auth.json — run `manifold validate auth` for details."

> **Rationale:** Commandment #1 Level 3 requires "comprehensive logging of errors with contextual information." The current error output often shows raw exception text without guidance.

#### U3: Debug Flag Reveals Full Diagnostics

A `--debug` flag on the root command must show: full stack traces, timing data for each phase, and solver cache hit/miss statistics. This output is suppressed by default.

> **Rationale:** Currently there is no way to diagnose slow commands or cache misses without reading source code. The debug flag gives power users and contributors a diagnostic escape hatch.

### Security

#### S1: Dependabot Enabled and Blocks on Critical CVEs

GitHub Dependabot must be configured for the repository. PRs with dependencies that have known critical (CVSS >= 9.0) vulnerabilities must be blocked by CI.

> **Rationale:** Commandment #7 (Secure by Design) Level 5 requires continuous security monitoring. The report identified missing dependency vulnerability scanning as the primary security gap.

#### S2: No Secrets or PII in Log Output

Structured logging must never emit file contents, user-provided constraint text, or environment variable values. Only metadata (file paths, timing, counts, IDs) may appear in logs.

> **Rationale:** The existing security pipeline (Gitleaks, Semgrep) scans source code, but log output could leak sensitive constraint content at runtime. Defense-in-depth requires output sanitization.

### Operational

#### O1: CI Pipeline Reports Coverage in PR Comments

Test coverage percentage must appear in GitHub Actions summary for every PR. Coverage delta (vs. main) should be visible so reviewers can spot regressions.

> **Rationale:** Commandment #3 Level 4 requires "test coverage metrics drive improvements." Without visibility in PRs, coverage enforcement is invisible to reviewers.

#### O2: Solver Architecture Documented for Contributors

A `docs/architecture/solver.md` document must explain: the constraint graph data model, the caching strategy (hash-based invalidation), cache lifetime (session-scoped), and the relationship between `solver.ts`, `mermaid.ts`, and the graph export pipeline.

> **Rationale:** Commandment #5 (Document Thy Intent) Level 5 requires knowledge management integrated into workflow. The solver is the most complex component (1,870 lines) with undocumented caching behavior.

#### O3: Logging Respects NO_COLOR and Existing Color Flags

All new logging output must respect the existing `--no-color` and `--force-color` CLI flags and the `NO_COLOR` environment variable convention already used in `cli/lib/output.ts`.

> **Rationale:** The existing color system is already wired up. New logging must integrate with it rather than creating a parallel color control path.

#### O4: Plugin Sync Pipeline Updated for File Renames

Any file renames or splits in `cli/lib/` or `install/hooks/` must be reflected in `scripts/sync-plugin.ts` and the diff-guard workflow. The sync script must be updated and verified before merging refactoring PRs.

> **Rationale:** (Pre-mortem) Split files breaking plugin sync was flagged as a surprise failure. The sync script explicitly names files to copy; renamed files would silently disappear from the plugin distribution.

#### O5: Dependabot Configured With Auto-merge Limits

Dependabot must be configured with: grouped updates for minor/patch versions, weekly schedule (not daily), and auto-merge disabled for major version bumps. Maximum open Dependabot PRs limited to 5 to prevent noise.

> **Rationale:** (Pre-mortem) Dependabot flooding with noise was flagged as a surprise failure. The Bun ecosystem has frequent transitive dependency updates; unthrottled Dependabot would overwhelm the maintainer.

#### O6: Plugin Update Must Ensure CLI Version Equivalence

When the plugin version is newer than the installed CLI binary, the SessionStart hook must automatically download and install the matching CLI version. Version comparison must work on all platforms (bash on Unix, PowerShell on Windows). A version mismatch between plugin and CLI must never persist past the first session start.

> **Rationale:** Users update plugins automatically via Claude Code marketplace. If the CLI binary lags behind, hooks that depend on new CLI features will break. The session-start scripts already implement auto-update logic -- this constraint ensures it works cross-platform and is reliable.

---

## Tensions

### TN1: Zero Dependencies vs Structured Logging

B3 (zero new runtime deps) conflicts with T1 (structured logger with 3 output modes). Building a production-quality JSON logger with levels, child contexts, and TTY detection from scratch is significant effort.

> **Resolution:** (Option B) Allow one logging dependency — add pino (~30KB). Pino is the smallest structured logger with native JSON output, log levels, and Bun compatibility. B3 relaxed from "zero new deps" to "one logging dep accepted" as an explicit boundary rather than a goal. Trade-off: +30KB binary size for significant development time savings and battle-tested logging.

### TN2: Coverage Enforcement vs Tool Reliability

T2 (enforce 70% coverage threshold in CI) directly conflicts with T7 (validate coverage tool before enforcement). If `bun test --coverage` has bugs, enforcing a broken metric blocks legitimate PRs.

> **Resolution:** (Option A — warning-first) Ship coverage as warning-only in CI initially. Add a validation test (`tests/coverage-validation.test.ts`) that exercises a known-coverage file and checks bun's reported numbers match expected. Only flip to enforcing (CI fails below threshold) after the validation test confirms accuracy. T7 gates T2 — enforcement is blocked until tool is validated.

### TN3: Debug Diagnostics vs Log Sanitization

S2 (no secrets/PII in log output) conflicts with U3 (debug flag reveals full diagnostics). Debug mode wants maximum visibility; security requires content filtering.

> **Resolution:** (Option A — metadata only) Even in `--debug` mode, only emit metadata: file paths, timing data, constraint IDs, cache hit/miss rates, line counts, phase transitions. Never emit constraint statement text, user-provided descriptions, or environment variable values. The line is drawn at structural metadata (safe) vs. user-authored content (sensitive).

### TN4: Hook Binary Dependency vs First-Run Bootstrap

T8 (hooks use compiled binary) conflicts with O6 (version equivalence on first run). On first session after plugin install, the binary doesn't exist yet. All hooks that call `manifold hook <name>` would fail.

> **Resolution:** (Option A — graceful degradation) Hooks exit 0 silently when `manifold` is not on PATH — no error, no noise. SessionStart (bash/PowerShell script) bootstraps the binary install. Once installed, all subsequent hooks work. Users see "CLI NOT INSTALLED — run /manifold:setup" in session context until binary is present. Never block the user during the bootstrap gap.

### TN5: CI Time Budget vs Coverage Reporting

B4 (CI < 2min) conflicts with T2 (coverage in CI) and O1 (coverage in PR comments). Coverage instrumentation adds significant time to the test run.

> **Resolution:** (Option C — accept 3min) Relax B4 ceiling from 2 minutes to 3 minutes. Current CI completes in ~30s. Even with coverage instrumentation + summary generation, 3 minutes provides generous headroom without impacting developer experience. The 10x multiplier from 30s baseline is acceptable for the observability gain.

### TN6: File Splitting Depends on Sync Pipeline

T3 (split files to <500 lines) has a hidden dependency on O4 (sync pipeline updated for renames). The `scripts/sync-plugin.ts` explicitly names files to copy. Splitting `solver.ts` into submodules without updating sync would silently drop files from the plugin distribution.

> **Resolution:** T3 and O4 must be satisfied in the same PR. The sync script update is a prerequisite for, not a consequence of, the file split. diff-guard CI catches any drift.

### TN7: Hook Binary Pattern Depends on Windows Binary

T8 (hooks use compiled binary) has a hidden dependency on T9 (Windows binary compiled and distributed). Without a Windows binary, the hook pattern works on macOS/Linux but fails on Windows — defeating the cross-platform purpose.

> **Resolution:** T9 (Windows compile target) must be merged before or simultaneously with T8 (hooks using binary). The release workflow already includes `bun-windows-x64` target. install-cli.ps1 handles the download.

---

## Required Truths

### RT-1: Structured Logging Exists With Three Output Modes

A `cli/lib/logger.ts` module wraps pino and provides TTY (colorized human-readable), quiet (errors only), and JSON (machine-readable) output modes. Root command flags `--verbose`, `--quiet`, `--json` control mode selection. Logger integrates with existing `cli/lib/output.ts` color system (O3).

**Gap:** pino not installed. No logger module exists. No --verbose/--quiet/--json flags on root command.

### RT-2: Test Coverage Is Measured and Visible in CI

CI workflow runs `bun test --coverage`, reports line coverage percentage in GitHub Actions summary, and shows coverage delta in PR comments. Initially warning-only (per TN2); enforcement at 70% gated by validation test (T7).

**Gap:** No coverage in CI. No coverage validation test. No PR summary reporting.

### RT-3: Custom Error Hierarchy Is Deployed

`cli/lib/errors.ts` defines `ManifoldError` base class with subclasses: `ParseError`, `ValidationError`, `LinkerError`, `SolverError`. Each carries error code, cause chain, file path, and operation name. Existing catch blocks migrated gradually (not all at once). User-facing messages include actionable fix guidance (U2).

**Gap:** No custom error classes exist. 90 try/catch blocks use generic Error. No error codes.

### RT-4: Large Files Split Below 500 Lines (BINDING CONSTRAINT)

`solver.ts` (1,870 lines) decomposed into `cli/lib/solver/index.ts` (re-exports), `cli/lib/solver/graph.ts` (graph building), `cli/lib/solver/cache.ts` (caching), `cli/lib/solver/conflicts.ts` (conflict detection). Same pattern for `schema.ts` and `validate.ts`. All public exports preserved via barrel files (T6). sync-plugin.ts updated simultaneously (O4). All files compile into same binary.

**Gap:** All three files are monoliths. No submodule structure. This is the highest-risk item because it touches the most imports and test files.

### RT-5: Dependency Vulnerability Scanning Is Active

`.github/dependabot.yml` exists with: weekly schedule, grouped minor/patch updates, max 5 open PRs (O5). GitHub Security tab shows dependency alerts.

**Gap:** No Dependabot configuration. No dependency scanning of any kind.

### RT-6: Command Execution Timing Is Captured

Each CLI command captures start/end time via `performance.now()`. Timing data emitted in `--debug` mode (U3) and in `--json` output. Overhead < 1ms (T5). Debug output shows metadata only, never constraint content (TN3).

**Gap:** No timing instrumentation. No --debug flag.

### RT-7: Solver Architecture Is Documented

`docs/architecture/solver.md` explains: constraint graph data model, caching strategy (hash-based invalidation via `generateManifestHash()`), cache lifetime (session-scoped Map), relationship between solver.ts/mermaid.ts/graph exports, and the semantic conflict detection algorithm.

**Gap:** No architecture documentation for the solver. Caching strategy undocumented.

### RT-8: Cross-Platform Hooks Use Compiled Binary

`manifold hook schema-guard`, `manifold hook context`, and `manifold hook prompt-enforcer` CLI subcommands handle all Claude Code hooks. `hooks.json` points to the binary, not TS files. No runtime dependency required.

**Status: SATISFIED** -- Implemented in this session (`cli/commands/hook.ts`, updated `hooks.json`).

### RT-9: Windows Platform Supported

Windows compile target in release workflow (`bun-windows-x64`). `install-cli.ps1` downloads and installs the Windows binary. `session-start.ps1` handles version check and auto-update. `install-cli.sh` updated to handle MINGW/MSYS/CYGWIN platform detection.

**Status: PARTIAL** -- Scripts and workflow targets implemented. Not yet tested on actual Windows machine. Binary not yet compiled (requires next release).

### RT-10: All Existing Tests Continue to Pass

539 tests across 22 files pass after all changes. No test regressions introduced.

**Status: SATISFIED** -- Verified: 539 pass, 0 fail as of this session.

---

## Solution Space

### Option A: Incremental (safety net first, split last) -- Recommended

Ship in 3 waves. Wave 1 (low-risk, independent): Dependabot config (RT-5), solver docs (RT-7), coverage CI (RT-2). Wave 2 (medium-risk, new code): structured logging with pino (RT-1), custom error hierarchy (RT-3), command timing (RT-6). Wave 3 (high-risk, refactoring): split solver.ts/schema.ts/validate.ts (RT-4) -- only after coverage is in place as safety net.

- Satisfies: All RTs
- Reversibility: TWO_WAY (each wave is independently revertable)
- Risk: Low-to-medium (binding constraint tackled last with safety net)

### Option B: Split-first (binding constraint first)

Tackle RT-4 first to eliminate the biggest unknown. Split all three files, verify tests pass, then layer on logging/coverage/errors.

- Satisfies: All RTs
- Reversibility: REVERSIBLE_WITH_COST (split is hard to undo cleanly if something goes wrong)
- Risk: High upfront (no coverage safety net during the riskiest refactor)

### Option C: Parallel waves (maximum speed)

Use Manifold parallel execution to run independent items simultaneously. Wave 1: RT-5 + RT-7 + RT-2 (no file overlap). Wave 2: RT-1 + RT-3 + RT-6 (all new files). Wave 3: RT-4 (refactoring).

- Satisfies: All RTs
- Reversibility: TWO_WAY per wave
- Risk: Medium (coordination overhead, merge conflicts between waves)
