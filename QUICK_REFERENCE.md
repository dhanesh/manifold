# Manifold - Quick Reference

## Philosophy

```
TRADITIONAL                          MANIFOLD
─────────────────────────────────    ─────────────────────────────────
Spec → Design → Build → Test         All constraints exist NOW
Discover problems during build       Problems visible before build
Sequential planning                  Constraint satisfaction
Forward reasoning                    Backward from outcome
```

## Command Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: INITIALIZE & CONSTRAIN                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /m0-init feature-name --outcome="Success criteria"                 │
│      └─→ Creates constraint manifold                                │
│                                                                     │
│  /m1-constrain feature-name                                         │
│      └─→ Interview-driven constraint discovery                      │
│      └─→ 5 categories: Business, Technical, UX, Security, Ops      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: TENSION ANALYSIS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /m2-tension feature-name --resolve                                 │
│      └─→ Surfaces constraint conflicts                              │
│      └─→ Types: Direct, Resource, Trade-off, Hidden                │
│      └─→ Suggests resolutions                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: OUTCOME ANCHORING                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /m3-anchor feature-name --outcome="Success criteria"               │
│      └─→ Reasons BACKWARD from desired outcome                      │
│      └─→ Derives required truths                                    │
│      └─→ Identifies gaps                                            │
│      └─→ Generates solution space                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: GENERATE & VERIFY                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /m4-generate feature-name --option=A                               │
│      └─→ Generates ALL artifacts simultaneously:                    │
│          • Code (with constraint traceability)                      │
│          • Tests (verify constraints, not code)                     │
│          • Documentation (explains constraints)                     │
│          • Runbooks (handles failure modes)                         │
│          • Dashboards & Alerts (monitors constraints)               │
│                                                                     │
│  /m5-verify feature-name                                            │
│      └─→ Verifies ALL artifacts against ALL constraints             │
│      └─→ Reports coverage and gaps                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Status Check

```
/m-status [feature-name]
    └─→ Shows current state and next recommended action
```

## Constraint Types

| Type | Meaning | Example |
|------|---------|---------|
| **INVARIANT** | Must NEVER be violated | "No duplicate payments" |
| **GOAL** | Should be optimized | "95% retry success rate" |
| **BOUNDARY** | Hard limits | "Retry window ≤ 72 hours" |

## Quick Recipes

### New Feature
```bash
/m0-init my-feature --outcome="User can do X in < 3 seconds"
/m1-constrain my-feature
/m2-tension my-feature --resolve
/m3-anchor my-feature
/m4-generate my-feature --option=A
/m5-verify my-feature
```

### Check Status
```bash
/m-status my-feature
```

## File Structure

```
project/
├── .manifold/
│   ├── feature-name.yaml        # Constraint manifold
│   ├── feature-name.anchor.yaml # Outcome anchoring
│   └── feature-name.verify.yaml # Verification results
└── src/                         # Generated code
```

## Key Principles

1. **All constraints exist simultaneously**
   - Don't discover constraints during implementation
   - Capture everything upfront

2. **Surface conflicts early**
   - What fails in tension analysis won't surprise you in production
   - Make implicit conflicts explicit

3. **Reason backward from outcomes**
   - If outcome X is true, what must be true?
   - Surfaces hidden requirements

4. **Generate all artifacts at once**
   - All artifacts derive from same manifold
   - No drift between code, tests, docs

## Verification Status

| Status | Meaning |
|--------|---------|
| SATISFIED | Constraint fully satisfied |
| PARTIAL | Some evidence, gaps remain |
| NOT SATISFIED | Constraint not addressed |
