---
description: "Backward reasoning from desired outcome. Derives required conditions by asking 'What must be TRUE?'"
argument-hint: "<feature-name>"
---

# /manifold:m3-anchor - Outcome Anchoring (Requirements Derivation)

Backward reasoning from desired outcome to required conditions.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/manifold:m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/manifold:m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/manifold:m3-anchor <feature>`"
4. **STOP AND WAIT** for user command

> **Plain Language**: Instead of planning forward ("build X, then Y, then Z"), we work backward from the goal: "For our goal to be achieved, what MUST be true?" This surfaces hidden requirements early.
>
> See [GLOSSARY.md](../../docs/GLOSSARY.md) for terminology explanations.

## Scope Guard (MANDATORY)

**This phase ONLY updates manifold files** (`.manifold/<feature>.json` and `.manifold/<feature>.md`) with required truths, gaps, and solution options. After updating, display the anchoring summary and suggest the next step.

**DO NOT** do any of the following during m3-anchor:
- Create project folders, directory structures, or source files
- Spawn background agents or sub-agents for content creation
- Write README.md, CLAUDE.md, or any files outside `.manifold/`
- Generate code, sample data, templates, or any implementation artifacts
- Begin implementing the recommended solution option — that belongs to m4-generate
- Begin work that belongs to later phases (m4-m6)

**Solution options are PROPOSALS recorded in the manifold, not instructions to build.** The user must explicitly invoke m4-generate to begin implementation. Here you only capture what must be true, what gaps exist, and what options are available.

**After updating the two manifold files: display anchoring summary, suggest next step, STOP.**

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
/manifold:m3-anchor <feature-name> [--outcome="<statement>"] [--skip-lookup]
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

## Context Lookup (MANDATORY)

**Before anchoring**, research the feature's domain to ensure backward reasoning and solution options reflect current reality. Required truths derived from stale assumptions create implementation gaps that surface late.

### Steps

1. **Extract solution-relevant topics** from the outcome statement and discovered constraints—identify technologies, architectural patterns, and external services that will shape the solution space
2. **Use `WebSearch`** to look up:
   - Current architectural patterns and implementation approaches for this type of feature
   - Recent library/framework versions, migration guides, or breaking changes relevant to the solution space
   - Production experiences and lessons learned from similar implementations (blog posts, post-mortems, conference talks)
   - Current pricing, limits, or SLAs of external services that may constrain solution options
3. **Summarize findings** in a brief "Domain Context" block shown to the user before anchoring:

```
DOMAIN CONTEXT (via web search):
- [Key finding 1 with source]
- [Key finding 2 with source]
- [Key finding 3 with source]
```

4. **Use these findings to inform** required truth derivation and solution option generation—propose options that use current best practices and available tools

### When to Skip

- `--skip-lookup` flag is passed
- Context lookup was already performed in m1-constrain or m2-tension within the same session and the domain context is still in the conversation

### Why This Matters

Without context lookup, the AI may:
- Propose solution options using deprecated libraries or outdated architectural patterns
- Miss better approaches that have emerged since training
- Set required truths based on incorrect assumptions about current system capabilities
- Generate a solution space that the user must extensively correct

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
12. **⚠️ Run `manifold validate <feature>`** — fix any errors before proceeding

### For Legacy YAML Format

1. **Run Context Lookup** (see above) — research the feature domain via `WebSearch` unless already done in m1/m2
2. Read manifold from `.manifold/<feature>.yaml`
3. Get outcome from `--outcome` flag or manifold file
4. For the outcome, recursively ask "What must be TRUE?"
5. Each truth becomes an RT-N (Required Truth)
6. Identify gaps between current state and requirement
7. Generate 2-4 solution options
8. Recommend best option with rationale
9. Save to `.manifold/<feature>.anchor.yaml`
10. Set phase to ANCHORED

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