---
name: manifold-m2-tension
description: "Surface and resolve constraint conflicts (trade-offs). Identifies direct conflicts, resource tensions, and competing requirements"
---

# /manifold:m2-tension

# /manifold:m2-tension - Conflict Resolution (Trade-offs)

Surface and resolve constraint conflicts. A "tension" is when two requirements compete—satisfying one makes satisfying the other harder.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/manifold:m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/manifold:m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/manifold:m2-tension <feature>`"
4. **STOP AND WAIT** for user command

> **Plain Language**: This phase asks "Which requirements conflict, and how do we balance them?"
>
> **Key terms**: A *tension* is when two requirements compete — satisfying one makes satisfying the other harder. Types: `trade_off` (competing goals), `resource_tension` (limited resources), `hidden_dependency` (one must happen before another). A *resolution* records the decision and rationale in the manifold.

## Scope Guard (MANDATORY)

**This phase ONLY updates manifold files** (`.manifold/<feature>.json` and `.manifold/<feature>.md`) with discovered tensions and resolutions. After updating, display the tension summary and suggest the next step.

**DO NOT** do any of the following during m2-tension:
- Create project folders, directory structures, or source files
- Spawn background agents or sub-agents for content creation
- Write README.md, CLAUDE.md, or any files outside `.manifold/`
- Generate code, sample data, templates, or any implementation artifacts
- Begin work that belongs to later phases (m3-m6)
- Implement resolution strategies — only DOCUMENT them in the manifold

**Tension resolutions are DECISIONS recorded in the manifold, not instructions to implement.** The implementation happens in m4-generate. Here you only capture what was decided and why.

**After updating the two manifold files: display tension summary, suggest next step, STOP.**

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

**CRITICAL**: Generate TWO outputs, not one YAML file.

### 1. JSON Structure (IDs, types, refs ONLY)

Update `.manifold/<feature>.json` with tension references:

```json
{
  "tensions": [
    {
      "id": "TN1",
      "type": "trade_off",
      "between": ["T1", "B1"],
      "status": "resolved"
    },
    {
      "id": "TN2",
      "type": "resource_tension",
      "between": ["T2", "O1"],
      "status": "unresolved"
    }
  ]
}
```

**Key rule**: JSON contains NO text content. Only IDs, types, `between` refs, and status.

### 2. Markdown Content (descriptions and resolutions)

Update `.manifold/<feature>.md` with tension content:

```markdown
## Tensions

### TN1: Performance vs Safety

Performance optimizations (caching, batch processing) conflict with safety checks (duplicate detection, validation).

> **Resolution:** Use async safety checks after initial response. Caching includes idempotency keys.

### TN2: Retry Frequency vs Provider Limits

Aggressive retry frequency conflicts with payment processor rate limits.

> **Unresolved:** Need to negotiate higher rate limits or implement adaptive throttling.
```

### Markdown Heading Rules

| ID Pattern | Markdown Heading Level | Example |
|------------|------------------------|---------|
| TN1, TN2, TN3 | `###` (h3) | `### TN1: Performance vs Safety` |

### Why This Eliminates Field Confusion

- **Old YAML**: Had to remember `description` for tensions (different from constraints)
- **New format**: JSON has NO text fields. All text lives in Markdown.
- **Linking**: JSON ID `TN1` links to Markdown heading `### TN1: Title`

## Legacy YAML Format (Still Supported)

If using legacy YAML, tensions use `description`, NOT `statement`:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Format: TN1, TN2, TN3... |
| `type` | string | ✅ | `trade_off`, `resource_tension`, `hidden_dependency` |
| `description` | string | ✅ | The tension text ← **NOT 'statement'** |
| `between` | array | ✅ | Array of constraint IDs in conflict (min 2) |
| `status` | string | ✅ | `resolved` or `unresolved` |
| `resolution` | string | If resolved | How the tension was resolved |

> **Memory Aid**: Tensions _describe_ conflicts → `description`

## v3 Schema Compliance

When recording tensions, maintain v3 schema structure and record iterations:

```json
{
  "tensions": [
    {
      "id": "TN1",
      "type": "trade_off",
      "between": ["T1", "B1"],
      "status": "resolved",
      "decision": "A"
    }
  ],
  "iterations": [
    {
      "number": 2,
      "phase": "tension",
      "timestamp": "2026-04-04T00:00:00Z",
      "result": "Found 3 tensions, resolved 2",
      "tensions_found": 3,
      "tensions_resolved": 2,
      "by_type": { "trade_offs": 1, "resource_tensions": 1, "hidden_dependencies": 1 }
    }
  ]
}
```

> **Note**: Tension text content (description, resolution rationale) goes in the `.md` file under `### TN1: Title`. JSON contains only IDs, types, and structural refs.

## CLI Conflict Detection

Use the CLI to detect semantic conflicts programmatically:

```bash
# Run semantic conflict detection on constraints
manifold validate <feature> --conflicts

# This detects:
# - Contradictory invariants (critical severity)
# - Resource conflicts (high severity)
# - Temporal conflicts (medium severity)
# - Scope conflicts (low severity)
```

## Usage

```
/manifold:m2-tension <feature-name> [--resolve] [--auto-deps] [--skip-lookup]
```

**Flags (v2):**
- `--resolve` - Interactively resolve tensions
- `--auto-deps` - Enable automatic dependency detection (v2)

## Tension Types

1. **Direct Conflicts** - Contradictory constraints that cannot both be satisfied
2. **Resource Tensions** - Constraints competing for the same resources
3. **Trade-off Pairs** - Goals that require balancing (improving one degrades the other)
4. **Hidden Dependencies** - Implicit relationships between constraints (v2: auto-detected)

## Common Tension Patterns

| Tension | Example |
|---------|---------|
| Speed vs Safety | "Fast response" vs "Comprehensive validation" |
| UX vs Security | "User-friendly errors" vs "Security through obscurity" |
| Availability vs Consistency | "High availability" vs "Strong consistency" |
| Cost vs Performance | "Minimize infrastructure" vs "Handle peak load" |

## Resolution Strategies

- **Prioritize** - Decide which constraint takes precedence
- **Partition** - Apply different constraints in different contexts
- **Transform** - Find a solution that satisfies both differently
- **Accept** - Document the trade-off and move forward
- **Invalidate** - Remove a constraint if it's not actually required

## Failure Cascade Analysis (GAP-06)

When a tension resolution introduces a fallback path (e.g., "Kafka fails → DLQ"), you MUST recursively ask:

> "What if the fallback also fails?"

Continue until reaching one of:
- **Explicit accept-loss decision**: Document that data loss is accepted under these conditions
- **Human intervention**: Define the escalation path and runbook
- **Redundant fallback**: Another independent fallback exists

This prevents undocumented failure modes where simultaneous outages cause silent data loss.

### Example

```
TN1 Resolution: Kafka fail → SQS DLQ fallback
  └── Q: "What if SQS also fails?"
      └── A: Log to local disk + CloudWatch alarm → human intervention
          └── Constraint added: O6 (DLQ failure alerting)
```

## Tension Resolution Validation Criteria (GAP-08)

Each resolved tension MUST declare testable validation criteria in the JSON:

```json
{
  "id": "TN1",
  "type": "trade_off",
  "between": ["B1", "T1"],
  "status": "resolved",
  "validation_criteria": [
    "Strategy pattern dispatches to correct handler class",
    "Fallback path activates when primary fails"
  ]
}
```

During `/manifold:m5-verify`, these criteria are checked programmatically.

## Cache Invalidation Sub-Constraints (GAP-16)

**When Required:** Any tension where the resolution involves caching, memoization, or stored computed results.

When tensions involve caching, generate sub-constraints for invalidation triggers beyond TTL:
- On validation failure, should the cache be refreshed before rejecting?
- What happens during key/credential rotation?
- Is there a forced invalidation mechanism?

## TRIZ Contradiction Classification (Enhancement 3)

After detecting a tension and before proposing resolution options, classify it using TRIZ methodology.

### Step 1: Classify the contradiction type

**Technical contradiction:** Improving parameter A degrades parameter B.
Signal: "the more X, the less Y."
Example: more retries → better reliability, higher latency.

**Physical contradiction:** The same element must simultaneously have a property and its opposite.
Signal: "must be X and must not be X."
Example: API must be public (usability) and private (security).

### Step 2: Map to parameter pairs

Match the tension to the parameter pair lookup table below. Surface top 2-3 principles per tension.

**Parameter Pair Lookup Table:**

| Parameters in Conflict | Principles to Apply |
|------------------------|---------------------|
| Performance vs. Reliability | P10 (Prior action: caching/precompute), P25 (Self-service: self-healing), P35 (Parameter changes: runtime tuning) |
| Speed vs. Safety | P10 (Prior action), P24 (Intermediary: proxy/adapter), P35 (Parameter changes) |
| Simplicity vs. Capability | P1 (Segmentation: break into parts), P15 (Dynamization: feature flags), P35 (Parameter changes) |
| Cost vs. Quality | P1 (Segmentation), P10 (Prior action), P27 (Cheap short-living: ephemeral/disposable) |
| Flexibility vs. Consistency | P1 (Segmentation), P15 (Dynamization), P40 (Composite: polyglot/hybrid) |
| Privacy vs. Usability | P1 (Segmentation), P10 (Prior action), P24 (Intermediary) |
| Autonomy vs. Control | P10 (Prior action), P15 (Dynamization), P35 (Parameter changes) |
| Speed vs. Correctness | P10 (Prior action), P11 (Beforehand cushioning: fallbacks), P25 (Self-service) |
| Global vs. Local optimum | P3 (Local quality: different strategies per context), P1 (Segmentation), P17 (Another dimension: add layer) |
| Standardisation vs. Flexibility | P1 (Segmentation), P15 (Dynamization), P3 (Local quality) |

**Key Tier A principles (always applicable):**
- **P1 Segmentation** — Divide into independent parts (microservices, modules, sub-decisions)
- **P2 Extraction** — Separate the problematic part from the useful part
- **P5 Merging** — Combine similar operations (batching, pooling)
- **P10 Prior action** — Pre-compute, cache, prepare in advance
- **P11 Beforehand cushioning** — Circuit breakers, fallbacks, Plan B
- **P13 The other way round** — Invert the approach (push vs pull, event-driven vs polling)
- **P15 Dynamization** — Make it adaptive (feature flags, A/B testing, runtime config)
- **P17 Another dimension** — Add a layer (cache layer, message queue, abstraction)
- **P22 Blessing in disguise** — Turn the constraint into an advantage
- **P24 Intermediary** — Use a proxy, adapter, or broker to absorb conflict
- **P25 Self-service** — Self-healing, auto-scaling, self-documenting
- **P27 Cheap short-living** — Containers, ephemeral infra, throwaway prototypes
- **P35 Parameter changes** — Change config/environment instead of code
- **P40 Composite** — Combine different approaches (polyglot persistence, hybrid architectures)

**Tier C principles (P18, P29-P33, P36-P39):** Engineering-specific with no abstract analog. Never surface in non-engineering contexts.

**Quality gate (U5):** If the parameter pair has no close match in the lookup table, say "No strong TRIZ mapping — resolve via direct analysis" rather than forcing a weak match. If the match is approximate, label it: "Approximate match (nearest: [pair]) — principles may not apply directly."

**Tier gate (B2):** Never surface Tier C principles (P18, P29-P33, P36-P39) in non-engineering contexts. In software contexts, Tier C principles may be surfaced only with explicit "engineering-specific, no abstract analog" warning.

### Step 3: Output format per tension

```
TENSION: [description]
CHALLENGER PROFILE: [C-ID] challenger: [tag] vs. [C-ID] challenger: [tag]
TYPE: Technical contradiction | Physical contradiction
PARAMETERS: [A] vs. [B]
TRIZ MATCH: Exact | Approximate (nearest: [pair]) | No match
PRINCIPLES:
  - P[N] [Name]: [one-line application note for this specific tension]
  - P[N] [Name]: [one-line application note]
RESOLUTION OPTIONS: [2-3 candidates incorporating principle guidance]
STATUS: resolved | unresolved
```

Note: Challenger profile informs resolution direction before principles are applied — challenge the assumption, not the regulation.

## Directional Constraint Propagation (Enhancement 8)

After proposing a resolution option for a tension, run a propagation check BEFORE committing the resolution. This prevents cascading constraint violations.

### Propagation check procedure

For the proposed resolution option:

1. List ALL constraints it directly affects (not just the two in tension)
2. For each affected constraint:
   - **TIGHTENED:** Makes it harder to satisfy → note the new pressure
   - **LOOSENED:** Makes it easier to satisfy → note the benefit
   - **VIOLATED:** Makes it unsatisfiable → resolution is INVALID, must choose another
3. Flag any VIOLATION immediately — this resolution option is blocked
4. Flag any TIGHTEN — note the new constraint pressure, surface to user
5. If no violations: mark resolution SAFE TO PROCEED

### Interaction with constraint genealogy

When a propagation check finds a TIGHTENED constraint, surface its challenger tag:
- A tightened `challenger: assumption` should be confirmed before accepting the resolution
- A tightened `challenger: regulation` may block the option entirely regardless of other factors

### Output format

```
RESOLUTION PROPOSED: [option description]
PROPAGATION CHECK:
  [C-ID] [title]: TIGHTENED — [how and by how much]
  [C-ID] [title]: LOOSENED — [how]
  [C-ID] [title]: VIOLATED — [why this invalidates the resolution]
VERDICT: SAFE | BLOCKED (violation found) | PROCEED WITH AWARENESS (tightening noted)
```

### Constructive Relaxation Suggestion (on VIOLATED)

When a propagation check finds VIOLATED, don't just block -- suggest what would make it work:

1. Identify the violated constraint (C-violated)
2. If C-violated has a `threshold` object, calculate the minimum relaxation that makes the resolution valid:
   > "If [C-violated ID] were relaxed from [current value] to [minimum viable value], this resolution becomes valid"
3. Check the challenger tag for negotiability:
   - `challenger: stakeholder` or `challenger: assumption` → "This constraint MAY be negotiable"
   - `challenger: regulation` or `challenger: technical-reality` → "This constraint is NOT negotiable — choose a different resolution"
4. Add to the propagation output:

```
VERDICT: BLOCKED (violation found)
RELAXATION SUGGESTION: Relax [C-ID] from [X] to [Y] → resolution becomes valid
NEGOTIABILITY: [negotiable | not negotiable] (based on challenger tag)
```

This turns dead-end tensions into actionable trade-off decisions. In `engineering-hardening`, B4 was relaxed from 2min to 3min (TN5) -- this pattern should be prompted, not accidental.

### Schema

Record propagation effects in `.manifold/<feature>.json`:
```json
{
  "tensions": [{
    "id": "TN1",
    "type": "trade_off",
    "between": ["B1", "T3"],
    "status": "resolved",
    "propagation_effects": [
      {"constraint_id": "T3", "effect": "TIGHTENED", "note": "Cache TTL adds 50ms to p99"}
    ]
  }]
}
```

## Example

```
/manifold:m2-tension payment-retry

TENSION ANALYSIS: payment-retry

TENSIONS DETECTED:

Tension T1: Performance vs Safety
├── T1: API response < 200ms (BOUNDARY)
├── B1: No duplicate payments (INVARIANT)
└── Conflict: Idempotency check adds ~50ms

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

## Automatic Dependency Detection (v2)

With `--auto-deps`, the framework scans constraint statements for implicit dependencies:

### Dependency Keywords

| Keyword in Constraint | Likely Depends On |
|----------------------|-------------------|
| "ACID", "durable", "persistent" | Crash recovery, WAL |
| "secure", "authenticated" | Session management, encryption |
| "fast", "performant" | Caching, optimization |
| "reliable", "available" | Redundancy, failover |
| "consistent" | Transaction isolation |

### Example: Auto-Detected Hidden Dependency

```
/manifold:m2-tension graph-db --auto-deps

DEPENDENCY ANALYSIS (v2):

Scanning constraint statements for implicit relationships...

HIDDEN DEPENDENCY DETECTED:
├── B4: "ACID compliance for all transactions"
│   └── Keywords: "ACID", "transactions"
├── T3: "Persistence must survive crash and recover"
│   └── Keywords: "crash", "recover", "persistence"
└── Relationship: B4 REQUIRES T3

    Rationale: ACID 'D' (Durability) cannot be satisfied
    without crash recovery capability.

    Resolution: T3 must be implemented BEFORE B4.
    Priority: T3 elevated to blocking dependency.

AUTO-DETECTED DEPENDENCIES:
- T3 → B4 (blocking)
- O3 → B2 (verification requires CI)
```

### Blocking Dependency Export for m3

After all tensions are resolved, collect all `hidden_dependency` tensions where one constraint blocks another. Write to JSON as a top-level array:

```json
{
  "blocking_dependencies": [
    {"blocker": "T3", "blocked": "O4", "tension_id": "TN6"},
    {"blocker": "T8", "blocked": "T9", "tension_id": "TN7"}
  ]
}
```

**m3-anchor SHOULD prioritize required truth derivation starting from blocking dependencies.** The blocker constraint maps to the highest-priority RT. This feeds directly into m3's Theory of Constraints bottleneck identification -- blocking dependencies are the strongest candidates for the binding constraint.

## Context Lookup (MANDATORY)

**Before analyzing tensions**, research the feature's domain to ensure conflict analysis reflects current reality. Tensions grounded in outdated assumptions produce wrong trade-offs.

### Steps

1. **Extract tension-relevant topics** from the discovered constraints—identify technologies, standards, and external systems referenced in constraint statements
2. **Use `WebSearch`** to look up:
   - Current capabilities and limitations of referenced technologies (e.g., database consistency models, API rate limits, provider SLAs)
   - Known trade-off patterns and resolution strategies used by practitioners in this domain
   - Recent incidents, post-mortems, or advisories that reveal real-world tensions
3. **Summarize findings** in a brief "Domain Context" block shown to the user before tension analysis:

```
DOMAIN CONTEXT (via web search):
- [Key finding 1 with source]
- [Key finding 2 with source]
- [Key finding 3 with source]
```

4. **Use these findings to inform** tension analysis—identify real conflicts based on current system behaviors, not assumed ones

### When to Skip

- `--skip-lookup` flag is passed
- Context lookup was already performed in m1-constrain within the same session and the domain context is still visible in the conversation. **If context may have been lost due to compaction**, re-run the lookup for tension-relevant topics rather than assuming prior results are still available.

### Why This Matters

Without context lookup, the AI may:
- Declare tensions that don't actually exist given current technology capabilities
- Miss real tensions caused by recent API changes or deprecations
- Propose resolution strategies that rely on outdated system behaviors
- Force the user to correct false trade-offs during the analysis

## Execution Instructions

### For JSON+Markdown Format (Default)

1. **Run Context Lookup** (see above) — research the feature domain via `WebSearch` unless already done in m1
2. Read structure from `.manifold/<feature>.json`
3. Read content from `.manifold/<feature>.md`
4. For each pair of constraints, check for conflicts
5. **If `--auto-deps` (v2):**
   - Extract keywords from constraint content in Markdown
   - Map keywords to dependency patterns
   - Identify hidden dependencies automatically
   - Flag blocking dependencies with elevated priority
6. For each tension found:
   - Describe the conflict
   - Generate resolution options (A, B, C)
   - Recommend based on constraint types (INVARIANT > BOUNDARY > GOAL)
7. If `--resolve` flag, prompt user to choose resolutions
8. **Update TWO files:**
   - `.manifold/<feature>.json` — Add tension objects with id, type, between, status
   - `.manifold/<feature>.md` — Add `### TN1: Title` + description + resolution
9. **Record iteration** in JSON `iterations[]`
10. Set phase to TENSIONED in JSON
11. **⚠️ Run `manifold validate <feature>`** — fix any errors before proceeding
12. Display summary and next step

### For Legacy YAML Format

1. **Run Context Lookup** (see above) — research the feature domain via `WebSearch` unless already done in m1
2. Read manifold from `.manifold/<feature>.yaml`
3. For each pair of constraints, check for conflicts
4. **If `--auto-deps` (v2):**
   - Extract keywords from constraint statements
   - Map keywords to dependency patterns
   - Identify hidden dependencies automatically
   - Flag blocking dependencies with elevated priority
5. For each tension found:
   - Describe the conflict
   - Generate resolution options (A, B, C)
   - Recommend based on constraint types (INVARIANT > BOUNDARY > GOAL)
6. If `--resolve` flag, prompt user to choose resolutions
7. Update manifold with tensions and resolutions
8. **Record iteration** in `iterations[]` (v2)
9. Set phase to TENSIONED
10. Display summary and next step

### ⚠️ Mandatory Post-Phase Validation

After updating manifold files, you MUST run validation before showing results:

```bash
manifold validate <feature>
```

If validation fails, fix the errors BEFORE proceeding. The JSON structure must conform to `install/manifold-structure.schema.json`.

**Format lock**: If `.manifold/<feature>.json` exists, ALWAYS use JSON+Markdown format. Never create/update `.yaml` when `.json` exists.


## Interaction Rules (MANDATORY)
<!-- Satisfies: RT-1 (next-step templates), RT-3 (structured input), U1 (suggest next), U2 (AskUserQuestion) -->

1. **Questions → AskUserQuestion**: When you need user input during this phase, use the `AskUserQuestion` tool with structured options. NEVER ask questions as plain text without options.
2. **Phase complete → Suggest next**: After completing this phase, ALWAYS include the concrete next command (`/manifold:mN-xxx <feature>`) and a one-line explanation of what the next phase does.
3. **Trade-offs → Labeled options**: When presenting alternatives, use `AskUserQuestion` with labeled choices (A, B, C) and descriptions.
