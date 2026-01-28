# Changelog

All notable changes to Manifold will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.14.3](https://github.com/dhanesh/manifold/compare/v2.14.2...v2.14.3) (2026-01-28)

### Bug Fixes

* **ci:** use local path for manifold-verify workflow ([a155dde](https://github.com/dhanesh/manifold/commit/a155dde823e46a7df7aff4f33494a5f91a9fc2f1))

## [2.14.2](https://github.com/dhanesh/manifold/compare/v2.14.1...v2.14.2) (2026-01-28)

### Bug Fixes

* **ci:** add workflow_call trigger to security workflow ([ed3ccc8](https://github.com/dhanesh/manifold/commit/ed3ccc8fc21465a3c1a6ba51a321a2d4bc9b6821))

## [2.14.1](https://github.com/dhanesh/manifold/compare/v2.14.0...v2.14.1) (2026-01-28)

### Bug Fixes

* **security:** remove malformed gitleaks rule ([9358cb7](https://github.com/dhanesh/manifold/commit/9358cb746dd8efaec6fb54353c7d29ff48224989))

## [2.14.0](https://github.com/dhanesh/manifold/compare/v2.13.0...v2.14.0) (2026-01-28)

### Features

* **security:** add defense-in-depth secret detection ([265ec28](https://github.com/dhanesh/manifold/commit/265ec28270ae6248d8b1bd9e3c8cf63507c2132b))

## [2.13.0](https://github.com/dhanesh/manifold/compare/v2.12.0...v2.13.0) (2026-01-23)

### Features

* add pm workflow support with prd and user story generation ([6d8bbf1](https://github.com/dhanesh/manifold/commit/6d8bbf1a26b3aa2b8dbfad7f3f530f401e66a1e8))

## [2.12.0](https://github.com/dhanesh/manifold/compare/v2.11.0...v2.12.0) (2026-01-23)

### Features

* add light mode, templates, and usability improvements ([68255ca](https://github.com/dhanesh/manifold/commit/68255caa8f55a42d70a4701699169794538115b8))

## [2.11.0](https://github.com/dhanesh/manifold/compare/v2.10.1...v2.11.0) (2026-01-20)

### Features

* **install:** inject schema reference into user claude.md ([c520b2a](https://github.com/dhanesh/manifold/commit/c520b2a844a9697d4ba3d372ac566efab2bbc843))

## [2.10.1](https://github.com/dhanesh/manifold/compare/v2.10.0...v2.10.1) (2026-01-19)

### Bug Fixes

* **validate:** reduce false positives in cross-feature contradiction detection ([2803e96](https://github.com/dhanesh/manifold/commit/2803e96d5fc768f5304acf0b6414308071526999))

## [2.10.0](https://github.com/dhanesh/manifold/compare/v2.9.1...v2.10.0) (2026-01-19)

### Features

* **validate:** implement semantic cross-feature conflict detection ([fd28b1e](https://github.com/dhanesh/manifold/commit/fd28b1eb59512c2f817662a68f67f1272dd886ab))

## [2.9.1](https://github.com/dhanesh/manifold/compare/v2.9.0...v2.9.1) (2026-01-19)

### Bug Fixes

* **manifold:** add required fields to integration file ([67b064b](https://github.com/dhanesh/manifold/commit/67b064b454f425b3888f168389f26310cc41bb34))

## [2.9.0](https://github.com/dhanesh/manifold/compare/v2.8.0...v2.9.0) (2026-01-19)

### Features

* **validate:** add cross-feature detection, metrics, and parallel verification ([19eee1d](https://github.com/dhanesh/manifold/commit/19eee1db03d0b709c459efdab752807d1e050a19))

## [2.8.0](https://github.com/dhanesh/manifold/compare/v2.7.0...v2.8.0) (2026-01-19)

### Features

* **schema:** add v3 validation, conflict detection, and best practices ([a1b6314](https://github.com/dhanesh/manifold/commit/a1b63141c3703ee203ef599423505db000d839d5))

## [2.7.0](https://github.com/dhanesh/manifold/compare/v2.6.1...v2.7.0) (2026-01-17)

### Features

* **schema:** upgrade default manifold schema to v3 ([d552ef9](https://github.com/dhanesh/manifold/commit/d552ef96fecc306454562042afe6cf26928ed1db))

## [2.6.1](https://github.com/dhanesh/manifold/compare/v2.6.0...v2.6.1) (2026-01-16)

### Bug Fixes

* **cli:** read version from package.json instead of hardcoded value ([7094166](https://github.com/dhanesh/manifold/commit/70941663e8fca50b0c031422e6d4d869adfb3eb9))

## [2.6.0](https://github.com/dhanesh/manifold/compare/v2.5.2...v2.6.0) (2026-01-16)

### Features

* **cli:** add graph/solve commands, caching, and real-time updates ([906118f](https://github.com/dhanesh/manifold/commit/906118f2b9974f329f075a097519e5758be2224f))

## [2.5.2](https://github.com/dhanesh/manifold/compare/v2.5.1...v2.5.2) (2026-01-16)

### Bug Fixes

* **ci:** handle non-zero exit codes in manifold-verify workflow ([7b56ffa](https://github.com/dhanesh/manifold/commit/7b56ffa3bbc3ec5e273a06cbd127928fbefc46ad))

## [2.5.1](https://github.com/dhanesh/manifold/compare/v2.5.0...v2.5.1) (2026-01-16)

### Bug Fixes

* **release:** use semantic-release-action to properly expose outputs ([b84db18](https://github.com/dhanesh/manifold/commit/b84db18408dafdf41485e93df996606663e0eade))

## [2.5.0](https://github.com/dhanesh/manifold/compare/v2.4.0...v2.5.0) (2026-01-16)

### Features

* add v3 schema with temporal non-linearity and reality grounding ([92ed795](https://github.com/dhanesh/manifold/commit/92ed7953ad9d32d333c81c6e2f48c846dbcd13fa))

## [2.4.0](https://github.com/dhanesh/manifold/compare/v2.3.0...v2.4.0) (2026-01-16)

### Features

* **parallel:** integrate auto-suggester hook with m4-generate ([7771344](https://github.com/dhanesh/manifold/commit/7771344fc802b632c3488618daabd76676e08578))

## [2.3.0](https://github.com/dhanesh/manifold/compare/v2.2.1...v2.3.0) (2026-01-16)

### Features

* **install:** auto-detect latest version from github api ([2b80c04](https://github.com/dhanesh/manifold/commit/2b80c046b0f2e0cb4b89832f5c1c8e32944e32c3))

## [2.2.1](https://github.com/dhanesh/manifold/compare/v2.2.0...v2.2.1) (2026-01-16)

### Bug Fixes

* **tests:** resolve parallel test failures ([6c3996e](https://github.com/dhanesh/manifold/commit/6c3996e819d87a40c21346ef82e89172d801ae4f))

## [2.2.0](https://github.com/dhanesh/manifold/compare/v2.1.2...v2.2.0) (2026-01-16)

### Features

* **parallel-agents:** add parallel task execution with git worktrees ([4670e72](https://github.com/dhanesh/manifold/commit/4670e728b209768b737c9cd66b7ea34e29f19d10))

## [2.1.2](https://github.com/dhanesh/manifold/compare/v2.1.1...v2.1.2) (2026-01-15)

### Bug Fixes

* skip anchor files in ci workflow validation ([0a6d0c7](https://github.com/dhanesh/manifold/commit/0a6d0c758e7af10411ec9c29299e2d7796d1c81c))

## [2.1.1](https://github.com/dhanesh/manifold/compare/v2.1.0...v2.1.1) (2026-01-15)

### Bug Fixes

* exclude anchor and verify files from validation list ([e292ef5](https://github.com/dhanesh/manifold/commit/e292ef5ec862cb845d1d65162d3baaceec90d781))

## [2.1.0](https://github.com/dhanesh/manifold/compare/v2.0.0...v2.1.0) (2026-01-15)

### Features

* add automated release pipeline with conventional commits ([8da089f](https://github.com/dhanesh/manifold/commit/8da089f9041a5406dba6f0cb085f9c1b05d26a9f))

## [2.0.0](https://github.com/dhanesh/manifold/releases/tag/v2.0.0) (2026-01-15)

### Added

- **Native CLI** - Fast, deterministic operations without AI round-trips
  - `manifold status` - Show manifold state (<100ms response time)
  - `manifold validate` - Validate schema with exit codes for CI/CD
  - `manifold init` - Initialize new manifold with v2 template
  - `manifold verify` - Verify artifact existence and coverage
  - `--json` flag for machine-readable output
  - `--no-color` and `--force-color` for output control

- **GitHub Action** - CI/CD integration for automated verification
  - Reusable workflow: `dhanesh/manifold/.github/workflows/manifold-verify.yml`
  - Schema validation on push/PR
  - Artifact coverage reporting
  - Optional strict mode with `fail-on-gaps`

- **Schema v2** - Enhanced manifold structure
  - `schema_version: 2` field for forward compatibility
  - `iterations[]` array for tracking workflow progress
  - `convergence{}` object for completion status
  - Backward compatible with v1 manifolds

- **Integration Phase** (`/m6-integrate`)
  - Wire generated artifacts together
  - Identify integration points
  - Produce actionable wiring checklist

- **Iteration Tracking**
  - Full history of manifold phases
  - Timestamps and results for each iteration
  - Convergence detection when all invariants satisfied

- **Auto-dependency Detection** (`--auto-deps`)
  - Scan constraint statements for implicit dependencies
  - Surface hidden dependencies automatically
  - Flag blocking dependencies for prioritization

### Changed

- `/m-status` now shows iteration history with `--history` flag
- `/m5-verify` supports `--artifacts` mode for artifact existence checking
- Install script now downloads CLI binary for current platform

### Technical Details

- CLI built with Bun + TypeScript + Commander.js
- Single binary distribution via `bun compile`
- 39 tests covering parser, schema validation, and output formatting
- Supports darwin-arm64, darwin-x64, linux-x64, linux-arm64

## [1.0.0](https://github.com/dhanesh/manifold/releases/tag/v1.0.0) (2026-01-10)

### Added

- Initial release
- Core slash commands: `/m0-init`, `/m1-constrain`, `/m2-tension`, `/m3-anchor`, `/m4-generate`, `/m5-verify`, `/m-status`
- Constraint categories: Business, Technical, UX, Security, Operational
- Constraint types: INVARIANT, GOAL, BOUNDARY
- Tension analysis with resolution strategies
- Backward reasoning from outcomes
- Artifact generation with constraint traceability
- Context preservation hook for Claude Code
