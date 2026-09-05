# Manifold

[![Release](https://img.shields.io/github/v/release/dhanesh/manifold)](https://github.com/dhanesh/manifold/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Works with](https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20AMP%20%C2%B7%20Gemini%20CLI%20%C2%B7%20Codex%20CLI-555)](#install)

**Your design has contradictions in it right now. Manifold finds them before you write the code.**

Your coding agent will happily implement a spec that contradicts itself. Manifold is the planning layer it doesn't have: you state an outcome, it interviews you across five constraint categories, then reports which pairs of your own requirements can't both be true — and makes you resolve them while resolving is still cheap.

It doesn't write code. It decides what your agent should write, and it works with Claude Code, AMP, Gemini CLI, and Codex CLI. The CLI itself is a compiled binary with no model in the path.

![A verified manifold, then a broken one: `manifold status manifold-doctor` reports Phase VERIFIED (6/6), 2 tensions resolved, 7/7 required truths. A tension is added referencing constraint ZZ9, which does not exist. `manifold validate manifold-doctor` then reports 2 errors and exits 2.](docs/assets/demo.gif)

_v2.35.1 — the 72nd tagged release since January 2026. Manifold was specified with itself: [`.manifold/`](.manifold/) holds 22 manifolds, 21 of them verified — one is the example below._

## A real one

While designing `manifold doctor` — a command that runs four repo-health checks — two requirements were written down independently:

- **T3:** completes in under 500ms
- **T4:** each check is an independent unit; adding a fifth check doesn't modify the other four

Both are reasonable. Together they're a trap, and Manifold said so before implementation:

```
### TN2: Modular Checks vs Redundant I/O

T4 wants each check to be an independent unit. The naive realization — each
check walks the filesystem itself — would read and hash the same files four
times, undermining T3. T4's modularity has a hidden dependency on *how* I/O
is structured.

> Resolution: Each check becomes a pure function (snapshot) => Problem[] —
> independent and individually testable (T4 preserved), with zero redundant
> traversal. Modularity and performance are reconciled by the same
> intermediary.
```

That "snapshot" is one shared filesystem pass, introduced a few lines earlier to resolve a related tension. Nobody wrote it down as a requirement; it fell out of holding two requirements next to each other.

**Without this:** you write four clean, self-contained checks. It works. Months later it's the slowest thing in CI, and the modular design you were proud of is the reason — so the fix touches all four.

**With this:** the snapshot layer was in the spec before any code existed. [`cli/lib/doctor.ts`](cli/lib/doctor.ts) still carries the trace:

```ts
// Satisfies: RT-2 (one shared snapshot, all filesystem reads in one pass)

/**
 * All data needed by the four check functions, gathered in a single pass.
 * Check functions are pure: (RepoSnapshot) => Problem[].
 */
export interface RepoSnapshot {
```

The tension, the resolution, and the code are all in this repo. Read [`.manifold/manifold-doctor.md`](.manifold/manifold-doctor.md) and check the work.

## Try it in 60 seconds

No AI agent required for this part — the CLI is a standalone binary.

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
git clone https://github.com/dhanesh/manifold && cd manifold
manifold status manifold-doctor
```

```
Feature: manifold-doctor
Schema: v3
Phase: VERIFIED (6/6)
Outcome: A `manifold doctor` CLI command detects repo-health problems ...
Constraints: Business: 2, Technical: 4, UX: 3, Security: 1, Operational: 2
Tensions: 2 detected, all resolved
Required Truths: 7/7 satisfied
Convergence: CONVERGED
```

Now break it. Open `.manifold/manifold-doctor.json`, add a tension that points at a constraint ID you never defined, and run:

```bash
manifold validate manifold-doctor
```

```
  Linked: 12/12 constraints, 2/3 tensions, 7/7 required truths
  Result: ✗ Invalid (2 errors, 0 warnings)

  Errors:
    ✗ tensions.TN3: Tension "TN3" not found in Markdown
    ✗ tensions.TN3.between: Tension "TN3" references unknown constraint "ZZ9"
```

Exit code 2. Your design doc just failed CI.

## "Isn't this just…"

**…another AI coding CLI?**
It doesn't generate code and it doesn't wrap a model. A coding agent takes a description and produces a diff; Manifold runs before that and produces the file it reads. It's a layer up rather than an alternative — the same manifold feeds whichever agent you already use, so picking it up doesn't mean putting anything down. And the parts that enforce anything (`validate`, `verify`, `drift`, `doctor`) are a compiled binary that never calls a model.

**…a linter with extra steps?**
A linter reads code you already wrote. Manifold runs before the code exists. No linter will tell you that your modular design is going to cost you 4× the I/O, because by the time a linter can see it, the decision is already load-bearing across four files.

**…a design doc?**
A design doc is prose, and nothing checks prose. Manifold's output is a structured file: constraints have IDs, tensions reference those IDs, artifacts reference the constraints they satisfy. So `manifold validate` can exit 2 when a tension points at a constraint that doesn't exist, and `manifold drift` can tell you when the code moved away from the spec it was verified against. A design doc cannot fail your build.

**…just prompt scaffolding for an LLM?**
Partly, and that's the honest answer. The discovery phases (`m1-constrain`, `m2-tension`, `m3-anchor`) are structured prompts your coding agent runs — the elicitation quality comes from the agent. What is *not* prompting: the schema, the validator, the drift detection, and the CLI, which is a compiled binary with no AI in the path (on this repo, `status` runs in ~0.15s and `doctor` in ~0.3s). The prompts produce the artifact; the binary keeps it honest.

**…way too much ceremony for a three-line fix?**
Yes. Use `/manifold:m-quick` for those, or don't use Manifold at all — see [When NOT to Use](docs/WHEN_NOT_TO_USE.md), which is a real page in these docs.

## The workflow

```
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
```

```bash
/manifold:m0-init payment-retry --outcome="95% retry success"
/manifold:m1-constrain payment-retry   # discover constraints across 5 categories
/manifold:m2-tension payment-retry     # surface conflicts: latency vs idempotency
/manifold:m3-anchor payment-retry      # reason backward from outcome
/manifold:m4-generate payment-retry    # code, tests, docs, runbooks, alerts
/manifold:m5-verify payment-retry      # validate every artifact against every constraint
```

Constraints come in three flavors — **invariant** (never violate), **boundary** (hard limit), **goal** (optimize) — across business, technical, UX, security, and operational categories. Tensions are found between them. See the [Walkthrough](docs/walkthrough/README.md) for a full run with real outputs.

## Install

**Claude Code plugin** (recommended) — two steps; the marketplace has to be added before the install resolves:

```bash
claude plugin marketplace add dhanesh/manifold
claude plugin install manifold@manifold
```

Then `/manifold:setup` inside Claude Code to fetch the CLI binary. Gives you 14 slash commands, 4 hooks, and 17 templates.

**Shell installer** — auto-detects Claude Code, AMP, Gemini CLI, and Codex CLI:

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
manifold --version
```

Installs 13 slash commands, 4 hooks, 17 templates, and a platform binary (darwin/linux/windows, arm64/x64) — no `/manifold:setup` step, the binary comes with it. Idempotent — re-run it to update. Standalone binaries are on [Releases](https://github.com/dhanesh/manifold/releases); [Uninstall](#uninstall) below.

## CLI

Deterministic, no AI round-trip, safe for CI:

```bash
manifold status [feature]     # phase, constraints, tensions, convergence
manifold validate [feature]   # schema + cross-reference check (exit 2 = invalid)
manifold verify [feature]     # artifacts exist and cover constraints
manifold drift [feature]      # files changed since verification (exit 2 = drift)
manifold doctor               # repo health, each problem with a fix command
manifold graph [feature]      # constraint network as ASCII, Mermaid, DOT, or JSON
manifold serve                # local web visualiser, no network required
```

Every command takes `--json`. In CI:

```yaml
jobs:
  manifold:
    uses: dhanesh/manifold/.github/workflows/manifold-verify.yml@main
```

Full list in the [CLI Reference](docs/cli-reference.md).

## Beyond code

`m4-prd` and `m4-stories` generate PRDs and user stories traceable to the same constraints ([PM Guide](docs/pm/guide.md)). `--domain=non-software` swaps in universal categories — Obligations, Desires, Resources, Risks, Dependencies — and produces decision briefs instead of code ([Non-Programming Guide](docs/non-programming/guide.md)).

## Built with itself

The `.manifold/` directory in this repo holds 22 manifolds, 21 carrying verification artifacts — `manifold-doctor`, `manifold-serve`, `parallel-agents`, `secret-detection`, and the rest. Every feature listed above was specified this way before it was built. They're readable, and the tensions in them are the real ones.

## Docs

| | |
|---|---|
| [Quickstart](docs/quickstart.md) | Zero to a verified feature in 15 minutes |
| [Walkthrough](docs/walkthrough/README.md) | End-to-end example with real outputs |
| [CLI Reference](docs/cli-reference.md) | Every command and flag |
| [When NOT to Use](docs/WHEN_NOT_TO_USE.md) | Cases where simpler wins |
| [Glossary](docs/GLOSSARY.md) | Plain-language terminology |
| [Evidence System](docs/evidence-system.md) | How verification proves a constraint holds |
| [Templates](install/templates/README.md) | 17 starter manifolds — 4 code (api, auth, crud, payment), 13 product |
| [Troubleshooting](docs/troubleshooting.md) | Common errors and fixes |
| [Contributing](CONTRIBUTING.md) | How to contribute |

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
```

## License

MIT
