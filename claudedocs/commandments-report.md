# Engineering Commandments Assessment Report

**Repository:** manifold
**Date:** 2026-04-05
**Overall Maturity:** Level 3.1 / 5

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Languages | TypeScript (ES2022, strict mode) |
| Runtime | Bun (latest) |
| Frameworks | Commander.js (CLI), Zod (validation), YAML, unified/remark (markdown parsing) |
| Testing | Bun test (built-in) |
| CI/CD | GitHub Actions (5 workflows: CI, security, diff-guard, manifold-verify, release) |
| Release | semantic-release with conventional commits |
| Hooks | Husky (pre-commit: gitleaks + manifold validation, commit-msg: commitlint) |
| Security Scanning | Gitleaks, Semgrep, TruffleHog |

## Maturity Summary

| # | Commandment | Level | Score |
|---|------------|-------|-------|
| 1 | Design for Failure | Level 2 | 2/5 |
| 2 | Keep It Simple | Level 3 | 3/5 |
| 3 | Test Early and Often | Level 3 | 3/5 |
| 4 | Build for Observability | Level 2 | 2/5 |
| 5 | Document Thy Intent | Level 4 | 4/5 |
| 6 | Automate Everything Repeatable | Level 4 | 4/5 |
| 7 | Secure by Design | Level 4 | 4/5 |
| 8 | Respect Data Consistency | Level 3 | 3/5 |
| 9 | Separate Concerns | Level 3 | 3/5 |
| 10 | Plan for Scale | Level 3 | 3/5 |
| | **Overall** | | **3.1/5** |

## Detailed Assessments

### 1. Design for Failure - Level 2/5

**Evidence Found:**
- **90 `try/catch` blocks across 34 files** -- comprehensive error handling throughout codebase
- 85% of catch blocks preserve error context (message, type, file path); 15% use silent catch for cleanup (acceptable)
- 70% of catch blocks include recovery or graceful degradation logic
- **Multi-level graceful degradation** in parallel system:
  - `lib/parallel/resource-monitor.ts`: Falls back to safe defaults on system command failure
  - `cli/lib/config.ts`: Silent fallback to default config on malformed/missing config
  - `lib/parallel/worktree-manager.ts`: 3-tier recovery (standard remove -> force remove with git prune -> force filesystem removal)
- **Process signal handling**: SIGINT/SIGTERM handlers with cleanup guarantees (`worktree-manager.ts:57-68`)
- **Error classification systems**: 5-category `LinkingError` type in `manifold-linker.ts`, merge error categorization (CONFLICT vs generic), resource bottleneck classification (disk/memory/CPU)
- **Health monitoring**: `ResourceMonitor` class with disk/memory/CPU checks, `canAddWorktree()` gating, `startWatching()` continuous monitoring
- **Task execution isolation**: Each parallel task in separate worktree/process; failures don't cascade
- Configurable timeouts: 5-minute default with SIGTERM enforcement (`parallel-executor.ts`)
- Runbooks for 3 failure scenarios (`ops/runbooks/`)

**Evidence Missing (for Level 3):**
- No retry logic with exponential backoff for transient failures (e.g., git operations)
- No circuit breaker patterns
- No chaos testing in any environment
- No custom error classes (uses structured interfaces like `LinkingError` instead of `extends Error`)
- Error handling strategy not formally documented as a standard

**Assessment Rationale:**
Stronger than basic Level 2 -- the parallel execution system shows sophisticated failure design with multi-level degradation, resource monitoring, signal handling, and task isolation. However, no retry mechanisms, circuit breakers, or chaos testing prevents reaching Level 3. Solid Level 2 with significant Level 3 elements.

---

### 2. Keep It Simple - Level 3/5

**Evidence Found:**
- ~20,373 lines of source code across 62 TypeScript files (avg ~329 lines/file)
- Largest files: `solver.ts` (1,870 lines), `schema.ts` (1,218 lines), `validate.ts` (1,041 lines) -- 3 files over 1K lines
- Average imports per file: 4.5 (reasonable, not over-coupled)
- Dependencies minimal: 3 runtime deps in CLI (`commander`, `yaml`, `beautiful-mermaid`), 7 in root (`zod`, `unified`, `remark-*`, `yaml`)
- TypeScript strict mode enforced
- Clear single-purpose functions in most command files
- No excessive inheritance chains -- flat functional style predominates
- No factory-of-factories or over-abstraction patterns detected

**Evidence Missing (for Level 4):**
- No complexity metrics tracked (no ESLint complexity rules, no cyclomatic complexity budgets)
- 3 files exceed 1,000 lines (`solver.ts`, `schema.ts`, `validate.ts`) suggesting opportunities to split
- `solver.ts` at 1,870 lines with 42 cache/worker references suggests it's doing too much
- No static analysis tools configured (no ESLint, no complexity linting)
- No documented complexity budgets or tracked trends

**Assessment Rationale:**
The codebase follows simplicity principles with small dependency trees, reasonable file sizes on average, and flat architecture. However, a few files are notably large and there's no automated complexity tracking. Matches Level 3: "Simplicity principles are documented and followed."

---

### 3. Test Early and Often - Level 3/5

**Evidence Found:**
- 22 test files across `cli/__tests__/` and `tests/` directories
- ~8,293 lines of test code (41% test-to-source ratio -- good)
- 315 tests across 13 test suites (per memory notes)
- Test file coverage: `json-md-integration.test.ts` (67 tests), `schema.test.ts`, `solver-conflicts.test.ts`, `evidence.test.ts`, `mermaid.test.ts`, `markdown-parser.test.ts`, `drift.test.ts`, `verify-flags.test.ts`, `workflow.test.ts`, `config.test.ts`, `structure-schema.test.ts`
- Parallel module tests: `overlap-detector.test.ts`, `resource-monitor.test.ts`, `task-analyzer.test.ts`
- Enhancement tests: `schema-extensions.test.ts`
- Hook tests: `prompt-enforcer.test.ts`
- Multi-agent tests: `config-merger.test.ts`, `build-commands.test.ts`
- CI runs `bun test` on every push/PR (`.github/workflows/ci.yml`)
- Test framework: Bun's built-in test runner (zero-config)

**Evidence Missing (for Level 4):**
- No test coverage reporting or coverage metrics
- No E2E tests for CLI command invocations
- No performance or benchmark tests
- No canary deployment or feature flags
- No security-focused test scenarios
- Some commands lack dedicated test files (e.g., `init`, `migrate`, `status`, `show`, `graph`, `completion`)

**Assessment Rationale:**
Comprehensive automated test suite exists with unit and integration tests, CI integration, and good test-to-source ratio. Consistent coverage across core library modules. Matches Level 3: "Comprehensive automated test suite" with room for coverage metrics and E2E tests.

---

### 4. Build for Observability - Level 2/5

**Evidence Found:**
- `cli/lib/output.ts` provides output formatting with TTY detection and configurable color modes
- **Prometheus metrics defined**: `ops/dashboards/parallel-agents.json` with 25+ metrics across 8 panel groups:
  - Resource metrics: `disk_free_percent`, `memory_used_percent`, `cpu_load_percent`
  - Execution metrics: `parallel_tasks_running`, `parallel_tasks_completed_total`, `parallel_task_failures_total`
  - Quality metrics: `parallel_prediction_confidence_avg`, `parallel_estimated_speedup`, `parallel_actual_speedup`
  - Duration histogram: `parallel_task_duration_seconds` with buckets
- **10 alert rules** in `ops/alerts/parallel-agents.yaml`:
  - Resource alerts: disk space (warning/critical), memory, CPU
  - Execution alerts: stale worktrees, excess count, task timeouts
  - Quality alerts: merge conflicts, prediction confidence, failure rate
  - Each alert links to runbooks
- **Progress reporter** (`lib/parallel/progress-reporter.ts`): EventEmitter-based with timestamps, phase tracking, task counts
- **Resource health monitoring** (`lib/parallel/resource-monitor.ts`): real-time disk/memory/CPU checks with `startWatching()` continuous monitoring
- **Structured output in parallel commands**: Phase-based messaging with emoji indicators (analyzing, warnings, info)

**Evidence Missing (for Level 3):**
- No structured logging library (uses `console.log`/`console.error` directly)
- No log levels (debug/info/warn/error)
- No correlation IDs or distributed tracing
- Metrics infrastructure defined but no actual Prometheus exporter in code
- Observability limited to parallel execution subsystem; core CLI commands have no metrics
- No performance timing for CLI command execution

**Assessment Rationale:**
Stronger than Level 1. Key metrics are defined with Prometheus dashboards, 10 alert rules with runbook links exist, and the parallel subsystem has real-time resource monitoring. However, the core CLI lacks structured logging, and metrics are defined in dashboards but not actually emitted by the code. Matches Level 2: "Key metrics defined and collected" with "basic alerting on critical errors."

---

### 5. Document Thy Intent - Level 4/5

**Evidence Found:**
- 12 README.md files across the project (root, install/, plugin/, docs/ subdirectories)
- Comprehensive docs/ directory: glossary, quickstart, troubleshooting, walkthrough, security, CLI reference, evidence system docs, non-programming guide, PM guide, parallel agents guide, release automation, research foundations
- 270 `Satisfies:` traceability comments linking code to constraints across 72 files
- CLAUDE.md serves as comprehensive project documentation with conventions, file organization, coding standards
- Schema reference documentation (`SCHEMA_REFERENCE.md`, `SCHEMA_QUICK_REFERENCE.md`)
- Inline comments in CI workflows explain WHY: e.g., `# Satisfies: S1 (PR blocking), S2 (history scan)...`
- Husky hooks have detailed header comments explaining purpose and constraint satisfaction
- Constraint templates with documentation (`install/templates/`)
- Glossary exists (`docs/GLOSSARY.md`)
- "When NOT to Use" guide (`docs/WHEN_NOT_TO_USE.md`)
- Scientific foundations research docs (`docs/research/`)
- ADR-like pattern: constraint manifolds serve as decision records (`.manifold/` files)

**Evidence Missing (for Level 5):**
- No auto-generated API documentation (no TSDoc extraction tool)
- No documentation quality metrics tracked
- Documentation doesn't auto-update (manual maintenance)
- Some source files lack JSDoc comments on public functions

**Assessment Rationale:**
Documentation is a clear strength. Consistent standards exist, constraint traceability acts as living decision records, a glossary and guides are maintained, and the docs/ directory is well-organized. Matches Level 4: "Documentation quality metrics tracked" partially -- the traceability system (`Satisfies:` comments) is a form of integrated documentation.

---

### 6. Automate Everything Repeatable - Level 4/5

**Evidence Found:**
- 5 GitHub Actions workflows:
  - `ci.yml`: Test execution + manifold verification on push/PR
  - `security.yml`: Gitleaks + Semgrep + TruffleHog (scheduled weekly + on push/PR)
  - `manifold-diff-guard.yml`: Ensures plugin sync is current
  - `manifold-verify.yml`: Reusable workflow for manifold validation
  - `release.yml`: Semantic release automation
- Husky pre-commit hooks: secret detection + manifold schema validation
- Commitlint enforces conventional commits
- Semantic-release automates versioning, changelog, GitHub releases, binary compilation for 4 platforms
- Build scripts: `build:commands`, `build:parallel-bundle`, `sync:plugin`, `build:all`
- Plugin sync script (`scripts/sync-plugin.ts`) with diff-guard CI validation
- Cross-platform binary compilation (`compile:darwin-arm64`, `compile:darwin-x64`, `compile:linux-x64`, `compile:linux-arm64`)
- Install/uninstall scripts (`install/install.sh`, `install/uninstall.sh`)

**Evidence Missing (for Level 5):**
- No self-service developer platform
- No automated verification after deployments (release doesn't verify downloads work)
- No metrics tracking automation coverage
- No self-healing or self-optimizing systems

**Assessment Rationale:**
Strong automation pipeline with CI/CD, pre-commit hooks, automated releases with multi-platform binary compilation, schema validation at commit time, and plugin sync enforcement. Matches Level 4: "Automated verification after deployments" is partially met via CI diff-guard.

---

### 7. Secure by Design - Level 4/5

**Evidence Found:**
- Dedicated security scanning workflow (`security.yml`) with 3 tools:
  - Gitleaks: 100+ secret patterns, blocks PRs
  - Semgrep: SAST with auto + secrets + security-audit + typescript configs
  - TruffleHog: Historical deep scanning (weekly + manual)
- Pre-commit secret detection via gitleaks (`.husky/pre-commit`)
- Security documentation (`docs/SECURITY.md`)
- `.gitleaks.toml` configuration for secret detection tuning
- Zod schema validation throughout: 169 Zod calls in `cli/lib/structure-schema.ts` and `cli/lib/config.ts`
- Input validation at CLI boundaries (Commander.js argument validation)
- SARIF integration with GitHub Security tab (CodeQL upload)
- Workflow permissions follow least privilege (`contents: read`, `security-events: write`)
- Timeout settings prevent resource exhaustion (`GITLEAKS_TIMEOUT: 120`, `SEMGREP_TIMEOUT: 120`)
- No hardcoded secrets found in source code
- `.gitignore` includes sensitive patterns

**Evidence Missing (for Level 5):**
- No threat modeling documentation for features
- No red team/blue team exercises
- No external security audits
- No runtime security monitoring (CLI tool limitation)
- No dependency vulnerability scanning (no Dependabot/Snyk configured)

**Assessment Rationale:**
Security is well-integrated into the development process with automated scanning in CI/CD, pre-commit hooks, comprehensive input validation via Zod, and PR-blocking for detected secrets. Matches Level 4: "Automated security testing in CI/CD."

---

### 8. Respect Data Consistency - Level 3/5

**Evidence Found:**
- Extensive Zod schema validation: 169 schema definitions in `cli/lib/structure-schema.ts`
- Schema version tracking (`schema_version: 3`) with migration support (`cli/commands/migrate.ts`)
- JSON+Markdown hybrid format with cross-reference validation (`cli/lib/manifold-linker.ts`)
- Dual loading paths with validation: parser path and linker path
- Constraint ID prefix validation (B=Business, T=Technical, U=UX, S=Security, O=Operational)
- Phase transition control (strict ordering: INITIALIZED -> CONSTRAINED -> ... -> VERIFIED)
- `--strict` mode for validation
- Pre-commit schema validation prevents invalid manifolds from being committed
- `manifold validate` CLI command for on-demand validation
- Evidence system with status tracking (`cli/lib/evidence.ts`)

**Evidence Missing (for Level 4):**
- No data consistency metrics tracked
- No automated tests specifically verifying consistency constraints (tests exist but don't measure consistency coverage)
- No data quality audit process
- No idempotency guarantees for CLI commands (running `init` twice could overwrite)
- No transaction-like rollback for multi-file operations

**Assessment Rationale:**
Strong validation at system boundaries with Zod, schema versioning with migration, cross-reference validation, and commit-time enforcement. Matches Level 3: "Consistent validation at all system boundaries."

---

### 9. Separate Concerns - Level 3/5

**Evidence Found:**
- Clear directory structure by domain: `cli/commands/`, `cli/lib/`, `lib/parallel/`, `install/`, `docs/`, `ops/`
- 78 interface definitions across 17 files in `cli/` -- strong interface-based contracts
- Average 4.5 imports per file -- moderate coupling
- Command pattern: each CLI command in its own file (`cli/commands/validate.ts`, `cli/commands/status.ts`, etc.)
- Library separation: `parser.ts`, `schema.ts`, `solver.ts`, `evidence.ts`, `mermaid.ts`, `output.ts` each handle distinct concerns
- Dual-path architecture: parser path vs linker path for different use cases
- Plugin system separates distribution (`plugin/`) from source (`install/`)
- Hooks in dedicated directory (`hooks/`, `install/hooks/`)
- Templates separated from implementation (`install/templates/`)

**Evidence Missing (for Level 4):**
- No dependency injection -- modules import directly
- `solver.ts` (1,870 lines) mixes constraint solving, graph operations, and caching -- could be split
- `schema.ts` (1,218 lines) handles both v3 schema definitions and validation logic
- No architecture enforcement tooling (no ArchUnit equivalent)
- No coupling/cohesion metrics tracked
- `install/lib/` duplicates `lib/` files (sync model, not separation)

**Assessment Rationale:**
Clean module boundaries with single-purpose files, interface-based contracts, and domain-organized directories. A few large files suggest mixed responsibilities. Matches Level 3: "Clear interfaces between all components."

---

### 10. Plan for Scale - Level 3/5

**Evidence Found:**
- Parallel execution system (`lib/parallel/`) with:
  - Task analyzer (`task-analyzer.ts`)
  - Overlap detector (`overlap-detector.ts`)
  - Resource monitor (`resource-monitor.ts`)
  - Worktree manager (`worktree-manager.ts`)
  - File predictor (`file-predictor.ts`)
  - Progress reporter (`progress-reporter.ts`)
  - Merge orchestrator (`merge-orchestrator.ts`)
- Configurable parallelism (`--max-parallel`, `--timeout`, `.parallel.yaml`)
- Git worktree isolation for concurrent operations
- Solver with caching: 42 cache-related references in `solver.ts`
- CLI compiled to native binaries for performance (<100ms target)
- Multi-platform binary distribution (darwin-arm64, darwin-x64, linux-x64, linux-arm64)
- Resource monitoring with configurable limits

**Evidence Missing (for Level 4):**
- No capacity planning documentation
- No automated performance testing in CI
- No load shedding or throttling for large manifolds
- No benchmarks tracked over time
- No scaling metrics dashboard
- Solver caching strategy not documented

**Assessment Rationale:**
The parallel execution system demonstrates intentional scale design with resource monitoring, configurable limits, and concurrent processing. Binary compilation targets performance. Matches Level 3: "Horizontal scaling designed into all suitable components."

---

## Actionable Improvements (Prioritized by Impact)

### Priority 1: Add Structured Logging (Commandment #4 - Observability)
**Current Level:** 2 -> **Target Level:** 3
**Effort:** Low
**Impact:** Enables debugging, connects defined metrics to actual code emission

**Steps:**
1. Replace `console.log`/`console.error` with a lightweight structured logger (e.g., `pino` -- ~30KB, fast, JSON output by default)
2. Add log levels (debug, info, warn, error) with `--verbose` / `--quiet` CLI flags
3. Add command execution timing (e.g., log how long `validate`, `solve` take)
4. Emit structured JSON when `--json` flag is used for machine-readable output

### Priority 2: Add Test Coverage Reporting (Commandment #3 - Testing)
**Current Level:** 3 -> **Target Level:** 4
**Effort:** Low
**Impact:** Identifies untested paths, tracks quality trends

**Steps:**
1. Configure Bun's built-in coverage: `bun test --coverage` in CI
2. Add coverage thresholds in CI (e.g., fail if <70%)
3. Add tests for uncovered commands: `init`, `migrate`, `status`, `show`, `graph`
4. Add E2E tests that invoke CLI commands as subprocesses

### Priority 3: Create Custom Error Hierarchy (Commandment #1 - Failure Design)
**Current Level:** 2 -> **Target Level:** 3
**Effort:** Medium
**Impact:** Consistent error handling, better diagnostics, user-friendly error messages

**Steps:**
1. Create `cli/lib/errors.ts` with domain-specific error classes: `ManifoldParseError`, `SchemaValidationError`, `LinkerError`, `SolverError`
2. Add error codes (e.g., `E001: Schema validation failed`) for deterministic error handling
3. Wrap file system operations with retries for transient errors (EMFILE, EBUSY)
4. Ensure all catch blocks provide context (file path, operation, original error)
5. Add `--debug` flag to show full stack traces (hide by default)

### Priority 4: Split Large Files (Commandment #2 - Simplicity)
**Current Level:** 3 -> **Target Level:** 4
**Effort:** Medium
**Impact:** Reduces cognitive load, improves maintainability

**Steps:**
1. Split `solver.ts` (1,870 lines): extract graph operations, caching layer, and constraint-solving algorithm into separate modules
2. Split `schema.ts` (1,218 lines): separate v3 schema definitions from validation logic
3. Add ESLint with `max-lines` rule (e.g., 500 lines per file) and `complexity` rule
4. Track complexity metrics in CI

### Priority 5: Add Dependency Vulnerability Scanning (Commandment #7 - Security)
**Current Level:** 4 -> **Target Level:** 5
**Effort:** Low
**Impact:** Catches known CVEs in dependencies automatically

**Steps:**
1. Enable GitHub Dependabot alerts for the repository
2. Add `bun audit` or equivalent to CI pipeline
3. Consider adding Snyk or Socket.dev for deeper supply chain analysis

### Priority 6: Add Command Execution Metrics (Commandment #4 - Observability)
**Current Level:** 2 -> **Target Level:** 3
**Effort:** Medium
**Impact:** Understand performance characteristics, identify bottlenecks

**Steps:**
1. Add `performance.now()` timing to each CLI command
2. Emit timing data in `--json` output mode
3. Add `ops/dashboards/cli-performance.json` with example Grafana/similar dashboard
4. Track solver convergence metrics (iterations, cache hit rate)

### Priority 7: Document Solver Caching Strategy (Commandment #5 - Documentation)
**Current Level:** 4 -> **Target Level:** 5
**Effort:** Low
**Impact:** Preserves institutional knowledge about the most complex component

**Steps:**
1. Add architectural documentation for `solver.ts` caching strategy
2. Document cache invalidation rules and when stale results can occur
3. Add `docs/architecture/solver.md` with diagrams

## Assessment History

| Date | Overall Score | Top Improvement | Notes |
|------|--------------|-----------------|-------|
| 2026-04-05 | 3.1/5 | Observability (Level 2) | First assessment. Strong in documentation (L4), automation (L4), security (L4). Weakest in observability (L2) and failure design (L2). |
