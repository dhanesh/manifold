# release-automation

## Outcome

Automated versioning and releases using conventional commits, semantic versioning, and GitHub releases

---

## Context

### Motivation

- Manual version bumping is error-prone and inconsistent
- Releases are currently created ad-hoc without changelog generation
- No automated version increment based on commit history
- Want to follow semantic versioning best practices

### Prior Art

- semantic-release for automated versioning
- conventional-changelog for changelog generation
- commitlint for commit message validation
- GitHub Actions for CI/CD automation

### Success Metrics

- Version automatically incremented based on commit types
- Changelog generated from commit history
- GitHub releases created automatically on tag push
- Commit messages validated against conventional format

---

## Constraints

### Business

#### B1: Version numbers must follow semantic versioning (MAJOR

Version numbers must follow semantic versioning (MAJOR.MINOR.PATCH)

> **Rationale:** Industry standard, enables dependency management

#### B2: Every release should have a changelog

Every release should have a changelog

> **Rationale:** Users need to know what changed

#### B3: Breaking changes must increment MAJOR version

Breaking changes must increment MAJOR version

> **Rationale:** SemVer contract with consumers

#### B4: Releases should be traceable to commits

Releases should be traceable to commits

> **Rationale:** Audit trail and debugging

### Technical

#### T1: Commits must follow Conventional Commits format

Commits must follow Conventional Commits format

> **Rationale:** Required for automated parsing

#### T2: Version bump determined by commit types: fix→PATCH, feat→MINOR, BREAKING→MAJOR

Version bump determined by commit types: fix→PATCH, feat→MINOR, BREAKING→MAJOR

> **Rationale:** SemVer automation rule

#### T3: Support both CLI binaries and npm package releases

Support both CLI binaries and npm package releases

> **Rationale:** Manifold has both distribution channels

#### T4: Release artifacts must match the tagged version

Release artifacts must match the tagged version

> **Rationale:** Prevents version/artifact mismatch

#### T5: GitHub Action should handle the full release pipeline

GitHub Action should handle the full release pipeline

> **Rationale:** CI/CD automation requirement

### User Experience

#### U1: Contributors should get immediate feedback on commit format

Contributors should get immediate feedback on commit format

> **Rationale:** Prevents malformed commits from merging

#### U2: Changelog should be human-readable, not just commit dumps

Changelog should be human-readable, not just commit dumps

> **Rationale:** Users are the audience, not machines

#### U3: Release notes should categorize changes (Features, Fixes, Breaking)

Release notes should categorize changes (Features, Fixes, Breaking)

> **Rationale:** Standard changelog structure

### Security

#### S1: Release workflow must not expose secrets in logs

Release workflow must not expose secrets in logs

> **Rationale:** GitHub Actions security best practice

#### S2: Only GitHub Actions (not local) can create releases

Only GitHub Actions (not local) can create releases

> **Rationale:** Prevents unauthorized releases

#### S3: Signed commits preferred for release tags

Signed commits preferred for release tags

> **Rationale:** Authenticity verification

### Operational

#### O1: Release process should be fully automated (no manual steps)

Release process should be fully automated (no manual steps)

> **Rationale:** Reduces human error

#### O2: Releases triggered on push to main branch only

Releases triggered on push to main branch only

> **Rationale:** Prevents accidental releases

#### O3: Failed releases should not leave partial state

Failed releases should not leave partial state

> **Rationale:** Atomic release operations

#### O4: Easy to manually trigger release if needed

Easy to manually trigger release if needed

> **Rationale:** Escape hatch for edge cases

---

## Tensions

### TN1: Full automation vs manual override capability

Full automation vs manual override capability

> **Resolution:** Automation is the default path; manual trigger via workflow_dispatch provides escape hatch without bypassing CI/CD

### TN2: Security-only GitHub Actions vs manual trigger needs

Security-only GitHub Actions vs manual trigger needs

> **Resolution:** Manual trigger implemented as workflow_dispatch in GitHub Actions, maintaining security boundary while enabling manual releases

### TN3: Version bump automation requires Conventional Commits

Version bump automation requires Conventional Commits

> **Resolution:** T1 is foundational - implement commit validation (commitlint) before version automation can work

### TN4: Commit format enforcement requires feedback mechanism

Commit format enforcement requires feedback mechanism

> **Resolution:** commitlint with husky pre-commit hook provides immediate feedback on commit format violations

### TN5: Human-readable changelog vs automated generation

Human-readable changelog vs automated generation

> **Resolution:** Use conventional-changelog with grouping by type (U3) - categorizes commits into Features/Fixes/Breaking for readability

### TN6: Atomic releases require careful automation design

Atomic releases require careful automation design

> **Resolution:** GitHub releases are atomic by design; use npm publish --dry-run before actual publish to validate

---

## Required Truths

### RT-1: Commits are parseable for version determination

Commits are parseable for version determination

**Evidence:** commitlint.config.js + .husky/commit-msg enforce format

### RT-2: Version can be automatically calculated from commit history

Version can be automatically calculated from commit history

**Evidence:** @semantic-release/commit-analyzer in .releaserc.json

### RT-3: Changelog is generated automatically from commits

Changelog is generated automatically from commits

**Evidence:** @semantic-release/changelog generates CHANGELOG.md

### RT-4: GitHub release created on version bump

GitHub release created on version bump

**Evidence:** @semantic-release/github + release.yml workflow

### RT-5: Release pipeline is secure

Release pipeline is secure

**Evidence:** Secrets via GITHUB_TOKEN, CI-only releases

### RT-6: Manual release override available

Manual release override available

**Evidence:** workflow_dispatch trigger with dry_run option
