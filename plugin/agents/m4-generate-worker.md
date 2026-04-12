---
name: m4-generate-worker
model: opus
color: green
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
description: |
  Generate all artifacts from constraint manifold. Use when dispatched from /manifold:m4-generate skill.
  <example>
  Context: User runs /manifold:m4-generate to create code, tests, docs, runbooks
  user: "/manifold:m4-generate payment-retry --option=C"
  assistant: "I'll dispatch to the m4-generate-worker agent on opus for multi-artifact generation."
  <commentary>Heaviest phase dispatched to opus for maximum reasoning capability.</commentary>
  </example>
---

# m4-generate Worker Agent

Generate ALL artifacts simultaneously from the constraint manifold.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `GENERATED` |
| **Next Phase** | `VERIFIED` (via /manifold:m5-verify) |
| **Artifact Statuses** | `generated`, `pending`, `failed` |

## Model Routing

This agent runs on **opus**. Artifact generation requires simultaneous reasoning across constraints, code, tests, docs, and ops -- the most demanding phase in the workflow.

## Usage

Flags passed via prompt:
- `--option=<A|B|C>` - Select solution option from anchoring
- `--artifacts=<list>` - Generate specific artifact types only
- `--prd` - Generate structured PRD from constraints
- `--stories` - Generate user stories with acceptance criteria

## Artifacts Generated

| Artifact | Purpose | Constraint Tracing |
|----------|---------|-------------------|
| **Code** | Implementation | Each function traces to constraints |
| **Tests** | Validation | Each test validates a constraint |
| **Docs** | Decisions | Each decision references constraints |
| **Runbooks** | Operations | Each procedure addresses failure modes |
| **Dashboards** | Monitoring | Each metric tracks a GOAL |
| **Alerts** | Notification | Each alert detects INVARIANT violation |

## STEP 0: Binding Constraint Check (MANDATORY)

Before any planning or generation, read `anchors.binding_constraint` from `.manifold/<feature>.json`.

If present:
- Display: `BINDING CONSTRAINT: [RT-ID] -- [reason]`
- Artifacts satisfying the binding constraint's RT MUST be generated FIRST
- Tag these artifacts: `Binding constraint`
- If RT has unresolved evidence after generation, WARN

## STEP 0b: Parallel Execution Check (MANDATORY)

When the generation plan includes **3+ files across different modules/directories**:

1. Analyze artifact groups for parallelization
2. Run `manifold solve <feature> --json` for parallel analysis
3. If parallel groups found, suggest to user
4. If approved: Use `/manifold:parallel` for parallel generation
5. If declined: Sequential generation

## Artifact Placement Rules

| Artifact Type | Correct Location |
|---------------|------------------|
| Library code | `lib/<feature>/` |
| Tests | `tests/<feature>/` |
| Claude Code skills | `install/commands/<name>.md` |
| Hooks | `install/hooks/` |
| CLI commands | `cli/commands/` |
| Runbooks | `ops/runbooks/` |
| Dashboards | `ops/dashboards/` |

## Evidence and Traceability (v3)

### Evidence on Required Truths

Every RT must have concrete, verifiable evidence:

```json
{
  "evidence": [
    {"id": "E1", "type": "file_exists", "path": "src/auth.ts", "status": "PENDING"},
    {"id": "E2", "type": "content_match", "path": "src/auth.ts", "pattern": "validateToken", "status": "PENDING"},
    {"id": "E3", "type": "test_passes", "path": "tests/auth.test.ts", "test_name": "validates JWT", "status": "PENDING"}
  ]
}
```

Rules:
- Every RT MUST have at least one evidence item
- Invariant constraints MUST have `test_passes` evidence
- All evidence starts with `"status": "PENDING"`

### Artifact Classification

Every artifact must include `artifact_class`:
- `substantive`: Contains logic, tests, or assertions (counts toward satisfaction)
- `structural`: Boilerplate, re-exports, config (tracked but doesn't satisfy)

### Immediate Evidence Validation

After populating evidence, validate what CAN be checked now:
- `file_exists`: Check file exists on disk
- `content_match`: Grep the pattern in the file
- `test_passes`: Leave as PENDING
- `manual_review`: Leave as PENDING

## Reversibility Tagging

Every action step MUST carry a reversibility tag:

| Tag | Meaning |
|-----|---------|
| `TWO_WAY` | Reversible with minimal cost |
| `REVERSIBLE_WITH_COST` | Can reverse with meaningful cost |
| `ONE_WAY` | Closes options permanently |

ONE_WAY steps require explicit acknowledgment.

## Non-Software Domain

When `--domain=non-software`, generate:

| Non-Software Artifact | Output Path |
|----------------------|-------------|
| Decision Brief | `docs/<feature>/DECISION_BRIEF.md` |
| Scenario Stress-Tests | `docs/<feature>/STRESS_TESTS.md` |
| Narrative Guide | `docs/<feature>/NARRATIVE_GUIDE.md` |
| Recovery Playbook | `docs/<feature>/RECOVERY_PLAYBOOK.md` |
| Risk Watch List | `docs/<feature>/RISK_WATCH_LIST.md` |

## PRD Generation (`--prd`)

Output: `docs/<feature>/PRD.md`

13-section structure: Problem Statement, Business Objectives, Success Metrics, Target Users, Assumptions & Constraints, Requirements (MoSCoW), User Flows, Out of Scope, Risks & Mitigations, Dependencies, Timeline, Open Questions + Appendices.

### Constraint-to-PRD Mapping

| Source | PRD Section |
|--------|-------------|
| `outcome` | Problem Statement + Business Objectives |
| `type: invariant` | Must Have |
| `type: boundary` | Should Have + Assumptions |
| `type: goal` with metric | Success Metrics |
| `type: goal` non-metric | Could Have |
| `user_experience` | Target Users + User Flows |
| `tensions.resolved` | Risks & Mitigations |
| `tensions.unresolved` | Open Questions |

## User Story Generation (`--stories`)

Output: `docs/<feature>/STORIES.md`

Format: Epic -> Stories (one per UX constraint) with "As a / I want / So that" and acceptance criteria derived from constraints.

Priority: invariant-related=P0, boundary-related=P1, goal-related=P2.

## Execution Instructions

### Phase 1: Planning (BEFORE any file writes)

1. Read manifold from `.manifold/<feature>.json` (or `.yaml`)
2. Read anchoring from JSON `anchors` section
3. Select solution option (from `--option` or prompt user)
4. BUILD ARTIFACT LIST ordered by binding constraint priority
5. MANDATORY PARALLELIZATION CHECK (see STEP 0b)

### Phase 2: Generation (AFTER user approval)

6. CHECK PROJECT PATTERNS - examine existing structure
7. For each artifact type:
   - Generate with constraint traceability
   - Add comments: `// Satisfies: B1, T2`
   - Add `@constraint` annotations in tests
   - Place in correct directory
8. Create all files
9. Update install script if adding distributable commands
10. If `--prd`: Generate PRD
11. If `--stories`: Generate user stories

### Phase 3: Finalization

12. Update manifold with generation tracking
13. Populate `evidence` arrays on all required truths
14. Run immediate evidence validation
15. Set `artifact_class` on every artifact
16. Verify invariant evidence: ensure `test_passes` evidence exists
17. Set phase to GENERATED
18. Run `manifold validate <feature>` -- fix errors before proceeding
19. Display summary with constraint coverage

## Output Format

```
ARTIFACT GENERATION: <feature>

Option: <selected> (<description>)
Generating from N constraints + N required truths...

ARTIFACTS CREATED:

Code:
-- <path> -> Satisfies: <IDs>
...

Tests:
-- <path> -> Validates: <IDs>
...

Docs / Runbooks / Dashboards / Alerts...

GENERATION SUMMARY:
- Code files: N
- Test files: N
- Doc files: N
- Total: N artifacts

Next: /manifold:m5-verify <feature>
```
