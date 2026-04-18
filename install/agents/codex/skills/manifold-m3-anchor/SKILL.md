---
name: manifold-m3-anchor
description: "Backward reasoning from desired outcome. Derives required conditions by asking 'What must be TRUE?'"
---

# /manifold:m3-anchor

# /manifold:m3-anchor - Outcome Anchoring (Requirements Derivation)

Backward reasoning from desired outcome to required conditions.

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
        "evidence": [
          {"id": "E1", "type": "file_exists", "path": "src/retry/error-classifier.ts", "status": "PENDING"}
        ]
      },
      {
        "id": "RT-2",
        "status": "SPECIFICATION_READY",
        "maps_to": ["B2"]
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
5. **Identify gaps** - What's missing between current state and requirements?
6. **Generate solution space** - Options that satisfy all required truths

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

RT-1: Can distinguish transient from permanent failures  [gap: no error taxonomy]
RT-2: Retries are idempotent                              [gap: no idempotency]
RT-3: Sufficient retry budget                             [gap: policy undefined]
RT-4: Downstream services recoverable                     [gap: no circuit breaker]
RT-5: Retry state persists across failures                [gap: in-memory only]

SOLUTION SPACE:
  Option A: Client-side backoff     — satisfies RT-3      [TWO_WAY]
  Option B: Server-side workflow    — satisfies all       [ONE_WAY ⚠️]
  Option C: Hybrid (client+queue)   — satisfies RT-1/3/5  [TWO_WAY]

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
   - `.manifold/<feature>.json` — Add required truths to `anchors.required_truths` with id, status, maps_to
   - `.manifold/<feature>.md` — Add `### RT-1: Title` + statement + gap under `## Required Truths`
11. Set phase to ANCHORED in JSON
12. **Run `manifold validate <feature>`** -- fix any errors before showing results. Format lock: if `.json` exists, never create/update `.yaml`.

### Solution-Tension Validation

After selecting the recommended option, validate it against m2's tensions. For each RESOLVED tension, check whether the option honors the recorded resolution — mark `CONFIRMED` if yes, `REOPENED` if no. Record in JSON under `anchors.tension_validation` (array of `{tension_id, status, by_option | reason}`). If any tension is REOPENED, surface via AskUserQuestion with options to accept, change option, or modify the option.

Run `manifold validate <feature>` after updates. Shared directives (output format, interaction rules, validation) injected by phase-commons hook.
