# Manifold Enhancement Requirements

---

## Overview

This document consolidates the design decisions and artifact outputs from a
structured enhancement session for the Manifold framework. It is intended to
be used directly as input to Manifold's own workflow — the framework applied
to itself.

Six core enhancements were designed, plus a non-software domain redesign.
None require new phases. None alter the phase count. All are backward-compatible.

---

## Enhancement 1: Pre-mortem integration into m1-constrain

### What changes
`m1-constrain` gains a mandatory second pass — the pre-mortem sweep — that
runs after initial constraint elicitation closes and before the phase commits.

### Why
Single-pass elicitation produces constraints stakeholders know to name. The
pre-mortem surfaces constraints people didn't know to articulate — assumption
violations, hidden dependencies, external failure modes. These are the
constraints most likely to invalidate a plan.

### Mechanism
After eliciting constraints across all categories, the AI asks:

> "Imagine it is [timeframe from outcome]. This has clearly failed — not
> partially, just failed. Give me three failure stories:
> 1. One you could have seen coming
> 2. One that surprised you
> 3. One caused by someone else's action or inaction"

Three stories are required. One story produces the obvious failure. Three
stories reliably surfaces assumption violations and external dependencies.

For each story: identify which category the violated constraint belongs to,
check if it is already in the set, add it if missing tagged `source: pre-mortem`.

### Prompt addition — location: `.claude-plugin/m1-constrain.md`

Add as a new section after the category interview loop:

```markdown
## Pre-mortem pass (run after elicitation, before phase closes)

Say to the user: "Before we close constraint discovery, let's stress-test
what we have. Imagine it is [TIMEFRAME]. This has clearly failed. Give me
three failure stories: one foreseeable, one surprising, one caused by someone
else's action."

For each story:
- Identify which category the violated constraint belongs to
- If not already in set: add it, tag source: pre-mortem
- If already in set: confirm and tag source: validated-pre-mortem
```

### Files affected
- `.claude-plugin/m1-constrain.md` — add pre-mortem pass section

---

## Enhancement 2: Constraint genealogy tagging

### What changes
Every constraint carries a `source` tag that records its origin and a
`challenger` classification that determines whether it can be challenged.
This is introduced in m1-constrain and read by m2-tension and m4-generate.

### Why
When resolving a tension in m2, the resolution strategy depends entirely on
the source of each constraint. A regulation cannot be challenged; an
assumption can. A stakeholder demand can be negotiated; a physical limit
cannot. Currently Manifold treats all constraints as equally immutable — this
is wrong and leads to wasted resolution effort on the wrong constraints.

### Source taxonomy

| Source tag | Meaning | Can be challenged? |
|---|---|---|
| `source: interview` | Named explicitly during elicitation | Depends on challenger |
| `source: pre-mortem` | Discovered through failure analysis | Depends on challenger |
| `source: assumption` | Believed true, unverified | Yes — must be confirmed |

### Challenger taxonomy

| Challenger tag | Meaning | Resolution implication |
|---|---|---|
| `challenger: regulation` | Legal / regulatory requirement | Cannot be challenged. Tensions involving this must route around it. |
| `challenger: stakeholder` | Named party's stated requirement | Can be negotiated. Tension resolution may include renegotiation. |
| `challenger: technical-reality` | Physical or architectural limit | Cannot be changed within scope. May be changed by scope expansion. |
| `challenger: assumption` | Believed true but unverified | Must be confirmed before m4. Unconfirmed assumptions block artifact generation. |

### Downstream use
- **m2-tension:** When two constraints conflict, surface their challenger
  tags. If one is `regulation` and one is `assumption`, the resolution
  direction is obvious — challenge the assumption, not the regulation.
- **m4-generate:** All `challenger: assumption` constraints are surfaced
  prominently. Require explicit user acknowledgment before artifact
  generation proceeds. Unconfirmed assumptions elevate to the watch list.
- **m5-verify:** Flag any INVARIANT constraint with `challenger: assumption`
  as a convergence risk.

### Schema addition

```json
{
  "constraints": {
    "business": [
      {
        "id": "B1",
        "statement": "...",
        "type": "invariant",
        "source": "interview | pre-mortem | assumption",
        "challenger": "regulation | stakeholder | technical-reality | assumption",
        "status": "SATISFIED | PARTIAL | NOT_SATISFIED"
      }
    ]
  }
}
```

### Files affected
- `.claude-plugin/m1-constrain.md` — add source and challenger tagging instructions
- `.claude-plugin/m2-tension.md` — read challenger tags when classifying tensions
- `.claude-plugin/m4-generate.md` — flag assumption constraints before generation
- `.manifold/<feature>.json` — schema: add `source` and `challenger` fields

---

## Enhancement 3: TRIZ contradiction classification and principle lookup in m2-tension

### What changes
`m2-tension` gains a structured classification step between detection and
resolution. Each detected tension is classified as a Technical or Physical
contradiction, then mapped to a curated set of TRIZ inventive principles.

### Why
Current resolution suggestions are ad-hoc — Claude figures it out. TRIZ
provides a systematic lookup: which classes of contradiction have which
historically-proven resolution archetypes. This moves tension resolution
from open-ended brainstorming to structured, principle-guided candidates.

### Contradiction taxonomy

**Technical contradiction:** Improving parameter A degrades parameter B.
Signal: "the more X, the less Y."
Example: more retries → better reliability, higher latency.

**Physical contradiction:** The same element must simultaneously have a
property and its opposite.
Signal: "must be X and must not be X."
Example: API must be public (usability) and private (security).

### Parameter pair lookup table

| Parameters in conflict        | Tier-A/B Principles          |
|-------------------------------|------------------------------|
| Performance vs. Reliability   | P10, P25, P35                |
| Speed vs. Safety              | P10, P24, P35                |
| Simplicity vs. Capability     | P1, P15, P35                 |
| Cost vs. Quality              | P1, P10, P27                 |
| Flexibility vs. Consistency   | P1, P15, P40                 |
| Privacy vs. Usability         | P1, P10, P24                 |
| Autonomy vs. Control          | P10, P15, P35                |
| Speed vs. Correctness         | P10, P11, P25                |
| Global vs. Local optimum      | P3, P1, P17                  |
| Standardisation vs. Flexibility | P1, P15, P3                |

If the parameter pair doesn't match, identify the nearest match and note the
approximation. Surface top 2–3 principles per tension. Never surface Tier C
principles (P18, P29–P33, P36–P39) in non-engineering contexts.

### Output format per tension

```
TENSION: [description]
CHALLENGER PROFILE: [C-ID] challenger: [tag] vs. [C-ID] challenger: [tag]
TYPE: Technical contradiction | Physical contradiction
PARAMETERS: [A] vs. [B]
PRINCIPLES:
  - P[N] [Name]: [one-line application note for this specific tension]
  - P[N] [Name]: [one-line application note]
RESOLUTION OPTIONS: [2-3 candidates incorporating principle guidance]
STATUS: detected | resolved | accepted
```

Note: challenger profile informs resolution direction before principles are
applied — challenge the assumption, not the regulation.

### New file: `docs/triz-principles.md`
Full reference — all 40 principles with plain-language definition, software
application note, life/strategy application note, key question, and tier
rating. Tier C principles explicitly marked "no strong abstract analog."
See attached `triz-principles.md` (565 lines).

### Files affected
- `.claude-plugin/m2-tension.md` — add classification step and principle lookup
- `docs/triz-principles.md` — new file

---

## Enhancement 4: Reversibility tagging per decision

### What changes
Every decision generated in m4-generate carries a reversibility tag.
One-way doors are explicitly identified, listed in the decision output,
and require acknowledgment before the action plan proceeds.

### Why
Manifold currently treats all generated decisions symmetrically. Bezos'
one-way / two-way door insight is that the cost of getting a decision wrong
depends entirely on whether it can be undone. Irreversible decisions warrant
more deliberation, more stress-testing, and more explicit acknowledgment than
reversible ones. Not surfacing this means users don't know which steps they
can safely revisit.

### Reversibility taxonomy

| Tag | Meaning | Implication at m4 |
|---|---|---|
| `TWO_WAY` | Reversible with minimal cost — can undo, retry, adjust | Proceed normally |
| `REVERSIBLE_WITH_COST` | Can reverse with meaningful cost — financial, relational, reputational | Flag and note the cost |
| `ONE_WAY` | Once taken, closes options permanently or for a defined long period | Require explicit acknowledgment before proceeding |

### Integration points

**m3-anchor:** When generating required truths and solution options, tag each
option with its reversibility. Options that close doors should be surfaced
distinctly from options that don't.

**m4-generate:** The action plan lists each step with its reversibility tag.
One-way steps are grouped under a dedicated "Irreversible steps — require
explicit acknowledgment" section before the plan begins execution. The
decision brief includes a "What this decision closes" section listing all
ONE_WAY consequences explicitly.

**m5-verify:** Check that all ONE_WAY steps in the action plan have a
corresponding entry in the risk watch list. An irreversible step without a
watch entry is a convergence gap.

### Schema addition

```json
{
  "reversibility_log": [
    {
      "action_step": 1,
      "description": "...",
      "reversibility": "TWO_WAY | ONE_WAY | REVERSIBLE_WITH_COST",
      "one_way_consequence": "what becomes unavailable — populate only for ONE_WAY"
    }
  ]
}
```

### Prompt addition — location: `.claude-plugin/m4-generate.md`

Add to the action plan generation section:

```markdown
## Reversibility tagging (required for every action step)

For each step in the action plan, assign a reversibility tag:
  TWO_WAY — reversible with minimal cost
  REVERSIBLE_WITH_COST — reversible but with meaningful cost; name the cost
  ONE_WAY — closes options permanently; name what becomes unavailable

Group all ONE_WAY steps into a dedicated section before the plan proceeds.
Present them to the user and require explicit acknowledgment of each.

Add to the decision brief: "What this decision closes" — list all ONE_WAY
consequences in plain language.
```

### Files affected
- `.claude-plugin/m3-anchor.md` — tag solution options with reversibility
- `.claude-plugin/m4-generate.md` — add reversibility tagging to action plan
- `.claude-plugin/m5-verify.md` — check ONE_WAY steps have watch list entries
- `.manifold/<feature>.json` — schema: add `reversibility_log`

---

## Enhancement 5: Theory of Constraints bottleneck identification in m3-anchor

### What changes
`m3-anchor` gains a bottleneck identification step before generating solution
options. The binding constraint — the single required truth whose gap is
hardest to close and on which everything else depends — is identified and
surfaced explicitly.

### Why
Manifold currently treats all GOAL constraints as equal when generating
solution options. Goldratt's Theory of Constraints insight is that in any
constrained system, one constraint is the binding limit — improving anything
else is waste. Without identifying it, m4 can generate elaborate plans that
work around the wrong bottleneck. The binding constraint must be closed first;
everything else is secondary.

### Mechanism

After generating required truths, before generating solution options:

```markdown
## Bottleneck identification (run before solution generation)

For all required truths with status PARTIAL or NOT_SATISFIED:

1. Ask: Which of these is hardest to close given current state?
2. Ask: Which of these, if closed, would make the others easier or automatically
   satisfied?
3. Ask: Which of these, if not closed, blocks all solution options regardless
   of how the others are handled?

The answer to all three is the binding constraint. Surface it explicitly:

BINDING CONSTRAINT: [required truth ID and statement]
REASON: [why this is the binding limit]
IMPLICATION: [which other required truths depend on this being closed first]

Generate solution options ordered by their approach to the binding constraint
first. Solutions that do not address the binding constraint are deprioritised
regardless of how elegantly they handle the others.
```

### Output addition to m3-anchor

```
BINDING CONSTRAINT: [RT-ID] [statement]
  Status: PARTIAL | NOT_SATISFIED
  Dependency chain: RT-[n] depends on this, RT-[n] depends on this
  
SOLUTION OPTIONS (ordered by binding constraint approach):
  Option A: [addresses binding constraint via ...]
  Option B: [addresses binding constraint via ...]
  Option C: [does not address binding constraint — deprioritised]
```

### Files affected
- `.claude-plugin/m3-anchor.md` — add bottleneck identification step
- `.manifold/<feature>.json` — schema: add `binding_constraint` field in `anchors`

### Schema addition

```json
{
  "anchors": {
    "binding_constraint": {
      "required_truth_id": "RT-N",
      "statement": "...",
      "reason": "...",
      "dependency_chain": ["RT-n", "RT-n"]
    },
    "required_truths": []
  }
}
```

---

## Enhancement 6: Probabilistic constraint bounds in m1-constrain

### What changes
`m1-constrain` prompts for probabilistic expression of constraints where
appropriate — p99/p50 percentile targets, confidence intervals, and acceptable
failure rates — rather than accepting only deterministic thresholds.

### Why
"API response < 200ms" is a deterministic constraint that is actually
probabilistic in production. A SATISFIED status against a deterministic
target means something entirely different from SATISFIED against a p99 target.
Constraints expressed deterministically encourage binary pass/fail thinking
on metrics that are inherently distributed. This creates false confidence at
m5-verify — a system can technically satisfy "< 200ms" while hitting 800ms
99% of the time if the single test case runs fast.

### Mechanism

During m1-constrain, for any GOAL or BOUNDARY constraint involving a
measurable metric, prompt:

```markdown
## Probabilistic bounds prompt (run on metric-based constraints)

When a constraint contains a measurable threshold (latency, success rate,
cost, time), ask:

"Is this a hard ceiling that must hold for every instance, or a statistical
target? If statistical, what percentile or confidence level applies?

Examples:
  - Deterministic: 'must never exceed 500ms' → hard ceiling, tag: deterministic
  - Statistical: 'p99 < 200ms, p50 < 80ms' → tag: p99=200ms, p50=80ms
  - Rate-based: '< 0.1% failure rate over rolling 24h' → tag: rate, window=24h

For non-software: 'budget must not exceed ₹40L' is deterministic. 'Project
must be profitable within 18 months' is statistical — what confidence level
is required?"
```

### Constraint schema additions

```json
{
  "id": "T1",
  "statement": "API response time",
  "type": "boundary",
  "threshold": {
    "kind": "statistical",
    "p99": "200ms",
    "p50": "80ms",
    "failure_rate": "< 0.1% over rolling 24h"
  }
}
```

```json
{
  "id": "B2",
  "statement": "Project cash flow",
  "type": "boundary",
  "threshold": {
    "kind": "deterministic",
    "ceiling": "₹40L"
  }
}
```

### m5-verify implication

Verification status meaning changes for statistical constraints:

| Constraint kind | SATISFIED means |
|---|---|
| Deterministic | Artifact provably does not exceed the ceiling |
| Statistical | Artifact addresses the distribution — test coverage includes percentile cases |

### Files affected
- `.claude-plugin/m1-constrain.md` — add probabilistic bounds prompt for metric constraints
- `.claude-plugin/m5-verify.md` — add statistical vs deterministic verification distinction
- `.manifold/<feature>.json` — schema: add `threshold` object to constraint

---

## Non-software domain redesign

### What changes
A `--domain=non-software` flag is added to m0-init. When set, it activates
two related changes: (1) universal constraint categories in m1-constrain,
(2) a domain-appropriate artifact set in m4-generate.

This is a domain translation layer built on top of the six enhancements above —
all six enhancements apply in non-software mode. The domain flag changes
vocabulary and artifacts, not the reasoning mechanics.

### Universal constraint categories (replaces software-specific mapping)

| Category | Core question | Replaces |
|---|---|---|
| Obligations | What must/must-not be true? | Business + Security |
| Desires | What does success look like? | UX + Business goals |
| Resources | What can I bring to this? | Technical (capability limits) |
| Risks | What could break irreversibly? | Security (broadened) |
| Dependencies | What else must hold outside me? | Operational |

Constraint types (INVARIANT / GOAL / BOUNDARY) are unchanged. The categories
change; the type taxonomy does not.

### Non-software artifact set (replaces software artifacts at m4-generate)

| Non-software artifact | Software equivalent | Function |
|---|---|---|
| Decision brief | Implementation code | Decision with full constraint traceability |
| Scenario stress-tests | Test suite | Verifies decision holds under adversarial conditions |
| Narrative guide | Documentation | Reasoning survives time and personnel changes |
| Recovery playbook | Runbooks | Pre-decided responses to watch-list risks |
| Risk watch list + review triggers | Dashboards + alerts | What to monitor; when to reopen |

### New and updated files
- `docs/non-programming/guide.md` — full replacement; universal categories,
  reversibility tagging, worked example (startup job offer decision), domain
  applicability table. See attached `non-programming-guide.md` (326 lines).
- `docs/m4-generate-nonsoftware.md` — new file; full artifact templates for
  all five non-software artifacts. See attached (366 lines).
- `.claude-plugin/m0-init.md` — add `--domain` flag, default `software`
- `.claude-plugin/m1-constrain.md` — use universal categories when domain=non-software
- `.claude-plugin/m4-generate.md` — branch on domain for artifact set
- `.claude-plugin/m5-verify.md` — non-software verification checks

---

## Constraints on these enhancements

### INVARIANT
- C1: Phase count must remain unchanged — 7 phases (m0–m6), no additions
- C2: Software workflow must be fully backward-compatible — no breaking changes
  to existing manifold file formats or command interfaces
- C3: Existing `.manifold/*.json` and `.manifold/*.yaml` files must continue
  to validate — all new fields are additive
- C4: TRIZ Tier C principles must not be surfaced in non-engineering contexts —
  no forced metaphors
- C5: `--domain` flag must default to `software` — all existing usage unchanged

### GOAL
- C6: Pre-mortem and TRIZ integrations should feel like natural parts of their
  phases, not bolt-ons — the interview flow should not feel longer, just more
  structured
- C7: Non-software workflow operable without software background — vocabulary
  test: no jargon requiring a developer to interpret
- C8: Constraint genealogy adds signal without friction — source defaults to
  `interview`, challenger flagged only when it changes resolution direction
- C9: Probabilistic bounds prompt only fires on metric-based constraints —
  not on qualitative constraints

### BOUNDARY
- C10: No new runtime dependencies — all functionality is prompt-based
- C11: New files fit within existing directory structure:
  `docs/triz-principles.md`, `docs/non-programming/guide.md`,
  `docs/m4-generate-nonsoftware.md` — no new top-level directories

---

## Implementation order (recommended)

Enhancements are independent but have a natural dependency sequence:

1. **Enhancement 2 (constraint genealogy)** — introduces `source` and
   `challenger` schema fields that everything else reads. Must be first.

2. **Enhancement 6 (probabilistic bounds)** — extends the constraint schema
   further. Can run in parallel with Enhancement 2 but must precede m5-verify
   changes.

3. **Enhancement 1 (pre-mortem)** — requires source tagging from Enhancement 2
   to be in the schema. Prompt-only change otherwise.

4. **Enhancement 3 (TRIZ)** — requires challenger tags from Enhancement 2 to
   be readable in m2-tension. Requires `docs/triz-principles.md` committed
   before the prompt references it.

5. **Enhancement 4 (reversibility tagging)** — requires m3-anchor and
   m4-generate. Schema additions are independent but the prompt changes
   build on the option-generation flow from m3.

6. **Enhancement 5 (Theory of Constraints)** — requires required truths to be
   populated (m3-anchor). Must come after the anchor phase is stable.

7. **Non-software domain** — built on top of all six enhancements. Implement
   last — it is a translation layer, not a foundation.

---

## Attached files (generated, ready to commit)

| File | Destination | Lines |
|---|---|---|
| `triz-principles.md` | `docs/triz-principles.md` | 565 |
| `m4-generate-nonsoftware.md` | `docs/m4-generate-nonsoftware.md` | 366 |
| `non-programming-guide.md` | `docs/non-programming/guide.md` | 326 |

Prompt file changes (`.claude-plugin/*.md`) are specified as additions/sections
above — they require integration into existing command files, not wholesale
replacement.

## Enhancement 7: Recursive backward chaining in m3-anchor

### What changes
`m3-anchor` recurses the backward reasoning pass rather than stopping at one
level. After generating required truths, each NOT_SATISFIED truth becomes the
input to a second round of backward reasoning: "what must be true for *this*
to hold?" The recursion continues until it reaches primitives — facts already
confirmed in the constraint set, or facts the user can immediately verify.

### Why
The current single-pass anchor identifies first-order gaps: "for 95% retry
success, retries must be idempotent." But it stops there. A second pass asks:
"for retries to be idempotent, what must be true?" → "unique request IDs must
be generated and stored." A third pass: "for unique IDs to be stored, what
must be true?" → "a persistence layer with the right TTL must exist." Without
recursion, m3 hands you a gap. With recursion, it hands you the full
dependency chain to the gap — which is what you actually need to build a plan.

The single-pass version creates a false sense of completeness. You see the
first-order required truths, think the analysis is done, and discover the
second-order gaps during implementation — which is exactly what Manifold
exists to prevent.

### Mechanism

```markdown
## Recursive backward chaining (m3-anchor)

After the first-pass required truths are generated, for each truth with
status NOT_SATISFIED or PARTIAL:

1. Take the truth as the new sub-outcome
2. Ask: "For [required truth] to hold, what MUST be true?"
3. Generate second-order required truths
4. Check each against the constraint set and current state
5. Tag each: SATISFIED (already holds) | PRIMITIVE (verifiable fact,
   recursion stops) | REQUIRES_FURTHER_DECOMPOSITION

6. For each REQUIRES_FURTHER_DECOMPOSITION truth, recurse to depth --depth
   (default: 2, maximum: 4)

7. Recursion stops when:
   - All leaves are SATISFIED or PRIMITIVE
   - Maximum depth is reached (flag remaining gaps explicitly)
   - A circular dependency is detected (flag and surface to user)

Output the full dependency tree, not just the leaf nodes.
```

### Output format addition

```
REQUIRED TRUTH: RT-1 Retries are idempotent [NOT_SATISFIED]
  ├── RT-1.1 Unique request IDs generated per call [NOT_SATISFIED]
  │     ├── RT-1.1.1 ID generation library available [SATISFIED]
  │     └── RT-1.1.2 ID stored with TTL matching retry window [NOT_SATISFIED]
  │           └── RT-1.1.2.1 Persistence layer with TTL support exists [PRIMITIVE — verify]
  └── RT-1.2 Server-side deduplication check on ID [NOT_SATISFIED]
        └── RT-1.2.1 Deduplication store accessible at request time [NOT_SATISFIED]
```

### Parameter
`--depth=N` on `m3-anchor` command (default: 2, range: 1–4). Depth 1 is
current behaviour. Users with complex systems can increase. The AI surfaces
a warning if depth 4 is reached without all leaves resolving to SATISFIED
or PRIMITIVE.

### Files affected
- `.claude-plugin/m3-anchor.md` — add recursive pass with depth parameter
- `.manifold/<feature>.json` — schema: required truths gain `depth` field
  and `children` array for sub-truths

### Schema addition

```json
{
  "anchors": {
    "required_truths": [
      {
        "id": "RT-1",
        "statement": "Retries are idempotent",
        "status": "NOT_SATISFIED",
        "depth": 0,
        "children": [
          {
            "id": "RT-1.1",
            "statement": "Unique request IDs generated per call",
            "status": "NOT_SATISFIED",
            "depth": 1,
            "children": []
          }
        ]
      }
    ]
  }
}
```

---

## Enhancement 8: Directional constraint propagation in m2-tension

### What changes
`m2-tension` gains a propagation check after each tension is resolved. When
a resolution option is chosen, the AI asks: "which other constraints does
this resolution affect?" — and flags any that are tightened, loosened, or
newly violated by the choice.

### Why
Without propagation, tensions are resolved in isolation. You fix T1 by
choosing resolution option A, then discover that option A makes constraint
C7 unsatisfiable, then discover that makes T3 unresolvable. This is the
most common form of late-stage surprise in complex planning. The resolution
of one tension silently creates or worsens another.

This is not full CSP arc consistency — that requires a formal solver. This
is directional propagation: human-readable reasoning about which constraints
are affected by a given resolution choice, surfaced before the choice is
committed. It captures 80% of the value at 0% of the solver infrastructure
cost.

### Mechanism

```markdown
## Propagation check (run after each tension resolution is proposed)

For the proposed resolution option:

1. List the constraints it directly affects (not just the two in tension)
2. For each affected constraint:
   - Does this resolution TIGHTEN it? (makes it harder to satisfy)
   - Does this resolution LOOSEN it? (makes it easier to satisfy)
   - Does this resolution VIOLATE it? (makes it unsatisfiable)
3. Flag any VIOLATION immediately — this resolution option is invalid
4. Flag any TIGHTEN — note the new constraint pressure, surface to user
5. If no violations: mark resolution SAFE TO PROCEED

Format:

RESOLUTION PROPOSED: [option description]
PROPAGATION CHECK:
  C-[ID] [statement]: TIGHTENED — [how and by how much]
  C-[ID] [statement]: LOOSENED — [how]
  C-[ID] [statement]: VIOLATED — [why this invalidates the resolution]
VERDICT: SAFE | BLOCKED (violation found) | PROCEED WITH AWARENESS (tightening noted)
```

### Interaction with constraint genealogy (Enhancement 2)
When a propagation check finds a TIGHTENED constraint, surface its challenger
tag. A tightened `challenger: assumption` should be confirmed before accepting
the resolution. A tightened `challenger: regulation` may block the option
entirely regardless of other factors.

### Files affected
- `.claude-plugin/m2-tension.md` — add propagation check after each resolution proposal
- `.manifold/<feature>.json` — schema: add `propagation_effects` array to
  tension resolution record

### Schema addition

```json
{
  "tensions": [
    {
      "id": "T1",
      "description": "...",
      "type": "trade_off",
      "status": "resolved",
      "resolution": "Option A — cache recent transaction IDs",
      "triz_principles": ["P24", "P10"],
      "propagation_effects": [
        {
          "constraint_id": "C7",
          "effect": "TIGHTENED",
          "note": "Cache TTL adds 50ms to p99 latency — C7 boundary now has 30ms headroom"
        }
      ]
    }
  ]
}
```

---

## Updated implementation order

With all eight enhancements and the non-software domain in scope:

1. **Enhancement 2** (constraint genealogy — source + challenger schema) —
   foundation; everything reads these fields

2. **Enhancement 6** (probabilistic bounds) — extends constraint schema;
   independent of genealogy but must precede m5-verify changes

3. **Enhancement 1** (pre-mortem) — prompt change; requires source tagging
   schema from Enhancement 2

4. **Enhancement 3** (TRIZ) — requires challenger tags from Enhancement 2;
   requires `docs/triz-principles.md` committed first

5. **Enhancement 8** (directional constraint propagation) — requires TRIZ
   classification (Enhancement 3) to be in place in m2-tension; builds on
   the tension resolution output format

6. **Enhancement 4** (reversibility tagging) — requires m3-anchor; schema
   additions independent but prompt changes build on option-generation flow

7. **Enhancement 7** (recursive backward chaining) — requires m3-anchor to
   be stable; depth parameter and tree schema are new additions

8. **Enhancement 5** (Theory of Constraints bottleneck) — requires required
   truths tree from Enhancement 7 to be populated before bottleneck
   identification is meaningful

9. **Non-software domain** — translation layer; built on top of all eight
   enhancements; implement last
