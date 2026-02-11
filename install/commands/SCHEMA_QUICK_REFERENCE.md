---
description: "Quick lookup for Manifold field names across YAML and JSON+MD formats. Prevents field name confusion."
---

# Manifold Schema Quick Reference

> **PURPOSE**: This file exists to prevent field name confusion between AI commands.
> It documents both the legacy YAML format and the new JSON+Markdown hybrid format.

## Format Options

### JSON+Markdown Hybrid (Recommended)

**Why this format eliminates field name confusion:**
- **JSON file** (`<feature>.json`) contains ONLY structure: IDs, types, phases, references
- **Markdown file** (`<feature>.md`) contains ALL text content: statements, descriptions, rationale
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
manifold migrate <feature>     # Convert YAML → JSON+MD
```

### Legacy YAML Format

Single file (`<feature>.yaml`) with both structure and content.

## Field Names - For YAML Only

| Structure | Text Field | Use | Memory Aid |
|-----------|------------|-----|------------|
| **Constraint** | `statement` | What must be true | Constraints _state_ requirements |
| **Tension** | `description` | What the conflict is | Tensions _describe_ conflicts |
| **RequiredTruth** | `statement` | What must be verified | Truths _state_ conditions |
| **Iteration** | `result` | What was accomplished | Iterations report _results_ |

### The Rule (YAML only)

```
NEVER use 'description' for Constraints or RequiredTruths
NEVER use 'statement' for Tensions
```

> **NOTE**: In JSON+Markdown format, these text fields live in Markdown, not JSON.
> JSON only has IDs and type references, eliminating this confusion entirely.

## Valid Values Reference

### Phases
```
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
```

### Constraint Types
```yaml
type: invariant  # Must NEVER be violated
type: goal       # Should be optimized
type: boundary   # Hard limits
```

### Tension Types
```yaml
type: trade_off           # Competing constraints
type: resource_tension    # Resource limits
type: hidden_dependency   # Non-obvious relationships
```

### Statuses
```yaml
# Tension statuses
status: resolved
status: unresolved

# Required truth statuses
status: SATISFIED
status: PARTIAL
status: NOT_SATISFIED
status: SPECIFICATION_READY

# Convergence statuses
status: NOT_STARTED
status: IN_PROGRESS
status: CONVERGED

# Evidence statuses (v3)
status: VERIFIED
status: PENDING
status: FAILED
status: STALE
```

### Constraint ID Prefixes
```yaml
B1, B2, ...  # Business constraints
T1, T2, ...  # Technical constraints
U1, U2, ...  # User experience constraints
S1, S2, ...  # Security constraints
O1, O2, ...  # Operational constraints
TN1, TN2, ...  # Tension IDs
RT-1, RT-2, ... # Required truth IDs
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

## Legacy YAML Templates

### Constraint (uses `statement`)
```yaml
constraints:
  business:
    - id: B1
      statement: "No duplicate payments allowed"  # ← statement
      type: invariant
      rationale: "Duplicates cause chargebacks"
```

### Tension (uses `description`)
```yaml
tensions:
  - id: TN1
    type: trade_off
    description: "Performance vs safety trade-off"  # ← description
    between: [T1, B1]
    status: resolved
    resolution: "Use caching"
```

### Required Truth (uses `statement`)
```yaml
anchors:
  required_truths:
    - id: RT-1
      statement: "Idempotency key preserved across retries"  # ← statement
      status: NOT_SATISFIED
      priority: 1
```

### Iteration (uses `result`)
```yaml
iterations:
  - number: 1
    phase: constrain
    timestamp: "2026-01-29T10:00:00Z"
    result: "Discovered 12 constraints across 5 categories"  # ← result
```

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

### JSON+Markdown Format

| Wrong | Right | Fix |
|-------|-------|-----|
| Text in JSON | Text in Markdown | JSON = structure only |
| `"statement": "..."` in JSON | Markdown heading | Move text to `.md` file |
| Missing Markdown heading for ID | `#### B1: Title` | Every JSON ID needs Markdown heading |

### Legacy YAML Format

| Wrong | Right | Fix |
|-------|-------|-----|
| `constraint.description` | `constraint.statement` | Constraints state, not describe |
| `tension.statement` | `tension.description` | Tensions describe, not state |
| `required_truth.description` | `required_truth.statement` | Truths state conditions |
| `phase: Initialized` | `phase: INITIALIZED` | Phases are UPPERCASE |
| `type: INVARIANT` | `type: invariant` | Types are lowercase |

---

*For complete schema documentation, see [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md)*
