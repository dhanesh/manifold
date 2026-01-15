# Changelog

All notable changes to Manifold will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1](https://github.com/dhanesh/manifold/compare/v2.1.0...v2.1.1) (2026-01-15)

### Bug Fixes

* exclude anchor and verify files from validation list ([e292ef5](https://github.com/dhanesh/manifold/commit/e292ef5ec862cb845d1d65162d3baaceec90d781))

## [2.1.0](https://github.com/dhanesh/manifold/compare/v2.0.0...v2.1.0) (2026-01-15)

### Features

* add automated release pipeline with conventional commits ([8da089f](https://github.com/dhanesh/manifold/commit/8da089f9041a5406dba6f0cb085f9c1b05d26a9f))

# Changelog

All notable changes to Manifold will be documented in this file.

## [2.0.0] - 2026-01-15

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

## [1.0.0] - 2026-01-10

### Added

- Initial release
- Core slash commands: `/m0-init`, `/m1-constrain`, `/m2-tension`, `/m3-anchor`, `/m4-generate`, `/m5-verify`, `/m-status`
- Constraint categories: Business, Technical, UX, Security, Operational
- Constraint types: INVARIANT, GOAL, BOUNDARY
- Tension analysis with resolution strategies
- Backward reasoning from outcomes
- Artifact generation with constraint traceability
- Context preservation hook for Claude Code
