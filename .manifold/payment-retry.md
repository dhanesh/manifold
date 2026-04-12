# payment-retry

## Outcome

95% retry success rate for transient payment failures with exponential backoff.

---

## Constraints

### Business

#### B1: No Duplicate Payments

Payment processing must never create duplicate charges regardless of retry state, network failure, or race condition.

> **Rationale:** Duplicate charges cause chargebacks, regulatory violations, and loss of customer trust. Idempotency is an invariant — it cannot be traded off against any other constraint.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=regulatory+customer-trust | challenger=none

#### B2: 95% Retry Success Rate

At least 95% of retried transient payment failures must ultimately succeed within the allowed retry window.

> **Rationale:** This is the primary outcome metric. Below 95% the retry system fails its purpose and merchants experience unacceptable revenue loss.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=product-goal | challenger=B4 (max-attempts may limit achievability)

#### B3: 72-Hour Retry Window

All retry attempts must complete within 72 hours of initial failure. No new attempt may be scheduled beyond this window.

> **Rationale:** Beyond 72 hours payment authorization is typically expired, fraud risk escalates, and accounting reconciliation becomes unreliable.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=payment-network-rules | challenger=none

#### B4: Maximum 5 Retry Attempts

Each payment may be retried at most 5 times after initial failure. On the 6th attempt the payment must be marked permanently failed.

> **Rationale:** Excessive retries increase issuer decline rates and can trigger fraud flags. 5 attempts is the industry-standard ceiling for automatic retries.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=card-network-rules | challenger=B2 (fewer attempts may reduce success rate)

#### B5: No Retry on Disputed Payments

Any payment that has been disputed or flagged for fraud must never be automatically retried.

> **Rationale:** Retrying a disputed charge is a compliance violation and can result in fines or merchant account termination.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=compliance | challenger=none

---

### Technical

#### T1: Atomic State Transitions

Retry state transitions (pending → retrying → succeeded/failed) must be atomic. No retry may be scheduled without persisting the updated state first.

> **Rationale:** Non-atomic transitions create zombie retries — the system believes a payment was processed but the state reflects otherwise. This directly violates B1.
>
> **Quality scores:** specificity: 3 | measurability: 2 | testability: 3
>
> **Genealogy:** source=distributed-systems | challenger=T5 (high throughput may pressure atomicity guarantees)

#### T2: Exponential Backoff With Jitter

Retry delays must follow exponential backoff (base 2) with random jitter ±20% applied to each interval. Minimum delay: 30 seconds. Maximum delay: 4 hours.

> **Rationale:** Pure exponential backoff without jitter causes thundering-herd effects under bulk failure. Jitter distributes load while exponential growth prevents excessive retries on persistent failures.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=distributed-systems-best-practices | challenger=U1 (longer backoffs delay user-visible status)

#### T3: Error Classification Accuracy ≥99%

The error classification module must correctly distinguish transient errors (retriable) from permanent errors (non-retriable) with ≥99% accuracy.

> **Rationale:** Misclassifying a permanent error (e.g., card permanently declined) as transient wastes retry budget and delays final failure notification. Misclassifying a transient error as permanent forfeits revenue.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=engineering | challenger=none

#### T4: Payment API Timeout ≤5 Seconds

Each payment API call within the retry system must time out within 5 seconds. No indefinite blocking.

> **Rationale:** Blocking retries cause queue buildup, exhaust connection pools, and cascade into system-wide slowdowns. 5 seconds is the payment processor SLA upper bound.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=payment-processor-sla | challenger=T5 (tight timeouts may reduce throughput)

#### T5: Queue Throughput ≥1000 Retries/Minute

The retry queue must sustain ≥1000 retry scheduling operations per minute under peak load.

> **Rationale:** During payment infrastructure incidents a large cohort of payments may fail simultaneously. The queue must handle bulk retry scheduling without becoming the bottleneck.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 2
>
> **Genealogy:** source=capacity-planning | challenger=T1 (atomicity overhead may constrain throughput)

#### T6: HMAC-SHA256 Idempotency Keys

All idempotency keys must be generated using HMAC-SHA256 over (payment_id + attempt_number + timestamp_bucket). Keys must be non-guessable and collision-resistant.

> **Rationale:** Guessable idempotency keys allow malicious actors to pre-empt legitimate retries or replay attacks. HMAC-SHA256 provides cryptographic guarantees.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=security | challenger=none

---

### User Experience

#### U1: Retry Status Visible Within 30 Seconds

After a retry is scheduled or executed, the payment status visible to the merchant dashboard must update within 30 seconds.

> **Rationale:** Merchants need near-real-time visibility to distinguish "system is working" from "payment silently dropped." 30 seconds matches dashboard polling expectations.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 2
>
> **Genealogy:** source=merchant-feedback | challenger=T2 (backoff intervals may delay observable progress)

#### U2: Final Failure Notification Within 5 Minutes

When a payment exhausts all retry attempts and is permanently failed, the merchant must receive a final failure notification within 5 minutes.

> **Rationale:** Merchants need timely notification to take manual action (contact customer, issue refund, flag the order). Delays beyond 5 minutes cause downstream business disruption.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=merchant-sla | challenger=none

#### U3: No Duplicate Notifications

A merchant must never receive more than one notification for the same retry event (attempt started, attempt succeeded, attempt failed, payment permanently failed).

> **Rationale:** Duplicate notifications cause merchant alarm and manual double-processing. This invariant mirrors B1 at the notification layer.
>
> **Quality scores:** specificity: 3 | measurability: 2 | testability: 3
>
> **Genealogy:** source=merchant-trust | challenger=none

---

### Security

#### S1: Non-Guessable Idempotency Keys

Idempotency keys must pass NIST SP 800-57 non-guessability requirements: minimum 128 bits of entropy, generated from a cryptographically secure RNG.

> **Rationale:** Predictable keys allow replay attacks where an attacker schedules a retry for a different payment using a guessed key. This is a financial fraud vector.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=owasp-cryptographic-failures | challenger=none

#### S2: Immutable Audit Trail

Every retry attempt (scheduled, executed, succeeded, failed) must be recorded in an append-only audit log. Existing audit entries must never be modified or deleted by application code.

> **Rationale:** Mutable audit logs cannot be used for compliance review, fraud investigation, or dispute resolution. Immutability is the minimum requirement for auditability.
>
> **Quality scores:** specificity: 3 | measurability: 2 | testability: 3
>
> **Genealogy:** source=pci-dss | challenger=none

#### S3: Pre-Retry Authorization Check

Before each retry attempt the system must re-validate that the payment authorization is still active and the account is in good standing. A stale or revoked authorization must block the retry.

> **Rationale:** Payment authorizations expire. An authorization valid at T=0 may be stale or fraudulent at T+48h. Retrying on a stale auth can charge a customer whose card has been cancelled.
>
> **Quality scores:** specificity: 3 | measurability: 2 | testability: 3
>
> **Genealogy:** source=payment-network-rules | challenger=T5 (auth checks add latency per retry)

#### S4: Maximum 10 Concurrent Retries Per User

No more than 10 retry attempts may be in-flight simultaneously for a single user account.

> **Rationale:** Uncapped concurrency per user enables resource exhaustion attacks and amplifies the blast radius of compromised accounts.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=rate-limiting | challenger=B2 (concurrency cap may reduce success rate for high-volume merchants)

---

### Operational

#### O1: Dead Letter Queue for All Failures

Any payment that exhausts retry attempts or encounters an unclassifiable error must be routed to a Dead Letter Queue (DLQ) with full context for manual review.

> **Rationale:** Without a DLQ, permanently failed payments vanish silently. The DLQ is the system's safety net — every payment must have a traceable fate.
>
> **Quality scores:** specificity: 3 | measurability: 2 | testability: 3
>
> **Genealogy:** source=operational-safety | challenger=none

#### O2: Alert on Success Rate <85%

An automated alert must fire when the 5-minute rolling retry success rate drops below 85%. Alert must reach on-call within 3 minutes.

> **Rationale:** The 85% threshold (10 points below the 95% target) provides early warning before the SLA is breached. 3-minute delivery ensures actionable response time.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 2
>
> **Genealogy:** source=sre-sla | challenger=none

#### O3: Runbook Must Exist Before Launch

A complete incident runbook for the payment retry system must be reviewed and approved before any production deployment.

> **Rationale:** Undocumented operational procedures lead to inconsistent incident response. The runbook is a pre-launch gate, not a post-launch deliverable.
>
> **Quality scores:** specificity: 2 | measurability: 2 | testability: 2
>
> **Genealogy:** source=operational-maturity | challenger=none

#### O4: Circuit Breaker at >50% 5xx Rate

The circuit breaker must open when the payment processor 5xx error rate exceeds 50% over a 1-minute window, halting retries until the rate recovers below 20% for 30 seconds.

> **Rationale:** Retrying against a degraded payment processor amplifies load and extends the outage. Circuit breaker protection prevents thundering-herd on provider recovery.
>
> **Quality scores:** specificity: 3 | measurability: 3 | testability: 3
>
> **Genealogy:** source=resilience-engineering | challenger=B2 (circuit breaker pauses retries, may reduce success rate)

---

## Gap Checklist Compliance

| Gap | Status | Notes |
|-----|--------|-------|
| GAP-03 | COMPLETED | External-system constraints (T1, T4, T5, S3) require integration-tier test coverage minimum |
| GAP-09 | COMPLETED | Crypto constraints (T6, S1) have attack matrix coverage: algorithm confusion, replay, forged keys, timing attacks |
| GAP-10 | COMPLETED | Resource exhaustion checklist applied: S4 (concurrency cap per user) surfaces amplification vector |
| GAP-14 | COMPLETED | Input validation derivation: S3 (pre-retry auth check) requires payment_id + account status validation at boundary |

