---
name: manifold-m2-tension
description: "Surface and resolve constraint conflicts (trade-offs). Identifies direct conflicts, resource tensions, and competing requirements"
---

# /manifold:m2-tension

# /manifold:m2-tension - Conflict Resolution (Trade-offs)

Surface and resolve constraint conflicts. A "tension" is when two requirements compete -- satisfying one makes satisfying the other harder.

> **Plain Language**: "Which requirements conflict, and how do we balance them?"

## Scope Guard

This phase ONLY updates manifold files. Do NOT create code, docs, or project files. Record decisions in manifold; implement in m4.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `TENSIONED` |
| **Next Phase** | `ANCHORED` (via /manifold:m3-anchor) |
| **Tension Types** | `trade_off`, `resource_tension`, `hidden_dependency` |
| **Tension Statuses** | `resolved`, `unresolved` |
| **Tension ID Prefix** | TN1, TN2, TN3... |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new tension types or statuses.

## Output Format: JSON+Markdown Hybrid

Update TWO files (never create `.yaml` when `.json` exists):

**`.manifold/<feature>.json`** -- Structure only (IDs, types, refs):
```json
{
  "tensions": [
    {"id": "TN1", "type": "trade_off", "between": ["T1", "B1"], "status": "resolved"},
    {"id": "TN2", "type": "resource_tension", "between": ["T2", "O1"], "status": "unresolved"}
  ],
  "iterations": [{
    "number": 2, "phase": "tension", "timestamp": "2026-04-04T00:00:00Z",
    "result": "Found 3 tensions, resolved 2",
    "tensions_found": 3, "tensions_resolved": 2,
    "by_type": {"trade_offs": 1, "resource_tensions": 1, "hidden_dependencies": 1}
  }]
}
```

**`.manifold/<feature>.md`** -- Content (descriptions, resolutions):
```markdown
## Tensions
### TN1: Performance vs Safety
Performance optimizations conflict with safety checks (duplicate detection, validation).
> **Resolution:** Use async safety checks after initial response. Caching includes idempotency keys.

### TN2: Retry Frequency vs Provider Limits
Aggressive retry frequency conflicts with payment processor rate limits.
> **Unresolved:** Need to negotiate higher rate limits or implement adaptive throttling.
```

JSON ID `TN1` links to Markdown heading `### TN1: Title`. JSON contains NO text content.

## CLI Conflict Detection

```bash
manifold validate <feature> --conflicts   # Detects contradictory invariants, resource/temporal/scope conflicts
```

## Usage

```
/manifold:m2-tension <feature-name> [--resolve] [--auto-deps] [--skip-lookup]
```

- `--resolve` -- Interactively resolve tensions
- `--auto-deps` -- Enable automatic dependency detection (v2)
- `--skip-lookup` -- Skip context lookup

## Tension Types

1. **Direct Conflicts** -- Contradictory constraints that cannot both be satisfied
2. **Resource Tensions** -- Constraints competing for the same resources
3. **Trade-off Pairs** -- Goals requiring balance (improving one degrades the other)
4. **Hidden Dependencies** -- Implicit relationships between constraints (v2: auto-detected)

## Common Tension Patterns

| Tension | Example |
|---------|---------|
| Speed vs Safety | "Fast response" vs "Comprehensive validation" |
| UX vs Security | "User-friendly errors" vs "Security through obscurity" |
| Availability vs Consistency | "High availability" vs "Strong consistency" |
| Cost vs Performance | "Minimize infrastructure" vs "Handle peak load" |

## Resolution Strategies

- **Prioritize** -- Decide which constraint takes precedence
- **Partition** -- Apply different constraints in different contexts
- **Transform** -- Find a solution that satisfies both differently
- **Accept** -- Document the trade-off and move forward
- **Invalidate** -- Remove a constraint if it's not actually required

## Failure Cascade Analysis (GAP-06)

When a resolution introduces a fallback path, recursively ask: "What if the fallback also fails?"

Continue until reaching: **explicit accept-loss decision**, **human intervention** (with escalation path), or **redundant fallback** (independent). This prevents undocumented failure modes from simultaneous outages.

```
TN1 Resolution: Kafka fail -> SQS DLQ fallback
  -> Q: "What if SQS also fails?"
     -> A: Log to local disk + CloudWatch alarm -> human intervention
        -> Constraint added: O6 (DLQ failure alerting)
```

## Tension Resolution Validation Criteria (GAP-08)

Each resolved tension MUST declare testable validation criteria in JSON:

```json
{
  "id": "TN1", "type": "trade_off", "between": ["B1", "T1"], "status": "resolved",
  "validation_criteria": [
    "Strategy pattern dispatches to correct handler class",
    "Fallback path activates when primary fails"
  ]
}
```

These criteria are checked programmatically during `/manifold:m5-verify`.

## Cache Invalidation Sub-Constraints (GAP-16)

**When Required:** Any tension where the resolution involves caching, memoization, or stored computed results.

Generate sub-constraints for: invalidation on validation failure, key/credential rotation handling, forced invalidation mechanism.

## TRIZ Contradiction Classification

Classify each tension using TRIZ before proposing resolutions. Quality gate (U5): If no close match exists, say "No strong TRIZ mapping -- resolve via direct analysis." Tier gate (B2): Never surface Tier C principles (P18, P29-P33, P36-P39) in non-engineering contexts.

### Step 1: Classify contradiction type

| Type | Signal | Example |
|------|--------|---------|
| **Technical** | "the more X, the less Y" | More retries -> better reliability, higher latency |
| **Physical** | "must be X and must not be X" | API must be public (usability) and private (security) |

### Step 2: Map to parameter pairs

| Parameters in Conflict | Principles |
|------------------------|------------|
| Performance vs. Reliability | P10 (Prior action), P25 (Self-service: self-healing), P35 (Parameter changes) |
| Speed vs. Safety | P10 (Prior action), P24 (Intermediary: proxy/adapter), P35 (Parameter changes) |
| Simplicity vs. Capability | P1 (Segmentation), P15 (Dynamization: feature flags), P35 (Parameter changes) |
| Cost vs. Quality | P1 (Segmentation), P10 (Prior action), P27 (Cheap short-living: ephemeral) |
| Flexibility vs. Consistency | P1 (Segmentation), P15 (Dynamization), P40 (Composite: polyglot/hybrid) |
| Privacy vs. Usability | P1 (Segmentation), P10 (Prior action), P24 (Intermediary) |
| Autonomy vs. Control | P10 (Prior action), P15 (Dynamization), P35 (Parameter changes) |
| Speed vs. Correctness | P10 (Prior action), P11 (Beforehand cushioning: fallbacks), P25 (Self-service) |
| Global vs. Local optimum | P3 (Local quality), P1 (Segmentation), P17 (Another dimension) |
| Standardisation vs. Flexibility | P1 (Segmentation), P15 (Dynamization), P3 (Local quality) |

**Tier A principles (always applicable):** P1 Segmentation, P2 Extraction, P5 Merging, P10 Prior action, P11 Beforehand cushioning, P13 The other way round, P15 Dynamization, P17 Another dimension, P22 Blessing in disguise, P24 Intermediary, P25 Self-service, P27 Cheap short-living, P35 Parameter changes, P40 Composite.

### Step 3: Output format per tension

```
TENSION: [description]
CHALLENGER PROFILE: [C-ID] challenger: [tag] vs. [C-ID] challenger: [tag]
TYPE: Technical contradiction | Physical contradiction
PARAMETERS: [A] vs. [B]
TRIZ MATCH: Exact | Approximate (nearest: [pair]) | No match
PRINCIPLES:
  - P[N] [Name]: [one-line application note]
  - P[N] [Name]: [one-line application note]
RESOLUTION OPTIONS: [2-3 candidates incorporating principle guidance]
STATUS: resolved | unresolved
```

Challenger profile informs resolution direction -- challenge the assumption, not the regulation.

## Directional Constraint Propagation

After proposing a resolution, run a propagation check BEFORE committing. For each constraint the resolution affects:
- **TIGHTENED:** Harder to satisfy -- note new pressure, surface challenger tag
- **LOOSENED:** Easier to satisfy -- note benefit
- **VIOLATED:** Unsatisfiable -- resolution is INVALID, must choose another

A tightened `challenger: assumption` should be confirmed; a tightened `challenger: regulation` may block entirely.

### Output format

```
RESOLUTION PROPOSED: [option description]
PROPAGATION CHECK:
  [C-ID] [title]: TIGHTENED | LOOSENED | VIOLATED -- [explanation]
VERDICT: SAFE | BLOCKED (violation found) | PROCEED WITH AWARENESS (tightening noted)
```

### Constructive Relaxation (on VIOLATED)

When VIOLATED, suggest what would make it work:
1. If the violated constraint has a `threshold`, calculate minimum relaxation: "If [C-ID] were relaxed from [current] to [minimum viable], this resolution becomes valid"
2. Check challenger tag: `stakeholder`/`assumption` = "MAY be negotiable"; `regulation`/`technical-reality` = "NOT negotiable -- choose different resolution"

```
VERDICT: BLOCKED (violation found)
RELAXATION SUGGESTION: Relax [C-ID] from [X] to [Y] -> resolution becomes valid
NEGOTIABILITY: [negotiable | not negotiable] (based on challenger tag)
```

### Propagation schema

Record in `.manifold/<feature>.json`:
```json
{
  "tensions": [{
    "id": "TN1", "type": "trade_off", "between": ["B1", "T3"], "status": "resolved",
    "propagation_effects": [
      {"constraint_id": "T3", "effect": "TIGHTENED", "note": "Cache TTL adds 50ms to p99"}
    ]
  }]
}
```

## Automatic Dependency Detection (v2)

With `--auto-deps`, scan constraint statements for implicit dependencies:

| Keyword in Constraint | Likely Depends On |
|----------------------|-------------------|
| "ACID", "durable", "persistent" | Crash recovery, WAL |
| "secure", "authenticated" | Session management, encryption |
| "fast", "performant" | Caching, optimization |
| "reliable", "available" | Redundancy, failover |
| "consistent" | Transaction isolation |

Auto-detected dependencies are typed as `hidden_dependency` tensions. Flag blocking dependencies with elevated priority.

### Blocking Dependency Export for m3

After all tensions are resolved, collect `hidden_dependency` tensions where one constraint blocks another:

```json
{
  "blocking_dependencies": [
    {"blocker": "T3", "blocked": "O4", "tension_id": "TN6"},
    {"blocker": "T8", "blocked": "T9", "tension_id": "TN7"}
  ]
}
```

m3-anchor prioritizes required truth derivation starting from blocking dependencies. The blocker constraint maps to the highest-priority RT and feeds into m3's Theory of Constraints bottleneck identification.

## Context Lookup

Before analyzing tensions, research the feature domain via `WebSearch` to ground conflict analysis in current reality. Extract tension-relevant topics from constraints, look up current capabilities/limitations, known trade-off patterns, and recent incidents. Summarize as a brief "Domain Context" block before analysis.

**Skip when:** `--skip-lookup` flag is passed, or context lookup was already performed in m1-constrain within the same session and is still visible (if context may have been lost due to compaction, re-run).

## Example

```
/manifold:m2-tension payment-retry

TENSION ANALYSIS: payment-retry

TENSIONS DETECTED:

Tension TN1: Performance vs Safety
  T1: API response < 200ms (BOUNDARY)
  B1: No duplicate payments (INVARIANT)
  Conflict: Idempotency check adds ~50ms

  Resolution Options:
  A. Cache recent transaction IDs (adds memory cost)
  B. Async idempotency check (eventual consistency)
  C. Accept 250ms budget (relax T1)

  Recommended: A - Cache recent transaction IDs
  Rationale: B1 is INVARIANT, cannot be violated

TENSION SUMMARY:
- Direct Conflicts: 1 (resolved)
- Resource Tensions: 1 (pending)
- Trade-offs: 0
- Hidden Dependencies: 0

Updated: .manifold/payment-retry.json + .manifold/payment-retry.md
Next: /manifold:m3-anchor payment-retry
```

## Execution Instructions

1. **Context Lookup** -- research feature domain via `WebSearch` unless `--skip-lookup` or already done in m1
2. Read `.manifold/<feature>.json` (structure) and `.manifold/<feature>.md` (content)
3. For each pair of constraints, check for conflicts
4. **If `--auto-deps`:** extract keywords from Markdown content, map to dependency patterns, identify hidden dependencies, flag blocking dependencies
5. For each tension: describe conflict, generate resolution options (A, B, C), recommend based on constraint types (INVARIANT > BOUNDARY > GOAL)
6. For each resolution: run TRIZ classification, then propagation check
7. If `--resolve`, prompt user to choose resolutions
8. **Update TWO files:** JSON (tension objects) + Markdown (descriptions/resolutions)
9. Record iteration in JSON `iterations[]`, set phase to `TENSIONED`
10. Run `manifold validate <feature>` -- fix errors before proceeding
11. Display summary and suggest next step

Run `manifold validate <feature>` after updates. Shared directives (output format, interaction rules, validation) injected by phase-commons hook.
