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
        "maps_to": ["B1", "T1"]
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

## Recursive Backward Chaining (Enhancement 7)

After the first-pass required truths are generated, for each truth with status NOT_SATISFIED or PARTIAL:

1. Take the truth as the new sub-outcome
2. Ask: "For [required truth] to hold, what MUST be true?"
3. Generate second-order required truths with dotted IDs (RT-1.1, RT-1.2)
4. Check each against the constraint set and current state
5. Tag each: SATISFIED (already holds) | PRIMITIVE (verifiable fact, recursion stops) | REQUIRES_FURTHER_DECOMPOSITION

6. For each REQUIRES_FURTHER_DECOMPOSITION truth, recurse to `--depth` (default: 2, maximum: 4)

7. Recursion stops when:
   - All leaves are SATISFIED or PRIMITIVE
   - Maximum depth is reached (flag remaining gaps explicitly)
   - A circular dependency is detected (flag and surface to user)

Output the full dependency tree, not just the leaf nodes:

```
REQUIRED TRUTH: RT-1 Retries are idempotent [NOT_SATISFIED]
  ├── RT-1.1 Unique request IDs generated per call [NOT_SATISFIED]
  │     ├── RT-1.1.1 ID generation library available [SATISFIED]
  │     └── RT-1.1.2 ID stored with TTL matching retry window [NOT_SATISFIED]
  │           └── RT-1.1.2.1 Persistence layer with TTL support exists [PRIMITIVE — verify]
  └── RT-1.2 Server-side deduplication check on ID [NOT_SATISFIED]
        └── RT-1.2.1 Deduplication store accessible at request time [NOT_SATISFIED]
```

**Parameter:** `--depth=N` (default: 2, range: 1-4). Depth 1 is current behavior. Surface a warning if depth 4 is reached without all leaves resolving.

**Schema:** Required truths gain `depth` and `children` fields:
```json
{"id": "RT-1", "status": "NOT_SATISFIED", "depth": 0, "children": [
  {"id": "RT-1.1", "status": "NOT_SATISFIED", "depth": 1, "children": []}
]}
```

## Theory of Constraints Bottleneck Identification (Enhancement 5)

After generating required truths (and recursive sub-truths if --depth > 1), identify the binding constraint before generating solution options.

For all required truths with status PARTIAL or NOT_SATISFIED:

1. Ask: Which of these is hardest to close given current state?
2. Ask: Which of these, if closed, would make the others easier or automatically satisfied?
3. Ask: Which of these, if not closed, blocks all solution options regardless of how the others are handled?

The answer to all three is the binding constraint. Surface it explicitly:

```
BINDING CONSTRAINT: [RT-ID] [statement]
  Status: PARTIAL | NOT_SATISFIED
  Reason: [why this is the binding limit]
  Dependency chain: RT-[n] depends on this, RT-[n] depends on this
```

Generate solution options ordered by their approach to the binding constraint first. Solutions that do not address the binding constraint are deprioritized regardless of how elegantly they handle the others.

**Schema:** Add `binding_constraint` to anchors in `.manifold/<feature>.json`:
```json
{"anchors": {"binding_constraint": {"required_truth_id": "RT-3", "reason": "...", "dependency_chain": ["RT-1", "RT-5"]}}}
```

### Binding Constraint Handoff to m4 (Enhancement 5b)

The binding constraint identified above MUST be communicated to m4-generate. It is already stored in JSON as `anchors.binding_constraint`.

**m4-generate MUST:**
1. Read `anchors.binding_constraint` from JSON before building the artifact plan
2. Generate artifacts that address the binding constraint's required truth FIRST
3. Tag binding-constraint artifacts in the generation plan: `"priority": "binding"`
4. If the binding constraint's RT has unresolved evidence after generation, WARN before completing m4

This ensures the most critical, highest-risk artifact is generated first, when context is freshest and attention is highest. Without this handoff, m4 generates in arbitrary order and the binding constraint may be addressed last (or inadequately).

**Evidence for need:** In `engineering-hardening`, RT-4 (file splitting) was the binding constraint. It was the highest-risk item but would have been generated last without explicit prioritization.

### Reversibility Tagging for Solution Options (Enhancement 4)

When generating solution options, tag each option with its reversibility:

| Tag | Meaning | Implication |
|-----|---------|-------------|
| `TWO_WAY` | Reversible with minimal cost | Proceed normally |
| `REVERSIBLE_WITH_COST` | Can reverse with meaningful cost | Flag and note the cost |
| `ONE_WAY` | Closes options permanently | Require explicit acknowledgment |

Options that close doors should be surfaced distinctly from options that don't:

```
SOLUTION OPTIONS:
  Option A: [description]
    Reversibility: TWO_WAY
    Satisfies: RT-1, RT-3

  Option B: [description]
    Reversibility: ONE_WAY ⚠️
    What this closes: [consequences]
    Satisfies: RT-1, RT-2, RT-3
```

## Example

```
/manifold:m3-anchor payment-retry --outcome="95% retry success for transient failures"

OUTCOME ANCHORING: payment-retry

Outcome: 95% retry success for transient failures

BACKWARD REASONING:

For 95% retry success, what MUST be true?

RT-1: Can distinguish transient from permanent failures
      └── Requires: Error classification system
      └── Gap: No current error taxonomy

RT-2: Retries are idempotent
      └── Requires: Transaction idempotency keys
      └── Gap: Current system lacks idempotency

RT-3: Sufficient retry budget
      └── Requires: At least 3 attempts with exponential backoff
      └── Gap: Need to define retry policy

RT-4: Downstream services recoverable
      └── Requires: Circuit breaker for dependencies
      └── Gap: No circuit breaker implementation

RT-5: Retry state persists across failures
      └── Requires: Durable retry queue
      └── Gap: In-memory only currently

SOLUTION SPACE:

Option A: Client-side Exponential Backoff
├── Satisfies: RT-3
├── Gaps: RT-2, RT-4, RT-5
└── Complexity: Low

Option B: Server-side Workflow Engine
├── Satisfies: RT-1, RT-2, RT-3, RT-4, RT-5
├── Gaps: None
└── Complexity: High

Option C: Hybrid (Client retry + Server queue)
├── Satisfies: RT-1, RT-3, RT-5
├── Gaps: None (with implementation)
└── Complexity: Medium

RECOMMENDATION: Option C (Hybrid)

Updated: .manifold/payment-retry.json + .manifold/payment-retry.md

Next: /manifold:m4-generate payment-retry --option=C
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

### Solution-Tension Validation (Cross-Phase Feedback)

After the recommended solution option is selected, validate it against m2's tensions to close the feedback loop:

1. Read all tensions from JSON
2. For each RESOLVED tension:
   - Does the recommended option's approach match the recorded resolution?
   - If YES: Mark as `CONFIRMED by option [X]`
   - If NO: Flag as `TENSION REOPENED — option [X] does not honor resolution for [TN-ID]`
3. For each UNRESOLVED tension (if any):
   - Does the option implicitly resolve it? If YES, suggest marking as resolved
4. Record in JSON under `anchors.tension_validation`:
```json
{
  "tension_validation": [
    {"tension_id": "TN1", "status": "CONFIRMED", "by_option": "A"},
    {"tension_id": "TN3", "status": "REOPENED", "reason": "Option A uses caching which conflicts with TN3 resolution"}
  ]
}
```

If any tension is REOPENED, surface to user via AskUserQuestion:
> "The recommended option conflicts with tension [TN-ID]. Options: A. Accept and update the resolution. B. Choose a different option. C. Modify the option to honor the resolution."

This prevents m3 from recommending solutions that silently invalidate m2 decisions -- a gap observed in early manifolds where solution selection was disconnected from tension resolutions.

Run `manifold validate <feature>` after updates. Shared directives (output format, interaction rules, validation) injected by phase-commons hook.
