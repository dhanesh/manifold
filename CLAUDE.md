# Manifold

Constraint-first development framework that makes ALL constraints visible BEFORE implementation.

## Philosophy

```
TRADITIONAL                          MANIFOLD
─────────────────────────────────    ─────────────────────────────────
Spec → Design → Build → Test         All constraints exist NOW
Discover problems during build       Problems visible before build
Sequential planning                  Constraint satisfaction
Forward reasoning                    Backward from outcome
```

**Core Insight**: Development is constraint satisfaction, not feature building. All constraints—business, technical, UX, security, operational—exist simultaneously. They don't emerge; they're discovered.

**Why backward reasoning?** Forward planning misses implicit requirements. Backward reasoning surfaces them by asking: "For this outcome, what MUST be true?"

## Workflow Commands

### AI Commands (Claude Code)

| Command | Phase | Purpose |
|---------|-------|---------|
| `/m0-init <feature>` | INITIALIZED | Create constraint manifold |
| `/m1-constrain <feature>` | CONSTRAINED | Interview-driven constraint discovery |
| `/m2-tension <feature>` | TENSIONED | Surface conflicts (trade-offs) between constraints |
| `/m3-anchor <feature>` | ANCHORED | Backward reasoning from outcome |
| `/m4-generate <feature>` | GENERATED | Create ALL artifacts simultaneously |
| `/m5-verify <feature>` | VERIFIED | Validate against constraints |
| `/m6-integrate <feature>` | - | Wire artifacts together |
| `/m-status` | - | Show current state and next action |
| `/m-solve` | - | Generate parallel execution plan |
| `/m-quick <feature>` | - | **Light mode**: 3-phase workflow for simple changes |
| `/parallel` | - | Execute tasks in parallel worktrees |

### Phase Progression

```
INITIALIZED → CONSTRAINED → TENSIONED → ANCHORED → GENERATED → VERIFIED
     ↑                                                              |
     └──────────────────── (iteration) ─────────────────────────────┘
```

### Native CLI (Fast, <100ms)

```bash
manifold status [feature]      # Show state (no AI required)
manifold validate [feature]    # Validate YAML schema
manifold init <feature>        # Initialize manifold
manifold verify [feature]      # Verify artifacts exist
```

**Exit Codes**: 0 = Success, 1 = Error, 2 = Validation failure

## Constraint System

### Constraint Types

| Type | Meaning | Priority | Example |
|------|---------|----------|---------|
| `invariant` | Must NEVER be violated | Highest | "No duplicate payments" |
| `boundary` | Hard limits | Medium | "Retry window ≤ 72 hours" |
| `goal` | Should be optimized | Lowest | "95% retry success rate" |

**Priority**: `invariant` > `boundary` > `goal` (invariants cannot be traded off)

### Constraint Categories

| Category | ID Prefix | Focus |
|----------|-----------|-------|
| `business` | B1, B2... | Revenue, compliance, stakeholders |
| `technical` | T1, T2... | Performance, integration, data |
| `user_experience` | U1, U2... | Response times, errors, accessibility |
| `security` | S1, S2... | Data protection, auth, audit |
| `operational` | O1, O2... | Monitoring, incidents, deployment |

### Tension Types

| Type | Description |
|------|-------------|
| `trade_off` | Competing constraints requiring balance |
| `resource_tension` | Resource limits constraining options |
| `hidden_dependency` | Non-obvious relationships |

### Required Truth Statuses

| Status | Meaning |
|--------|---------|
| `SATISFIED` | Truth verified with evidence |
| `PARTIAL` | Partially satisfied, needs work |
| `NOT_SATISFIED` | Not yet implemented |
| `SPECIFICATION_READY` | Spec complete, ready for implementation |

> **CRITICAL**: Use ONLY these exact values. See `install/commands/SCHEMA_REFERENCE.md` for complete reference.
>
> **Field Names**: Constraints use `statement`, Tensions use `description`. See `install/commands/SCHEMA_QUICK_REFERENCE.md` for quick lookup.

## File Organization

```
.manifold/                      # Constraint manifolds (JSON+Markdown hybrid)
├── <feature>.json              # Structure (IDs, types, phases)
├── <feature>.md                # Content (statements, rationale)
└── <feature>.verify.json       # Verification results

cli/                            # Native CLI (Commander.js)
├── commands/                   # CLI command implementations
├── lib/                        # Shared libraries (parser, schema, solver)
└── __tests__/                  # CLI tests

lib/                            # Core library modules
install/                        # Distribution files (canonical source)
├── commands/                   # Claude Code skill files (.md)
├── lib/                        # Distributable TypeScript modules
├── hooks/                      # Claude Code hooks
└── templates/                  # Constraint templates

plugin/                         # Claude Code plugin (synced from install/)
├── commands/                   # Synced from install/commands/
├── lib/                        # Synced from install/lib/
├── hooks/                      # Synced from install/hooks/
└── templates/                  # Synced from install/templates/

docs/                           # User documentation
ops/                            # Operational artifacts
├── runbooks/                   # Incident procedures
├── dashboards/                 # Monitoring dashboards
└── alerts/                     # Alert configurations

tests/                          # Test files (Bun test)
examples/                       # Example manifolds
```

**Plugin Sync**: The `plugin/` directory is synced from `install/` (canonical source) using `bun scripts/sync-plugin.ts`. CI enforces sync via the diff-guard workflow. Edit files in `install/` only; `plugin/` is auto-generated.

**Build Commands**:
```bash
bun run build:commands        # Rebuild command translations for Gemini/Codex
bun run build:parallel-bundle # Bundle parallel execution library
bun run sync:plugin           # Sync install/ → plugin/
bun run build:all             # Run all build steps
```

**Release Automation**: Semantic release automatically:
- Bumps version in `cli/package.json`, `plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Syncs plugin files via `sync:plugin` script
- Generates CHANGELOG.md with conventional commits
- Creates git tags (format: `v${version}`)

## Coding Conventions

### TypeScript

- **Runtime**: Bun (preferred over Node.js)
- **Test Framework**: Bun test (`bun test`)
- **Entry Points**: `index.ts` for module exports
- **Strict Mode**: TypeScript strict mode enabled

### Distribution Model

- **Canonical source**: `install/` directory contains single source of truth
- **Plugin sync**: `plugin/` contains synced copies (Claude Code doesn't follow symlinks)
- **Sync script**: `bun scripts/sync-plugin.ts` copies `install/` → `plugin/`
- **CI validation**: Diff-guard workflow ensures sync is current
- **Edit location**: Always edit in `install/`, never in `plugin/`

### Constraint Traceability

**Every code artifact MUST trace to constraints:**

```typescript
/**
 * IdempotencyService - Prevents duplicate payment processing
 * Satisfies: B1 (no duplicates), RT-2 (idempotent retries)
 */
export class IdempotencyService {
  /**
   * Classify error as transient or permanent
   * Satisfies: RT-1
   */
  classifyError(error: Error): ErrorType {
    // Implementation
  }
}
```

### Test Derivation

**Tests verify CONSTRAINTS, not implementation details:**

```typescript
// CORRECT: Tests constraint B1
describe('IdempotencyService', () => {
  it('rejects duplicate payment attempts (B1: No duplicates)', async () => {
    // Test the INVARIANT, not internal implementation
  });
});

// WRONG: Tests implementation detail
describe('IdempotencyService', () => {
  it('uses Redis for storage', () => {
    // This tests HOW, not WHAT
  });
});
```

### Manifold Format (Schema v3)

**Recommended: JSON+Markdown Hybrid**

Two files that work together, eliminating field name confusion:

**`.manifold/<feature>.json`** — Structure only (IDs, types, refs)
```json
{
  "schema_version": 3,
  "feature": "payment-retry",
  "phase": "INITIALIZED",
  "constraints": {
    "business": [{"id": "B1", "type": "invariant"}],
    "technical": [],
    "user_experience": [],
    "security": [],
    "operational": []
  },
  "tensions": [],
  "anchors": {"required_truths": []},
  "convergence": {"status": "NOT_STARTED"}
}
```

**`.manifold/<feature>.md`** — Content only (text, rationale)
```markdown
# payment-retry

## Outcome
95% retry success rate

## Constraints
### Business
#### B1: No Duplicate Payments
Payment processing must never create duplicate charges.
> **Rationale:** Duplicates cause chargebacks.
```

**CLI commands:**
```bash
manifold validate <feature>    # Validates JSON+MD linking
manifold show <feature>        # Combined view
manifold migrate <feature>     # Convert YAML → JSON+MD
```

**Legacy: YAML Manifold**

Single file with both structure and content (still supported):

```yaml
schema_version: 3
feature: payment-retry
outcome: "95% retry success rate"
phase: INITIALIZED

constraints:
  business: []
  technical: []
  user_experience: []
  security: []
  operational: []

tensions: []
anchors:
  required_truths: []
iterations: []
convergence:
  status: NOT_STARTED
```

## Critical Rules

### Phase Transition Control

**CRITICAL**: Manifold phase transitions require EXPLICIT user commands.

- **Never auto-continue** to the next phase after completing one
- After any phase completes, show status and **WAIT** for user command
- After context compaction, run `/m-status` and **WAIT** - do not auto-continue
- The "SUGGESTED NEXT ACTION" in status output is a **suggestion**, not a directive

**Post-compaction recovery pattern:**
1. Run `/m-status` to understand current state
2. Display: "Current phase: X. Suggested next action: Y. Waiting for your command."
3. **STOP** and wait for user input

**Why this matters:** Users need control over when phases transition. Auto-continuing after compaction bypasses user oversight and can lead to unwanted changes.

### DO

1. **Always run `/m-status` first** to understand current phase
2. **Discover ALL constraints before coding** — use `/m1-constrain`
3. **Surface tensions explicitly** — use `/m2-tension`
4. **Generate ALL artifacts together** — code, tests, docs, runbooks, alerts
5. **Trace every artifact to constraints** — use comments like `// Satisfies: B1`
6. **Validate schema after changes** — `manifold validate <feature>`
7. **Check convergence criteria** before marking complete

### DO NOT

1. **DO NOT skip constraint discovery** — never implement without a manifold
2. **DO NOT invent new phases or types** — use ONLY values from SCHEMA_REFERENCE.md
3. **DO NOT generate code without tests** — tests derive from constraints
4. **DO NOT forget operational artifacts** — runbooks, alerts, dashboards
5. **DO NOT ignore tensions** — unresolved tensions cause bugs
6. **DO NOT modify main worktree during parallel execution**

## Parallel Execution

When generating 3+ artifacts across different modules, consider parallel execution:

```bash
/parallel "implement auth module" "add logging" "create tests" --dry-run
```

The system:
1. Analyzes tasks for file overlap
2. Forms safe parallel groups (no overlap)
3. Creates isolated git worktrees
4. Executes concurrently
5. Merges results automatically

**Options:**
- `--dry-run` — Analyze only, no execution
- `--max-parallel N` — Limit concurrent tasks (default: 4)
- `--timeout N` — Seconds per task (default: 300)

**Configuration:** `.parallel.yaml` in project root

## Artifact Placement

| Artifact Type | Location | Example |
|---------------|----------|---------|
| Library code | `lib/<feature>/` | `lib/retry/PaymentRetryClient.ts` |
| CLI commands | `cli/commands/` | `cli/commands/status.ts` |
| Claude skills | `install/commands/<name>.md` | `install/commands/m1-constrain.md` |
| Tests | `tests/<feature>/` | `tests/retry/PaymentRetryClient.test.ts` |
| Documentation | `docs/<feature>/` | `docs/payment-retry/README.md` |
| Runbooks | `ops/runbooks/` | `ops/runbooks/payment-retry-failure.md` |
| Dashboards | `ops/dashboards/` | `ops/dashboards/payment-retry.json` |
| Alerts | `ops/alerts/` | `ops/alerts/payment-retry.yaml` |

## Quick Reference

### Start New Feature (Full Workflow)

```bash
/m0-init my-feature --outcome="Success criteria here"
/m1-constrain my-feature
/m2-tension my-feature --resolve
/m3-anchor my-feature
/m4-generate my-feature --option=A
/m5-verify my-feature
```

### Quick Changes (Light Mode)

For simple changes that don't need full constraint analysis:

```bash
/m-quick fix-login-bug --outcome="Fix 504 timeout on login"
```

Light mode uses 3 phases: Constrain → Generate → Verify. See [When NOT to Use](docs/WHEN_NOT_TO_USE.md) for guidance.

### Use Templates

Pre-built constraint patterns for common scenarios:

```bash
/m0-init user-auth --template=auth
/m0-init user-crud --template=crud
/m0-init payment-flow --template=payment
/m0-init api-endpoint --template=api
```

### PM Workflow (Product Managers)

For PRD and user story generation:

```bash
/m0-init mobile-checkout --template=pm/feature-launch
/m1-constrain mobile-checkout
/m2-tension mobile-checkout
/m3-anchor mobile-checkout
/m4-generate mobile-checkout --prd --stories
```

Outputs:
- `docs/mobile-checkout/PRD.md` — Structured PRD with constraint traceability
- `docs/mobile-checkout/STORIES.md` — User stories with acceptance criteria

PM templates available: `pm/feature-launch`, `pm/experiment`, `pm/deprecation`

### Check Status

```bash
/m-status                  # All features
/m-status my-feature       # Single feature
manifold status            # Fast CLI check
```

### Fix Verification Gaps

```bash
/m5-verify my-feature --actions    # Get actionable fix commands
# Apply the generated actions
/m5-verify my-feature              # Re-verify
```

### Validate Schema

```bash
manifold validate my-feature    # Exits 2 on failure
```

## See Also

- [README.md](README.md) — Project overview
- [AGENTS.md](AGENTS.md) — Agent specifications
- [SCHEMA_REFERENCE.md](install/commands/SCHEMA_REFERENCE.md) — Valid values
- [Parallel Agents](docs/parallel-agents/README.md) — Parallel execution guide
- [Practical Walkthrough](docs/walkthrough/README.md) — End-to-end feature example
- [Glossary](docs/GLOSSARY.md) — Plain-language terminology explanations
- [When NOT to Use](docs/WHEN_NOT_TO_USE.md) — Know when simpler approaches are better
- [Constraint Templates](install/templates/README.md) — Pre-built patterns (auth, CRUD, API, payment)
- [PM Adaptation Guide](docs/pm/guide.md) — Product Manager workflows and PRD/story generation
- [PM Templates](install/templates/pm/README.md) — Feature launch, experiment, deprecation templates
- [Scientific Foundations](docs/research/phase-scientific-foundations.md) — Research supporting each phase
