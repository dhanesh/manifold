---
description: "Quick lookup for Manifold JSON schema field names. Prevents field name confusion and lists all required fields."
---

# Manifold Schema Quick Reference

> **PURPOSE**: This file exists to prevent field name confusion and document required fields.
> New manifolds use JSON+Markdown hybrid format. YAML is only supported for migrating legacy manifolds.

## Format: JSON+Markdown Hybrid

**Two files per feature:**
- **JSON file** (`<feature>.json`) — ONLY structure: IDs, types, phases, references
- **Markdown file** (`<feature>.md`) — ALL text content: statements, descriptions, rationale
- No text fields in JSON = no `statement` vs `description` confusion

**Files created:**
```
.manifold/
├── <feature>.json    # Structure only (IDs, types, refs)
└── <feature>.md      # Content only (text, rationale)
```

**CLI commands:**
```bash
manifold validate <feature>    # Validates both files + linking
manifold show <feature>        # Combined view
manifold migrate <feature>     # Convert legacy YAML → JSON+MD
```

## Required Fields Per Object Type

> **CRITICAL**: These fields are MANDATORY. Omitting them will fail `manifold validate`.

| Object | Required Fields | Example |
|--------|----------------|---------|
| **Evidence** | `id`, `type` | `{"id": "E1", "type": "file_exists", "path": "..."}` |
| **Iteration** | `number`, `phase`, `timestamp`, `result` | `{"number": 1, "phase": "constrain", "timestamp": "...", "result": "Discovered 12 constraints"}` |
| **Constraint** | `id`, `type` | `{"id": "B1", "type": "invariant"}` |
| **Tension** | `id`, `type`, `between`, `status` | `{"id": "TN1", "type": "trade_off", "between": ["B1", "T1"], "status": "resolved"}` |
| **Required Truth** | `id`, `status` | `{"id": "RT-1", "status": "NOT_SATISFIED"}` |

**Common mistakes that fail validation:**
- Evidence without `id` → Add `"id": "E1"`, `"E2"`, etc.
- Iteration without `result` → Add `"result": "Summary of what happened"`

## Text Content Rule

In JSON+Markdown format, **all text content lives in Markdown**, not JSON. JSON only has IDs, types, and references.

| Object | Text goes in Markdown as... | JSON has only... |
|--------|---------------------------|-----------------|
| **Constraint** | `#### B1: Title` + paragraph + `> **Rationale:**` | `id`, `type` |
| **Tension** | `### TN1: Title` + paragraph + `> **Resolution:**` | `id`, `type`, `between`, `status` |
| **Required Truth** | `### RT-1: Title` + paragraph + `**Gap:**` | `id`, `status`, `maps_to`, `evidence` |
| **Iteration** | N/A (result is a brief summary string in JSON) | `number`, `phase`, `timestamp`, `result` |

## Valid Values Reference

### Phases
```
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
```

### Constraint Types
```json
"type": "invariant"         // Must NEVER be violated
"type": "goal"              // Should be optimized
"type": "boundary"          // Hard limits
```

### Tension Types
```json
"type": "trade_off"          // Competing constraints
"type": "resource_tension"   // Resource limits
"type": "hidden_dependency"  // Non-obvious relationships
```

### Statuses
```json
// Tension statuses
"status": "resolved"
"status": "unresolved"

// Required truth statuses
"status": "SATISFIED"
"status": "PARTIAL"
"status": "NOT_SATISFIED"
"status": "SPECIFICATION_READY"

// Convergence statuses
"status": "NOT_STARTED"
"status": "IN_PROGRESS"
"status": "CONVERGED"

// Evidence statuses (v3)
"status": "VERIFIED"
"status": "PENDING"
"status": "FAILED"
"status": "STALE"
```

### Constraint ID Prefixes
```
B1, B2, ...     // Business constraints
T1, T2, ...     // Technical constraints
U1, U2, ...     // User experience constraints
S1, S2, ...     // Security constraints
O1, O2, ...     // Operational constraints
TN1, TN2, ...   // Tension IDs
RT-1, RT-2, ... // Required truth IDs
E1, E2, ...     // Evidence IDs
```

## JSON+Markdown Templates (Recommended)

### JSON Structure File (`<feature>.json`)

```json
{
  "schema_version": 3,
  "feature": "payment-retry",
  "phase": "CONSTRAINED",
  "constraints": {
    "business": [
      {"id": "B1", "type": "invariant"},
      {"id": "B2", "type": "goal"}
    ],
    "technical": [
      {"id": "T1", "type": "boundary"}
    ]
  },
  "tensions": [
    {"id": "TN1", "type": "trade_off", "between": ["B1", "T1"], "status": "resolved"}
  ],
  "anchors": {
    "required_truths": [
      {"id": "RT-1", "status": "NOT_SATISFIED", "maps_to": ["B1"]}
    ]
  }
}
```

**Key insight**: JSON has NO text content fields. Only IDs, types, and references.

### Markdown Content File (`<feature>.md`)

```markdown
# payment-retry

## Outcome

Achieve 95% retry success rate with zero duplicate payments.

---

## Constraints

### Business

#### B1: No Duplicate Payments

Payment processing must never create duplicate charges for the same order.

> **Rationale:** Duplicates cause chargebacks, refund overhead, and complaints.

**Implemented by:** `lib/retry/IdempotencyService.ts`
**Verified by:** `tests/idempotency.test.ts`

#### B2: 95% Success Rate

Achieve 95% retry success rate within 72 hours of initial failure.

---

### Technical

#### T1: 72-Hour Retry Window

All retries must complete within 72 hours of initial failure.

---

## Tensions

### TN1: Performance vs Safety

Performance optimizations conflict with safety checks (duplicate detection).

> **Resolution:** Use async safety checks after initial response.

---

## Required Truths

### RT-1: Idempotency Preserved

Idempotency key must be preserved across all retry attempts.
```

**Parsing rules:**
- `#### B1: Title` → Constraint ID `B1`
- `### TN1: Title` → Tension ID `TN1`
- `### RT-1: Title` → Required Truth ID `RT-1`
- `> **Rationale:**` → Rationale blockquote
- `> **Resolution:**` → Resolution blockquote

## Legacy YAML Format (Migration Only)

> YAML manifolds are only supported for backward compatibility. Use `manifold migrate <feature>` to convert to JSON+MD.
> In YAML, text fields use specific names: constraints use `statement`, tensions use `description`, required truths use `statement`, iterations use `result`. Never mix these up.

## Validation Commands

```bash
# Validate a feature manifold (auto-detects format)
manifold validate <feature>

# Show combined JSON+Markdown view
manifold show <feature>

# Migrate YAML to JSON+Markdown
manifold migrate <feature>

# Validate with all checks
manifold validate <feature> --all

# Strict mode (warnings become errors)
manifold validate <feature> --strict
```

## Common Mistakes

| Wrong | Right | Fix |
|-------|-------|-----|
| Text in JSON | Text in Markdown | JSON = structure only, text in `.md` |
| `"statement": "..."` in JSON | Markdown heading | Move text to `.md` file |
| Missing Markdown heading for ID | `#### B1: Title` | Every JSON ID needs Markdown heading |
| Evidence without `"id"` | `{"id": "E1", "type": ...}` | Every evidence MUST have `id` |
| Iteration without `"result"` | `{"result": "...", ...}` | Every iteration MUST have `result` |
| `"phase": "Initialized"` | `"phase": "INITIALIZED"` | Phases are UPPERCASE |
| `"type": "INVARIANT"` | `"type": "invariant"` | Types are lowercase |
| Creating `.yaml` file | Create `.json` + `.md` | YAML is legacy only |

---

*For complete schema documentation, see [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md)*
