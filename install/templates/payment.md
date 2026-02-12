# Payment Processing Constraint Template

Use: `/manifold:m0-init <feature> --template=payment`
Covers: Payment processing, refunds, subscriptions, financial transactions

## Outcome

[CUSTOMIZE: e.g., '99.9% payment success rate with zero duplicate charges']

---

## Constraints

### Business

#### B1: No Duplicate Charges
No duplicate charges may occur for the same transaction.
> **Rationale:** Duplicate charges cause customer disputes, chargebacks, and trust loss.

#### B2: Refund Limits
Refund amount must never exceed original charge amount.
> **Rationale:** Over-refunds cause financial loss and potential fraud.

#### B3: Record Retention
Transaction records must be retained for [CUSTOMIZE: 7] years.
> **Rationale:** Regulatory requirement for financial record keeping (varies by jurisdiction).

#### B4: Payment Success Rate
Payment success rate should exceed [CUSTOMIZE: 95]%.
> **Rationale:** Failed payments directly impact revenue and customer experience.

#### B5: Refund Processing
Refunds must be processed within [CUSTOMIZE: 5] business days.
> **Rationale:** Customer service SLA and regulatory requirements.

### Technical

#### T1: Idempotency Keys
All payment operations must use idempotency keys with [CUSTOMIZE: 24]-hour retention.
> **Rationale:** Prevents duplicate charges from network retries or user double-clicks.

#### T2: State Machine Enforcement
Payment state machine must enforce valid transitions only.
> **Rationale:** Invalid state transitions can cause inconsistent ledger entries.

#### T3: Authorization Timeout
Payment authorization must complete in <[CUSTOMIZE: 10]s.
> **Rationale:** User abandonment increases significantly after this threshold.

#### T4: ACID Compliance
Database transactions must be ACID-compliant for all financial operations.
> **Rationale:** Eventual consistency is unacceptable for money movement.

#### T5: Automatic Retry
Support automatic retry with exponential backoff for transient failures.
> **Rationale:** Improves payment success rate without manual intervention.

### User Experience

#### U1: Multiple Payment Methods
Payment form must support [CUSTOMIZE: 3+] payment methods.
> **Rationale:** Different users prefer different payment methods.

#### U2: Amount Transparency
Users must see clear amount and currency before confirming payment.
> **Rationale:** Hidden costs are illegal in many jurisdictions and erode trust.

#### U3: Alternative Payment Suggestions
Failed payments should suggest alternative payment methods.
> **Rationale:** Recovers potentially lost sales.

#### U4: Confirmation Receipt
Receipt/confirmation must be sent within [CUSTOMIZE: 5] minutes of successful payment.
> **Rationale:** Users need immediate confirmation of their purchase.

### Security

#### S1: PCI DSS Compliance
PCI DSS compliance must be maintained for all card data handling.
> **Rationale:** Legal requirement; non-compliance results in fines and processing ban.

#### S2: Card Data Logging
Card numbers must never be logged, even partially.
> **Rationale:** PCI requirement; logs are often less protected than primary systems.

#### S3: Token Scoping
Payment tokens must be scoped to merchant and non-replayable.
> **Rationale:** Prevents token theft from enabling unauthorized charges.

#### S4: High-Value Re-Authentication
All payment endpoints must require re-authentication for amounts > [CUSTOMIZE: $1000].
> **Rationale:** High-value transactions warrant additional verification.

#### S5: Fraud Detection
Fraud detection should flag suspicious patterns in real-time.
> **Rationale:** Reduces chargebacks and protects customers.

### Operational

#### O1: Real-Time Reconciliation
Payment system must have real-time reconciliation with payment processor.
> **Rationale:** Discrepancies must be caught immediately, not in monthly reports.

#### O2: Uptime SLA
Payment system downtime must not exceed [CUSTOMIZE: 4] hours/month (99.5% uptime).
> **Rationale:** Payment unavailability directly impacts revenue.

#### O3: Failure Alerting
Payment failures should alert on-call within [CUSTOMIZE: 5] minutes.
> **Rationale:** Enables rapid response to payment processor issues.

#### O4: Complete Audit Trail
Complete audit trail must exist for every payment state change.
> **Rationale:** Required for dispute resolution and regulatory compliance.

---

## Tensions

### TN1: Fast Authorization vs Fraud Checking
Fast authorization (T3) vs thorough fraud checking (S5).
> **Resolution:** Async fraud scoring with hold release; immediate auth for trusted customers.

### TN2: Success Rate vs Re-Authentication
High success rate (B4) vs re-auth for high amounts (S4).
> **Resolution:** Risk-based authentication; re-auth only for anomalous patterns, not just amount.

### TN3: Automatic Retry vs No Duplicates
Automatic retry (T5) vs no duplicate charges (B1).
> **Resolution:** Idempotency keys (T1) make retry safe; verify charge status before retry.

### TN4: Reconciliation Requires Commits
Reconciliation (O1) requires transactions to be committed (T4).
> **Resolution:** Two-phase commit with reconciliation as verification step.

### TN5: Uptime vs Security Updates
High uptime (O2) vs security updates requiring downtime (S1).
> **Resolution:** [CUSTOMIZE: Blue-green deployment or rolling updates].

---

## Required Truths

### RT-1: Unique Payment Identifier
Every payment attempt has a unique, traceable identifier.
**Maps to:** B1, T1, O4

### RT-2: Valid State Transitions
Payment state can only transition through valid paths.
**Maps to:** T2, B2

### RT-3: Accurate Financial Records
Financial records are accurate and reconcilable.
**Maps to:** T4, O1, B3

### RT-4: Card Data Protection
Card data is protected at every processing stage.
**Maps to:** S1, S2, S3

### RT-5: Failure Diagnosis
Payment failures can be diagnosed and resolved.
**Maps to:** O3, O4, T5

---

## Customization Notes

### Required Changes
- Replace retention period (B3) based on your jurisdiction
- Set re-auth threshold (S4) based on your risk tolerance
- Configure uptime SLA (O2) based on business requirements
- Add specific payment processor constraints

### Optional Additions
- Subscription billing cycles
- Multi-currency support
- Split payments
- Marketplace payouts
- Cryptocurrency acceptance
- Buy-now-pay-later integration

### Common Removals
- Remove fraud detection (S5) if using processor's fraud tools
- Remove multi-method (U1) for single payment method

### Compliance Notes
- PCI DSS level depends on transaction volume
- Strong Customer Authentication (SCA) required in EU
- State-specific money transmission licenses may be required
- Consult legal/compliance team for jurisdiction-specific requirements
