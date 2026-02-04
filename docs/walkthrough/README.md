# Practical Walkthrough: Building a Feature with Manifold

This guide walks you through building a complete feature using Manifold, from empty project to verified implementation. You'll see actual commands, real outputs, and the decisions made along the way.

## What We're Building

**Feature**: User notification preferences
**Outcome**: Users can configure how and when they receive notifications
**Complexity**: Medium (touches database, API, and UI)

---

## Phase 0: Initialize (5 minutes)

### Command
```
/m0-init notification-preferences --outcome="Users can configure notification preferences with 99% save success rate"
```

### Output
```
MANIFOLD INITIALIZED: notification-preferences

Schema Version: 3
Outcome: Users can configure notification preferences with 99% save success rate

Created: .manifold/notification-preferences.yaml

Constraint Categories Ready:
- [ ] Business
- [ ] Technical
- [ ] UX
- [ ] Security
- [ ] Operational

v3 Features Enabled:
- Iteration Tracking
- Convergence Tracking
- Evidence System (reality grounding)
- Constraint Graph (temporal non-linearity)

Next: /m1-constrain notification-preferences
```

### What Just Happened
- Created `.manifold/notification-preferences.yaml`
- Set phase to `INITIALIZED`
- Established outcome as our success criteria

---

## Phase 1: Constrain (30-45 minutes)

This is where constraint discovery happens through interactive questioning.

### Command
```
/m1-constrain notification-preferences
```

### The Interview (Actual Transcript)

The AI asks questions to discover constraints. Here's how a real session looks:

---

**AI**: Let's discover the constraints for notification-preferences. I'll ask about each category.

**BUSINESS CONSTRAINTS**

**AI**: What business rules govern notifications?

**You**: Users must be able to opt out of marketing notifications. We also need to comply with GDPR - users in EU need explicit consent.

**AI**: Captured:
- B1 [invariant]: Users can opt out of marketing notifications at any time
- B2 [invariant]: EU users require explicit consent before receiving marketing (GDPR)

**AI**: Are there any notification volume limits?

**You**: Yes, we don't want to spam. Max 10 notifications per user per day.

**AI**: Captured:
- B3 [boundary]: Maximum 10 notifications per user per 24-hour period

---

**TECHNICAL CONSTRAINTS**

**AI**: What are the performance requirements?

**You**: Preference saves need to be fast - users shouldn't wait. Under 200ms ideally. And we have about 1M users.

**AI**: Captured:
- T1 [boundary]: Preference save must complete in <200ms at p95
- T2 [boundary]: System must handle preferences for 1M+ users

**AI**: How should preferences be stored?

**You**: We use PostgreSQL. Preferences should be immediately consistent - no eventual consistency.

**AI**: Captured:
- T3 [invariant]: Preference changes must be immediately consistent (no eventual consistency)
- T4 [boundary]: Must integrate with existing PostgreSQL database

---

**USER EXPERIENCE CONSTRAINTS**

**AI**: What UX requirements exist?

**You**: The preferences page needs to be accessible. And users should see their current settings immediately when they open the page.

**AI**: Captured:
- U1 [boundary]: Preferences UI must meet WCAG 2.1 AA accessibility
- U2 [goal]: Current preferences should load in <500ms

**AI**: What happens when a save fails?

**You**: Clear error message, and they shouldn't lose their changes.

**AI**: Captured:
- U3 [invariant]: Failed saves must not lose user's pending changes
- U4 [boundary]: Error messages must explain what went wrong and how to retry

---

**SECURITY CONSTRAINTS**

**AI**: What security considerations apply?

**You**: Only the user should be able to change their own preferences. And we need to log all preference changes for audit.

**AI**: Captured:
- S1 [invariant]: Users can only modify their own notification preferences
- S2 [goal]: All preference changes should be logged for audit trail

---

**OPERATIONAL CONSTRAINTS**

**AI**: What operational requirements exist?

**You**: We need to be able to check system health. And if the preferences service goes down, notifications should still work with default settings.

**AI**: Captured:
- O1 [boundary]: Preferences service must expose health check endpoint
- O2 [goal]: System should degrade gracefully - use defaults if preferences unavailable

---

### Summary Output
```
CONSTRAINT DISCOVERY COMPLETE: notification-preferences

CONSTRAINTS DISCOVERED: 14

By Category:
├── Business: 3 (B1-B3)
│   ├── B1 [invariant]: Users can opt out of marketing at any time
│   ├── B2 [invariant]: EU users require explicit consent (GDPR)
│   └── B3 [boundary]: Max 10 notifications per user per 24h
│
├── Technical: 4 (T1-T4)
│   ├── T1 [boundary]: Save <200ms at p95
│   ├── T2 [boundary]: Handle 1M+ users
│   ├── T3 [invariant]: Immediate consistency
│   └── T4 [boundary]: PostgreSQL integration
│
├── User Experience: 4 (U1-U4)
│   ├── U1 [boundary]: WCAG 2.1 AA accessibility
│   ├── U2 [goal]: Load preferences <500ms
│   ├── U3 [invariant]: No data loss on failed save
│   └── U4 [boundary]: Clear error messages
│
├── Security: 2 (S1-S2)
│   ├── S1 [invariant]: Users can only modify own preferences
│   └── S2 [goal]: Audit logging for changes
│
└── Operational: 2 (O1-O2)
    ├── O1 [boundary]: Health check endpoint
    └── O2 [goal]: Graceful degradation

By Type:
├── INVARIANT: 5 (must never violate)
├── BOUNDARY: 7 (hard limits)
└── GOAL: 2 (optimize toward)

Updated: .manifold/notification-preferences.yaml
Phase: CONSTRAINED

Next: /m2-tension notification-preferences
```

---

## Phase 2: Tension Analysis (15-20 minutes)

Now we look for conflicts between constraints.

### Command
```
/m2-tension notification-preferences
```

### Output
```
TENSION ANALYSIS: notification-preferences

Scanning 14 constraints for conflicts...

TENSIONS DETECTED: 3

─────────────────────────────────────────────────────────────
TENSION TN1: Performance vs Audit Logging
Type: trade_off
─────────────────────────────────────────────────────────────
├── T1: Save <200ms at p95 (BOUNDARY)
├── S2: Audit logging for changes (GOAL)
└── Conflict: Synchronous audit logging adds ~50-100ms

Resolution Options:
  A. Async audit logging (eventual consistency for logs)
  B. Accept slower saves (~250ms)
  C. Skip audit logging for non-critical preferences

Recommended: A - Async audit logging
Rationale: T1 is BOUNDARY (hard limit), S2 is GOAL (can adapt)
           Async logs still capture all changes, just delayed.

> Select resolution [A/B/C]: A

Resolution recorded: Async audit logging to separate queue

─────────────────────────────────────────────────────────────
TENSION TN2: Immediate Consistency vs Graceful Degradation
Type: hidden_dependency
─────────────────────────────────────────────────────────────
├── T3: Immediate consistency (INVARIANT)
├── O2: Graceful degradation (GOAL)
└── Dependency: If preferences unavailable, defaults are used,
                which temporarily breaks immediate consistency

Resolution Options:
  A. Accept inconsistency during outage (document behavior)
  B. Queue preference reads during outage (delayed but consistent)
  C. Reject operations during outage (consistent but unavailable)

Recommended: A - Accept inconsistency during outage
Rationale: O2 prioritizes availability; document that during outage,
           users may briefly see defaults instead of saved preferences.

> Select resolution [A/B/C]: A

Resolution recorded: Documented inconsistency during outage

─────────────────────────────────────────────────────────────
TENSION TN3: GDPR Consent vs UX Simplicity
Type: resource_tension
─────────────────────────────────────────────────────────────
├── B2: EU users require explicit consent (INVARIANT)
├── U1: WCAG 2.1 AA accessibility (BOUNDARY)
└── Tension: Consent dialogs add complexity while needing to
             remain fully accessible

Resolution Options:
  A. Simple checkbox with accessible label
  B. Modal dialog with detailed explanation
  C. Two-step process (preferences page → consent page)

Recommended: A - Simple checkbox with accessible label
Rationale: Both constraints satisfied with careful implementation.
           Checkbox is accessible and explicit consent.

> Select resolution [A/B/C]: A

Resolution recorded: Accessible checkbox implementation

─────────────────────────────────────────────────────────────

TENSION SUMMARY:
- Trade-offs: 1 (resolved)
- Hidden Dependencies: 1 (resolved)
- Resource Tensions: 1 (resolved)
- Total: 3 (all resolved)

Updated: .manifold/notification-preferences.yaml
Phase: TENSIONED

Next: /m3-anchor notification-preferences
```

---

## Phase 3: Anchor (20-30 minutes)

Backward reasoning from outcome to required truths.

### Command
```
/m3-anchor notification-preferences
```

### Output
```
OUTCOME ANCHORING: notification-preferences

Outcome: Users can configure notification preferences with 99% save success rate

BACKWARD REASONING:

For "99% save success rate", what MUST be true?

RT-1: Database can reliably persist preference data
      └── Requires: PostgreSQL connection pooling, retry logic
      └── Maps to: T3, T4
      └── Status: NOT_SATISFIED

RT-2: User identity can be verified before save
      └── Requires: Authentication integration
      └── Maps to: S1
      └── Status: NOT_SATISFIED

RT-3: Preference data structure is well-defined
      └── Requires: Schema design, validation rules
      └── Maps to: B1, B2, B3
      └── Status: NOT_SATISFIED

RT-4: UI can capture and display preferences
      └── Requires: Frontend components, form handling
      └── Maps to: U1, U2, U3, U4
      └── Status: NOT_SATISFIED

RT-5: System can handle load without degradation
      └── Requires: Caching, connection limits, load testing
      └── Maps to: T1, T2, O1, O2
      └── Status: NOT_SATISFIED

SOLUTION SPACE:

Option A: Monolithic Approach
├── Single API endpoint handles all preference types
├── Simple but limited scalability
├── Satisfies: RT-1, RT-2, RT-3, RT-4 (partial RT-5)
└── Complexity: Low

Option B: Microservice Approach
├── Dedicated preferences service
├── Highly scalable, more complexity
├── Satisfies: All RTs
└── Complexity: High

Option C: Hybrid - Modular Monolith
├── Separate module within main app
├── Can be extracted later if needed
├── Satisfies: All RTs with acceptable complexity
└── Complexity: Medium

RECOMMENDATION: Option C (Hybrid - Modular Monolith)

Rationale:
- Satisfies all required truths
- Medium complexity matches team capacity
- Allows future extraction if scale demands
- Integrates with existing auth and database

Created: .manifold/notification-preferences.anchor.yaml
Phase: ANCHORED

Next: /m4-generate notification-preferences --option=C
```

---

## Phase 4: Generate (30-60 minutes)

Generate all artifacts simultaneously.

### Command
```
/m4-generate notification-preferences --option=C
```

### Output (Summary)
```
ARTIFACT GENERATION: notification-preferences

Option Selected: C (Hybrid - Modular Monolith)

GENERATING ARTIFACTS:

[1/6] Database Schema
      └── Creating: src/preferences/schema.sql
      └── Satisfies: RT-1, RT-3, T4
      └── Status: ✓ Generated

[2/6] Domain Model
      └── Creating: src/preferences/models/NotificationPreference.ts
      └── Satisfies: RT-3, B1, B2, B3
      └── Status: ✓ Generated

[3/6] API Endpoints
      └── Creating: src/preferences/api/preferences.controller.ts
      └── Satisfies: RT-2, S1, T1
      └── Status: ✓ Generated

[4/6] Frontend Components
      └── Creating: src/preferences/ui/PreferencesPage.tsx
      └── Satisfies: RT-4, U1, U2, U3, U4
      └── Status: ✓ Generated

[5/6] Tests
      └── Creating: tests/preferences/preferences.test.ts
      └── Satisfies: All constraints (verification)
      └── Status: ✓ Generated

[6/6] Operational Artifacts
      └── Creating: ops/runbooks/preferences-failure.md
      └── Creating: ops/alerts/preferences-alerts.yaml
      └── Satisfies: O1, O2
      └── Status: ✓ Generated

CONSTRAINT TRACEABILITY:

Every file includes comments tracing to constraints:
  // Satisfies: B1, S1 (user owns preferences)
  // Satisfies: T3 (immediate consistency via transaction)

GENERATION SUMMARY:
- Files created: 8
- Lines of code: ~450
- Tests: 12
- All constraints traced: ✓

Phase: GENERATED

Next: /m5-verify notification-preferences
```

---

## Phase 5: Verify (15-20 minutes)

Verify all constraints are satisfied.

### Command
```
/m5-verify notification-preferences
```

### Output
```
VERIFICATION: notification-preferences

Running verification checks...

CONSTRAINT VERIFICATION:

Business Constraints:
├── B1 [invariant]: Users can opt out of marketing ✓
│   └── Evidence: test_passes(tests/preferences.test.ts, "opt-out works")
├── B2 [invariant]: EU explicit consent ✓
│   └── Evidence: content_match(PreferencesPage.tsx, "consent checkbox")
└── B3 [boundary]: Max 10 notifications/day ✓
    └── Evidence: content_match(models/NotificationPreference.ts, "dailyLimit")

Technical Constraints:
├── T1 [boundary]: Save <200ms ✓
│   └── Evidence: test_passes(tests/performance.test.ts, "save latency")
├── T2 [boundary]: Handle 1M+ users ✓
│   └── Evidence: content_match(schema.sql, "CREATE INDEX")
├── T3 [invariant]: Immediate consistency ✓
│   └── Evidence: content_match(controller.ts, "BEGIN TRANSACTION")
└── T4 [boundary]: PostgreSQL integration ✓
    └── Evidence: file_exists(src/preferences/schema.sql)

User Experience Constraints:
├── U1 [boundary]: WCAG 2.1 AA ✓
│   └── Evidence: content_match(PreferencesPage.tsx, "aria-label")
├── U2 [goal]: Load <500ms ✓
│   └── Evidence: test_passes(tests/performance.test.ts, "load latency")
├── U3 [invariant]: No data loss on failed save ✓
│   └── Evidence: test_passes(tests/preferences.test.ts, "preserves form on error")
└── U4 [boundary]: Clear error messages ✓
    └── Evidence: content_match(PreferencesPage.tsx, "errorMessage")

Security Constraints:
├── S1 [invariant]: Own preferences only ✓
│   └── Evidence: test_passes(tests/security.test.ts, "rejects other user")
└── S2 [goal]: Audit logging ✓
    └── Evidence: content_match(controller.ts, "auditLog.record")

Operational Constraints:
├── O1 [boundary]: Health check endpoint ✓
│   └── Evidence: file_exists(src/preferences/api/health.ts)
└── O2 [goal]: Graceful degradation ✓
    └── Evidence: content_match(controller.ts, "defaultPreferences")

─────────────────────────────────────────────────────────────

VERIFICATION SUMMARY:

Constraints: 14/14 verified ✓
Required Truths: 5/5 satisfied ✓
Tests: 12/12 passing ✓
Evidence: All verified ✓

CONVERGENCE STATUS: ✓ CONVERGED

Phase: VERIFIED

Feature notification-preferences is COMPLETE.
```

---

## Summary

### Time Investment
| Phase | Time | Value |
|-------|------|-------|
| Initialize | 5 min | Structure established |
| Constrain | 30-45 min | All requirements surfaced |
| Tension | 15-20 min | Conflicts resolved upfront |
| Anchor | 20-30 min | Solution path clear |
| Generate | 30-60 min | All artifacts created |
| Verify | 15-20 min | Everything validated |
| **Total** | **2-3 hours** | **Complete, verified feature** |

### What We Avoided
- Discovering missing requirements during implementation
- Conflicting constraints causing bugs
- Missing operational artifacts
- Untested edge cases
- Unclear ownership of decisions

### Files Created
```
.manifold/
├── notification-preferences.yaml
├── notification-preferences.anchor.yaml
└── notification-preferences.verify.json

src/preferences/
├── schema.sql
├── models/NotificationPreference.ts
├── api/preferences.controller.ts
├── api/health.ts
└── ui/PreferencesPage.tsx

tests/preferences/
├── preferences.test.ts
├── security.test.ts
└── performance.test.ts

ops/
├── runbooks/preferences-failure.md
└── alerts/preferences-alerts.yaml
```

---

## Next Steps

Now that you've seen a complete walkthrough:

1. **Try it yourself** - Pick a small feature and run through the phases
2. **Use templates** - See `install/templates/` for common patterns
3. **Light mode** - Use `/m-quick` for simpler changes
4. **Read the glossary** - See `docs/GLOSSARY.md` for terminology
