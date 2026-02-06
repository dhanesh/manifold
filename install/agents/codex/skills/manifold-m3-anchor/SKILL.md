---
name: manifold-m3-anchor
description: "Backward reasoning from desired outcome. Derives required conditions by asking 'What must be TRUE?'"
---

# /m3-anchor

# /m3-anchor - Outcome Anchoring (Requirements Derivation)

Backward reasoning from desired outcome to required conditions.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/m3-anchor <feature>`"
4. **STOP AND WAIT** for user command

> **Plain Language**: Instead of planning forward ("build X, then Y, then Z"), we work backward from the goal: "For our goal to be achieved, what MUST be true?" This surfaces hidden requirements early.
>
> See [GLOSSARY.md](../../docs/GLOSSARY.md) for terminology explanations.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `ANCHORED` |
| **Next Phase** | `GENERATED` (via /m4-generate) |
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

## Legacy YAML Format (Still Supported)

When using legacy YAML, maintain v3 schema structure:

```yaml
anchors:
  required_truths:
    - id: RT-1
      statement: "Description of what must be true"
      status: NOT_SATISFIED    # Valid: SATISFIED, PARTIAL, NOT_SATISFIED, SPECIFICATION_READY
      gap: "What's missing"
      evidence:                # v3: Reality grounding
        - type: file_exists
          path: "path/to/implementation"
        - type: content_match
          path: "path/to/file"
          pattern: "expected pattern"
        - type: test_passes
          path: "path/to/test"
          test_name: "test name"

# Record iteration when phase changes
iterations:
  - number: 3
    phase: anchor
    timestamp: "<ISO timestamp>"
    required_truths: <count>
    by_status:
      SATISFIED: <count>
      PARTIAL: <count>
      NOT_SATISFIED: <count>
      SPECIFICATION_READY: <count>
    solution_options: <count>
    selected_option: "Option description"
```

**Evidence Types** (v3):
- `file_exists` - Verify file exists on disk
- `content_match` - Grep for pattern in file
- `test_passes` - Run test and check exit code
- `metric_value` - Check runtime metric threshold
- `manual_review` - Requires human verification

## Usage

```
/m3-anchor <feature-name> [--outcome="<statement>"]
```

## Why Backward Reasoning?

**Forward planning** (traditional): Start with spec → implement features → hope it works
- Misses implicit requirements
- Discovers edge cases late

**Backward reasoning** (Manifold): Start with outcome → ask "What must be TRUE?" → derive requirements
- Surfaces hidden assumptions
- Identifies gaps early
- Constrains solution space

## Process

1. **State the outcome** - Clear, measurable success criteria
2. **Ask "What must be TRUE?"** - Necessary conditions for outcome
3. **Derive required truths** - Chain backward from each condition
4. **Identify gaps** - What's missing between current state and requirements?
5. **Generate solution space** - Options that satisfy all required truths

## Example

```
/m3-anchor payment-retry --outcome="95% retry success for transient failures"

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

Next: /m4-generate payment-retry --option=C
```

## Execution Instructions

### For JSON+Markdown Format (Default)

1. Read structure from `.manifold/<feature>.json`
2. Read content from `.manifold/<feature>.md`
3. Get outcome from `--outcome` flag or Markdown `## Outcome` section
4. For the outcome, recursively ask "What must be TRUE?"
5. Each truth becomes an RT-N (Required Truth)
6. Identify gaps between current state and requirement
7. Generate 2-4 solution options
8. Recommend best option with rationale
9. **Update TWO files:**
   - `.manifold/<feature>.json` — Add required truths to `anchors.required_truths` with id, status, maps_to
   - `.manifold/<feature>.md` — Add `### RT-1: Title` + statement + gap under `## Required Truths`
10. Set phase to ANCHORED in JSON
11. **⚠️ Run `manifold validate <feature>`** — fix any errors before proceeding

### For Legacy YAML Format

1. Read manifold from `.manifold/<feature>.yaml`
2. Get outcome from `--outcome` flag or manifold file
3. For the outcome, recursively ask "What must be TRUE?"
4. Each truth becomes an RT-N (Required Truth)
5. Identify gaps between current state and requirement
6. Generate 2-4 solution options
7. Recommend best option with rationale
8. Save to `.manifold/<feature>.anchor.yaml`
9. Set phase to ANCHORED

### ⚠️ Mandatory Post-Phase Validation

After updating manifold files, you MUST run validation before showing results:

```bash
manifold validate <feature>
```

If validation fails, fix the errors BEFORE proceeding. The JSON structure must conform to `install/manifold-structure.schema.json`.

**Format lock**: If `.manifold/<feature>.json` exists, ALWAYS use JSON+Markdown format. Never create/update `.yaml` when `.json` exists.
