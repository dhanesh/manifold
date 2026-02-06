# Manifold Agents

Specialized agents for constraint-first development. Each agent handles a specific phase of the Manifold workflow.

## Agent Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MANIFOLD ORCHESTRATOR                          │
│  Routes to specialized agents based on current phase and task type    │
└──────────────────────────────────────────────────────────────────────┘
        │
        ├─────────────────────────────────────────────────────────────┐
        │                                                             │
        ▼                                                             ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   CONSTRAINT    │  │    TENSION      │  │     ANCHOR      │  │   GENERATION    │
│   DISCOVERY     │  │    ANALYSIS     │  │     AGENT       │  │     AGENT       │
│     AGENT       │  │      AGENT      │  │                 │  │                 │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ Phase: m1       │  │ Phase: m2       │  │ Phase: m3       │  │ Phase: m4       │
│ Elicits across  │  │ Finds conflicts │  │ Backward        │  │ Creates code,   │
│ 5 categories    │  │ Suggests fixes  │  │ reasoning       │  │ tests, docs,    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  │ runbooks, alerts│
        │                     │                   │            └─────────────────┘
        │                     │                   │                    │
        ▼                     ▼                   ▼                    ▼
┌─────────────────┐                                            ┌─────────────────┐
│  VERIFICATION   │◀───────────────────────────────────────────│   INTEGRATION   │
│     AGENT       │                                            │     AGENT       │
├─────────────────┤                                            ├─────────────────┤
│ Phase: m5       │                                            │ Phase: m6       │
│ Validates all   │                                            │ Wires artifacts │
│ artifacts       │                                            │ together        │
└─────────────────┘                                            └─────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PARALLEL EXECUTION AGENT                        │
│  Manages worktree-based parallelism for independent tasks            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Constraint Discovery Agent

**Command:** `/m1-constrain <feature>`

**Purpose:** Elicit and document ALL constraints across 5 categories before any implementation begins.

### Activation Triggers

- Phase is `INITIALIZED`
- User invokes `/m1-constrain`
- New feature needs constraints identified

### Behavior

1. Load existing manifold from `.manifold/<feature>.json` + `.manifold/<feature>.md`
2. For each category, ask probing questions (see Interview Protocol)
3. Classify responses into constraint types (`invariant`, `goal`, `boundary`)
4. Assign IDs (B1, T1, U1, S1, O1, etc.)
5. Update manifold JSON + MD files
6. Set phase to `CONSTRAINED`

### Interview Protocol

```yaml
business:
  questions:
    - "What is the revenue/cost impact of this feature?"
    - "Are there compliance or legal requirements?"
    - "Who are the stakeholders and what do they need?"
    - "What happens if this feature fails?"
  invariant_signals: ["must", "cannot", "never", "always", "required by law"]
  goal_signals: ["should", "ideally", "target", "aim for"]
  boundary_signals: ["maximum", "minimum", "within", "no more than"]

technical:
  questions:
    - "What are the performance requirements?"
    - "What systems does this integrate with?"
    - "What data consistency guarantees are needed?"
    - "What is the expected load/scale?"
  invariant_signals: ["ACID", "consistency", "must not lose"]
  boundary_signals: ["SLA", "latency", "throughput", "timeout"]

user_experience:
  questions:
    - "What response times are acceptable?"
    - "How should errors be communicated?"
    - "Are there accessibility requirements?"
    - "What is the user's mental model?"
  invariant_signals: ["WCAG", "must be accessible"]
  goal_signals: ["intuitive", "easy", "clear"]

security:
  questions:
    - "What data needs protection?"
    - "What authentication/authorization is required?"
    - "What needs to be audited?"
    - "What are the threat vectors?"
  invariant_signals: ["PII", "encrypt", "audit", "compliance"]
  boundary_signals: ["authentication required", "role-based"]

operational:
  questions:
    - "What needs monitoring?"
    - "What are the SLA requirements?"
    - "What is the incident response process?"
    - "How will this be deployed/rolled back?"
  invariant_signals: ["alerting", "logging required"]
  goal_signals: ["observable", "debuggable"]
```

### Output Format

```
CONSTRAINT DISCOVERY: <feature>

CONSTRAINTS DISCOVERED:

Business:
- B1: <statement> (invariant)
- B2: <statement> (goal)

Technical:
- T1: <statement> (boundary)
...

Updated: .manifold/<feature>.json + .manifold/<feature>.md (N constraints)

Next: /m2-tension <feature>
```

### Schema Compliance

- Types: ONLY `invariant`, `goal`, `boundary`
- Categories: ONLY `business`, `technical`, `user_experience`, `security`, `operational`
- ID format: Category prefix + number (B1, T1, U1, S1, O1)

---

## 2. Tension Analysis Agent

**Command:** `/m2-tension <feature> [--resolve] [--auto-deps]`

**Purpose:** Surface conflicts between constraints and propose resolutions before implementation.

### Activation Triggers

- Phase is `CONSTRAINED`
- User invokes `/m2-tension`
- Constraints updated that may conflict

### Behavior

1. Load manifold from `.manifold/<feature>.json` + `.manifold/<feature>.md`
2. Compare each pair of constraints for conflicts
3. Detect hidden dependencies (`--auto-deps`)
4. Generate resolution options for each tension
5. Recommend resolution based on priority (`invariant` > `boundary` > `goal`)
6. If `--resolve`, prompt user to choose
7. Update manifold JSON + MD with tensions and resolutions
8. Set phase to `TENSIONED`

### Tension Detection Patterns

```yaml
common_tensions:
  speed_vs_safety:
    pattern: ["fast", "performance"] + ["validation", "security"]
    type: trade_off
    example: "API response <200ms" vs "Comprehensive input validation"

  availability_vs_consistency:
    pattern: ["available", "uptime"] + ["consistent", "ACID"]
    type: trade_off
    example: "99.9% availability" vs "Strong consistency"

  ux_vs_security:
    pattern: ["user-friendly", "helpful error"] + ["security", "obscure"]
    type: trade_off
    example: "Descriptive errors" vs "Don't reveal internal state"

  cost_vs_performance:
    pattern: ["minimize cost", "budget"] + ["performance", "scale"]
    type: resource_tension
    example: "Minimize infrastructure" vs "Handle 10K concurrent users"
```

### Resolution Strategies

- **Prioritize**: `invariant` always wins over `goal`
- **Partition**: Apply different constraints in different contexts
- **Transform**: Find solution satisfying both differently
- **Accept**: Document trade-off and proceed
- **Invalidate**: Remove constraint if not actually required

### Output Format

```
TENSION ANALYSIS: <feature>

TENSIONS DETECTED:

Tension TN1: <description>
├── <constraint_id>: <statement>
├── <constraint_id>: <statement>
└── Conflict: <why they conflict>

    Resolution Options:
    A. <option with trade-offs>
    B. <option with trade-offs>
    C. <option with trade-offs>

    Recommended: <A|B|C> - <rationale>

TENSION SUMMARY:
- Trade-offs: N
- Resource Tensions: N
- Hidden Dependencies: N

Updated: .manifold/<feature>.json + .md

Next: /m3-anchor <feature>
```

### Schema Compliance

- Tension types: ONLY `trade_off`, `resource_tension`, `hidden_dependency`
- Tension statuses: ONLY `resolved`, `unresolved`
- Tension ID format: TN1, TN2, TN3...

---

## 3. Anchor Agent

**Command:** `/m3-anchor <feature> [--outcome="<statement>"]`

**Purpose:** Reason backward from desired outcome to derive required truths and solution space.

### Activation Triggers

- Phase is `TENSIONED`
- User invokes `/m3-anchor`
- Outcome needs clarification

### Behavior

1. Load manifold from `.manifold/<feature>.json` + `.manifold/<feature>.md`
2. Get outcome (from flag or manifold)
3. Recursively ask "What must be TRUE for this outcome?"
4. Each truth becomes RT-N (Required Truth)
5. Identify gaps between current state and requirements
6. Generate 2-4 solution options
7. Recommend best option with rationale
8. Save to `.manifold/<feature>.json` + `.manifold/<feature>.md`
9. Set phase to `ANCHORED`

### Backward Reasoning Process

```
OUTCOME: "95% retry success for transient failures"
         │
         ▼
    "What must be TRUE?"
         │
         ├──► RT-1: Can distinguish transient from permanent failures
         │         └── Gap: No error classification system
         │
         ├──► RT-2: Retries are idempotent
         │         └── Gap: No idempotency keys
         │
         ├──► RT-3: Sufficient retry budget
         │         └── Gap: Retry policy undefined
         │
         └──► RT-4: Downstream services recoverable
                   └── Gap: No circuit breaker
```

### Output Format

```
OUTCOME ANCHORING: <feature>

Outcome: <statement>

BACKWARD REASONING:

For <outcome>, what MUST be true?

RT-1: <statement>
      └── Requires: <prerequisite>
      └── Gap: <current state>

RT-2: <statement>
      ...

SOLUTION SPACE:

Option A: <name>
├── Satisfies: RT-1, RT-3
├── Gaps: RT-2, RT-4
└── Complexity: Low

Option B: <name>
├── Satisfies: All
├── Gaps: None
└── Complexity: High

RECOMMENDATION: Option <X>
<rationale>

Updated: .manifold/<feature>.json + .md

Next: /m4-generate <feature> --option=<X>
```

### Schema Compliance

- Required Truth ID format: RT-1, RT-2, RT-3...
- Statuses: ONLY `SATISFIED`, `PARTIAL`, `NOT_SATISFIED`, `SPECIFICATION_READY`

---

## 4. Generation Agent

**Command:** `/m4-generate <feature> [--option=<A|B|C>] [--artifacts=<list>]`

**Purpose:** Generate ALL artifacts simultaneously from the constraint manifold—code, tests, docs, runbooks, alerts.

### Activation Triggers

- Phase is `ANCHORED`
- User invokes `/m4-generate`
- Solution option selected

### Behavior

1. Load manifold and anchor files
2. Select solution option
3. **Check for parallel execution opportunity** (if 3+ files across modules)
4. Generate all artifact types:
   - Code with constraint traceability comments
   - Tests derived from constraints
   - Documentation explaining decisions
   - Runbooks for failure modes
   - Dashboards for monitoring goals
   - Alerts for invariant violations
5. Place artifacts in correct directories
6. Update manifold with generation tracking
7. Set phase to `GENERATED`

### Parallel Execution Check

If generating 3+ files across different modules:

```
PARALLEL GENERATION OPPORTUNITY

I've identified N artifacts that could be generated in parallel:

Group 1 - Code: [file1.ts, file2.ts]
Group 2 - Tests: [file1.test.ts, file2.test.ts]
Group 3 - Docs & Ops: [README.md, runbooks]

Estimated speedup: ~Xx faster

Would you like to enable parallel generation? [Y/N]
```

### Artifact Placement Rules

| Artifact | Location | Example |
|----------|----------|---------|
| Library code | `lib/<feature>/` | `lib/retry/PaymentRetryClient.ts` |
| Tests | `tests/<feature>/` | `tests/retry/PaymentRetryClient.test.ts` |
| Claude skills | `install/commands/<name>.md` | `install/commands/parallel.md` |
| Documentation | `docs/<feature>/` | `docs/payment-retry/README.md` |
| Runbooks | `ops/runbooks/` | `ops/runbooks/payment-retry-failure.md` |
| Dashboards | `ops/dashboards/` | `ops/dashboards/payment-retry.json` |
| Alerts | `ops/alerts/` | `ops/alerts/payment-retry.yaml` |

### Constraint Traceability Format

```typescript
/**
 * PaymentRetryClient - Handles payment retry logic
 * Satisfies: RT-1, RT-3 (error classification, retry policy)
 */
export class PaymentRetryClient {
  /**
   * Classify error as transient or permanent
   * Satisfies: RT-1
   */
  classifyError(error: Error): ErrorType {
    // Implementation
  }
}
```

### Test Derivation Format

```typescript
describe('PaymentRetryClient', () => {
  // Validates: B1 - No duplicate payments
  it('prevents duplicate payment processing (B1)', async () => {
    // Test invariant, not implementation
  });

  // Validates: RT-1 - Error classification
  it('classifies network timeout as transient (RT-1)', () => {
    // Test required truth
  });
});
```

---

## 5. Verification Agent

**Command:** `/m5-verify <feature> [--strict] [--actions]`

**Purpose:** Verify ALL artifacts against ALL constraints and produce coverage matrix.

### Activation Triggers

- Phase is `GENERATED`
- User invokes `/m5-verify`
- After code changes

### Behavior

1. Load manifold and generation data
2. Verify each declared artifact exists on disk
3. Scan artifacts for constraint references
4. Build verification matrix
5. Calculate coverage percentages
6. Identify gaps with actionable items
7. If `--actions`, generate executable fix commands
8. Update `.manifold/<feature>.verify.json`
9. Set phase to `VERIFIED` (if no blocking gaps) or keep `GENERATED`

### Verification Matrix

```
| Constraint | Type | Code | Test | Docs | Ops | Status |
|------------|------|------|------|------|-----|--------|
| B1: No duplicates | invariant | ✓ | ✓ | ✓ | ✓ | SATISFIED |
| B2: 95% success | goal | ✓ | ◐ | ✓ | ✓ | PARTIAL |
| T1: <200ms | boundary | ✓ | ◐ | ✓ | ✓ | PARTIAL |
```

**Symbols:**
- ✓ `SATISFIED` — Fully addressed
- ◐ `PARTIAL` — Some evidence, gaps remain
- ✗ `NOT_SATISFIED` — Not addressed
- − N/A — Not applicable

### Strictness Levels

- **Default**: `invariant` must be ✓ in Code + Test; `boundary` in Code; `goal` can be ◐
- **Strict** (`--strict`): All constraints must be ✓, no ◐ allowed

### Gap Actions (`--actions`)

```
Gap G1: B2 (95% success) - Test coverage incomplete
├── Type: test_coverage
├── Constraint: B2
├── Severity: non-blocking
└── ACTION (copy-paste ready):

    # In tests/retry/PaymentRetryClient.test.ts, add:
    describe('success rate under load', () => {
      it('achieves 95% success rate (B2)', async () => {
        // Load test implementation
      });
    });
```

### Convergence Criteria

Automatically checked:
- All `invariant` constraints `SATISFIED`
- Test pass rate ≥ 95%
- No blocking gaps
- At least one generate→verify cycle completed

---

## 6. Integration Agent

**Command:** `/m6-integrate <feature> [--check-only] [--auto-wire]`

**Purpose:** Wire generated artifacts together by identifying integration points.

### Activation Triggers

- Phase is `GENERATED` or `VERIFIED`
- User invokes `/m6-integrate`
- Artifacts exist but aren't connected

### Behavior

1. Load manifold and generation data
2. Inventory all generated artifacts
3. Detect integration points using pattern matching
4. Generate wiring checklist
5. Verify prerequisites satisfied
6. If `--auto-wire`, perform safe integrations
7. Update manifold with integration status
8. Recommend `/m5-verify` after integration

### Integration Detection Patterns

| Pattern | Detection | Action |
|---------|-----------|--------|
| TypeScript modules | `export` without `import` in parent | Add export to `index.ts` |
| Feature flags | Feature-gated code | Add to config |
| Index exports | New module not exported | Add to index |
| Config references | New config file | Add to config loader |
| Test imports | Test utilities used | Add import statement |

### Output Format

```
INTEGRATION CHECKLIST:

[1] Wire RetryClient into main export
    ├── Source: lib/retry/PaymentRetryClient.ts
    ├── Target: lib/retry/index.ts
    ├── Action: Add `export { PaymentRetryClient } from './PaymentRetryClient';`
    └── Satisfies: RT-1, T3

[2] Add retry feature flag
    ├── Target: .parallel.yaml
    ├── Action: Add `retry: enabled` section
    └── Satisfies: B4

COPY-PASTE COMMANDS:
echo 'export { PaymentRetryClient } from "./PaymentRetryClient";' >> lib/retry/index.ts

Next: After integration, run /m5-verify <feature>
```

### Safe vs Manual Integrations

- **Safe (auto-wireable)**: Module exports, re-exports, simple imports
- **Manual review**: Struct modifications, constructor changes, feature flags

---

## 7. Parallel Execution Agent

**Command:** `/parallel "task1" "task2" "task3" [options]`

**Purpose:** Execute independent tasks concurrently using isolated git worktrees.

### Activation Triggers

- Multiple independent tasks identified
- `/m4-generate` suggests parallelization
- User invokes `/parallel`

### Behavior

1. Parse task descriptions
2. Predict file modifications for each task
3. Detect file overlaps
4. Form safe parallel groups (no overlap)
5. Check system resources
6. If `--dry-run`, show analysis and exit
7. Create isolated git worktrees
8. Execute tasks concurrently
9. Merge results to main worktree
10. Cleanup temporary worktrees
11. Report results

### File Prediction Confidence

| Method | Confidence | Description |
|--------|------------|-------------|
| Explicit | 95% | Files directly mentioned |
| Pattern | 80% | Glob patterns like "test files" |
| Module | 70% | Component name inference |
| Git History | 60% | Past commit patterns |
| Heuristic | 50% | Domain inference (auth, API) |

### Safe Group Formation

```
Tasks: [A, B, C, D]
File predictions:
  A: [src/auth/login.ts, src/auth/utils.ts]
  B: [src/auth/signup.ts, src/auth/utils.ts]  # Overlaps with A on utils.ts
  C: [src/api/users.ts]
  D: [src/api/products.ts]

Groups:
  Group 1: [A, C, D]  # No overlap
  Group 2: [B]        # Overlaps with A, runs after Group 1
```

### Resource Limits

- Max parallel worktrees: 4 (default, configurable)
- Disk space: ≥2GB free
- Memory: <85% used
- CPU: <80% load

### Options

```
--dry-run          Analyze only, no execution
--auto-parallel    Enable without confirmation
--max-parallel N   Maximum concurrent (default: 4)
--timeout N        Seconds per task (default: 300)
--verbose, -v      Detailed output
--deep             Thorough file analysis
--strategy TYPE    Merge: sequential, squash, rebase
--no-cleanup       Keep worktrees after completion
--file, -f FILE    Load tasks from YAML
```

---

## Agent Coordination

### Phase-Based Routing

| Phase | Primary Agent | Allowed Actions |
|-------|---------------|-----------------|
| `INITIALIZED` | Constraint Discovery | `/m1-constrain` |
| `CONSTRAINED` | Tension Analysis | `/m2-tension`, back to `/m1-constrain` |
| `TENSIONED` | Anchor | `/m3-anchor`, back to `/m2-tension` |
| `ANCHORED` | Generation | `/m4-generate`, back to `/m3-anchor` |
| `GENERATED` | Verification, Integration | `/m5-verify`, `/m6-integrate` |
| `VERIFIED` | All | Any (feature complete) |

### Cross-Agent Communication

Agents communicate through:
1. **Manifold files** — Primary state storage (`.manifold/*.json` + `.manifold/*.md`)
2. **Phase transitions** — Signal readiness for next agent
3. **Constraint IDs** — Reference shared constraints (B1, T1, etc.)
4. **Required truth IDs** — Link to anchoring (RT-1, RT-2, etc.)

### Iteration Pattern

When gaps are found:

```
VERIFIED ──┐
     │     │
     │     └─ Gaps found
     │           │
     ▼           ▼
GENERATED ◀─── Re-generate to fix gaps
     │
     ▼
VERIFIED ──► CONVERGED (no gaps)
```

---

## Configuration

### Agent Defaults

```yaml
# .manifold/agent-config.yaml (optional)
constraint_discovery:
  interview_style: conversational  # or structured
  categories: [business, technical, user_experience, security, operational]

tension_analysis:
  auto_deps: true
  resolution_style: recommend  # or interactive

generation:
  parallel_threshold: 3  # Files before suggesting parallel
  trace_format: jsdoc   # or inline_comment

verification:
  strict_mode: false
  min_coverage: 80

parallel:
  max_workers: 4
  timeout: 300000
  cleanup: true
```

---

## Quick Reference

### Agent Selection by Task

| Task | Agent | Command |
|------|-------|---------|
| "What constraints exist?" | Constraint Discovery | `/m1-constrain` |
| "Find conflicts" | Tension Analysis | `/m2-tension` |
| "What's needed for success?" | Anchor | `/m3-anchor` |
| "Create the implementation" | Generation | `/m4-generate` |
| "Is everything complete?" | Verification | `/m5-verify` |
| "Connect the pieces" | Integration | `/m6-integrate` |
| "Run tasks simultaneously" | Parallel | `/parallel` |
| "What's the status?" | Status | `/m-status` |

### Common Workflows

**New Feature:**
```
/m0-init feature-name --outcome="Success criteria"
/m1-constrain feature-name
/m2-tension feature-name --resolve
/m3-anchor feature-name
/m4-generate feature-name --option=A
/m5-verify feature-name
```

**Fix Verification Gaps:**
```
/m5-verify feature-name --actions
# Copy-paste the generated actions
/m5-verify feature-name  # Re-verify
```

**Parallel Feature Work:**
```
/parallel "Add auth module" "Add logging" "Add tests" --dry-run
# Review analysis
/parallel "Add auth module" "Add logging" "Add tests"
```

---

## See Also

- [CLAUDE.md](CLAUDE.md) — Project instructions
- [SCHEMA_REFERENCE.md](install/commands/SCHEMA_REFERENCE.md) — Valid schema values
- [Parallel Agents](docs/parallel-agents/README.md) — Parallel execution guide
- [SKILL.md](install/manifold/SKILL.md) — Manifold skill overview
