name: manifold-suggest
description: Analyze current tasks and suggest parallelization opportunities. Examines task descriptions for file overlap and dependency patterns to recommend safe parallel execution groups. Use when planning multi-task work.

# /manifold-suggest

## Purpose
Satisfies: RT-4 (Codex hooks via skills), TN1 (skills-as-hooks pattern)

This skill provides auto-suggestion equivalent to Claude Code's auto-suggester hook.
Since Codex CLI does not have lifecycle hooks, this skill packages the same functionality
as an on-demand capability.

## When to Use
- When you have 2+ tasks that might be parallelizable
- Before executing a multi-task plan from `/m4-generate`
- When planning implementation of multiple artifacts

## Instructions

When the user invokes this skill with a list of tasks (or you detect multiple tasks in the current plan):

1. **Parse task descriptions** to identify:
   - Which files each task is likely to modify
   - Dependencies between tasks (e.g., "implement auth" must precede "add auth tests")
   - Estimated scope (single file, module, cross-cutting)

2. **Detect file overlap** between tasks:
   - Tasks modifying the same files CANNOT run in parallel
   - Tasks in different directories are usually safe to parallelize
   - Test files can often run in parallel with implementation

3. **Form safe parallel groups**:
   - Group tasks that have NO file overlap
   - Identify sequential dependencies that must be preserved
   - Calculate estimated speedup

4. **Output a suggestion** in this format:

```
## Parallelization Analysis

### Safe Parallel Groups
- **Group 1**: Task A, Task B (no file overlap)
- **Group 2**: Task C, Task D (independent modules)

### Sequential (must be ordered)
- Task E → Task F (dependency: E creates files F needs)

### Recommendation
<Parallelize / Sequential / Mixed> — Estimated speedup: <n>x

### Warnings
- <any overlap concerns or low-confidence predictions>
```

### Decision Criteria
| Condition | Recommendation |
|-----------|---------------|
| 2+ tasks, no overlap | Parallelize |
| Some overlap, safe groups exist | Mixed (parallel groups + sequential) |
| All tasks overlap | Sequential |
| Single task | N/A |

If the user hasn't specified tasks, check for a `.manifold/` directory and look at
the current phase to suggest what tasks might be parallelizable in the next phase.
