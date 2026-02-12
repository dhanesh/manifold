# Deprecation Constraint Template

Use: `/manifold:m0-init <feature> --template=pm/deprecation`
Covers: Feature sunset, legacy migration, breaking changes, user migration

## Outcome

[CUSTOMIZE: e.g., 'Safely sunset legacy checkout with <2% user complaints and zero data loss']

---

## Constraints

### Business

#### B1: Customer Retention
Deprecation must not result in net customer loss exceeding [CUSTOMIZE: 1%].
> **Rationale:** Customer retention is paramount even during transitions.

#### B2: Cost Savings
Cost savings from deprecation: [CUSTOMIZE: $X/month] in infrastructure/maintenance.
> **Rationale:** Quantify the business case for deprecation.

#### B3: Deprecation Deadline
Complete deprecation by [CUSTOMIZE: Q4 2025] to align with EOL commitments.
> **Rationale:** External commitments or technical debt deadlines.

#### B4: Voluntary Migration Rate
[CUSTOMIZE: 90%] of users migrated voluntarily before forced cutover.
> **Rationale:** Smooth migration reduces support burden and complaints.

### Technical

#### T1: Zero Data Loss
All user data must be preserved or migrated with zero loss.
> **Rationale:** Data loss is unacceptable and may have legal implications.

#### T2: Feature Parity
Migration path must exist for [CUSTOMIZE: 100%] of current functionality.
> **Rationale:** Users must not lose capabilities they depend on.

#### T3: Legacy Access Period
Legacy system must remain accessible for [CUSTOMIZE: 90 days] post-deprecation announcement.
> **Rationale:** Grace period for stragglers and edge cases.

#### T4: Automated Migration
Automated migration tool handles [CUSTOMIZE: 80%] of cases.
> **Rationale:** Manual migration doesn't scale; automation reduces errors.

### User Experience

#### U1: Advance Notice
Users must receive [CUSTOMIZE: 60 days] advance notice before deprecation.
> **Rationale:** Respect for users requires adequate warning.

#### U2: Migration Duration
Migration process must complete in under [CUSTOMIZE: 5 minutes] per user.
> **Rationale:** Low friction encourages voluntary migration.

#### U3: In-App Guidance
In-app guidance for migration visible to [CUSTOMIZE: all affected users].
> **Rationale:** Proactive communication beats reactive support.

#### U4: Support Volume
Support ticket volume remains below [CUSTOMIZE: 2x baseline] during transition.
> **Rationale:** Manageable support load indicates successful communication.

### Security

#### S1: Data Retention Compliance
Deprecated feature data must be handled per data retention policy.
> **Rationale:** Compliance requirements don't end with feature sunset.

#### S2: Audit Log Retention
Access logs retained for [CUSTOMIZE: 1 year] post-deprecation for audit.
> **Rationale:** Support investigations and compliance verification.

#### S3: Migration Security
No new security vulnerabilities introduced during migration.
> **Rationale:** Transition periods are high-risk for security gaps.

### Operational

#### O1: Rollback Capability
Rollback capability must exist until [CUSTOMIZE: 30 days] post-cutover.
> **Rationale:** Safety net for unforeseen migration issues.

#### O2: Support Readiness
Support team trained on migration FAQ before announcement.
> **Rationale:** Frontline readiness prevents escalations.

#### O3: Migration Dashboard
Deprecation status dashboard tracks migration progress in real-time.
> **Rationale:** Visibility enables proactive intervention.

#### O4: Post-Deprecation Cleanup
Post-deprecation cleanup completes within [CUSTOMIZE: 30 days].
> **Rationale:** Realize cost savings promptly; don't maintain zombie infrastructure.

---

## Tensions

### TN1: Timeline vs User Notice
Aggressive timeline (B3) vs adequate user notice (U1).
> **Resolution:** [CUSTOMIZE: Balance external commitments with user respect].

### TN2: Automation vs Legacy Maintenance
Automated migration (T4) development vs maintaining legacy (T3).
> **Resolution:** [CUSTOMIZE: Prioritize automation to shorten legacy maintenance].

### TN3: Cost Savings vs Feature Parity
Cost savings (B2) vs feature parity (T2).
> **Resolution:** [CUSTOMIZE: Identify features that can be dropped vs must migrate].

### TN4: Support Training vs User Notification
Support training (O2) must complete before user notification (U1).
> **Resolution:** [CUSTOMIZE: Build training into announcement timeline].

---

## Required Truths

### RT-1: Migration Path Tested
Migration path documented and tested for all user segments.
**Maps to:** T1, T2, T4

### RT-2: Communication Plan Approved
Communication plan approved by legal/marketing.
**Maps to:** U1, U3

### RT-3: Rollback Ready
Rollback tested and operations team trained.
**Maps to:** O1, O2

### RT-4: Success Metrics in Place
Success metrics and monitoring in place.
**Maps to:** B4, O3, U4

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Define acceptable churn in B1
- Set realistic timeline in B3
- Determine notice period in U1 based on user dependency
- Plan data retention in S1

### Optional Additions
- Add contractual constraints if enterprise customers affected
- Add API deprecation constraints if external integrations exist
- Add localization constraints for international communication
- Add legal review constraints if terms of service changes needed

### Common Removals
- Remove B2 if deprecation is not cost-motivated
- Remove T4 if user count is small enough for manual migration
- Remove O4 if infrastructure is shared/not decommissionable
