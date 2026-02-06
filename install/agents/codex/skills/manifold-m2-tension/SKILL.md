name: manifold-m2-tension
description: Surface and resolve constraint conflicts (trade-offs). Identifies direct conflicts, resource tensions, and competing requirements

# /m2-tension

# /m2-tension - Conflict Resolution (Trade-offs)

Surface and resolve constraint conflicts. A "tension" is when two requirements compete—satisfying one makes satisfying the other harder.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/m2-tension <feature>`"
4. **STOP AND WAIT** for user command

> **Plain Language**: This phase asks "Which requirements conflict, and how do we balance them?"
>
> See [GLOSSARY.md](../../docs/GLOSSARY.md) for terminology explanations.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `TENSIONED` |
| **Next Phase** | `ANCHORED` (via /m3-anchor) |
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

```yaml
tensions:
  - id: TN1
    type: trade_off           # Valid: trade_off, resource_tension, hidden_dependency
    status: resolved          # Valid: resolved, unresolved
    between: [T1, B1]         # Constraint IDs in conflict
    resolution: "Description of how tension was resolved"
    decision: "A"             # Selected option (A/B/C)

# Record iteration when phase changes
iterations:
  - number: 2
    phase: tension
    timestamp: "<ISO timestamp>"
    tensions_found: <count>
    tensions_resolved: <count>
    by_type:
      trade_offs: <count>
      resource_tensions: <count>
      hidden_dependencies: <count>
```

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
/m2-tension <feature-name> [--resolve] [--auto-deps]
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

## Example

```
/m2-tension payment-retry

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

Next: /m3-anchor payment-retry
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
/m2-tension graph-db --auto-deps

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

## Execution Instructions

### For JSON+Markdown Format (Default)

1. Read structure from `.manifold/<feature>.json`
2. Read content from `.manifold/<feature>.md`
3. For each pair of constraints, check for conflicts
4. **If `--auto-deps` (v2):**
   - Extract keywords from constraint content in Markdown
   - Map keywords to dependency patterns
   - Identify hidden dependencies automatically
   - Flag blocking dependencies with elevated priority
5. For each tension found:
   - Describe the conflict
   - Generate resolution options (A, B, C)
   - Recommend based on constraint types (INVARIANT > BOUNDARY > GOAL)
6. If `--resolve` flag, prompt user to choose resolutions
7. **Update TWO files:**
   - `.manifold/<feature>.json` — Add tension objects with id, type, between, status
   - `.manifold/<feature>.md` — Add `### TN1: Title` + description + resolution
8. **Record iteration** in JSON `iterations[]`
9. Set phase to TENSIONED in JSON
10. **⚠️ Run `manifold validate <feature>`** — fix any errors before proceeding
11. Display summary and next step

### For Legacy YAML Format

1. Read manifold from `.manifold/<feature>.yaml`
2. For each pair of constraints, check for conflicts
3. **If `--auto-deps` (v2):**
   - Extract keywords from constraint statements
   - Map keywords to dependency patterns
   - Identify hidden dependencies automatically
   - Flag blocking dependencies with elevated priority
4. For each tension found:
   - Describe the conflict
   - Generate resolution options (A, B, C)
   - Recommend based on constraint types (INVARIANT > BOUNDARY > GOAL)
5. If `--resolve` flag, prompt user to choose resolutions
6. Update manifold with tensions and resolutions
7. **Record iteration** in `iterations[]` (v2)
8. Set phase to TENSIONED
9. Display summary and next step

### ⚠️ Mandatory Post-Phase Validation

After updating manifold files, you MUST run validation before showing results:

```bash
manifold validate <feature>
```

If validation fails, fix the errors BEFORE proceeding. The JSON structure must conform to `install/manifold-structure.schema.json`.

**Format lock**: If `.manifold/<feature>.json` exists, ALWAYS use JSON+Markdown format. Never create/update `.yaml` when `.json` exists.
