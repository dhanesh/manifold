# CRUD Operations Constraint Template

Use: `/m0-init <feature> --template=crud`
Covers: Create, Read, Update, Delete operations on data entities

## Outcome

[CUSTOMIZE: e.g., 'Reliable CRUD operations for user profiles with <100ms response']

---

## Constraints

### Business

#### B1: Referential Integrity
Data must maintain referential integrity across all operations.
> **Rationale:** Orphaned or inconsistent data causes application errors and data quality issues.

#### B2: Soft Delete with Recovery
[CUSTOMIZE: Entity] records must support soft delete with recovery window of [CUSTOMIZE: 30] days.
> **Rationale:** Enables data recovery and compliance with retention policies.

#### B3: Bulk Operations
Bulk operations should support [CUSTOMIZE: 1000]+ records per request.
> **Rationale:** Enables efficient data migration and batch processing.

### Technical

#### T1: Idempotent Writes
All write operations must be idempotent or use idempotency keys.
> **Rationale:** Prevents duplicate records from network retries.

#### T2: Read Latency
Read operations must complete in <[CUSTOMIZE: 100]ms at p95.
> **Rationale:** User experience degrades significantly above this threshold.

#### T3: Write Latency
Write operations must complete in <[CUSTOMIZE: 500]ms at p95.
> **Rationale:** Acceptable latency for data modification operations.

#### T4: Cursor Pagination
List operations should support pagination with cursor-based navigation.
> **Rationale:** Enables efficient handling of large datasets.

### User Experience

#### U1: Field-Level Validation Errors
Validation errors must be returned with field-level specificity.
> **Rationale:** Users need to know exactly what to fix.

#### U2: Return Updated Entity
Create/Update operations should return the complete updated entity.
> **Rationale:** Avoids additional fetch request after modification.

#### U3: Delete Confirmation
Delete confirmation must be required for destructive operations.
> **Rationale:** Prevents accidental data loss.

### Security

#### S1: Authorization Enforcement
All CRUD operations must enforce authorization checks.
> **Rationale:** Users should only access/modify their own data or authorized resources.

#### S2: Input Sanitization
Input must be validated and sanitized before database operations.
> **Rationale:** Prevents SQL injection and data corruption.

#### S3: Audit Trail
Audit trail should capture who modified what and when.
> **Rationale:** Enables investigation and compliance reporting.

### Operational

#### O1: Connection Pooling
Database connections must be pooled with max [CUSTOMIZE: 100] connections.
> **Rationale:** Prevents connection exhaustion under load.

#### O2: Retry with Backoff
Failed operations should be retryable with exponential backoff.
> **Rationale:** Improves reliability during transient failures.

---

## Tensions

### TN1: Fast Reads vs Audit Logging
Fast reads (T2) vs audit logging (S3).
> **Resolution:** Async audit logging to separate store; read path unaffected.

### TN2: Soft Delete vs Idempotency
Soft delete (B2) vs idempotency (T1) - delete then create same ID?
> **Resolution:** Soft delete uses timestamp; new records get new IDs; restore uses original ID.

### TN3: Bulk Operations vs Connection Limits
Bulk operations (B3) vs connection pool limits (O1).
> **Resolution:** [CUSTOMIZE: Consider batch processing with queue].

---

## Required Truths

### RT-1: Entity Identification
Entity can be uniquely identified by ID.
**Maps to:** T1, S1

### RT-2: State Validation
Valid entity state can be distinguished from invalid state.
**Maps to:** U1, S2

### RT-3: Lifecycle Definition
Entity lifecycle (create->update->delete) is well-defined.
**Maps to:** B1, B2

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: Entity] with your specific entity name
- Adjust latency thresholds (T2, T3) based on SLA requirements
- Configure soft delete retention period (B2)
- Set connection pool size (O1) based on infrastructure

### Optional Additions
- Versioning/conflict detection for concurrent updates
- Field-level permissions
- Data encryption at rest
- Multi-tenancy constraints
- Cascading delete rules

### Common Removals
- Remove soft delete (B2) if hard delete is acceptable
- Remove bulk operations (B3) if not needed
- Remove audit trail (S3) if not required by compliance
