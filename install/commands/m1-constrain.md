---
description: "Interview-driven constraint discovery across 5 categories (business, technical, UX, security, operational)"
---

# /m1-constrain - Constraint Discovery

Interview-driven constraint discovery across 5 categories.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `CONSTRAINED` |
| **Next Phase** | `TENSIONED` (via /m2-tension) |
| **Constraint Types** | `invariant`, `goal`, `boundary` |
| **Constraint Categories** | `business`, `technical`, `user_experience`, `security`, `operational` |
| **Constraint ID Prefixes** | B1, B2... (business), T1, T2... (technical), U1, U2... (UX), S1, S2... (security), O1, O2... (operational) |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new types or categories.

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

1. Read existing manifold from `.manifold/<feature>.yaml`
2. If `--category` specified, focus on that category only
3. For each category, ask probing questions and classify responses
4. Assign constraint IDs (B1, T1, U1, S1, O1, etc.)
5. Update the manifold YAML with discovered constraints
6. Set phase to CONSTRAINED
7. Display summary and next step
