---
description: "Wire generated artifacts together. Identifies integration points and produces actionable wiring checklist"
argument-hint: "<feature-name>"
---

# /m6-integrate - Artifact Integration (v2)

Wire generated artifacts together by identifying integration points and producing actionable checklists.

## Usage

```
/m6-integrate <feature-name> [--check-only] [--auto-wire]
```

**Flags:**
- `--check-only` - Show integration checklist without making changes
- `--auto-wire` - Attempt automatic integration where safe

## v3 Schema Compliance

When recording integration, maintain v3 schema structure:

```yaml
# Record iteration for integration phase
iterations:
  - number: 6
    phase: integrate
    timestamp: "<ISO timestamp>"
    integration_points: <count>
    completed: <count>
    pending: <count>
    auto_wireable: <count>
    manual_required: <count>

# Update convergence status based on integration completion
convergence:
  status: IN_PROGRESS    # Valid: NOT_STARTED, IN_PROGRESS, CONVERGED
  criteria:
    all_invariants_satisfied: true
    all_required_truths_satisfied: false
    no_blocking_gaps: true
```

> See `SCHEMA_REFERENCE.md` for valid convergence statuses, iteration fields, and integration checklist structure.

## Why Integration?

**Problem observed**: `/m4-generate` creates artifacts in isolation. Integration was manual and error-prone.

**From graph-d-validation learnings**:
- GAP-1: "WAL feature flag missing from Cargo.toml"
- GAP-2: "MVCC not integrated with TransactionManager"
- GAP-3: "WAL/Checkpoint not integrated with Storage"

These gaps emerged AFTER generation because wiring wasn't tracked.

## Integration Analysis

`/m6-integrate` performs:

1. **Artifact Inventory** - List all generated artifacts from manifold
2. **Integration Point Detection** - Find where artifacts need to connect
3. **Wiring Checklist Generation** - Produce actionable integration tasks
4. **Dependency Verification** - Ensure prerequisites are satisfied

## Integration Point Detection

Uses static pattern matching (no code execution) to identify wiring needs:

### Detection Patterns

| Artifact Type | Integration Pattern | Detection Method |
|---------------|--------------------|--------------------|
| Rust modules | `mod` declarations | Grep for `pub mod` |
| Feature flags | Cargo.toml features | Grep for `[features]` |
| TypeScript modules | Import/export | Grep for `export`, `import` |
| Config files | Reference to new configs | Grep for config paths |
| Tests | Test imports | Grep for test utilities |

## Example

```
/m6-integrate graph-d-validation

INTEGRATION ANALYSIS: graph-d-validation

Scanning 9 generated artifacts for integration points...

INTEGRATION CHECKLIST:

[1] Wire WAL into Storage
    ├── Source: src/storage/wal.rs (generated)
    ├── Target: src/storage/mod.rs (existing)
    ├── Action: Add `pub mod wal;` to mod.rs
    ├── Action: Import WAL in MmapStorage impl
    └── Satisfies: RT-1, T3

[2] Add WAL feature flag
    ├── Source: src/storage/wal.rs (uses feature gate)
    ├── Target: Cargo.toml
    ├── Action: Add `wal = []` to [features] section
    └── Satisfies: T3

[3] Wire MVCC into TransactionManager
    ├── Source: src/transaction/mvcc.rs (generated)
    ├── Target: src/transaction/mod.rs (existing)
    ├── Action: Add `pub mod mvcc;`
    ├── Action: Import MvccManager in Transaction impl
    └── Satisfies: RT-2, B4

[4] Wire Checkpoint into Storage
    ├── Source: src/storage/checkpoint.rs (generated)
    ├── Target: src/storage/mod.rs (existing)
    ├── Action: Add `pub mod checkpoint;`
    ├── Action: Add CheckpointManager to MmapStorage
    └── Satisfies: RT-1, TN1

[5] Wire BatchManager into MemoryManager
    ├── Source: src/memory/batch.rs (generated)
    ├── Target: src/memory/mod.rs (existing)
    ├── Action: Add `pub mod batch;`
    ├── Action: Add BatchManager field to MemoryManager
    └── Satisfies: RT-5, B3

INTEGRATION SUMMARY:
├── Total integration points: 5
├── Auto-wireable: 3 (mod declarations)
├── Manual required: 2 (struct modifications)
└── Estimated changes: ~50 lines

COPY-PASTE COMMANDS:

# Add mod declarations (can be automated)
echo 'pub mod wal;' >> src/storage/mod.rs
echo 'pub mod checkpoint;' >> src/storage/mod.rs
echo 'pub mod mvcc;' >> src/transaction/mod.rs
echo 'pub mod batch;' >> src/memory/mod.rs

# Add feature flag
# Edit Cargo.toml [features] section:
# wal = []

Next: After integration, run /m5-verify to validate
```

## Integration Tracking

Updates manifold with integration status:

```yaml
integration:
  timestamp: <ISO timestamp>
  iteration: 5
  checklist:
    - id: INT-1
      source: "src/storage/wal.rs"
      target: "src/storage/mod.rs"
      action: "Add mod declaration"
      status: pending
      satisfies: [RT-1, T3]
    - id: INT-2
      source: "src/storage/wal.rs"
      target: "Cargo.toml"
      action: "Add feature flag"
      status: pending
      satisfies: [T3]
  summary:
    total_points: 5
    completed: 0
    pending: 5
```

## Auto-Wire Mode

With `--auto-wire`, safe integrations are performed automatically:

**Safe to auto-wire:**
- Module declarations (`pub mod xyz;`)
- Re-exports (`pub use xyz::*;`)
- Simple imports

**Requires manual review:**
- Struct field additions
- Constructor changes
- Trait implementations
- Feature flag additions

## Execution Instructions

1. Read manifold from `.manifold/<feature>.json` (or `.yaml` for legacy)
2. Read generation data to get artifact list
3. For each generated artifact:
   - Detect integration points using pattern matching
   - Identify target files
   - Generate wiring actions
4. Build integration checklist
5. If `--auto-wire`, perform safe integrations
6. **Record iteration** in `iterations[]`
7. Update manifold with integration status
8. Display checklist with copy-paste commands
9. Recommend `/m5-verify` after integration
