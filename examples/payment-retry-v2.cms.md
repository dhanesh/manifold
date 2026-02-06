# payment-retry-v2

Constraint Manifold Specification (CMS) - Extended Format Example.
Generated: 2025-01-12 | Status: VALIDATED

This example shows the extended CMS schema with additional metadata fields
beyond the standard manifold structure.

## Meta

- **ID:** payment-retry-v2
- **Version:** 1.0.0
- **Outcome Anchor:** Payment retry succeeds for 95% of transient failures within 3 attempts
- **Owners:**
  - Dhanesh Purohit (CTO)
  - Backend Lead (Technical Owner)
- **Context:** GrayQuest Education Finance - Payment processing for education fees

## Outcome

Payment retry succeeds for 95% of transient failures within 3 attempts

---

## Constraints

### Business

#### B1: No Duplicate Payments
No duplicate payments for same invoice.
> **Rationale:** Duplicate charges erode customer trust and require manual refunds.
> **Violation Cost:** Critical
> **Measurement:** `duplicate_payment_count == 0`
> **Derived From:** INC-2024-089

#### B2: Reduce Manual Intervention
Reduce manual payment intervention by 80%.
> **Rationale:** Operations team currently handles 500+ manual cases/month.
> **Measurement:** `manual_intervention_count / total_failed_payments < 0.20`
> **Current Baseline:** 500 cases/month
> **Target:** < 100 cases/month

#### B3: Retry Window
Retry window must not exceed 72 hours.
> **Rationale:** NBFC reconciliation cycles require settlement within 72 hours.
> **Measurement:** `max(retry_completion_time - initial_failure_time) <= 72h`

#### B4: Escalation Path
Failed payments after retry exhaustion must have defined escalation.
> **Rationale:** 5% of payments won't succeed - need clear handling.
> **Measurement:** `all exhausted retries have escalation_path != null`

### Technical

#### T1: Idempotency Key Preservation
Idempotency key must be preserved across retry attempts.
> **Rationale:** Required to prevent duplicates at payment gateway level.
> **Implementation Hint:** Use payment_id + attempt_number composite.
> **Relates to:** B1

#### T2: Atomic State Transitions
Payment state machine transitions must be atomic.
> **Rationale:** Partial state updates cause reconciliation nightmares.
> **Implementation Hint:** Use Temporal workflow state, not database.
> **Relates to:** B1

#### T3: Retry Decision Latency
Retry decision latency < 100ms p99.
> **Rationale:** Fast decisions enable better user experience.
> **Measurement:** `histogram_quantile(0.99, retry_decision_duration_seconds)`
> **Target:** 0.1

#### T4: Temporal Integration
Must integrate with existing Temporal workflow engine.
> **Rationale:** Temporal already deployed and team has expertise (ADR-007).
> **Implementation Hint:** Use Temporal retry policies where possible.

#### T5: Error Classification
Error classification must distinguish transient from permanent failures.
> **Rationale:** Retrying permanent failures wastes resources and delays resolution.
> **Relates to:** B2

### User Experience

#### U1: User Notifications
User receives notification before first retry and on final outcome.
> **Rationale:** Users need to know their payment is being handled.
> **Channels:** SMS, WhatsApp, Email

#### U2: Retry Cancellation
User can cancel pending retry from notification.
> **Rationale:** User may want to use different payment method.
> **Implementation Hint:** Deep link to cancellation flow.

#### U3: Notification Rate Limit
Maximum 1 notification per 6 hour period.
> **Rationale:** Prevent notification spam (ref: 47 SMS incident).
> **Derived From:** ticket_pattern_analysis

### Security

#### S1: Credential Protection
Payment credentials never logged or stored outside payment gateway.
> **Rationale:** PCI-DSS compliance and SOC2 requirements.
> **Compliance:** SOC2, PCI-DSS
> **Audit:** Required for annual compliance audit.

#### S2: Transaction Context Auth
Retry operations authenticated via original transaction context.
> **Rationale:** Prevent unauthorized retry triggering.
> **Implementation Hint:** Carry session token in workflow state.

### Operational

#### O1: Full Observability
Full observability of retry lifecycle.
> **Rationale:** Support team needs visibility for customer queries.
> **Measurement:** All state transitions logged to Mixpanel.
> **Tooling:** Mixpanel, Internal Dashboard

#### O2: Graceful Degradation
Graceful degradation if retry service unavailable.
> **Rationale:** Core payment flow must not be blocked.
> **Fallback:** Queue failed payments for manual processing.

---

## Tensions

### TN1: User Notification vs Notification Fatigue
User wants to know about retries (U1) vs notification fatigue (U3).
> **Resolution:** Notify on first attempt and final outcome only, not intermediate attempts.

### TN2: Fast Decisions vs Accurate Classification
Fast decisions (T3) vs accurate classification (T5) may conflict.
> **Resolution:** Cache classification results, async update for new error types.

---

## Relationships

| Type | From | To | Description |
|------|------|----|-------------|
| dependency | T1 | B1 | T1 (idempotency) is the implementation mechanism for B1 (no duplicates) |
| dependency | T2 | B1 | T2 (atomic transitions) prevents partial states that could cause duplicates |
| dependency | T5 | B2 | Accurate classification required to reduce manual intervention |

---

## Failure Modes

### F1: Ambiguous Gateway Response
**Scenario:** Payment gateway returns ambiguous response (HTTP 200 with unclear status).
- **Probability:** Medium | **Impact:** High
- **Constraints Violated:** B1, T2
- **Detection:** Response parsing fails to determine success/failure
- **Mitigation:** Mark as 'needs_verification', trigger manual check
- **Prevention:** Explicit handling for all known ambiguous responses
- **Source:** INC-2024-156

### F2: User Cancels During Retry
**Scenario:** User cancels while retry in progress.
- **Probability:** Medium | **Impact:** Medium
- **Constraints Violated:** B1
- **Detection:** Cancellation signal received during payment activity
- **Mitigation:** Check payment status before confirming cancellation
- **Prevention:** Optimistic locking on payment state

### F3: Notification Service Down
**Scenario:** Notification service down during retry.
- **Probability:** Low | **Impact:** Low
- **Constraints Violated:** U1
- **Detection:** Notification activity fails
- **Mitigation:** Continue with retry, queue notification for later
- **Prevention:** Notification should not block payment flow

### F_NEW_1: Gateway Timeout After Success
**Scenario:** Gateway timeout after successful charge.
- **Probability:** Medium | **Impact:** Critical
- **Constraints Violated:** B1
- **Detection:** Timeout exception but no failure confirmation
- **Mitigation:** Query payment status before next attempt
- **Prevention:** Always check existing success before retry
- **Source:** INC-2024-089

---

## Solution Space

### Must Include
- Idempotent retry endpoint with key preservation
- State machine with atomic transitions (via Temporal)
- Error classification service
- Notification service integration with rate limiting
- Pre-retry success verification
- Observability hooks for all state transitions

### May Include
- ML-based retry timing optimization
- User preference learning for notification channels
- Predictive failure classification

### Must Exclude
- Synchronous retry in main payment flow
- Client-side retry logic
- Retry without idempotency check
- Notification per retry attempt
- Storing payment credentials in retry service

---

## Open Questions

### 1. Escalation Path for Exhausted Retries
**Impact:** B4
**Decision Deadline:** Before implementation
**Options:**
1. Manual queue for ops team
2. Automatic refund + user notification
3. Escalation to relationship manager
**Stakeholders:** Product, Ops, Customer Success

### 2. Partial Retries for Bundled Payments
**Impact:** B1, T2
**Decision Deadline:** Can be Phase 2
**Current Assumption:** All-or-nothing retry for v1
