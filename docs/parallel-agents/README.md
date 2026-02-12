# Parallel Agents

Parallelise tasks that can be completed simultaneously using agents and git worktrees.

## Overview

The parallel-agents feature enables automatic detection and execution of parallelizable tasks using isolated git worktrees. The framework analyzes task dependencies, predicts file modifications, and executes independent tasks concurrently while ensuring no merge conflicts.

## Quick Start

```bash
# Execute tasks in parallel
/manifold:parallel "Add login form" "Add signup form" "Add password reset"

# Analyze without executing (dry run)
/manifold:parallel "task1" "task2" --dry-run

# Force parallel with custom settings
/manifold:parallel "task1" "task2" --auto-parallel --max-parallel 3
```

## Architecture

### Phase 1: Foundation
- **WorktreeManager**: Creates and manages isolated git worktrees for parallel execution
- **ResourceMonitor**: Monitors system resources (disk, memory, CPU) to determine safe parallelism levels

### Phase 2: Analysis
- **TaskAnalyzer**: Parses task descriptions and builds dependency graphs
- **FilePredictor**: Predicts which files each task will modify using multiple heuristics
- **OverlapDetector**: Identifies file overlaps between tasks to prevent merge conflicts

### Phase 3: Orchestration
- **ParallelExecutor**: Executes tasks in isolated worktrees with progress tracking
- **MergeOrchestrator**: Merges completed work back to main worktree
- **ProgressReporter**: Provides real-time progress updates and explanations

### Phase 4: Integration
- **ParallelCommand**: `/manifold:parallel` slash command implementation
- **AutoSuggester**: Hook that automatically suggests parallelization opportunities
- **ParallelConfig**: Configuration management for parallel execution

## Configuration

Create `.parallel.yaml` in your project root:

```yaml
# Core settings
enabled: true
autoSuggest: true
autoParallel: false  # Requires explicit flag

# Resource limits
maxParallel: 4
maxDiskUsagePercent: 90
maxMemoryUsagePercent: 85
maxCpuLoadPercent: 80

# Execution settings
timeout: 300000  # 5 minutes
cleanupOnComplete: true
cleanupOnFail: true

# Merge settings
mergeStrategy: sequential  # sequential, squash, or rebase
autoPush: false

# Analysis settings
useGitHistory: true
deepAnalysis: false
includeTests: true
```

## Command Reference

### /manifold:parallel

```
/manifold:parallel "task1" "task2" "task3" [options]

OPTIONS:
  --auto-parallel      Enable automatic parallelization
  --max-parallel N     Maximum concurrent tasks (default: 4)
  --verbose, -v        Show detailed output
  --deep               Use deep analysis (slower but more accurate)
  --timeout N          Task timeout in seconds (default: 300)
  --strategy TYPE      Merge strategy: sequential, squash, rebase
  --no-cleanup         Don't cleanup worktrees after completion
  --dry-run            Analyze but don't execute
  --file, -f FILE      Load tasks from YAML file
```

## How It Works

### 1. Task Analysis

When you provide tasks, the system:
1. Parses task descriptions to identify file mentions
2. Infers module and component dependencies
3. Uses git history patterns to predict modifications
4. Builds a dependency graph

### 2. File Prediction

Multiple prediction methods ranked by confidence:
- **Explicit** (95%): Files directly mentioned in task description
- **Pattern** (80%): Glob patterns like "all test files"
- **Module** (70%): Component/service name inference
- **Git History** (60%): Patterns from past commits
- **Heuristic** (50%): Domain-based inference (auth, API, etc.)

### 3. Overlap Detection

Tasks are grouped into safe parallel sets:
- No file overlap = can run in parallel
- File overlap = must run sequentially
- Severity levels: Critical (source), Warning (config), Info (docs)

### 4. Parallel Execution

For each parallelizable group:
1. Check system resources
2. Create isolated git worktree
3. Run agent in worktree with task
4. Track progress and handle failures

### 5. Merge Orchestration

After execution completes:
1. Verify no merge conflicts
2. Merge each completed worktree
3. Cleanup temporary worktrees
4. Report results

## Constraints Addressed

| ID | Constraint | Implementation |
|----|------------|----------------|
| B1 | No merge conflicts | Overlap detection prevents file conflicts |
| B2 | Faster than sequential | Parallel execution with resource-aware concurrency |
| B3 | Auto-identify opportunities | Task analysis and auto-suggestion |
| B4 | Opt-in control | Configuration and explicit flags |
| T1 | Clean branch state | Pre-check before worktree creation |
| T2 | Isolated worktrees | Each task runs in separate worktree |
| T3 | No same-file parallel | Overlap detector enforces |
| T4 | Detect implicit deps | Multiple prediction methods |
| T5 | Cleanup worktrees | Automatic cleanup after completion |
| T7 | Main worktree consistent | Isolated execution doesn't affect main |
| U1 | Transparent operation | Minimal output by default |
| U2 | Progress indication | Real-time progress reporting |
| U3 | Auto-merge results | Merge orchestrator handles |
| U4 | Explain parallelization | Detailed reasoning available |
| O1 | Resource limits | Resource monitor enforces |
| O2 | Graceful degradation | Falls back to sequential |
| O4 | Failure isolation | Worktree isolation contains failures |

## Required Truths Satisfied

| ID | Truth | Status |
|----|-------|--------|
| RT-1 | Task graph analyzable | ✅ TaskAnalyzer |
| RT-2 | Independent tasks identifiable | ✅ OverlapDetector |
| RT-3 | Isolated environments | ✅ WorktreeManager |
| RT-4 | Results mergeable | ✅ MergeOrchestrator |
| RT-5 | Resource limits | ✅ ResourceMonitor |
| RT-6 | User visibility | ✅ ProgressReporter |

## Troubleshooting

### "Cannot create worktree: Uncommitted changes"

The repository must be in a clean state before creating worktrees. Commit or stash your changes first.

### "Maximum worktrees reached"

You've hit the resource limit. Either:
- Wait for current tasks to complete
- Increase `maxParallel` in config (if resources allow)
- Manually cleanup old worktrees: `git worktree list` and `git worktree remove <path>`

### "Resource constraints prevent parallelization"

System resources are low. Check:
- Available disk space (need 2GB+ free)
- Memory usage (should be <85%)
- CPU load (should be <80%)

### Low confidence file predictions

Use `--deep` flag for more thorough analysis, or explicitly specify files in task descriptions.

## API Usage

```typescript
import { runParallel } from './lib/parallel';

const result = await runParallel(process.cwd(), [
  'Add login form',
  'Add signup form',
  'Add password reset',
], {
  maxParallel: 3,
  verbose: true,
  autoMerge: true,
});

if (result.success) {
  console.log(`Parallelized: ${result.parallelized}`);
  console.log(`Results: ${result.results.length}`);
}
```

## See Also

- [Manifold Framework](../../README.md)
- [Constraint Manifold](../../.manifold/parallel-agents.yaml)
- [Anchor Document](../../.manifold/parallel-agents.anchor.yaml)
