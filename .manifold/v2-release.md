# v2-release

## Outcome

Ship Manifold v2.0.0: GitHub release with CLI binaries, updated README, validated installation

---

## Context

### Motivation

- CLI implementation complete but binaries not yet published
- README doesn't document CLI commands or GitHub Action
- Installation flow untested end-to-end
- Users can't benefit until release is published

---

## Constraints

### Business

#### B1: Release enables user adoption of Manifold v2

Release enables user adoption of Manifold v2

> **Rationale:** Users can't benefit from CLI until binaries are published

#### B2: Version numbers must be consistent (2

Version numbers must be consistent (2.0.0 everywhere)

> **Rationale:** Inconsistent versions cause confusion and installation failures

#### B3: README must be self-sufficient for new users

README must be self-sufficient for new users

> **Rationale:** First impression determines adoption; users won't dig for docs

### Technical

#### T1: CLI binaries must be built for all 4 platforms

CLI binaries must be built for all 4 platforms

> **Rationale:** darwin-arm64, darwin-x64, linux-x64, linux-arm64 cover 99% of users

#### T2: Binaries must be attached to GitHub release as assets

Binaries must be attached to GitHub release as assets

> **Rationale:** install.sh expects binaries at releases/download/v{VERSION}/

#### T3: Binary size < 50MB per platform

Binary size < 50MB per platform

> **Rationale:** Large binaries slow download and indicate bloat

#### T4: All tests must pass before release

All tests must pass before release

> **Rationale:** Release with failing tests ships broken software

### User Experience

#### U1: README documents all 4 CLI commands with examples

README documents all 4 CLI commands with examples

> **Rationale:** Users need to know CLI exists and how to use it

#### U2: README shows GitHub Action usage for CI/CD

README shows GitHub Action usage for CI/CD

> **Rationale:** CI/CD integration is key value prop for CLI

#### U3: Installation takes < 30 seconds

Installation takes < 30 seconds

> **Rationale:** Quick start experience drives adoption

#### U4: install

install.sh must work without sudo if possible

> **Rationale:** Many users can't or won't use sudo

### Security

#### S1: Release artifacts must not contain secrets

Release artifacts must not contain secrets

> **Rationale:** Exposed secrets are critical security failures

#### S2: Binaries must be built from tagged commit

Binaries must be built from tagged commit

> **Rationale:** Traceability from binary to source code

### Operational

#### O1: Release must include changelog/release notes

Release must include changelog/release notes

> **Rationale:** Users need to know what's new and breaking

#### O2: Test installation in fresh environment (Docker/VM)

Test installation in fresh environment (Docker/VM)

> **Rationale:** Catch environment assumptions before users hit them

#### O3: Release tag must match CLI version (v2

Release tag must match CLI version (v2.0.0)

> **Rationale:** Mismatched versions break install.sh download URLs

---

## Tensions

### TN1: Binaries must be built from tagged commit, but we can't tag until we're ready to release

Binaries must be built from tagged commit, but we can't tag until we're ready to release

> **Resolution:** Create tag first, then build binaries from that tag, then create release with assets

### TN2: Version in CLI (package

Version in CLI (package.json), install.sh, and release tag must all match

> **Resolution:** Verify all three sources show 2.0.0 before proceeding

### TN3: Should README update come before or after release?

Should README update come before or after release?

> **Resolution:** Update README first (can reference future release), commit, then release includes updated README

### TN4: Thorough testing delays release, but untested release risks user frustration

Thorough testing delays release, but untested release risks user frustration

> **Resolution:** Test install.sh locally first, then test in Docker after binaries are built but before release

---

## Required Truths

### RT-1: All version numbers are synchronized at 2

All version numbers are synchronized at 2.0.0

### RT-2: All tests pass

All tests pass

### RT-3: CLI binaries can be built for all platforms

CLI binaries can be built for all platforms

### RT-4: README documents CLI commands and GitHub Action

README documents CLI commands and GitHub Action

### RT-5: Release notes document what's new

Release notes document what's new

### RT-6: Installation works end-to-end

Installation works end-to-end
