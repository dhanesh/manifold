# mermaid-viz

## Outcome

Replace custom ASCII graph renderer across all CLI visualization commands (graph, status, solve, show) with beautiful-mermaid library, add --mermaid export flag, achieving more expressive and visually appealing constraint network diagrams in the terminal.

---

## Constraints

### Business

#### B1: All Visualization Commands Updated

All 4 visualization commands (graph, status, solve, show) must use the new Mermaid-based renderer. No command may be left on the old renderer.

> **Rationale:** Partial migration creates inconsistent user experience and maintenance burden of two rendering paths.

#### B2: Clean Replacement No Legacy Fallback

The old ASCII renderer is fully removed. No --ascii-legacy flag or fallback path exists.

> **Rationale:** User decided against maintaining two renderers. Clean cut reduces code surface and eliminates confusion about which renderer is active.

#### B3: Raw Mermaid Syntax Export

A --mermaid flag on each visualization command outputs raw Mermaid syntax that users can paste into GitHub, Notion, or documentation tools.

> **Rationale:** Mermaid is a widely supported diagram format. Raw export enables integration with external tools without screenshots.

### Technical

#### T1: Bun Runtime Compatibility

The beautiful-mermaid library and all new code must work in Bun runtime. No Node-specific APIs, no DOM dependencies, no browser-only modules.

> **Rationale:** Manifold CLI runs exclusively on Bun. Node-incompatible libraries cause runtime crashes.

#### T2: Single Binary Compilation

`bun build --compile` must continue producing a working single binary with the new dependency included.

> **Rationale:** The CLI distributes as a compiled binary. Dependencies that break compilation block release.

#### T3: Existing Output Formats Unchanged

--json and --dot flags on graph and solve commands must produce identical output to current behavior.

> **Rationale:** Users and scripts may depend on structured output. Breaking JSON or DOT format is a regression.

#### T4: Reuse Existing Solver Data Structures

New Mermaid conversion functions consume existing ConstraintGraph, ExecutionPlan, and whatMustBeTrue() output directly. No modifications to solver computation logic.

> **Rationale:** The solver is well-tested with 315 tests. Changing its data structures risks regressions across the entire test suite.

### User Experience

#### U1: Readable Graph Layout at Scale

Mermaid ASCII rendering must produce readable output for manifolds with up to 20 constraints, tensions, and required truths.

> **Rationale:** Real-world manifolds like manifold-cli have 15+ constraints. Layout must not collapse into unreadable output at this scale.

#### U2: ASCII Flag Produces Terminal-Friendly Output

The --ascii flag continues to produce terminal-renderable output. Semantics change from old box-drawing to Mermaid ASCII, but the output remains suitable for terminal display without external tools.

> **Rationale:** Users expect --ascii to mean "show me something readable in my terminal" regardless of underlying renderer.

### Security

<!-- No security constraints — visualization-only change with no external input or network calls -->

### Operational

#### O1: All Existing Tests Pass

All 315 existing tests across 13 test files must continue passing after the change.

> **Rationale:** Test suite is the primary regression safety net. Any test failure indicates a breaking change.

#### O2: Old Renderer Fully Removed

visualizeGraphAscii() and visualizeExecutionPlan() functions are deleted from solver.ts. exportGraphDot() is preserved.

> **Rationale:** Dead code increases maintenance burden and confuses future contributors about which rendering path is active.

---

## Tensions

### TN1: Clean Replacement vs Readability at Scale

Removing the old grouped-by-type box renderer (B2) means no fallback if beautiful-mermaid struggles with large graph layouts (U1). The old renderer scaled linearly by listing nodes in typed sections; Mermaid flowcharts compute full graph layout which may degrade with 20+ nodes.

> **Resolution:** Use Mermaid subgraphs to group nodes by type (constraints, tensions, required truths, artifacts), preserving the logical grouping of the old renderer. `renderMermaidToTerminal` falls back to raw Mermaid syntax if ASCII rendering fails. Spike test with 20+ nodes validates layout before committing to removal.

### TN2: Bun Runtime as Compilation Prerequisite

T2 (single binary compilation) cannot be verified until T1 (Bun runtime compatibility) is confirmed. If beautiful-mermaid imports Node-specific modules at compile time, both constraints fail together.

> **Resolution:** Step 1 spike test validates both sequentially: first `bun run` (T1), then `bun build --compile` (T2). This catches the dependency early before any code is written against the library.

---

## Required Truths

### RT-1: Library Runs in Bun and Compiles to Binary

beautiful-mermaid's `renderMermaidAscii()` executes successfully in Bun runtime, and `bun build --compile` produces a working single binary with the dependency included.

**Gap:** Unverified. Spike test needed before any code is written against the library.

### RT-2: Conversion Layer Transforms Solver Data to Mermaid Syntax

Functions exist to convert `ConstraintGraph`, `ExecutionPlan`, and `whatMustBeTrue()` output into valid Mermaid flowchart syntax without modifying existing solver data structures.

**Gap:** `cli/lib/mermaid.ts` does not exist yet. No conversion functions implemented.

### RT-3: Mermaid ASCII Output is Readable at Scale

`renderMermaidAscii()` produces readable terminal output for graphs with up to 20 constraints, tensions, and required truths. Subgraph grouping preserves logical structure.

**Gap:** Unknown layout quality at scale. Depends on library behavior with complex flowcharts.

### RT-4: All Commands Support --mermaid Flag

`graph`, `solve`, `status`, and `show` commands each accept `--mermaid` and output raw Mermaid syntax suitable for pasting into GitHub, Notion, or documentation tools.

**Gap:** No --mermaid flag exists on any command currently.

### RT-5: Old Renderer Removed Without Breaking Existing Output

`visualizeGraphAscii()` and `visualizeExecutionPlan()` deleted from `solver.ts`. All imports updated. `--json` and `--dot` output unchanged. `exportGraphDot()` preserved.

**Gap:** Old code still exists in solver.ts lines 849-955. Two commands import and use it.

### RT-6: All Existing Tests Pass

All 315 tests across 13 test files continue passing after the renderer replacement.

**Gap:** Tests haven't been run against new code yet.

---

## Solution Space

### Option A: beautiful-mermaid + Conversion Layer (Recommended)

Install `beautiful-mermaid`, create `cli/lib/mermaid.ts` with conversion functions, update all 4 commands to use Mermaid rendering for `--ascii` and add `--mermaid` for raw export.

- Satisfies: RT-1, RT-2, RT-3, RT-4, RT-5, RT-6
- Gaps: None (with implementation)
- Complexity: Medium

### Option B: Custom Mermaid-to-ASCII Renderer

Write our own Mermaid syntax to ASCII converter instead of using beautiful-mermaid.

- Satisfies: RT-2, RT-4, RT-5, RT-6
- Gaps: RT-1 (no library to validate), RT-3 (unproven layout engine)
- Complexity: Very High

### Option C: Mermaid Syntax Export Only

Add `--mermaid` flag for raw syntax export but skip ASCII rendering entirely. `--ascii` removed.

- Satisfies: RT-4, RT-5, RT-6
- Gaps: RT-3 (no terminal rendering), loses `--ascii` functionality
- Complexity: Low
