# parallel-agents

## Outcome

Parallelise tasks that can be completed simultaneously using agents and git worktrees, let the framework identify and decide when and how

---

## Context

### Motivation

- Sequential task execution is slow for independent operations
- Agents can work on separate files/modules simultaneously
- Git worktrees provide isolated workspaces without branch switching
- Framework should automatically detect parallelization opportunities

### Prior Art

- Git worktrees for parallel development
- Claude Code Task tool for sub-agent delegation
- Make/Bazel parallel build systems
- CI/CD parallel job execution (GitHub Actions matrix)

### Success Metrics

- Tasks that can be parallelized are automatically detected
- Parallel execution completes faster than sequential
- No merge conflicts from parallel work
- User doesn't need to manually orchestrate parallelization

---

## Constraints

### Business

#### B1: Parallel work must not introduce merge conflicts

Parallel work must not introduce merge conflicts

> **Rationale:** Conflicts would negate the speed benefit and frustrate users

#### B2: Parallel execution should be faster than sequential for eligible tasks

Parallel execution should be faster than sequential for eligible tasks

> **Rationale:** Core value proposition of the feature

#### B3: Framework should automatically identify parallelization opportunities

Framework should automatically identify parallelization opportunities

> **Rationale:** Users shouldn't need to manually analyze task dependencies

#### B4: Parallelization must be opt-in or easily disabled

Parallelization must be opt-in or easily disabled

> **Rationale:** Users need control over their workflow

### Technical

#### T1: Git worktrees must be created from clean branch state

Git worktrees must be created from clean branch state

> **Rationale:** Dirty state would propagate to parallel workers

#### T2: Each parallel agent operates in isolated worktree

Each parallel agent operates in isolated worktree

> **Rationale:** Prevents file system conflicts between agents

#### T3: Tasks modifying the same file cannot be parallelized

Tasks modifying the same file cannot be parallelized

> **Rationale:** Would cause merge conflicts - fundamental git constraint

#### T4: Dependency analysis should detect implicit dependencies

Dependency analysis should detect implicit dependencies

> **Rationale:** Explicit file overlap is obvious; imports/references are subtle

#### T5: Worktrees must be cleaned up after task completion

Worktrees must be cleaned up after task completion

> **Rationale:** Prevents disk space exhaustion and stale state

#### T6: Support both file-level and module-level parallelization

Support both file-level and module-level parallelization

> **Rationale:** Different granularity suits different tasks

#### T7: Main worktree state must remain consistent during parallel execution

Main worktree state must remain consistent during parallel execution

> **Rationale:** User should be able to continue working in main worktree

### User Experience

#### U1: Parallelization should be transparent to the user

Parallelization should be transparent to the user

> **Rationale:** User focuses on the task, not orchestration mechanics

#### U2: Clear progress indication for parallel operations

Clear progress indication for parallel operations

> **Rationale:** User needs visibility into what's happening

#### U3: Results from parallel agents must be merged automatically

Results from parallel agents must be merged automatically

> **Rationale:** Manual merge would defeat the purpose

#### U4: Easy to understand why tasks were/weren't parallelized

Easy to understand why tasks were/weren't parallelized

> **Rationale:** Transparency builds trust in the framework

### Security

#### S1: Parallel agents must not share sensitive context between worktrees

Parallel agents must not share sensitive context between worktrees

> **Rationale:** Isolation prevents information leakage

#### S2: Worktree cleanup should remove any sensitive data

Worktree cleanup should remove any sensitive data

> **Rationale:** No residual secrets left in temporary directories

#### S3: Parallel execution must respect existing permission boundaries

Parallel execution must respect existing permission boundaries

> **Rationale:** Parallelization shouldn't bypass security controls

### Operational

#### O1: Maximum concurrent worktrees limited by available resources

Maximum concurrent worktrees limited by available resources

> **Rationale:** Disk space, memory, and CPU are finite

#### O2: Graceful degradation when resources are constrained

Graceful degradation when resources are constrained

> **Rationale:** Fall back to sequential rather than fail

#### O3: Parallel operations should be monitorable

Parallel operations should be monitorable

> **Rationale:** Debugging and performance tuning require visibility

#### O4: Failed parallel task must not corrupt main worktree

Failed parallel task must not corrupt main worktree

> **Rationale:** Failure isolation is critical for reliability

#### O5: Support cancellation of parallel operations

Support cancellation of parallel operations

> **Rationale:** User may need to abort mid-execution

---

## Tensions

### TN1: Speed vs thoroughness of dependency analysis

Speed vs thoroughness of dependency analysis

> **Resolution:** Use fast file-level analysis by default; deeper AST-based analysis available via --deep flag. Most parallelization wins come from obvious file separation.

### TN2: Transparency (hide complexity) vs visibility (show progress/reasoning)

Transparency (hide complexity) vs visibility (show progress/reasoning)

> **Resolution:** Default to minimal output with progress bar; --verbose shows detailed reasoning. Balance: transparent by default, explainable on demand.

### TN3: Automatic identification vs user control

Automatic identification vs user control

> **Resolution:** Auto-identify and suggest parallelization; user confirms or can set --auto-parallel for fully automatic. Provides both convenience and control.

### TN4: Resource limits constrain maximum parallelism

Resource limits constrain maximum parallelism

> **Resolution:** Dynamic concurrency based on available resources. Measure disk/memory/CPU before spawning worktrees. Default max 4 parallel agents, configurable.

### TN5: File separation (T3) is mechanism to achieve no-conflicts (B1)

File separation (T3) is mechanism to achieve no-conflicts (B1)

> **Resolution:** T3 implementation directly satisfies B1. File overlap detection is the primary conflict prevention mechanism.

### TN6: Clean state (T1) required before creating isolated worktree (T2)

Clean state (T1) required before creating isolated worktree (T2)

> **Resolution:** Worktree creation workflow: check dirty state → stash or abort → create worktree. T1 is prerequisite gate for T2.

### TN7: Worktree cleanup (T5) enables sensitive data removal (S2)

Worktree cleanup (T5) enables sensitive data removal (S2)

> **Resolution:** Cleanup routine includes: git worktree remove + rm -rf worktree directory. Complete deletion satisfies both T5 and S2.

### TN8: Worktree isolation (T2) enables failure isolation (O4)

Worktree isolation (T2) enables failure isolation (O4)

> **Resolution:** Isolated worktrees contain blast radius of failures. Failed agent's worktree is simply removed without affecting main worktree.

### TN9: No conflicts (B1) enables automatic merge (U3)

No conflicts (B1) enables automatic merge (U3)

> **Resolution:** Auto-merge is only possible when B1 is satisfied. Dependency chain: T3 → B1 → U3. If conflict detected, abort and report.

---

## Required Truths

### RT-1: Task graph can be analyzed for parallelization opportunities

Task graph can be analyzed for parallelization opportunities

**Evidence:** lib/parallel/task-analyzer.ts

### RT-2: Independent tasks can be identified (no file overlap)

Independent tasks can be identified (no file overlap)

**Evidence:** lib/parallel/overlap-detector.ts, lib/parallel/file-predictor.ts

### RT-3: Isolated execution environments can be created

Isolated execution environments can be created

**Evidence:** lib/parallel/worktree-manager.ts

### RT-4: Results from parallel agents can be merged automatically

Results from parallel agents can be merged automatically

**Evidence:** lib/parallel/merge-orchestrator.ts

### RT-5: Resource limits are monitored and respected

Resource limits are monitored and respected

**Evidence:** lib/parallel/resource-monitor.ts

### RT-6: User has visibility and control over parallelization

User has visibility and control over parallelization

**Evidence:** lib/parallel/progress-reporter.ts, commands/parallel.ts, hooks/auto-suggester.ts
