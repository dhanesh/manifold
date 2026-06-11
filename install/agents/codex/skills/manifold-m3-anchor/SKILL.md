---
name: manifold-m3-anchor
description: "Backward reasoning from desired outcome. Derives required conditions by asking 'What must be TRUE?'"
---

# /manifold:m3-anchor

# /manifold:m3-anchor - Outcome Anchoring (Requirements Derivation)

Backward reasoning from desired outcome to required conditions.

> **Discipline:** This command follows [`references/execution-discipline.md`](references/execution-discipline.md) — the Iron Law of verification, the never-start-on-`main` rule, and the Red Flags below.

> **Plain Language**: Instead of planning forward ("build X, then Y, then Z"), we work backward from the goal: "For our goal to be achieved, what MUST be true?" This surfaces hidden requirements early.
>
> **Key terms**: A *required truth* (RT) is a precondition — something that MUST be true for the outcome to succeed. An *anchor* is the result of backward reasoning from the outcome. The *binding constraint* is the single hardest-to-close required truth that, if unresolved, blocks all solution options. *Convergence* is the point where all required truths are satisfied.

## Scope Guard

**This phase ONLY updates `.manifold/<feature>.json` and `.manifold/<feature>.md`** with required truths, gaps, and solution options. Solution options are PROPOSALS, not instructions to build -- m4-generate handles implementation.
**After updating manifold files: display anchoring summary, suggest next step, STOP.**

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `ANCHORED` |
| **Next Phase** | `GENERATED` (via /manifold:m4-generate) |
| **Required Truth Statuses** | `SATISFIED`, `PARTIAL`, `NOT_SATISFIED`, `SPECIFICATION_READY` |
| **Required Truth ID Prefix** | RT-1, RT-2, RT-3... |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new statuses.

## Output Format: JSON+Markdown Hybrid

**CRITICAL**: Generate TWO outputs, not one YAML file.

### 1. JSON Structure (IDs, statuses, maps ONLY)

Update `.manifold/<feature>.json` with required truth references:

```json
{
  "anchors": {
    "required_truths": [
      {
        "id": "RT-1",
        "status": "NOT_SATISFIED",
        "maps_to": ["B1", "T1"],
        "parent": "OUTCOME",
        "relevance": 0.95,
        "confidence": 1.0,
        "evidence": [
          {"id": "E1", "type": "file_exists", "path": "src/retry/error-classifier.ts", "status": "PENDING"}
        ]
      },
      {
        "id": "RT-2",
        "status": "SPECIFICATION_READY",
        "maps_to": ["B2"],
        "parent": "RT-1",
        "relevance": 0.8,
        "confidence": 0.7
      }
    ],
    "recommended_option": "C"
  }
}
```

**Key rule**: JSON contains NO text content. Only IDs, statuses, and constraint mappings.

### 2. Markdown Content (statements and gaps)

Update `.manifold/<feature>.md` with required truth content:

```markdown
## Required Truths

### RT-1: Error Classification System

Can distinguish transient from permanent failures.

**Gap:** No current error taxonomy exists.

### RT-2: Idempotent Retries

Retries are idempotent via transaction idempotency keys.

**Gap:** Current system lacks idempotency implementation.

---

## Solution Space

### Option A: Client-side Exponential Backoff
- Satisfies: RT-3
- Gaps: RT-2, RT-4, RT-5
- Complexity: Low

### Option B: Server-side Workflow Engine
- Satisfies: RT-1, RT-2, RT-3, RT-4, RT-5
- Gaps: None
- Complexity: High

### Option C: Hybrid (Client retry + Server queue) ← Recommended
- Satisfies: RT-1, RT-3, RT-5
- Gaps: None (with implementation)
- Complexity: Medium
```

### Markdown Heading Rules

| ID Pattern | Markdown Heading Level | Example |
|------------|------------------------|---------|
| RT-1, RT-2 | `###` (h3) | `### RT-1: Error Classification` |

## Iteration Recording

**Append to `"iterations"` array** in JSON when phase completes:
```json
{
  "iterations": [
    {
      "number": 3,
      "phase": "anchor",
      "timestamp": "2026-04-04T00:00:00Z",
      "result": "Derived 6 required truths, recommended Option A",
      "required_truths": 6,
      "by_status": { "SATISFIED": 0, "PARTIAL": 1, "NOT_SATISFIED": 3, "SPECIFICATION_READY": 2 },
      "solution_options": 3,
      "selected_option": "Option A"
    }
  ]
}
```

> **REQUIRED**: Every iteration MUST have `number`, `phase`, `timestamp`, and `result` (string). Omitting `result` fails schema validation.

**Evidence Types** (v3):
- `file_exists` - Verify file exists on disk
- `content_match` - Grep for pattern in file
- `test_passes` - Run test and check exit code
- `metric_value` - Check runtime metric threshold
- `manual_review` - Requires human verification

## Usage

```
/manifold:m3-anchor <feature-name> [--outcome="<statement>"] [--skip-lookup]
```

## Why Backward Reasoning?

Forward planning starts with a spec and discovers missing requirements late. Backward reasoning starts with the outcome and asks "What must be TRUE?" — this surfaces hidden assumptions and implicit requirements early, before implementation begins.

## Process

1. **State the outcome** - Clear, measurable success criteria
2. **Check blocking dependencies** - Read `blocking_dependencies` from JSON (written by m2). If present, derive required truths for the BLOCKER constraints FIRST -- these are the strongest candidates for the binding constraint. If `draft_required_truths` (from m1) exist for blocking constraints, validate those as starting seeds.
3. **Ask "What must be TRUE?"** - Necessary conditions for outcome
4. **Derive required truths** - Chain backward from each condition
5. **Score each edge** - For every RT, record its `parent` ("OUTCOME" or a parent RT) and the edge's `relevance` and `confidence` (see Edge Map below)
6. **Identify gaps** - What's missing between current state and requirements?
7. **Generate solution space** - Options that satisfy all required truths

## Edge Map: Relevance & Confidence (the backward-reasoning tree is a *map*, not a list)

A flat list of required truths hides the reasoning. Each RT is a **node with one parent** — either
`OUTCOME` (top-level necessary condition) or another RT (a sub-truth the parent depends on). Every
parent→child **edge** carries two scores in `[0,1]`:

| Field | Question it answers | Anchors |
|-------|---------------------|---------|
| `relevance` | Does "child TRUE" genuinely make "parent TRUE" more achievable — is it a *real* prerequisite, not decorative? | `1.0` = parent is impossible without it · `0.5` = materially helps · `≤0.3` = tangential ⇒ **drop the RT** |
| `confidence` | How *necessary* is the child — invariant-grade necessity vs. merely one helpful option? | `1.0` = must hold, no substitute · `0.7` = strong but alternatives exist · `0.4` = merely helpful |

**Derivation rules:**
- Assign `parent`, `relevance`, `confidence` **as you derive each RT** — not post-hoc. The scores
  are part of the reasoning, not decoration on top of it.
- **Calibrate to what an independent reviewer would assign, not to your hopes.** Before writing each
  edge, ask: *"If a skeptical reviewer who has never seen my reasoning re-scored this edge from the
  outcome and the constraints alone, what number would they pick?"* Emit **that** number. Your score
  is correct only when it survives that re-scoring — systematic over- or under-confidence is the
  primary defect this phase is graded on.
- **Use the full scale; mid-range is the common case.** Snap each score to the nearest anchor in the
  tables above (`1.0 / 0.85 / 0.7 / 0.5 / 0.4 / 0.3`) rather than rounding everything to `1.0`.
  Reserve `confidence = 1.0` for genuinely substitutable-by-nothing, invariant-grade truths; most
  real prerequisites land at `0.7–0.85` because an alternative path usually exists. A tree whose
  edges are all `0.9–1.0` is almost always over-confident and will lose calibration points.
- **Raise the tree's *true* strength by selecting necessary RTs, not by inflating scores.** Two
  scores are graded together: a *map-strength* score that rewards edges a skeptical reviewer would
  *also* rate high (rel & conf near `1.0`), and a *calibration* score that rewards matching that
  reviewer. The way to score well on BOTH is to **keep the tree to RTs that are genuinely
  load-bearing** — invariant-grade, no-substitute preconditions the outcome literally cannot hold
  without — and report their high rel/conf honestly. Do **not** pad the tree with merely-helpful RTs
  carried at `conf 0.4–0.5`: each one drags `mean(confidence)` down and weakens map strength. If an
  RT is only one helpful option among several, it belongs in **solution space**, not the truth tree —
  move it there. The ideal tree is *small, fully necessary, and honestly high-scored*, not *large and
  defensively low-scored*. Inflating a weak edge to `1.0` to chase strength is self-defeating: the
  reviewer re-scores it low and you lose more on calibration than you gain on strength.
- **Justify each score in one clause** (in the derivation, e.g. "conf 0.7: alternative via queue
  exists"). An edge you cannot justify in a clause is a guessed score — re-derive it.
- **Prune low-relevance edges.** Any edge with `relevance ≤ 0.3` means the RT is not actually
  required — remove it (it belongs in solution space, not the truth tree).
- **No orphans.** Every RT must have a `parent` and a path up to `OUTCOME`. An RT with no path to
  the outcome is either mis-derived or its parent is missing.

**Self-check before writing (quality gate):**
```
□ Does every RT have a parent, relevance, and confidence?   (else: incomplete map)
□ Is the outcome decomposed into ≥2 top-level RTs?           (else: single-RT trap)
□ Is each RT phrased as a TRUTH that must hold, not a build step?  (else: forward-plan leak)
□ Are confidences spread (not all 1.0)?                      (else: uncalibrated)
□ Does every RT have ≥1 evidence item?                       (else: unverifiable)
```
A map that passes all five is high-quality; one that fails any is incomplete — fix before continuing.

## Recursive Backward Chaining

Default: flat mode (`--depth=1`). The always-loaded body of this file covers flat-mode elicitation and produces the first-pass required truths.

For multi-level decomposition (when `--depth > 1`, range 1-4), load [`references/recursive-decomposition.md`](references/recursive-decomposition.md). That file covers recursion rules, tree output format, termination conditions, schema additions (`depth`, `children`), and variance guardrails (target RT band `[10, 28]` from the eval baseline).

## Binding Constraint (Enhancement 5)

Among RTs with status PARTIAL or NOT_SATISFIED, identify the single binding constraint — the one that is hardest to close, unlocks the others when closed, and blocks all options when unclosed. Surface it as `BINDING CONSTRAINT: [RT-ID] [reason] — chain: RT-[n], RT-[n]`. Order solution options by how directly they address it; solutions that skip it are deprioritized.

**Schema:** `{"anchors": {"binding_constraint": {"required_truth_id": "RT-3", "reason": "...", "dependency_chain": ["RT-1", "RT-5"]}}}`

**Handoff to m4:** m4-generate reads `anchors.binding_constraint`, tags artifacts satisfying its RT with `"priority": "binding"`, and generates them first (when context is freshest).

### Reversibility Tagging (Enhancement 4)

Tag every solution option: `TWO_WAY` (reversible), `REVERSIBLE_WITH_COST` (note the cost), `ONE_WAY` (flag consequences, require explicit acknowledgment). Surface ONE_WAY options distinctly and list what they close.

## Example

```
/manifold:m3-anchor payment-retry --outcome="95% retry success for transient failures"

OUTCOME ANCHORING: payment-retry

  (edge = parent → child, [rel=relevance, conf=confidence])
RT-1: Can distinguish transient from permanent failures  ← OUTCOME [rel=0.95 conf=1.0]  [gap: no error taxonomy]
RT-2: Retries are idempotent                             ← OUTCOME [rel=1.0  conf=1.0]  [gap: no idempotency]
RT-3: Retry state persists across failures               ← RT-2    [rel=0.85 conf=0.9]  [gap: in-memory only]
RT-4: Downstream services recoverable before budget exhausts ← OUTCOME [rel=0.7 conf=0.7]  [gap: no circuit breaker]
  (note: "client-side exponential backoff" was considered but is one helpful option, not a
   necessary truth — it lives in solution space below, not as an RT. Pruning it keeps the tree
   honestly high-scored rather than padding it with a conf-0.4 edge.)

SOLUTION SPACE:
  Option A: Client-side backoff     — satisfies RT-4      [TWO_WAY]
  Option B: Server-side workflow    — satisfies all       [ONE_WAY ⚠️]
  Option C: Hybrid (client+queue)   — satisfies RT-1/2/3  [TWO_WAY]

RECOMMENDATION: Option C  →  Next: /manifold:m4-generate payment-retry --option=C
```

## Context Lookup

**Before anchoring**, use `WebSearch` to research the feature domain (architectural patterns, library versions, external service limits) so required truths and solution options reflect current reality. Summarize findings in a "DOMAIN CONTEXT" block before anchoring. Skip if `--skip-lookup` is passed or context lookup was done in m1/m2 within the same session.

## Execution Instructions

### For JSON+Markdown Format (Default)

1. **Run Context Lookup** (see above) — research the feature domain via `WebSearch` unless already done in m1/m2
2. Read structure from `.manifold/<feature>.json`
3. Read content from `.manifold/<feature>.md`
4. Get outcome from `--outcome` flag or Markdown `## Outcome` section
5. For the outcome, recursively ask "What must be TRUE?"
6. Each truth becomes an RT-N (Required Truth)
7. Identify gaps between current state and requirement
8. Generate 2-4 solution options
9. Recommend best option with rationale
10. **Update TWO files:**
   - `.manifold/<feature>.json` — Add required truths to `anchors.required_truths` with id, status, maps_to, `parent`, `relevance`, `confidence`
   - `.manifold/<feature>.md` — Add `### RT-1: Title` + statement + gap under `## Required Truths`
11. Set phase to ANCHORED in JSON
12. **Run `manifold validate <feature>`** -- fix any errors before showing results. Format lock: if `.json` exists, never create/update `.yaml`.

### Solution-Tension Validation

After selecting the recommended option, validate it against m2's tensions. For each RESOLVED tension, check whether the option honors the recorded resolution — mark `CONFIRMED` if yes, `REOPENED` if no. Record in JSON under `anchors.tension_validation` (array of `{tension_id, status, by_option | reason}`). If any tension is REOPENED, surface via AskUserQuestion with options to accept, change option, or modify the option.

## Red Flags

| Thought | Reality |
|---|---|
| "I'll forward-plan the steps" | m3 reasons backward: ask what must be TRUE for the outcome. |
| "One required truth is enough" | Decompose until truths are concrete and verifiable. |
| "Skip evidence on the truths" | Every required truth needs at least one evidence item. |
| "A flat list of truths is fine" | The tree is a *map*: every RT needs a `parent` + `relevance` + `confidence` edge. |
| "Mark everything confidence 1.0" | Calibrate — over-confident edges are a defect; spread the scores honestly. |

Run `manifold validate <feature>` after updates. Shared directives (output format, interaction rules, validation) injected by phase-commons hook.
