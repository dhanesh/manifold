---
description: "Generate ALL artifacts simultaneously from the constraint manifold - code, tests, docs, runbooks, alerts"
---

# /m4-generate - Artifact Generation

Generate ALL artifacts simultaneously from the constraint manifold.

## Usage

```
/m4-generate <feature-name> [--option=<A|B|C>] [--artifacts=<list>]
```

## Why All At Once?

**Traditional approach:**
```
Code → Tests → Docs → Ops (often forgotten)
```
Each phase loses context. Tests don't cover all constraints.

**Manifold approach:**
```
Constraints → [Code, Tests, Docs, Ops] (simultaneously)
```
All artifacts derive from the SAME source. Every constraint is traced.

## Artifacts Generated

| Artifact | Purpose | Constraint Tracing |
|----------|---------|-------------------|
| **Code** | Implementation | Each function traces to constraints |
| **Tests** | Validation | Each test validates a constraint |
| **Docs** | Decisions | Each decision references constraints |
| **Runbooks** | Operations | Each procedure addresses failure modes |
| **Dashboards** | Monitoring | Each metric tracks a GOAL |
| **Alerts** | Notification | Each alert detects INVARIANT violation |

## Example

```
/m4-generate payment-retry --option=C

ARTIFACT GENERATION: payment-retry

Option: C (Hybrid - Client retry + Server queue)

Generating from 12 constraints + 5 required truths...

ARTIFACTS CREATED:

Code:
├── src/retry/PaymentRetryClient.ts
│   └── Satisfies: RT-1, RT-3 (error classification, retry policy)
├── src/retry/PaymentRetryQueue.ts
│   └── Satisfies: RT-5 (durable queue)
├── src/retry/IdempotencyService.ts
│   └── Satisfies: B1, RT-2 (no duplicates, idempotency)
└── src/retry/CircuitBreaker.ts
    └── Satisfies: RT-4 (downstream recovery)

Tests:
├── src/retry/__tests__/PaymentRetryClient.test.ts
│   └── Validates: B1, B2, T1, U2
├── src/retry/__tests__/IdempotencyService.test.ts
│   └── Validates: B1 (INVARIANT - critical)
└── src/retry/__tests__/integration.test.ts
    └── Validates: End-to-end constraint coverage

Docs:
├── docs/payment-retry/README.md
├── docs/payment-retry/API.md
└── docs/payment-retry/DECISIONS.md

Runbooks:
├── ops/runbooks/payment-retry-queue-overflow.md
├── ops/runbooks/payment-retry-success-drop.md
└── ops/runbooks/payment-retry-rollback.md

Dashboards:
└── ops/dashboards/payment-retry.json

Alerts:
└── ops/alerts/payment-retry.yaml

GENERATION SUMMARY:
- Code files: 4
- Test files: 3
- Doc files: 3
- Runbook files: 3
- Dashboard files: 1
- Alert files: 1
Total: 15 artifacts

Next: /m5-verify payment-retry
```

## Task Tracking

When generating artifacts, update `.manifold/<feature>.yaml` with completion status:

```yaml
generation:
  option: C
  timestamp: <ISO timestamp>
  artifacts:
    - path: src/retry/PaymentRetryClient.ts
      satisfies: [RT-1, RT-3]
      status: generated
    - path: src/retry/__tests__/PaymentRetryClient.test.ts
      validates: [B1, B2, T1, U2]
      status: generated
  coverage:
    constraints_addressed: 12
    constraints_total: 12
    percentage: 100
```

This ensures:
- Every artifact traces to constraints it addresses
- Coverage can be verified programmatically
- `/m5-verify` can check actual files against declared artifacts

## Artifact Placement Rules

**CRITICAL**: Artifacts must follow project integration patterns. Misplaced artifacts cause integration failures.

### For Manifold Projects

| Artifact Type | Correct Location | Wrong Location | Why |
|---------------|------------------|----------------|-----|
| Library code | `lib/<feature>/` | `src/`, root | Manifold uses `lib/` for TypeScript modules |
| Tests | `tests/<feature>/` | `lib/<feature>/` | Tests separate from implementation |
| Claude Code skills | `install/commands/<name>.md` | `commands/<name>.ts` | Skills are markdown, not TypeScript |
| Hooks | `install/hooks/` | `hooks/` | Install directory for distribution |
| CLI commands | `cli/commands/` | `commands/` | CLI has its own command structure |
| Runbooks | `ops/runbooks/` | `docs/` | Operational docs separate from user docs |
| Dashboards | `ops/dashboards/` | root | Monitoring artifacts in ops/ |

### Integration Pattern Detection

Before generating, check:

1. **Existing patterns** - Look at how similar artifacts are organized
2. **Install script** - What does `install.sh` actually install?
3. **Entry points** - Where are `index.ts` files? What do they export?
4. **Build system** - What gets compiled? What gets distributed?

### Common Mistakes to Avoid

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| `.ts` file for Claude Code command | Won't be installed, won't work | Use `.md` skill file |
| Code in `commands/` instead of `lib/` | Not importable, breaks structure | Implementation in `lib/`, skill in `install/commands/` |
| Missing from install script | Users don't get the feature | Add to `COMMAND_FILES` array |
| Wrong import paths | Compilation errors | Check relative paths after moving files |

### Verification Checklist

After generation, verify:
- [ ] All library code is in `lib/<feature>/`
- [ ] All library code exports from `lib/<feature>/index.ts`
- [ ] Claude Code commands have `.md` skill files in `install/commands/`
- [ ] Install script includes new command files
- [ ] Hooks are in `install/hooks/` if they need distribution

## Parallel Execution Integration

**IMPORTANT**: Before generating artifacts, check for parallelization opportunities.

### Parallelization Check

When the generation plan includes **3+ independent artifact groups**, invoke the parallel execution system:

1. **Analyze Artifact Groups**
   - Code files (can be generated in parallel across modules)
   - Test files (depend on code, but tests for different modules can parallelize)
   - Documentation (independent, can parallelize)
   - Operational artifacts (runbooks, dashboards, alerts - independent)

2. **Invoke Auto-Suggester**
   ```typescript
   // The auto-suggester at ~/.claude/hooks/auto-suggester.ts analyzes tasks
   // Import and use when parallelization is beneficial:
   import { AutoSuggester } from '~/.claude/lib/parallel/index';

   const suggester = new AutoSuggester(process.cwd());
   const tasks = [
     "Generate PaymentRetryClient.ts with error classification",
     "Generate PaymentRetryQueue.ts with durable queue logic",
     "Generate IdempotencyService.ts with duplicate prevention",
     "Generate all test files for retry module",
     "Generate documentation for payment-retry feature"
   ];

   const suggestion = await suggester.suggest(tasks);
   if (suggestion.shouldParallelize) {
     // Display suggestion to user
     console.log(suggester.formatSuggestion(suggestion));
   }
   ```

3. **User Approval Prompt**
   When parallelization is suggested, display:
   ```
   PARALLEL EXECUTION OPPORTUNITY DETECTED

   The following artifact groups can be generated in parallel:

   Group 1: Code Implementation
   - PaymentRetryClient.ts
   - PaymentRetryQueue.ts
   - IdempotencyService.ts
   - CircuitBreaker.ts

   Group 2: Test Files
   - PaymentRetryClient.test.ts
   - IdempotencyService.test.ts
   - integration.test.ts

   Group 3: Documentation & Ops
   - README.md, API.md, DECISIONS.md
   - Runbooks, Dashboards, Alerts

   Estimated speedup: 2.5x
   Confidence: 85%

   Would you like to generate artifacts in parallel using git worktrees?
   [Y]es / [N]o / [D]etails
   ```

4. **If Approved**: Use `/parallel` command to execute generation in isolated worktrees
5. **If Declined**: Proceed with sequential generation

### Parallel Generation Flow

```
User runs: /m4-generate payment-retry --option=C

1. Parse manifold and anchoring
2. Build artifact generation plan
3. Analyze for parallelization (≥3 independent groups?)
   └── YES: Invoke auto-suggester
       └── Suggestion positive?
           └── YES: Prompt user for approval
               └── Approved: Use /parallel for generation
               └── Declined: Sequential generation
           └── NO: Sequential generation
   └── NO: Sequential generation
4. Generate artifacts (parallel or sequential)
5. Merge results and update manifold
```

## Execution Instructions

1. Read manifold from `.manifold/<feature>.yaml`
2. Read anchoring from `.manifold/<feature>.anchor.yaml`
3. Select solution option (from `--option` or prompt user)
4. **CHECK PROJECT PATTERNS** - Examine existing structure before placing files
5. **PARALLELIZATION CHECK** - Analyze artifacts for parallel generation opportunity
   - If ≥3 independent artifact groups detected
   - Run auto-suggester analysis
   - Prompt user: "Parallel generation detected (Xfiles, Yx speedup). Enable? [Y/N]"
   - If approved, use `/parallel` command with artifact tasks
6. For each artifact type:
   - Generate artifact with constraint traceability
   - Add comments linking to constraint IDs: `// Satisfies: B1, T2`
   - **Place in correct directory per Artifact Placement Rules**
7. Create all files in appropriate directories
8. **Update install script** if adding new distributable commands
9. **Update manifold YAML** with generation tracking (artifacts, coverage)
10. Set phase to GENERATED
11. Display summary with constraint coverage
