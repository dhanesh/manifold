# Security Guidelines

> Satisfies: U4 (false positive documentation), O4 (developer security guide)
>
> This document describes the security scanning tools and practices for Manifold.

## Overview

Manifold uses a **defense-in-depth** strategy for secret detection:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Layers                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Developer Workstation          CI/CD Pipeline         Historical  │
│   ─────────────────────          ─────────────          ─────────── │
│                                                                     │
│   ┌─────────────────┐     ┌─────────────────────┐    ┌───────────┐ │
│   │   Pre-commit    │     │   Gitleaks (SARIF)  │    │TruffleHog │ │
│   │   (gitleaks)    │────▶│   Semgrep (SARIF)   │    │  (audit)  │ │
│   │                 │     │                     │    │           │ │
│   │  Catches        │     │  Catches leaked     │    │  Catches  │ │
│   │  secrets        │     │  secrets in PRs     │    │  secrets  │ │
│   │  BEFORE         │     │  BEFORE merge       │    │  in git   │ │
│   │  commit         │     │                     │    │  history  │ │
│   └─────────────────┘     └─────────────────────┘    └───────────┘ │
│                                                                     │
│   Fastest feedback          PR gate + SARIF           Deep scan    │
│                             integration                             │
└─────────────────────────────────────────────────────────────────────┘
```

| Layer | Tool | When | Purpose |
|-------|------|------|---------|
| Local | Gitleaks | Pre-commit hook | Prevent secrets from entering history |
| CI | Gitleaks + Semgrep | PR/Push | Gate merges, SARIF integration |
| Historical | TruffleHog | On-demand/weekly | Scan git history for past leaks |

---

## Setup for Developers

### 1. Install Gitleaks

Choose your preferred installation method:

**macOS (Homebrew)**
```bash
brew install gitleaks
```

**Windows (Scoop)**
```bash
scoop install gitleaks
```

**Go Install**
```bash
go install github.com/gitleaks/gitleaks/v8@latest
```

**Linux/macOS (curl)**
```bash
# Check https://github.com/gitleaks/gitleaks/releases for latest version
curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz | tar xz
sudo mv gitleaks /usr/local/bin/
```

### 2. Verify Installation

```bash
gitleaks version
# Should output: gitleaks version 8.x.x
```

### 3. Test Pre-Commit Hook

The pre-commit hook is configured via `.husky/pre-commit`. Verify it works:

```bash
# Create a test file with a fake secret
echo 'AWS_SECRET_KEY="AKIAIOSFODNN7EXAMPLE"' > test-secret.txt

# Attempt to commit (should fail)
git add test-secret.txt
git commit -m "test: should fail"
# Expected: Gitleaks blocks the commit

# Clean up
rm test-secret.txt
git reset HEAD
```

---

## Handling Detected Secrets

### If a Real Secret Is Found

**DO NOT COMMIT.** Follow these steps immediately:

1. **Remove the secret from your code**
   ```bash
   # Remove the offending line
   git checkout -- <file-with-secret>
   ```

2. **Use environment variables instead**
   ```typescript
   // WRONG: Hardcoded secret
   const apiKey = "sk-1234567890abcdef";

   // CORRECT: Environment variable
   const apiKey = process.env.API_KEY;
   ```

3. **If the secret was already committed** (even locally):
   - **Rotate the secret immediately** - assume it's compromised
   - Contact the relevant service provider (AWS, GitHub, etc.)
   - Use `git filter-branch` or BFG Repo Cleaner to remove from history
   - Force push to overwrite history (coordinate with team)

4. **Add to `.env.example`** (without real values):
   ```bash
   # .env.example
   API_KEY=your-api-key-here
   DATABASE_URL=postgres://user:password@localhost:5432/db
   ```

### If a False Positive

Gitleaks may flag strings that look like secrets but aren't (e.g., test fixtures, example values, hashes).

1. **Verify it's actually a false positive**
   - Is it a real credential? If unsure, treat it as real.
   - Is it an example/placeholder that can't be used?
   - Is it a test fixture with no production access?

2. **Add to `.gitleaks.toml` allowlist**

   Create or edit `.gitleaks.toml` in the project root:

   ```toml
   # .gitleaks.toml
   title = "Manifold Gitleaks Configuration"

   [allowlist]
   description = "Allowlisted patterns and paths"

   # Allowlist specific files
   paths = [
     '''tests/fixtures/.*''',
     '''docs/examples/.*''',
   ]

   # Allowlist specific patterns (use with caution)
   regexes = [
     '''EXAMPLE_.*''',
     '''test-api-key-.*''',
   ]

   # Allowlist specific commits (for historical issues)
   commits = [
     '''abc123def456...''',
   ]
   ```

3. **Document the rationale**

   Always include a comment explaining WHY something is allowlisted:

   ```toml
   # Allowlist test fixtures - these are fake credentials
   # used only in unit tests and have no production access
   # Added: 2024-01-15 by @developer
   paths = [
     '''tests/fixtures/mock-credentials\.json''',
   ]
   ```

4. **Get PR approval** - allowlist changes should be reviewed

### Emergency Override (Strongly Discouraged)

In rare cases, you may need to bypass the pre-commit hook:

```bash
# DANGER: Bypasses ALL pre-commit hooks
git commit --no-verify -m "emergency: fix production outage"
```

**When this is acceptable:**
- Active production incident where the secret check is blocking a critical fix
- The change contains NO actual secrets (you've verified manually)
- You immediately follow up with a proper commit

**When this is NOT acceptable:**
- "It's just a test credential" - add to allowlist instead
- "I'm in a hurry" - security is never optional
- "I'll fix it later" - you won't

---

## CI Security Workflow

The GitHub Actions security workflow runs automatically.

### Triggers

| Event | When | Purpose |
|-------|------|---------|
| Pull Request | PR to main | Gate before merge |
| Push | Push to main | Verify after merge |
| Weekly | Sunday 2am UTC | Historical scan |
| Manual | `workflow_dispatch` | On-demand scan |

### SARIF Integration

Scan results are uploaded to GitHub Security tab via SARIF format:
- Navigate to **Security** > **Code scanning alerts**
- View detected secrets with file locations
- Track remediation status

### Manual Trigger

To run a security scan on-demand:

```bash
# Via GitHub CLI
gh workflow run security.yml

# Or via GitHub UI
# Actions > Security Scan > Run workflow
```

---

## Secret Types Detected

Gitleaks detects 100+ secret patterns including:

| Category | Examples |
|----------|----------|
| **Cloud Providers** | AWS keys, GCP service accounts, Azure credentials |
| **Version Control** | GitHub tokens, GitLab tokens, Bitbucket credentials |
| **Databases** | PostgreSQL URLs, MongoDB connection strings, Redis passwords |
| **Payment** | Stripe keys, Square tokens, PayPal credentials |
| **Communication** | Slack tokens, Discord webhooks, Twilio credentials |
| **Authentication** | JWT secrets, OAuth client secrets, API keys |
| **Infrastructure** | Terraform state, Kubernetes secrets, Docker registry |
| **Private Keys** | RSA keys, SSH keys, PGP keys |

---

## Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `.gitleaks.toml` | Gitleaks configuration and allowlists | Project root |
| `.github/workflows/security.yml` | CI security workflow | `.github/workflows/` |
| `.husky/pre-commit` | Pre-commit hook configuration | `.husky/` |

### Example `.gitleaks.toml`

```toml
title = "Manifold Gitleaks Configuration"

# Extend the default rules
[extend]
useDefault = true

[allowlist]
description = "Manifold-specific allowlist"

# Paths that are safe to ignore
paths = [
  # Test fixtures with fake credentials
  '''tests/fixtures/.*''',
  # Documentation examples
  '''docs/examples/.*''',
  # Lock files
  '''bun\.lockb''',
  '''package-lock\.json''',
]

# Specific regex patterns to ignore
regexes = [
  # Example placeholders
  '''EXAMPLE_.*''',
  '''your-.*-here''',
  # Test identifiers
  '''test-[a-z]+-[0-9]+''',
]
```

### Example `.husky/pre-commit`

```bash
#!/usr/bin/env sh
# Husky pre-commit hook
# Satisfies: O4 (secret detection before commit)

# Run gitleaks on staged files
gitleaks protect --staged --verbose

# If gitleaks fails, the commit is blocked
```

---

## Reporting Security Issues

### For Manifold Security Issues

If you discover a security vulnerability in Manifold itself:

1. **DO NOT** create a public GitHub issue
2. **DO NOT** discuss in public channels (Slack, Discord, etc.)
3. **Email**: security@manifold.dev (or create a private security advisory on GitHub)
4. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### For Leaked Credentials

If you discover leaked credentials in the repository:

1. **Rotate immediately** - assume the credential is compromised
2. **Notify the team** via secure channel
3. **Remove from history** using git filter-branch or BFG Repo Cleaner
4. **Document the incident** for post-mortem

### Response Timeline

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| Critical (active exploit) | 1 hour | 24 hours |
| High (exposed credentials) | 4 hours | 48 hours |
| Medium (potential exposure) | 24 hours | 1 week |
| Low (hardening) | 1 week | 1 month |

---

## Quick Reference

### Common Commands

```bash
# Scan current directory
gitleaks detect --verbose

# Scan staged files only
gitleaks protect --staged --verbose

# Scan with custom config
gitleaks detect --config .gitleaks.toml --verbose

# Scan git history
gitleaks detect --log-opts="--all" --verbose

# Generate SARIF report
gitleaks detect --report-format sarif --report-path results.sarif
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Hook not running | Run `bun install` to set up Husky |
| False positive blocking commit | Add to `.gitleaks.toml` allowlist |
| gitleaks command not found | Install gitleaks (see Setup section) |
| CI scan failing | Check GitHub Security tab for details |

---

## See Also

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [TruffleHog Documentation](https://github.com/trufflesecurity/trufflehog)
- [Semgrep Documentation](https://semgrep.dev/docs/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
