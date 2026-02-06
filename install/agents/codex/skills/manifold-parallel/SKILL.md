---
name: manifold-parallel
description: "Execute tasks in parallel using git worktrees. Analyzes dependencies and file overlaps to safely parallelize independent tasks."
---

# /parallel

# /parallel - Parallel Task Execution

Execute multiple tasks in parallel using isolated git worktrees.

## Usage

```
/parallel "task1" "task2" "task3" [options]
```

## Options

| Flag | Description |
|------|-------------|
| `--auto-parallel` | Enable automatic parallelization without confirmation |
| `--max-parallel N` | Maximum concurrent tasks (default: 4) |
| `--verbose, -v` | Show detailed output |
| `--deep` | Use deep analysis (slower but more accurate) |
| `--timeout N` | Task timeout in seconds (default: 300) |
| `--strategy TYPE` | Merge strategy: sequential, squash, rebase |
| `--no-cleanup` | Don't cleanup worktrees after completion |
| `--dry-run` | Analyze but don't execute |
| `--file, -f FILE` | Load tasks from YAML file |

## Process

1. **Task Analysis** - Parse task descriptions and identify file mentions
2. **File Prediction** - Predict which files each task will modify using:
   - Explicit mentions (95% confidence)
   - Pattern matching (80% confidence)
   - Module inference (70% confidence)
   - Git history (60% confidence)
   - Heuristics (50% confidence)
3. **Overlap Detection** - Identify file conflicts between tasks
4. **Group Formation** - Form safe parallel groups (no file overlap)
5. **Resource Check** - Verify disk, memory, CPU capacity
6. **Parallel Execution** - Create isolated worktrees and execute concurrently
7. **Merge** - Automatically merge results to main worktree
8. **Cleanup** - Remove temporary worktrees

## Example

```
User: /parallel "Add login form" "Add signup form" "Add password reset" --dry-run

Response:
🔄 Analyzing tasks for parallelization...

PARALLELIZATION ANALYSIS
────────────────────────
Recommendation: ✅ PARALLELIZE (85% confidence)

Safe Parallel Groups:
  Group 1: [Add login form, Add signup form]
    └─ No file overlap detected
  Group 2: [Add password reset]
    └─ Overlaps with Group 1 on src/auth/utils.ts

Sequential Tasks: None

Estimated Speedup: 1.8x (2 parallel + 1 sequential)

ℹ️  Dry run mode - no execution performed
```

## Configuration

Create `.parallel.yaml` in project root:

```yaml
enabled: true
autoSuggest: true
autoParallel: false
maxParallel: 4
maxDiskUsagePercent: 90
maxMemoryUsagePercent: 85
maxCpuLoadPercent: 80
timeout: 300000
cleanupOnComplete: true
mergeStrategy: sequential
```

## Constraints Satisfied

| Constraint | Description | Implementation |
|------------|-------------|----------------|
| B1 | No merge conflicts | Overlap detection prevents file conflicts |
| B2 | Faster than sequential | Parallel execution with resource-aware concurrency |
| B3 | Auto-identify opportunities | Task analysis and file prediction |
| B4 | Opt-in control | Configuration and explicit flags |
| T1 | Clean branch state | Pre-check before worktree creation |
| T2 | Isolated worktrees | Each task runs in separate worktree |
| T3 | No same-file parallel | Overlap detector enforces |

## Execution Instructions

When this command is invoked:

1. Parse task descriptions from arguments
2. Load configuration from `.parallel.yaml` if present
3. Analyze tasks for dependencies and predict file modifications
4. Detect overlaps and form safe parallel groups
5. Check system resources (disk, memory, CPU)
6. If `--dry-run`, display analysis and exit
7. Create isolated git worktrees for each parallel task
8. Execute tasks concurrently using Claude Code agents
9. Merge completed worktrees back to main branch
10. Cleanup temporary worktrees unless `--no-cleanup`
11. Report results with timing and any failures

## Requirements

- Git repository in clean state (no uncommitted changes)
- Sufficient disk space for worktrees (~500MB per worktree)
- Claude Code agent capabilities for task execution

## Related Commands

- `/m0-init` - Initialize a constraint manifold
- `/m-status` - Show current manifold state

## See Also

- [Parallel Agents Documentation](../../docs/parallel-agents/README.md)
- [Constraint Manifold](../../.manifold/parallel-agents.yaml)
