---
name: manifold-m-quick
description: "Light mode: 3-phase workflow for simple changes. Use instead of full workflow for bug fixes, small features, or quick iterations."
---

# /m-quick

# /m-quick - Light Mode Workflow

Streamlined 3-phase workflow for simple changes that don't require full constraint analysis.

## When to Use Light Mode

| Scenario | Use Light Mode? | Use Full Workflow? |
|----------|-----------------|-------------------|
| Bug fix (single file) | YES | No |
| Add simple feature | YES | No |
| Refactor existing code | YES | No |
| New system/subsystem | No | YES |
| Cross-cutting concern | No | YES |
| Security-critical change | No | YES |
| Multi-team coordination | No | YES |

**Rule of Thumb**: If you can describe the change in one sentence, use light mode.

## Light Mode Phases

```
FULL WORKFLOW (7 phases):
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
     ↑                                                              |
     └──────────────────── (iteration) ─────────────────────────────┘

LIGHT MODE (3 phases):
CONSTRAINED → GENERATED → VERIFIED
      ↑                       |
      └─── (quick fix) ───────┘
```

## Usage

```
/m-quick <feature-name> [--outcome="<brief description>"]
```

## Process

### Phase 1: Quick Constrain

Simplified constraint discovery focusing on:
- **1-3 key constraints** (not exhaustive)
- **Primary category only** (usually technical or business)
- **No formal tension analysis** (handle conflicts inline)

**Questions to answer:**
1. What MUST this change accomplish? (invariant)
2. What must NOT break? (boundary)
3. What should improve? (goal)

### Phase 2: Quick Generate

Generate artifacts with minimal ceremony:
- Code changes
- Essential tests only (happy path + one edge case)
- No runbooks/alerts (unless production-critical)

### Phase 3: Quick Verify

Lightweight verification:
- Tests pass
- Key constraint satisfied
- No regressions

## Example

```
User: /m-quick fix-login-timeout --outcome="Fix 504 timeout on login"

Response:
LIGHT MODE: fix-login-timeout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUICK CONSTRAIN (1/3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key Constraints:
- T1 [boundary]: Login must complete in <5s
- T2 [invariant]: Auth token must be valid
- T3 [goal]: Reduce timeout errors by 95%

No formal tension analysis needed.

QUICK GENERATE (2/3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files to create/modify:
- src/auth/login.ts (modify timeout handling)
- tests/auth/login.test.ts (add timeout test)

[Implementation proceeds...]

QUICK VERIFY (3/3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ T1: Login completes in 2.3s (< 5s boundary)
✓ T2: Auth token valid in all test cases
✓ T3: Timeout errors: 0 in test suite

COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Light mode workflow complete.

Upgrade to full workflow? /m0-init fix-login-timeout --from-quick
```

## Manifold File (Minimal)

Light mode creates a minimal manifold for traceability:

```yaml
# Light Mode Manifold
schema_version: 3
feature: fix-login-timeout
outcome: "Fix 504 timeout on login"
mode: light  # Indicates light mode was used
phase: VERIFIED

constraints:
  technical:
    - id: T1
      type: boundary
      statement: "Login must complete in <5s"
    - id: T2
      type: invariant
      statement: "Auth token must be valid"
    - id: T3
      type: goal
      statement: "Reduce timeout errors by 95%"

# Light mode skips these sections:
# - tensions (handled inline)
# - anchors (not needed for simple changes)
# - detailed iterations

quick_summary:
  started: "2026-01-21T10:00:00Z"
  completed: "2026-01-21T10:15:00Z"
  files_changed: 2
  tests_added: 1
```

## Upgrading to Full Workflow

If a "simple" change turns out to be complex:

```
/m0-init <feature> --from-quick
```

This:
1. Preserves existing constraints
2. Expands to full manifold structure
3. Prompts for additional constraint categories
4. Sets phase to CONSTRAINED (ready for /m2-tension)

## Comparison: Light vs Full

| Aspect | Light Mode | Full Workflow |
|--------|------------|---------------|
| Phases | 3 | 6 |
| Constraints | 1-3 key | Comprehensive (5 categories) |
| Tensions | Inline | Formal analysis |
| Anchoring | Skip | Backward reasoning |
| Artifacts | Code + tests | Code + tests + docs + ops |
| Time | Minutes | Hours to days |
| Traceability | Basic | Complete |

## Best Practices

1. **Start Light, Upgrade if Needed**
   - Begin with `/m-quick` for new work
   - If complexity emerges, upgrade to full workflow
   - Don't feel guilty about upgrading

2. **Don't Force Light Mode**
   - If you're struggling to fit in 3 constraints, use full workflow
   - Security and compliance ALWAYS need full workflow
   - Multi-team changes need full workflow

3. **Keep the Trail**
   - Light mode still creates a manifold file
   - Future developers can see what constraints were considered
   - Audit trail is preserved

## Execution Instructions

When this command is invoked:

1. Parse feature name and outcome from arguments
2. Create `.manifold/` directory if needed
3. Begin interactive quick constrain session:
   - Ask for 1-3 key constraints
   - Categorize as invariant/boundary/goal
   - Skip tension analysis
4. Generate code and minimal tests
5. Run verification checks
6. Create minimal manifold file with `mode: light`
7. Display completion summary

## Related Commands

- `/m0-init` - Full workflow initialization
- `/m-status` - Check manifold status (works with light mode)
- `/m5-verify` - Full verification (can be run on light mode manifolds)
