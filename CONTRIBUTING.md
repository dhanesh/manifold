# Contributing to Manifold

<!-- Satisfies: RT-12 (Contribution Guide), O2 (Contribution-Friendly) -->

Manifold is maintained by one person in his spare time. That shapes two things
below: the work is cut into small pieces you can finish in an evening, and there
is a written promise about how fast you hear back. Both are meant to make this a
repo where a drive-by PR is worth your time.

## Start here

**Never touched this codebase?** Pick one of the
[good first issues](https://github.com/dhanesh/manifold/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
Each one names the files to change and sketches the approach — you should not
have to go hunting for where the code lives.

**Just want to get it running?**

```bash
git clone https://github.com/dhanesh/manifold.git
cd manifold
bun install                     # includes commit hooks
bun test                        # should be green on a fresh clone
```

You need [Bun](https://bun.sh). Nothing else — no database, no API keys, no
network access at runtime.

**Then:** branch, change, commit with a [conventional commit](#commit-convention)
message, open the PR. You do not need to ask permission first, and you do not
need to claim an issue before working on it — though a one-line "taking this"
comment saves someone else duplicating you.

## What happens after you open a PR

This is the part most repos leave you guessing about.

| | Commitment |
|---|---|
| **First human response** | Within **3 days.** A real reply — merged, questions, or "here's what needs to change" — not a bot. |
| **Decision on a scoped PR** | Within **7 days.** Scoped means one issue, one concern, reviewable in a sitting. |
| **Large or design-changing PR** | You get a reply in 3 days, but the decision may take longer. Open an issue first for these so you don't build something that gets turned down. |
| **If you hear nothing** | The commitment was missed. Comment on your own PR — that's not rude, it's the escalation path. |

CI runs on every PR: tests, Windows build check, Manifold verification, plugin
sync guard, and a security scan. A red CI is normal on a first PR and is not
held against you — the usual fix is `bun run build:all` (see below).

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

A commit hook checks the format locally, so you find out before you push.

## The one rule that trips people up

**Edit in `install/`, not `plugin/`.**

The `plugin/` directory is auto-generated from `install/`. If you edit `plugin/`
directly your change is overwritten and CI fails.

| File Type | Edit Here | Auto-synced To |
|-----------|-----------|---------------|
| Slash commands | `install/commands/*.md` | `plugin/commands/` |
| Hooks | `install/hooks/` | `plugin/hooks/` |
| Templates | `install/templates/` | `plugin/templates/` |
| TypeScript modules | `install/lib/` | `plugin/lib/` |

After editing `install/`, run `bun run build:all` and commit what it produces.

### Build Commands

```bash
bun run build:commands         # Rebuild Gemini/Codex translations
bun run build:parallel-bundle  # Bundle parallel library
bun run sync:plugin            # Sync install/ → plugin/
bun run build:all              # All of the above
```

## Testing

```bash
bun test                       # All tests
bun test cli/__tests__/        # CLI tests only
bun test --watch               # Watch mode
```

Test files live in `cli/__tests__/` and `tests/`. Tests verify constraints, not
implementation details.

## Where things live

```
cli/                         ← The `manifold` binary (commands + lib)
install/                     ← Source of truth for agent commands, hooks, templates
plugin/                      ← GENERATED from install/ — never edit by hand
docs/                        ← All user-facing documentation
examples/                    ← Example manifolds (JSON + Markdown pairs)
tests/                       ← Integration and golden tests
```

Documentation map:

```
README.md                    ← Entry point (~300 lines, links to docs/)
CLAUDE.md                    ← AI agent instructions
CONTRIBUTING.md              ← This file
docs/
├── quickstart.md            ← Getting started
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

## Recipes

### Adding a CLI command

1. Create `cli/commands/<name>.ts`
2. Register in `cli/index.ts`
3. Add to `docs/cli-reference.md` (the canonical reference)
4. Add tests in `cli/__tests__/`
5. Update shell completions in `cli/commands/completion.ts` — **all three**
   templates (`BASH_COMPLETION`, `ZSH_COMPLETION`, `FISH_COMPLETION`), including
   the command list near the top of each

### Adding a template

1. Create `install/templates/<name>.json` (structure) and `<name>.md` (content)
2. Include at least: 3 invariants, 3 boundaries, 3 goals
3. Document common tensions
4. Add to `install/templates/README.md`
5. Add to the template list in `cli/commands/completion.ts`

## CI Validation

The diff-guard workflow (`.github/workflows/manifold-diff-guard.yml`) runs on every push and verifies:

- Plugin sync is up to date (`install/` matches `plugin/`)
- Build artifacts are current
- Manifold schemas validate

If CI fails after your changes, run `bun run build:all` locally and commit the results.

## Before you push

Not a gate — CI checks all of this for you. It's just faster to catch it here:

- `bun test` passes
- `bun run build:all` succeeds and you committed anything it changed
- If you changed a CLI command: `docs/cli-reference.md` is updated
- If you added a template: `install/templates/README.md` is updated
- No real secrets in examples — use placeholders

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
