# manifold-cli

## Outcome

Native CLI tool for deterministic Manifold operations (status, validate, verify) with sub-100ms response times

---

## Context

### Motivation

- Current /m* commands require AI interpretation for every operation
- Simple operations (status, validate) don't need reasoning
- CI/CD pipelines need deterministic, fast validation
- Token usage for status checks is wasteful

### Prior Art

- manifold-context.ts hook already parses YAML natively
- manifold-v2 defined programmatic verification in .verify.yaml
- Convergence detection is algorithmic, not heuristic

### Success Metrics

- Status checks < 100ms (vs ~3s with AI)
- CI/CD integration with exit codes
- Zero token usage for deterministic operations

---

## Constraints

### Business

#### B1: Reduce token usage by 80% for status/validate operations

Reduce token usage by 80% for status/validate operations

> **Rationale:** AI round-trips for simple operations are wasteful

#### B2: CLI must produce identical results to AI-based equivalents

CLI must produce identical results to AI-based equivalents

> **Rationale:** Users must trust CLI output matches what AI would produce

#### B3: Enable Manifold adoption in token-constrained environments

Enable Manifold adoption in token-constrained environments

> **Rationale:** Some teams have strict AI usage budgets

### Technical

#### T1: Response time < 100ms for all CLI operations

Response time < 100ms for all CLI operations

> **Rationale:** Must feel instant; current AI commands take ~3s

#### T2: Parse both schema v1 and v2 manifolds correctly

Parse both schema v1 and v2 manifolds correctly

> **Rationale:** Backward compatibility with existing manifolds

#### T3: Exit codes must follow Unix conventions (0=success, 1=error, 2=validation failure)

Exit codes must follow Unix conventions (0=success, 1=error, 2=validation failure)

> **Rationale:** CI/CD integration depends on standard exit codes

#### T4: Single executable with no external dependencies (bun compile)

Single executable with no external dependencies (bun compile)

> **Rationale:** Simple installation and distribution

#### T5: Memory usage < 50MB for largest manifold operations

Memory usage < 50MB for largest manifold operations

> **Rationale:** Must work in constrained CI environments

#### T6: YAML output must round-trip without data loss

YAML output must round-trip without data loss

> **Rationale:** CLI writes must not corrupt manifold files

### User Experience

#### U1: Command structure mirrors /m* commands (manifold status ≈ /m-status)

Command structure mirrors /m* commands (manifold status ≈ /m-status)

> **Rationale:** Familiar mental model for existing users

#### U2: Error messages must include actionable next steps

Error messages must include actionable next steps

> **Rationale:** Users should know how to fix issues

#### U3: Support --json flag for machine-readable output

Support --json flag for machine-readable output

> **Rationale:** Enable scripting and tooling integration

#### U4: Work correctly when stdout is not a TTY (piped/redirected)

Work correctly when stdout is not a TTY (piped/redirected)

> **Rationale:** Must work in CI/CD and scripted environments

#### U5: Colored output with --no-color override

Colored output with --no-color override

> **Rationale:** Visual clarity with accessibility fallback

### Security

#### S1: No arbitrary code execution from YAML parsing (safe parser)

No arbitrary code execution from YAML parsing (safe parser)

> **Rationale:** YAML can contain dangerous constructs; must use safe parsing

#### S2: File operations restricted to 

File operations restricted to .manifold/ directory

> **Rationale:** Prevent path traversal attacks

#### S3: No network calls (fully offline operation)

No network calls (fully offline operation)

> **Rationale:** Predictable behavior; no external dependencies

### Operational

#### O1: Install via single curl command (like current install

Install via single curl command (like current install.sh)

> **Rationale:** Consistent with existing Manifold installation

#### O2: Version must be queryable (manifold --version)

Version must be queryable (manifold --version)

> **Rationale:** Standard CLI practice; needed for debugging

#### O3: Provide GitHub Action for easy CI integration

Provide GitHub Action for easy CI integration

> **Rationale:** Lower barrier for CI/CD adoption

#### O4: Must work on macOS, Linux; Windows optional

Must work on macOS, Linux; Windows optional

> **Rationale:** Primary development platforms; Windows is secondary

---

## Tensions

### TN1: CLI must produce identical results, but some AI operations involve reasoning

CLI must produce identical results, but some AI operations involve reasoning

> **Resolution:** Scope CLI to deterministic operations only: status, validate, init, verify --artifacts

### TN2: Bun-compiled binaries have ~50-80ms cold start overhead

Bun-compiled binaries have ~50-80ms cold start overhead

> **Resolution:** Accept bun compile startup; 80ms startup + 20ms execution within 100ms budget

### TN3: Colors must auto-disable when piped; need override flags

Colors must auto-disable when piped; need override flags

> **Resolution:** Auto-detect TTY, respect NO_COLOR env var, support --no-color and --force-color

### TN4: GitHub Action cannot function without proper exit codes

GitHub Action cannot function without proper exit codes

> **Resolution:** T3 (exit codes) is prerequisite for O3 (GitHub Action)

### TN5: AI commands can read files anywhere; CLI would be more restricted

AI commands can read files anywhere; CLI would be more restricted

> **Resolution:** Strict .manifold/ only; CLI operates on manifold state, not source code

### TN6: How many commands should CLI implement to achieve 80% token reduction?

How many commands should CLI implement to achieve 80% token reduction?

> **Resolution:** 6 core commands: status, validate, init, verify, graph, solve

---

## Required Truths

### RT-1: YAML parsing must be fast and safe

YAML parsing must be fast and safe

**Evidence:** cli/lib/parser.ts uses yaml library with safe defaults

### RT-2: Command output must match AI equivalents exactly

Command output must match AI equivalents exactly

**Evidence:** Status output format matches /m-status, tested against existing manifolds

### RT-3: Exit codes must enable CI/CD automation

Exit codes must enable CI/CD automation

**Evidence:** All commands return 0/1/2 per Unix conventions

### RT-4: Distribution must be zero-friction

Distribution must be zero-friction

**Evidence:** install.sh downloads CLI binary, GitHub Action for CI/CD

### RT-5: Commands must handle edge cases gracefully

Commands must handle edge cases gracefully

**Evidence:** Error handling with suggestions implemented in all commands

### RT-6: TTY and color handling must be correct

TTY and color handling must be correct

**Evidence:** cli/lib/output.ts auto-detects TTY, respects NO_COLOR, supports --no-color/--force-color
