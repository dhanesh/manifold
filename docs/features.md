# Full Feature List

The [README](../README.md#features) shows the six that matter on first read. This is
everything, grouped by **what you need to run it**.

The distinction is load-bearing. Manifold ships a native CLI *and* a set of AI agent
commands, and they do different jobs on the same `.manifold/<feature>.json` file. The
CLI is a deterministic reader, writer and renderer of that file. The agent commands
are what put non-trivial content *into* it. Installing only the CLI gets you the left
column below and nothing from the middle one.

## Native CLI

Works offline, with no agent and no API key. Typical run is under 100ms.

| Feature | Command | What it does |
|---|---|---|
| **Constraint templates** | `manifold init --template=<name>` | Scaffolds a manifold from a pre-built constraint set: auth, crud, api, payment, plus 13 PM templates. See [Templates](../install/templates/README.md). |
| **Backward reasoning** | `manifold solve --backward` | Walks the graph from the outcome to the conditions it requires. Prints required conditions, the dependency chain, the critical path, and blocking dependencies. |
| **Execution planning** | `manifold solve` | Derives a parallel execution plan from the constraint network. `--json`, `--ascii`, `--dot`, `--mermaid`. |
| **Graph rendering** | `manifold graph` | Outputs the constraint network as JSON, ASCII, Mermaid or GraphViz DOT. |
| **Status and guided workflow** | `manifold status` | Phase, constraint counts by category, tension and required-truth totals, convergence, and the suggested next step. |
| **Schema and link validation** | `manifold validate` | Schema conformance plus link integrity between constraints, tensions and required truths. Real exit codes; CI-ready. |
| **Semantic conflict check** | `manifold validate --conflicts` | Heuristic pass for contradictory invariants, resource, temporal and scope conflicts. Keyword-based — a supplement to `/manifold:m2-tension`, not a replacement. See the caveat below. |
| **Evidence verification** | `manifold verify` | Checks recorded evidence for each constraint and reports satisfaction levels. |
| **Drift detection** | `manifold drift` | SHA-256 hashes verified artifacts and reports files changed since verification. Requires artifacts already recorded in the manifold. |
| **Migration** | `manifold migrate` | Upgrades manifolds to the current schema version. |
| **Health check** | `manifold doctor` | Diagnoses a Manifold installation. |
| **Web viewer** | `manifold serve` | Serves an interactive view of the constraint network. |
| **Shell completions** | `manifold completion` | Completion scripts for bash, zsh and fish. |
| **Non-software domain** | `manifold init --domain=non-software` | Switches the manifold to universal categories (Obligations, Desires, Resources, Risks, Dependencies). Decision-focused artifacts come from the agent commands. See the [Non-Programming Guide](non-programming/guide.md). |

## AI agent commands

Requires Claude Code, AMP, Gemini CLI or Codex CLI. These are the commands that
*discover* things; the CLI only ever reports what is already in the file.

| Feature | Command | What it does |
|---|---|---|
| **Constraint discovery** | `/manifold:m1-constrain` | Interview-driven elicitation across all categories. |
| **Pre-mortem stress testing** | `/manifold:m1-constrain` | Mandatory failure-story pass after elicitation. Constraints it finds are tagged `source: pre-mortem`. |
| **Tension detection** | `/manifold:m2-tension` | Finds conflicts between constraints. **Not available in the CLI.** |
| **TRIZ-guided resolution** | `/manifold:m2-tension` | Classifies each tension against TRIZ contradiction pairs and proposes resolutions. See [TRIZ principles](triz-principles.md). |
| **Directional propagation checks** | `/manifold:m2-tension` | Traces the downstream effect of each resolution on the constraints it tightens. |
| **Bottleneck identification** | `/manifold:m3-anchor` | Theory of Constraints pass that surfaces the binding constraint before solutions are generated. |
| **Required-truth derivation** | `/manifold:m3-anchor` | Derives what must be true for the outcome, prioritized from blocking dependencies. |
| **All-at-once generation** | `/manifold:m4-generate` | Code, tests, docs, runbooks and alerts from the same constraint set, each traceable to what it satisfies. |
| **PM workflows** | `/manifold:m4-prd`, `/manifold:m4-stories` | PRDs and user stories with constraint traceability. See the [PM Guide](pm/guide.md). |
| **Verification** | `/manifold:m5-verify` | Collects evidence per constraint and records artifact hashes that `manifold drift` later checks. |
| **Integration** | `/manifold:m6-integrate` | Closes the loop back into the codebase. |
| **Light mode** | `/manifold:m-quick` | Simplified 3-phase workflow for small changes. |
| **Parallel execution** | `/manifold:parallel` | Runs independent tasks concurrently in git worktrees. See [Parallel Agents](parallel-agents/README.md). |

## Schema capabilities

Fields in the manifold format. The CLI validates and renders them; the agent commands
populate them.

| Field | Where | What it expresses |
|---|---|---|
| **Constraint genealogy** | `source`, `challenger` on each constraint | Where a constraint came from (`interview`, `pre-mortem`, `assumption`) and how challengeable it is. Guides which side of a tension gives way. |
| **Probabilistic bounds** | `probabilistic` on metric constraints | Statistical targets (p50, p99, failure rates) rather than only hard thresholds. |
| **Reversibility tagging** | on each action step | `TWO_WAY`, `REVERSIBLE_WITH_COST` or `ONE_WAY`, with explicit acknowledgment required for irreversible decisions. |
| **Tension types** | `type` on each tension | `trade_off`, `resource_tension`, `hidden_dependency`. |
| **Evidence** | `evidence` on each constraint | Concrete proof a constraint holds. See the [Evidence System](evidence-system.md). |

## Caveat on `validate --conflicts`

`manifold validate --conflicts` runs a keyword-and-heuristic pass over constraint
statements looking for contradictory invariants and resource, temporal or scope
conflicts. It is genuinely useful as a cheap second opinion, and it is genuinely not
tension detection: it has no semantic model of your domain and will miss conflicts
that are obvious to a reader. On a manifold whose tensions are already documented it
typically reports nothing. Treat a clean result as "no cheap red flags", not as
"no conflicts".

## Supported agents

| Agent | Install location |
|---|---|
| Claude Code | `~/.claude/commands/` (or the [plugin](../README.md#claude-code-plugin-recommended-for-claude-code-users)) |
| AMP | `~/.amp/commands/` |
| Gemini CLI | `~/.gemini/commands/` (translated `.toml`) |
| Codex CLI | `~/.agents/skills/manifold-*/` (`SKILL.md` skill dirs) |

See [Install](../README.md#install) for what each one gets, and the
[CLI Reference](cli-reference.md) for every flag.
