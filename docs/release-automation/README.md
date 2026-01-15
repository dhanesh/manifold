# Release Automation

Automated versioning and releases using Conventional Commits, Semantic Versioning, and GitHub Releases.

## Overview

Manifold uses a hybrid approach combining:
- **commitlint + husky** for local commit validation (developer feedback)
- **semantic-release** for CI/CD automation (version bumps, changelogs, releases)

This satisfies all constraints from the [release-automation manifold](./.manifold/release-automation.yaml).

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | MINOR (0.x.0) |
| `fix` | Bug fix | PATCH (0.0.x) |
| `perf` | Performance improvement | PATCH |
| `refactor` | Code refactoring | PATCH |
| `docs` | Documentation only | No release |
| `style` | Formatting, no code change | No release |
| `test` | Adding tests | No release |
| `build` | Build system changes | No release |
| `ci` | CI configuration | No release |
| `chore` | Maintenance | No release |
| `revert` | Reverting commits | Depends |

### Breaking Changes

Breaking changes trigger a MAJOR version bump. Indicate them with:

```
feat!: remove deprecated API endpoint

BREAKING CHANGE: The /api/v1/legacy endpoint has been removed.
Use /api/v2/modern instead.
```

Or in the footer:

```
feat: update authentication flow

BREAKING CHANGE: JWT tokens now expire after 1 hour instead of 24 hours.
```

### Examples

```bash
# Feature (MINOR bump: 1.0.0 → 1.1.0)
feat(cli): add export command for manifold data

# Bug fix (PATCH bump: 1.1.0 → 1.1.1)
fix(parser): handle empty constraint arrays

# Breaking change (MAJOR bump: 1.1.1 → 2.0.0)
feat!: require schema_version in all manifolds

BREAKING CHANGE: Manifolds without schema_version will now fail validation.
```

## Local Development

### Setup

The commit-msg hook is automatically installed via husky. If you need to reinstall:

```bash
# Install dependencies (includes commitlint and husky)
bun install

# Initialize husky (if needed)
bunx husky init
```

### Testing Commits

```bash
# Test a commit message
echo "feat: add new feature" | bunx commitlint

# Test from file
bunx commitlint --edit .git/COMMIT_EDITMSG
```

### Bypass Hook (Emergency Only)

```bash
# Skip commit validation (not recommended)
git commit --no-verify -m "emergency fix"
```

## Release Process

### Automatic Releases

Releases are triggered automatically when commits are pushed to `main`:

1. **semantic-release** analyzes commits since last release
2. Determines version bump based on commit types
3. Updates `CHANGELOG.md` with grouped changes
4. Updates `cli/package.json` version
5. Creates git tag (e.g., `v2.1.0`)
6. Creates GitHub Release with release notes
7. Builds and attaches CLI binaries

### Manual Trigger

For edge cases, you can manually trigger a release:

1. Go to **Actions** → **Release** workflow
2. Click **Run workflow**
3. Optionally enable **dry-run** to preview changes

### Dry Run

Test what would be released without actually releasing:

```bash
# Local dry-run
npx semantic-release --dry-run
```

Or use the workflow dispatch with `dry_run: true`.

## Changelog

The changelog is automatically generated in `CHANGELOG.md` with sections:

- **Features** - New functionality (`feat`)
- **Bug Fixes** - Bug fixes (`fix`)
- **Performance** - Performance improvements (`perf`)
- **Refactoring** - Code refactoring (`refactor`)

Hidden from changelog (internal):
- Documentation (`docs`)
- Styling (`style`)
- Tests (`test`)
- Build (`build`)
- CI (`ci`)
- Chores (`chore`)

## Troubleshooting

### Commit Rejected

```
⧗   input: add new feature
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

**Fix:** Use proper format: `feat: add new feature`

### No Release Created

If a push to main doesn't create a release:
- Check commit types - only `feat`, `fix`, `perf`, `refactor` trigger releases
- Ensure commits since last release include releasable types

### Version Not Bumping Correctly

- `fix` → PATCH (0.0.x)
- `feat` → MINOR (0.x.0)
- `BREAKING CHANGE` → MAJOR (x.0.0)

Check your commit messages match these patterns.

## Configuration Files

| File | Purpose |
|------|---------|
| `commitlint.config.js` | Commit message validation rules |
| `.husky/commit-msg` | Git hook for local validation |
| `.releaserc.json` | semantic-release configuration |
| `.github/workflows/release.yml` | CI/CD release pipeline |

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [semantic-release](https://semantic-release.gitbook.io/)
- [commitlint](https://commitlint.js.org/)
