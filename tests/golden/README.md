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

## Phase 2 — claude -p subprocess harness (planned)

Phase 1 catches regressions from *hand edits* to a verified manifold. It does **not** yet catch regressions from changes to the skill prompts themselves — because it compares the current on-disk manifold to golden, not a freshly-regenerated one.

Phase 2 closes that gap by regenerating the manifold from scratch before comparing:

```
for phase in m0 m1 m2 m3 m4 m5:
    claude -p --dangerously-skip-permissions \
            --output-format json \
            "/manifold:{phase} <feature> [args from fixture]"
then: extractSignature → compareSignatures → golden
```

### Harness design

- `tests/golden/harness.ts` — runs the full m0→m5 sequence in a sandboxed temp directory
- Sandboxing: `cp -R` the minimum required files (skill definitions, schema, CLI binary) into a `mktemp -d` dir; set `cwd` to it; run each phase as a subprocess
- Output format: `--output-format json` so we can parse status/cost/duration per phase
- Budget: estimated ~$5 and ~45 min for 3 pilot runs of `reduce-context-rot`

### Pilot plan

1. Run 3 full regenerations of `reduce-context-rot` back-to-back
2. Extract signatures from each
3. Compute per-dimension variance across runs
4. Calibrate tolerance bands: tighten dimensions that are stable, loosen ones that drift
5. Commit calibrated tolerance back into the fixture

### Why not run the harness in CI yet

- Cost per run is non-trivial; running on every PR is wasteful
- Non-determinism needs calibration first; otherwise we get flaky failures
- Plan: gate behind a `--regenerate` flag, run nightly or on skill-file changes only

## Known limitations

- **Structural only.** If a skill regresses in *quality of statements* but preserves counts, Phase 1 won't catch it. Must-have keywords partially mitigate this but are coarse.
- **Single fixture today.** `reduce-context-rot` is the pilot. More fixtures needed for coverage breadth (auth, crud, payment, pm/feature-launch).
- **Golden assumes the *current* manifold is correct.** Bootstrap from a verified, reviewed manifold — don't snapshot a freshly-generated one without review.
