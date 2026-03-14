---
description: "Interview-driven constraint discovery across 5 categories (business, technical, UX, security, operational)"
argument-hint: "<feature-name>"
---

# /manifold:m1-constrain - Constraint Discovery

Interview-driven constraint discovery across 5 categories.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/manifold:m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/manifold:m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/manifold:m1-constrain <feature>`"
4. **STOP AND WAIT** for user command

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `CONSTRAINED` |
| **Next Phase** | `TENSIONED` (via /manifold:m2-tension) |
| **Constraint Types** | `invariant`, `goal`, `boundary` |
| **Constraint Categories** | `business`, `technical`, `user_experience`, `security`, `operational` |
| **Constraint ID Prefixes** | B1, B2... (business), T1, T2... (technical), U1, U2... (UX), S1, S2... (security), O1, O2... (operational) |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new types or categories.

## Output Format: JSON+Markdown Hybrid

**CRITICAL**: Generate TWO outputs, not one YAML file.

### 1. JSON Structure (IDs and types ONLY)

Update `.manifold/<feature>.json` with constraint references:

```json
{
  "constraints": {
    "business": [
      {"id": "B1", "type": "invariant"},
      {"id": "B2", "type": "goal"}
    ],
    "technical": [
      {"id": "T1", "type": "boundary"}
    ]
  }
}
```

**Key rule**: JSON contains NO text content. Only IDs and types.

### 2. Markdown Content (text and rationale)

Update `.manifold/<feature>.md` with constraint content:

```markdown
## Constraints

### Business

#### B1: No Duplicate Payments

Payment processing must never create duplicate charges for the same order.

> **Rationale:** Duplicates cause chargebacks, refund processing overhead, and customer complaints.

**Implemented by:** `lib/retry/IdempotencyService.ts`

#### B2: 95% Success Rate

Achieve 95% retry success rate within 72 hours of initial failure.

> **Rationale:** Industry standard for payment retry success.

---

### Technical

#### T1: 72-Hour Retry Window

All retries must complete within 72 hours of initial failure.

> **Rationale:** Payment processor SLAs require resolution within 72 hours.
```

### Markdown Heading Rules

| ID Pattern | Markdown Heading Level | Example |
|------------|------------------------|---------|
| B1, T1, U1, S1, O1 | `####` (h4) | `#### B1: No Duplicates` |
| Category | `###` (h3) | `### Business` |

### Why This Eliminates Field Confusion

- **Old YAML**: Had to remember `statement` for constraints, `description` for tensions
- **New format**: JSON has NO text fields. All text lives in Markdown.
- **Linking**: JSON ID `B1` links to Markdown heading `#### B1: Title`

## Legacy YAML Format (Still Supported)

If using legacy YAML, constraints use `statement`, NOT `description`:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Format: B1, T1, U1, S1, O1 |
| `statement` | string | ✅ | The constraint text ← **NOT 'description'** |
| `type` | string | ✅ | `invariant`, `goal`, or `boundary` |
| `rationale` | string | ✅ | Why this constraint exists |

> **Memory Aid**: Constraints _state_ what must be true → `statement`

## v3 Schema Compliance

When adding constraints, ensure the manifold maintains v3 schema structure:

```yaml
# v3 requires these fields (created by /manifold:m0-init)
schema_version: 3
iterations: []      # Track each phase change
convergence:
  status: NOT_STARTED
evidence: []        # For reality grounding
constraint_graph:   # For temporal non-linearity
  version: 1
  nodes: {}
  edges:
    dependencies: []
    conflicts: []
    satisfies: []
```

**Record iteration** when updating constraints:
```yaml
iterations:
  - number: 1
    phase: constrain
    timestamp: "<ISO timestamp>"
    constraints_added: <count>
    by_category:
      business: <count>
      technical: <count>
      user_experience: <count>
      security: <count>
      operational: <count>
```

## Usage

```
/manifold:m1-constrain <feature-name> [--category=<category>] [--skip-lookup]
```

## Constraint Categories

1. **Business** - Revenue impact, compliance requirements, stakeholder needs
2. **Technical** - Performance requirements, integration points, data constraints
3. **User Experience** - Response times, error handling, accessibility
4. **Security** - Data protection, authentication, audit requirements
5. **Operational** - Monitoring needs, SLAs, incident procedures

## Constraint Types

- **INVARIANT** - Must NEVER be violated (e.g., "No duplicate payments")
- **GOAL** - Should be optimized (e.g., "95% success rate")
- **BOUNDARY** - Hard limits (e.g., "Retry window ≤ 72 hours")

## Interview Process

For each category, ask probing questions:

### Business
- What's the revenue/cost impact of this feature?
- Are there compliance or legal requirements?
- Who are the stakeholders and what do they need?
- What happens if this feature fails?

### Technical
- What are the performance requirements?
- What systems does this integrate with?
- What data consistency guarantees are needed?
- What's the expected load/scale?

**Core Data Path Analysis** (GAP-03): Identify the primary data flow through the system. For each transition in the flow, ask:
- Does this transition cross a system boundary (process, network, service)?
- What integration test constraint should cover this transition?
- What is the fallback path if this transition fails?

### User Experience
- What response times are acceptable?
- How should errors be communicated?
- Are there accessibility requirements?
- What's the user's mental model?

### Security
- What data needs protection?
- What authentication/authorization is required?
- What needs to be audited?
- What are the threat vectors?

**Resource Exhaustion Checklist** (GAP-10): For each unauthenticated endpoint or path:
- Can unauthenticated requests cause unbounded resource consumption?
- Are there rate limits, negative caching, or input size bounds?

**External Dependency Resilience** (GAP-11): For each external HTTP dependency:
- Is there a configurable timeout?
- Is there a circuit breaker or fallback?
- Is the response cached? What invalidation strategy?
- Does failure isolate to just this dependency?

**Crypto/Auth Attack Surface** (GAP-09): For constraints involving crypto or authentication:
- What attack test matrix should be generated? (algorithm confusion, timing, replay, forged signatures)
- Are IP-based checks tested across IPv4, IPv6, and IPv4-mapped IPv6?

### Operational
- What needs monitoring?
- What are the SLA requirements?
- What's the incident response process?
- How will this be deployed/rolled back?

### Input Validation Derivation (GAP-14)

When constraints reference data formats (e.g., "accept any JSON", "valid email"), auto-generate input validation sub-constraints:
- Content-Type checking
- Encoding validation
- Schema validation at boundaries

These are placed in the `suggested_constraints` staging area in the manifold JSON. They don't count toward constraint totals until explicitly promoted by the user.

### Concurrency Considerations (GAP-17)

When constraints involve shared state (caching, connection pools, singletons):
- Are there thread-safety requirements?
- Should concurrent request handling tests be generated?
- What shared-state constraints exist?

## Example

```
/manifold:m1-constrain payment-retry

CONSTRAINT DISCOVERY: payment-retry

CONSTRAINTS DISCOVERED:

Business:
- B1: No duplicate payments (INVARIANT)
- B2: 95% success rate for transient failures (GOAL)
- B3: Retry window ≤ 72 hours (BOUNDARY)

Technical:
- T1: API response < 200ms including retries (BOUNDARY)
- T2: Support 10K concurrent retry operations (GOAL)

UX:
- U1: Clear retry status visible to user (GOAL)
- U2: No user action required for automatic retries (INVARIANT)

Security:
- S1: Retry logs must not contain card numbers (INVARIANT)
- S2: All retry attempts audited (INVARIANT)

Operational:
- O1: Retry queue depth monitored (GOAL)
- O2: Alert on retry success rate < 90% (BOUNDARY)

Updated: .manifold/payment-retry.json + .manifold/payment-retry.md (12 constraints)

Next: /manifold:m2-tension payment-retry
```

## Context Lookup (MANDATORY)

**Before starting constraint discovery**, research the feature's domain to ground the interview in current facts. AI training data may be outdated—constraints based on stale information lead to rework.

### Steps

1. **Extract domain topics** from the feature name, outcome statement, and any user-provided context (e.g., feature `payment-retry` → topics: payment processing, retry strategies, idempotency, PCI compliance)
2. **Use `WebSearch`** to look up:
   - Current best practices and industry standards for the domain
   - Recent API changes, deprecations, or version updates for relevant technologies
   - Current regulatory or compliance requirements (if applicable)
   - Known pitfalls or failure modes documented by practitioners
3. **Summarize findings** in a brief "Domain Context" block shown to the user before the interview begins:

```
DOMAIN CONTEXT (via web search):
- [Key finding 1 with source]
- [Key finding 2 with source]
- [Key finding 3 with source]
```

4. **Use these findings to inform** the constraint interview—ask sharper questions and propose constraints that reflect current reality rather than assumptions

### When to Skip

- `--skip-lookup` flag is passed
- The feature is purely internal with no external dependencies or domain standards (e.g., refactoring an internal utility)

### Why This Matters

Without context lookup, the AI may:
- Propose constraints based on outdated API behaviors or deprecated standards
- Miss recent security advisories or compliance changes
- Overlook newer, better approaches that didn't exist at training time
- Force the user to repeatedly correct factual errors during the interview

## Execution Instructions

### For JSON+Markdown Format (Default)

1. **Run Context Lookup** (see above) — research the feature domain via `WebSearch`
2. Read existing structure from `.manifold/<feature>.json`
3. Read existing content from `.manifold/<feature>.md`
4. If `--category` specified, focus on that category only
5. For each category, ask probing questions and classify responses
6. Assign constraint IDs (B1, T1, U1, S1, O1, etc.)
7. **Update TWO files:**
   - `.manifold/<feature>.json` — Add `{"id": "B1", "type": "invariant"}` to constraints
   - `.manifold/<feature>.md` — Add `#### B1: Title` + statement + rationale
8. Set phase to CONSTRAINED in JSON
9. Display summary and next step

### For Legacy YAML Format

1. **Run Context Lookup** (see above) — research the feature domain via `WebSearch`
2. Read existing manifold from `.manifold/<feature>.yaml`
3. If `--category` specified, focus on that category only
4. For each category, ask probing questions and classify responses
5. Assign constraint IDs (B1, T1, U1, S1, O1, etc.)
6. Update the manifold YAML with discovered constraints
7. Set phase to CONSTRAINED
8. Display summary and next step

### Format Detection & Lock

The CLI auto-detects format:
- If `.json` + `.md` exist → JSON+Markdown hybrid
- If only `.yaml` exists → Legacy YAML
- Use `manifold show <feature>` to see current format

**Format lock**: If `.manifold/<feature>.json` exists, you MUST use JSON+Markdown format for ALL subsequent updates. Never create or update a `.yaml` file when `.json` exists for the same feature.

### ⚠️ Mandatory Post-Phase Validation

After updating manifold files, you MUST run validation before showing results:

```bash
manifold validate <feature>
```

If validation fails, fix the errors BEFORE proceeding. The JSON structure must conform to the schema defined in `install/manifold-structure.schema.json`. The pre-commit hook will also enforce this — invalid manifolds cannot be committed.

**Schema reference**: `cli/lib/structure-schema.ts` (Zod) / `install/manifold-structure.schema.json` (JSON Schema)


## Interaction Rules (MANDATORY)
<!-- Satisfies: RT-1 (next-step templates), RT-3 (structured input), U1 (suggest next), U2 (AskUserQuestion) -->

1. **Questions → AskUserQuestion**: When you need user input during this phase, use the `AskUserQuestion` tool with structured options. NEVER ask questions as plain text without options.
2. **Phase complete → Suggest next**: After completing this phase, ALWAYS include the concrete next command (`/manifold:mN-xxx <feature>`) and a one-line explanation of what the next phase does.
3. **Trade-offs → Labeled options**: When presenting alternatives, use `AskUserQuestion` with labeled choices (A, B, C) and descriptions.
