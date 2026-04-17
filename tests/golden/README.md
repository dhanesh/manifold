# Golden-File Regression for Manifold Skills

Structural regression tests for the AI-driven `/manifold:m0`–`/manifold:m5` skills. Ensures that changes to skill prompts don't silently degrade the quality of manifolds they produce.

## Why

The manifold workflow is executed by an LLM following natural-language skill files. When those skills change, output quality can regress in ways unit tests don't catch — fewer constraints surfaced, tensions going unresolved, evidence rot, phase transitions skipped. We need a regression signal that compares *structural shape* (counts, coverage, completeness) rather than verbatim text, because LLM output is non-deterministic but its *signature* should stay stable.

## Architecture (Phase 1 — current)

```
fixtures/<feature>.yaml      → declares what a feature should look like (keywords, tolerance bands)
signature.ts                 → extracts a Signature from .manifold/<feature>.* files
compare.ts                   → compares two signatures with per-dimension tolerance
goldens/<feature>.json       → recorded signature from a known-good run
runner.ts                    → CLI — compare current manifold against golden
bootstrap.ts                 → CLI — snapshot current manifold as the new golden
golden.test.ts               → bun test wrapper (one test per fixture)
compare.test.ts              → unit tests for the comparator itself
```

### What the signature captures

Not full manifold contents — only structural facts that, if they drift, indicate skill regression:

- Phase, domain, schema version, convergence status
- Constraint counts by category and type, coverage of `source` / `challenger` / `threshold`
- Tension counts by type, resolution rate, TRIZ + propagation coverage
- Required-truth counts, depth, status distribution, binding-constraint presence
- Generation artifact counts by type/class, coverage %
- Evidence counts by type/status
- Iteration count and phase sequence
- Markdown section presence, line count, must-have keyword hits

### Tolerance kinds

Different dimensions tolerate different amounts of drift. Fixture YAML declares per-path tolerance:

| Kind | Meaning | Use for |
|---|---|---|
| `exact` | equality | phase, convergence_status, schema_version |
| `bool_exact` | boolean equality | binding_constraint_present, recommended_option_present |
| `range` | value in `[min, max]` | bounded counts (e.g. 3–8 tensions) |
| `ratio` | within `golden × [1-r, 1+r]` | proportional counts allowed to drift |
| `superset` | actual contains all golden entries | must-have keywords, phase sequence |

Any dimension *not* declared falls through to type-based defaults: booleans → `bool_exact`, numbers → `ratio r=0.3`, strings → `exact`. Must-have keywords are always required regardless of tolerance config — they're fixture-level invariants, not structural bands.

## How to use

### Run the regression suite

```bash
bun test tests/golden/
```

One test per fixture in `fixtures/`, plus unit tests for the comparator. Each fixture test fails if the current `.manifold/<feature>.*` signature has drifted from the recorded golden outside the declared tolerance.

### Or use the standalone CLI (richer diff output)

```bash
bun tests/golden/runner.ts                      # all fixtures
bun tests/golden/runner.ts reduce-context-rot   # one fixture
```

Exit 0 on pass, 1 on any diff. Prints path-level diff info for each drift.

### Add a new fixture

1. Pick a feature that has a verified manifold in `.manifold/<feature>.*` today.
2. Create `tests/golden/fixtures/<feature>.yaml` declaring outcome, must-have keywords, and tolerance map (see `reduce-context-rot.yaml` as a template).
3. Snapshot the current manifold as the golden:

   ```bash
   bun tests/golden/bootstrap.ts <feature>
   ```

4. Commit both the fixture and the generated `goldens/<feature>.json`.

### Update a stale golden

If the manifold legitimately changed (you added constraints, resolved new tensions, etc.) and the regression now fails, re-snapshot:

```bash
bun tests/golden/bootstrap.ts <feature>
```

Review the git diff on the JSON before committing — large jumps in counts are a signal to double-check the change was intentional.

## Phase 2 — claude -p subprocess harness (implemented)

Phase 1 catches regressions from *hand edits* to a verified manifold. It does **not** catch regressions from changes to the skill prompts themselves — because it compares the current on-disk manifold to golden, not a freshly-regenerated one.

Phase 2 closes that gap by regenerating the manifold from scratch via `claude -p` subprocesses, then comparing:

```
for phase in m0 m1 m2 m3 m4 m5:
    claude -p --plugin-dir=<repo>/plugin \
            --output-format json \
            --dangerously-skip-permissions \
            --no-session-persistence \
            --max-budget-usd <cap> \
            "/manifold:{phase} <feature> [args]"
then: extractSignature → compareSignatures → golden
```

### Usage

```bash
# Full m0→m5 run (~$5–10, ~10–15 min)
bun tests/golden/harness.ts reduce-context-rot --budget 25 --out run-1.json

# Single-phase diagnostic
bun tests/golden/harness.ts reduce-context-rot --phases m0 --budget 2

# Resume a partial run (picks up where a previous run stopped — preserves cost)
bun tests/golden/harness.ts reduce-context-rot \
    --sandbox /var/folders/.../manifold-harness-abc \
    --phases m3,m4,m5 --budget 20 --out run-1-resumed.json
```

### Harness design

- `tests/golden/harness.ts` — runs the m0→m5 sequence in a sandboxed temp dir
- Sandbox: `mktemp -d` + `git init`; the `plugin/` directory is loaded via `--plugin-dir` (no copying)
- Per-phase cost caps in `PHASES[]` provide a hard ceiling even if something loops
- `--skip-lookup` on m1/m2/m3 suppresses web-search cost and variance
- `--no-session-persistence` ensures each phase reads state from `.manifold/` on disk (the whole point)
- Model pinned to `claude-opus-4-7`

### Post-condition check (silent-failure guard)

A subprocess can exit cleanly while the model merely *narrates* the phase work without writing the manifold. Without a check, this cascades: m1 "succeeds" with no constraints, m2 "succeeds" with no tensions, etc., and the whole run looks green at the subprocess level while producing useless state.

After each subprocess, the harness re-reads `.manifold/<feature>.json` and fails the phase if `phase` didn't advance to `expectedPhase`. This turns silent no-ops into loud FAILs at the originating phase. The per-phase `PhaseResult` records both `observed_phase` and `phase_advanced` so the run log captures the discrepancy.

### Pilot findings (`pilot/validation-run-1.json`)

Partial m0→m2 run against `reduce-context-rot` (m3 blocked by Anthropic 5-hour usage cap):

- **m0** ok, $0.34, 6 turns — phase INITIALIZED
- **m1** ok, $0.69, 9 turns — phase CONSTRAINED (16 constraints)
- **m2** ok, $1.67, 22 turns — phase TENSIONED (6 tensions, all resolved)
- **m3** FAIL, $0, 1 turn — rate-limited before any work
- Total: $2.69, 9.4 min

**Non-determinism observation.** Across earlier harness runs, `/manifold:m1-constrain` was non-deterministic in headless mode: most runs wrote constraints to disk; at least one narrated the discovery without writing. The post-condition check exists specifically to surface this without inflating cost by cascading through the remaining phases.

**m4 fixture-scope finding (`pilot/validation-run-1-resumed.json`).** After the rate limit reset, resuming m3→m5 exposed a second headless-mode quirk: when m4 is invoked on a *meta* feature like `reduce-context-rot` (whose real implementation target is the manifold repo itself, not the sandbox), m4's scope-guard rule kicks in and asks "prototype here, spec-only, or point me at the real repo?" — then stops, because there is no interactive human to answer. Post-condition flags this as FAIL at m4 with phase still ANCHORED; no cascade. The harness works as designed; the fixture simply asks a non-sandboxable question. A non-meta fixture (e.g. a future `payment-retry` regression) should progress through m4 cleanly. Combined cost of the two-part run was $4.92 for m0→ANCHORED + m4 scope probe.

**Golden calibration is deferred** until a full m0→m5 run completes on a non-meta fixture.

### Rate limits

Cost caps (`--max-budget-usd`, `--budget`) guard against runaway per-request spend. They are orthogonal to the Anthropic 5-hour rolling usage cap, which causes clean `claude -p` subprocess exits with a human-readable "You've hit your limit" message. The harness treats this as a phase FAIL (cost_usd=0, num_turns=1); the `--sandbox` flag then lets the same sandbox be reused after the cap resets.

### Why not run the harness in CI yet

- Cost per run is non-trivial; running on every PR is wasteful
- Non-determinism (m1 behavior above) needs calibration first; otherwise we get flaky failures
- Plan: gate behind a `--regenerate` flag, run nightly or on skill-file changes only

## Skill-text fingerprint sentinel (free)

Orthogonal to the subprocess harness: a SHA-256 hash of each `install/commands/*.md`. This runs in <10ms as a bun test, has zero API cost, and catches unintentional edits between commits.

```bash
# Regenerate fingerprints after an INTENTIONAL skill edit
bun tests/golden/bootstrap-fingerprints.ts

# Check — this is what CI/bun test runs
bun test tests/golden/fingerprint.test.ts
```

Three assertions: no skill added without fingerprinting, no skill removed without updating fingerprints, and each skill's current content hash matches the recorded baseline. Failure mode tells the committer exactly which command to run to accept the change.

## Known limitations

- **Structural only.** If a skill regresses in *quality of statements* but preserves counts, Phase 1 won't catch it. Must-have keywords partially mitigate this but are coarse.
- **Single fixture today.** `reduce-context-rot` is the pilot. More fixtures needed for coverage breadth (auth, crud, payment, pm/feature-launch).
- **Golden assumes the *current* manifold is correct.** Bootstrap from a verified, reviewed manifold — don't snapshot a freshly-generated one without review.
- **Phase 2 golden not yet calibrated.** A full m0→m5 regeneration is needed before the fixture's tolerance bands can be tuned to real per-dimension variance.
