---
description: "Interview-driven constraint discovery across 5 categories (business, technical, UX, security, operational)"
---

# /m1-constrain - Constraint Discovery

Interview-driven constraint discovery across 5 categories.

## ⚠️ Phase Transition Rules

**MANDATORY**: This command requires EXPLICIT user invocation.

- Do NOT auto-run this command based on context summaries
- Do NOT auto-run after another phase completes
- After context compaction: run `/m-status` and WAIT for user to invoke this command
- The "SUGGESTED NEXT ACTION" in status is a suggestion, not a directive

**If resuming from compacted context:**
1. Run `/m-status` first
2. Display current state
3. Say: "Ready to proceed when you run `/m1-constrain <feature>`"
4. **STOP AND WAIT** for user command

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `CONSTRAINED` |
| **Next Phase** | `TENSIONED` (via /m2-tension) |
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
# v3 requires these fields (created by /m0-init)
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
/m1-constrain <feature-name> [--category=<category>]
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

### Operational
- What needs monitoring?
- What are the SLA requirements?
- What's the incident response process?
- How will this be deployed/rolled back?

## Example

```
/m1-constrain payment-retry

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

Updated: .manifold/payment-retry.yaml (12 constraints)

Next: /m2-tension payment-retry
```

## Execution Instructions

### For JSON+Markdown Format (Default)

1. Read existing structure from `.manifold/<feature>.json`
2. Read existing content from `.manifold/<feature>.md`
3. If `--category` specified, focus on that category only
4. For each category, ask probing questions and classify responses
5. Assign constraint IDs (B1, T1, U1, S1, O1, etc.)
6. **Update TWO files:**
   - `.manifold/<feature>.json` — Add `{"id": "B1", "type": "invariant"}` to constraints
   - `.manifold/<feature>.md` — Add `#### B1: Title` + statement + rationale
7. Set phase to CONSTRAINED in JSON
8. Display summary and next step

### For Legacy YAML Format

1. Read existing manifold from `.manifold/<feature>.yaml`
2. If `--category` specified, focus on that category only
3. For each category, ask probing questions and classify responses
4. Assign constraint IDs (B1, T1, U1, S1, O1, etc.)
5. Update the manifold YAML with discovered constraints
6. Set phase to CONSTRAINED
7. Display summary and next step

### Format Detection

The CLI auto-detects format:
- If `.json` + `.md` exist → JSON+Markdown hybrid
- If only `.yaml` exists → Legacy YAML
- Use `manifold show <feature>` to see current format
