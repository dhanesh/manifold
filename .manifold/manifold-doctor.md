# manifold-doctor

## Outcome

A `manifold doctor` CLI command detects repo-health problems — invalid/unparseable manifold files, `plugin/` out of sync with `install/`, stale skill fingerprints, and post-verification file drift — and reports each with an actionable fix, exiting non-zero when problems are found.

---

## Constraints

### Business

#### B1: Detects All Four Health-Problem Classes
`manifold doctor` must detect every one of the four repo-health problem classes: (1) invalid or unparseable `.manifold/*.json` / `.md` files, (2) `plugin/` out of sync with `install/`, (3) skill fingerprints in `tests/golden/skill-fingerprints.json` that no longer match `install/commands/`, and (4) post-verification file drift recorded against `.verify.json` baselines.
> **Rationale:** This is the command's reason to exist — missing any class makes the health check untrustworthy.

#### B2: No False Positives On A Healthy Repo
On a repository with no real problems, `manifold doctor` reports zero problems and exits 0. Each check's notion of "healthy" must match its authoritative source — e.g. the plugin-sync check must mirror `sync-plugin.ts`'s own file-inclusion rules so legitimately plugin-only files (`setup.md`, `hooks.json`) never register as drift.
> **Rationale:** A health tool that cries wolf gets ignored. Surfaced by the pre-mortem (a false-positive sync report).

### Technical

#### T1: Follows The Existing CLI Command Pattern
The command is implemented as `cli/commands/doctor.ts` exporting `registerDoctorCommand(program)`, registered in the CLI entry point alongside the other commands, using Commander's `.command()` / `.option()` / `.action()` pattern.
> **Rationale:** Consistency with the 13 sibling commands; deviation creates maintenance friction.

#### T2: Reuses Existing Shared Libraries
doctor reuses `cli/lib/parser` (manifold discovery and loading), `cli/lib/evidence` (`computeFileHash`, `detectDrift`), and `cli/lib/output` (formatting, `toJSON`) rather than reimplementing parsing, hashing, or output formatting.
> **Rationale:** Reimplementation would drift from the canonical behavior the rest of the CLI relies on.

#### T3: Completes Under 500ms
On a typical repository, `manifold doctor` completes in under 500ms (p99).
> **Rationale:** Fast enough to run habitually and in CI. The native-CLI <100ms norm is waived because doctor hashes all skill files and diffs the `install/` vs `plugin/` trees.

#### T4: Checks Are Independent Units
Each health check is an independent unit behind a uniform interface; adding a new check does not require modifying existing checks.
> **Rationale:** The pre-mortem surfaced the risk that a future fifth check forces a rewrite. Modular checks keep the command extensible.

### User Experience

#### U1: Every Problem Carries A Fix Command
Each problem doctor reports includes a concrete, copy-pasteable fix command (e.g. `bun scripts/sync-plugin.ts`, `bun tests/golden/bootstrap-fingerprints.ts`).
> **Rationale:** "Reports with an actionable fix" is in the outcome — a problem without a remedy wastes the reader's time.

#### U2: Reports All Problems, Never Stops At First
doctor runs all four checks and reports every problem found, grouped by check. It never aborts after the first failing check.
> **Rationale:** A health check exists to show the full picture; fail-fast would hide problems and force repeated runs.

#### U3: Provides A --json Output Mode
doctor exposes a `--json` flag that emits a machine-readable report, consistent with the `--json` flag on `drift`, `status`, and other sibling commands.
> **Rationale:** Required for CI consumption and scripting; matches the established interface convention.

### Security

#### S1: Strictly Read-Only
doctor never creates, modifies, or deletes any file. The implementation contains no filesystem write path; remediation is out of scope (no `--fix`).
> **Rationale:** A diagnostic that can mutate the repo is dangerous to run habitually; read-only makes it always safe to invoke.

### Operational

#### O1: Deterministic Exit Codes
doctor returns deterministic exit codes: `0` when the repo is healthy, `1` on a command error (e.g. not run inside a manifold repo), `2` when health problems are found.
> **Rationale:** Matches the `validate` / `drift` convention (0/1/2) and lets CI distinguish "repo unhealthy" from "doctor itself failed".

#### O2: CI-Adoptable Without Workflow Changes
doctor's deterministic exit codes and `--json` mode make it adoptable by the existing diff-guard CI workflow with no doctor-side changes. This feature does not modify any `.github/workflows/` file.
> **Rationale:** Catching drift in CI is the long-term value; keeping the wiring as a separate change keeps this feature's scope tight.

---

## Tensions

### TN1: Thoroughness vs Speed
Detecting all four problem classes completely — hashing every skill file, diffing the full `install/`↔`plugin/` tree, parsing every manifold, comparing every drift baseline — costs I/O and CPU. The more exhaustive the checks (B1, U2 — both invariants), the harder the <500ms p99 goal (T3).

**TRIZ:** Technical contradiction — Performance vs Completeness. Nearest parameter pair: Performance vs Reliability → P2 (Extraction), P1 (Segmentation), P10 (Prior action).

> **Resolution:** Extract all filesystem reads into a single pass that builds an in-memory **repo snapshot**; all four checks consume that snapshot rather than doing their own I/O. B1 and U2 are invariants and stay fully satisfied; T3 is a goal and is *helped* by eliminating redundant reads. **Propagation:** T3 LOOSENED (one pass, not four); T4 TIGHTENED (checks must now take the snapshot as input — see TN2).

### TN2: Modular Checks vs Redundant I/O
T4 wants each check to be an independent unit. The naive realization — each check walks the filesystem itself — would read and hash the same files four times, undermining T3. T4's modularity has a hidden dependency on *how* I/O is structured.

**TRIZ:** P2 (Extraction — pull I/O out of the checks), P24 (Intermediary — the snapshot mediates between the filesystem and the checks).

> **Resolution:** The shared snapshot from TN1 *is* the resolution. Each check becomes a pure function `(snapshot) => Problem[]` — independent and individually testable (T4 preserved), with zero redundant traversal. Modularity and performance are reconciled by the same intermediary.

---

## Required Truths

### RT-1: The doctor command exists and is registered
A `doctor` command is implemented as `cli/commands/doctor.ts` exporting `registerDoctorCommand(program)` and is wired into the CLI entry point alongside the other commands.
**Gap:** No `doctor` command exists today.

### RT-2: A single shared repo snapshot is built once
Before any check runs, one filesystem pass builds an in-memory snapshot capturing everything the checks need: parsed `.manifold/*` files, the `install/` and `plugin/` command trees, the recorded skill fingerprints, and the `.verify.json` drift baselines.
**Gap:** No snapshot layer exists. This is the **binding constraint** — every check and the aggregator depend on it.

### RT-3: Each problem class has a dedicated check, pure over the snapshot
Each of the four problem classes (invalid manifolds, plugin↔install sync drift, stale fingerprints, file drift) has its own check implemented as a pure function `(snapshot) => Problem[]`. All four always run.
**Gap:** No checks exist.

### RT-4: Each check's verdict matches its authoritative source
The plugin-sync check mirrors `sync-plugin.ts`'s own file-inclusion rules; the fingerprint check uses the same `fingerprintSkills()` the golden sentinel uses; the manifold-validity check uses the real `cli/lib/parser`; the drift check uses `cli/lib/evidence`'s `detectDrift`. This is what makes B2 (no false positives) hold.
**Gap:** Authoritative-source alignment must be built deliberately — a naive reimplementation would diverge.

### RT-5: Every problem record carries a fix command
Each `Problem` emitted by a check includes a concrete, copy-pasteable remediation command.
**Gap:** No `Problem` shape is defined yet.

### RT-6: Problems aggregate into one result with a deterministic exit code and dual rendering
All check outputs aggregate into a single result that yields exit code `0`/`1`/`2` deterministically and renders as either human-readable text or `--json`.
**Gap:** No aggregation or rendering layer exists.

### RT-7: The doctor code path performs no filesystem writes
The entire `doctor` code path contains no `writeFileSync` / `mkdirSync` / `rmSync` or equivalent — it is provably read-only.
**Gap:** Must be enforced by construction and guarded by a test.

---

## Solution Space

### Option A: Single-file command
Everything — snapshot builder, four checks, aggregation, rendering — lives in `cli/commands/doctor.ts`.
- Satisfies: RT-1, RT-3, RT-5, RT-6, RT-7
- Gaps: RT-2 modularity weak — checks are functions in one large file; RT-4 harder to test in isolation
- Complexity: Low · Reversibility: TWO_WAY

### Option B: Command + checks module  ← Recommended
`cli/commands/doctor.ts` handles registration, orchestration, and rendering. `cli/lib/doctor.ts` holds the snapshot builder and the four exported check functions.
- Satisfies: RT-1 – RT-7
- Gaps: None
- Complexity: Medium · Reversibility: TWO_WAY
- **Why:** Structural module boundary makes each check independently testable (T4, RT-3) and matches the repo's own `cli/commands/X.ts` + `cli/lib/` convention — without over-fragmenting a feature this size.

### Option C: Command + per-check files
`cli/commands/doctor.ts` + `cli/lib/doctor/snapshot.ts` + `cli/lib/doctor/checks/*.ts` (one file per check).
- Satisfies: RT-1 – RT-7
- Gaps: None, but more files than a four-check feature warrants (YAGNI)
- Complexity: Medium-High · Reversibility: TWO_WAY

**Recommendation: Option B** — full RT coverage, honours both tension resolutions (shared snapshot + pure-function checks), matches existing repo structure.
