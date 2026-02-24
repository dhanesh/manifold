# Contributing to Manifold

<!-- Satisfies: RT-12 (Contribution Guide), O2 (Contribution-Friendly) -->

## Quick Start

```bash
bun install                     # Install dependencies (includes commit hooks)
bun test                        # Run tests
bun run build:all               # Build all artifacts
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with automated releases:

| Prefix | Release Type | Example |
|--------|-------------|---------|
| `feat:` | Minor (1.x.0) | `feat: add graph export` |
| `fix:` | Patch (1.0.x) | `fix: validate exit code` |
| `perf:` | Patch | `perf: cache graph lookups` |
| `docs:` | No release | `docs: update CLI reference` |
| `test:` | No release | `test: add evidence tests` |
| `chore:` | No release | `chore: update deps` |

## Documentation Structure

```
README.md                    ← Entry point (~300 lines, links to docs/)
CLAUDE.md                    ← AI agent instructions
CONTRIBUTING.md              ← This file
docs/
├── quickstart.md            ← 15-minute getting started
├── cli-reference.md         ← Complete CLI command reference (SINGLE SOURCE)
├── evidence-system.md       ← Evidence types and verification
├── troubleshooting.md       ← Common errors and fixes
├── GLOSSARY.md              ← Terminology explanations
├── WHEN_NOT_TO_USE.md       ← When simpler approaches work better
├── SECURITY.md              ← Security model
├── walkthrough/README.md    ← End-to-end example
├── parallel-agents/README.md ← Parallel execution guide
├── pm/                      ← Product Manager guides
├── non-programming/         ← Non-programming use cases
├── research/                ← Scientific foundations
└── release-automation/      ← Release process
```

### Key Rule: Single Source of Truth

Each piece of information lives in **one place**. Other documents link to it.

| Information | Canonical Location | Other docs link to it |
|-------------|-------------------|----------------------|
| CLI commands and flags | `docs/cli-reference.md` | README, CLAUDE.md |
| Constraint types/categories | `install/commands/SCHEMA_REFERENCE.md` | README, GLOSSARY |
| Evidence types | `docs/evidence-system.md` | cli-reference, CLAUDE.md |
| Terminology | `docs/GLOSSARY.md` | All docs |

**When updating:** Edit the canonical location, verify links still work.

## Editing Files

### Edit in `install/`, not `plugin/`

The `plugin/` directory is auto-generated from `install/`. Always edit in `install/`:

| File Type | Edit Here | Auto-synced To |
|-----------|-----------|---------------|
| Slash commands | `install/commands/*.md` | `plugin/commands/` |
| Hooks | `install/hooks/` | `plugin/hooks/` |
| Templates | `install/templates/` | `plugin/templates/` |
| TypeScript modules | `install/lib/` | `plugin/lib/` |

After editing, run `bun run sync:plugin` or `bun run build:all`.

### Build Commands

```bash
bun run build:commands         # Rebuild Gemini/Codex translations
bun run build:parallel-bundle  # Bundle parallel library
bun run sync:plugin            # Sync install/ → plugin/
bun run build:all              # All of the above
```

## Adding a CLI Command

1. Create `cli/commands/<name>.ts`
2. Register in `cli/index.ts`
3. Add to `docs/cli-reference.md` (the canonical reference)
4. Add tests in `cli/__tests__/`
5. Update shell completions in `cli/commands/completion.ts`

## Adding a Template

1. Create `install/templates/<name>.json` (structure) and `<name>.md` (content)
2. Include at least: 3 invariants, 3 boundaries, 3 goals
3. Document common tensions
4. Add to `install/templates/README.md`
5. Add to completion script template list

## CI Validation

The diff-guard workflow (`.github/workflows/manifold-diff-guard.yml`) runs on every push and verifies:
- Plugin sync is up to date (`install/` matches `plugin/`)
- Build artifacts are current
- Manifold schemas validate

If CI fails after your changes, run `bun run build:all` locally and commit the results.

## PR Checklist

Before submitting a pull request:

- [ ] Tests pass: `bun test`
- [ ] Build succeeds: `bun run build:all`
- [ ] Manifolds validate: `manifold validate`
- [ ] If you added/changed a CLI command: updated `docs/cli-reference.md`
- [ ] If you added/changed a template: updated `install/templates/README.md`
- [ ] If you added a new feature: added to README features list
- [ ] No secrets in examples (use placeholder values)
- [ ] Conventional commit message format

## Testing

```bash
bun test                       # All tests
bun test cli/__tests__/        # CLI tests only
bun test --watch               # Watch mode
```

Test files live in `cli/__tests__/` and `tests/`. Tests verify constraints, not implementation details.
