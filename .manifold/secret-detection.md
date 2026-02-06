# secret-detection

## Outcome

Secrets never leak into codebase through comprehensive detection at pre-commit, CI, and historical scanning layers

---

## Constraints

### Business

#### B1: No secrets ever reach the main branch

No secrets ever reach the main branch

> **Rationale:** Leaked secrets in version control persist forever and can be extracted from git history

#### B2: Security scanning must not block release velocity unreasonably

Security scanning must not block release velocity unreasonably

> **Rationale:** Security tools that slow developers too much get bypassed or disabled

#### B3: Zero cost for basic secret detection tooling

Zero cost for basic secret detection tooling

> **Rationale:** Project uses free/open-source tools; no paid security services

### Technical

#### T1: Pre-commit hook completes in < 5 seconds for staged files

Pre-commit hook completes in < 5 seconds for staged files

> **Rationale:** Slow hooks frustrate developers and lead to --no-verify usage

#### T2: CI security scan completes in < 3 minutes

CI security scan completes in < 3 minutes

> **Rationale:** Security checks should not dominate CI time; fast feedback loop

#### T3: SARIF output for GitHub Security tab integration

SARIF output for GitHub Security tab integration

> **Rationale:** Centralized security findings in GitHub's native security dashboard

#### T4: Support TypeScript/JavaScript codebase scanning

Support TypeScript/JavaScript codebase scanning

> **Rationale:** Project uses Bun + TypeScript; tools must understand this ecosystem

#### T5: Gitleaks + Semgrep + TruffleHog tool stack

Gitleaks + Semgrep + TruffleHog tool stack

> **Rationale:** Selected for complementary strengths: regex (fast), SAST (deep), entropy (historical)

### User Experience

#### U1: Clear error messages when secrets detected locally

Clear error messages when secrets detected locally

> **Rationale:** Developers need actionable guidance on how to fix the issue

#### U2: Graceful degradation if local tools not installed

Graceful degradation if local tools not installed

> **Rationale:** Pre-commit should skip (not fail) if gitleaks missing; CI provides backstop

#### U3: PR comments on detected secrets

PR comments on detected secrets

> **Rationale:** Inline feedback shows exactly where the problem is

#### U4: Documentation for handling false positives

Documentation for handling false positives

> **Rationale:** Developers need clear process for allowlist management

### Security

#### S1: Block PR merge when secrets detected in diff

Block PR merge when secrets detected in diff

> **Rationale:** Hard block is the only way to guarantee secrets never reach main

#### S2: Scan entire git history weekly for existing leaks

Scan entire git history weekly for existing leaks

> **Rationale:** Detect secrets that entered before scanning was implemented

#### S3: Include security audit rules beyond just secrets

Include security audit rules beyond just secrets

> **Rationale:** Semgrep p/security-audit catches SQL injection, XSS, etc.

#### S4: Allowlist mechanism for documented false positives

Allowlist mechanism for documented false positives

> **Rationale:** Must be able to exclude test fixtures, example placeholders

#### S5: Detect 100+ secret types (AWS, GCP, GitHub, etc

Detect 100+ secret types (AWS, GCP, GitHub, etc.)

> **Rationale:** Gitleaks default ruleset covers major cloud providers and services

### Operational

#### O1: Weekly historical scan with summary report

Weekly historical scan with summary report

> **Rationale:** TruffleHog entropy analysis finds secrets regex might miss

#### O2: Manual workflow trigger for on-demand scanning

Manual workflow trigger for on-demand scanning

> **Rationale:** Ability to run security scan without pushing code

#### O3: Security findings visible in GitHub Actions summary

Security findings visible in GitHub Actions summary

> **Rationale:** Quick overview of scan results without digging through logs

#### O4: SECURITY

SECURITY.md documentation for developers

> **Rationale:** Onboarding guide for tool installation and false positive handling

---

## Tensions

### TN1: Speed vs Comprehensive Detection

Speed vs Comprehensive Detection

> **Resolution:** Pre-commit uses gitleaks --staged (only staged files, ~1-2s). CI runs full scan on diff. TruffleHog handles history weekly. Speed maintained without sacrificing coverage.

### TN2: Allowlist Mechanism vs Security Invariants

Allowlist Mechanism vs Security Invariants

> **Resolution:** Every allowlist entry in .gitleaks.toml must include comment explaining why it's a false positive. Code review catches suspicious additions. Balance security with practicality.

### TN3: Graceful Degradation vs Protection Guarantee

Graceful Degradation vs Protection Guarantee

> **Resolution:** S1 (CI hard block) is the invariant that actually enforces B1. Local scanning is early feedback for developer convenience. Secrets are caught before merge regardless of local setup.

### TN4: PR Blocking Requires SARIF Integration

PR Blocking Requires SARIF Integration

> **Resolution:** Both gitleaks and semgrep must output SARIF format. GitHub Actions uses upload-sarif action to integrate with Security tab. This enables PR blocking via branch protection rules.

### TN5: Tool Stack vs Zero Cost

Tool Stack vs Zero Cost

> **Resolution:** All three tools (Gitleaks, Semgrep, TruffleHog) are fully functional in free/OSS mode. SEMGREP_APP_TOKEN is optional enhancement, not required. No paid services needed.

---

## Required Truths

### RT-1: GitHub Actions security workflow exists and runs on all PRs

GitHub Actions security workflow exists and runs on all PRs

### RT-2: Gitleaks scans PR diffs for 100+ secret patterns

Gitleaks scans PR diffs for 100+ secret patterns

### RT-3: Semgrep runs security audit and secrets rules

Semgrep runs security audit and secrets rules

### RT-4: SARIF output uploads to GitHub Security tab

SARIF output uploads to GitHub Security tab

### RT-5: CI workflow integrates with existing ci

CI workflow integrates with existing ci.yml

### RT-6: Pre-commit hook runs gitleaks on staged files

Pre-commit hook runs gitleaks on staged files

### RT-7: Weekly TruffleHog scan checks entire git history

Weekly TruffleHog scan checks entire git history

### RT-8: Gitleaks configuration with documented allowlist

Gitleaks configuration with documented allowlist

### RT-9: SECURITY

SECURITY.md documents tool usage and false positive handling
