# Runbook: Parallel Merge Conflicts

## Overview

This runbook covers recovery procedures when parallel task merges fail due to conflicts, despite overlap detection. This indicates a gap in file prediction that should be investigated.

**Satisfies**: B1 (No merge conflicts), O4 (Failure isolation)

## Symptoms

- Merge orchestrator reports failed merges
- `git status` shows conflict markers
- Error: "Merge would result in conflicts"
- Tasks completed but results not merged

## Diagnosis

### 1. Check merge status

```bash
git status
```

Look for:
```
Unmerged paths:
  both modified:   src/shared/utils.ts
```

### 2. Identify conflicting branches

```bash
git branch | grep parallel/
git log --oneline --graph --all | head -20
```

### 3. Review overlap detection logs

Check the parallel execution output for warnings about:
- Low confidence file predictions
- Heuristic-based predictions that may have missed files

## Resolution Procedures

### Abort and Retry

If merge is in progress:

```bash
# Abort current merge
git merge --abort

# Reset to clean state
git reset --hard HEAD
```

### Manual Merge

If you want to keep the changes:

```bash
# For each conflicting file
git checkout --theirs src/shared/utils.ts  # Keep parallel branch version
# OR
git checkout --ours src/shared/utils.ts    # Keep main version
# OR
# Manually edit to resolve conflicts

# After resolving
git add src/shared/utils.ts
git commit -m "Resolve parallel merge conflict"
```

### Cherry-pick Instead

If merge is too complex:

```bash
# Get the commit from parallel branch
git log parallel/task-1 --oneline -5

# Cherry-pick specific commits
git cherry-pick <commit-hash>
```

### Rollback Parallel Changes

If parallel work should be discarded:

```bash
# Remove the parallel worktree
git worktree remove .parallel-worktrees/task-1 --force

# Delete the branch
git branch -D parallel/task-1

# Cleanup
git worktree prune
```

## Root Cause Analysis

### Why did overlap detection miss this?

1. **Low confidence prediction**: File wasn't explicitly mentioned and heuristics missed it
   - Solution: Use `--deep` flag or explicitly mention files in task description

2. **Dynamic file generation**: Task created new files that weren't predicted
   - Solution: Improve heuristics or warn about generated files

3. **Shared imports**: Both tasks modified files that import a shared module
   - Solution: Include import analysis in prediction

4. **Race condition**: File was modified after prediction but before execution
   - Solution: Re-validate predictions before merge

### Record the gap

Update the overlap detector with the missed pattern:

```typescript
// In file-predictor.ts, add pattern
if (lowerDesc.includes('shared') || lowerDesc.includes('common')) {
  files.push(...this.findFilesByPattern('**/shared/**/*'));
  files.push(...this.findFilesByPattern('**/common/**/*'));
}
```

## Prevention

### Improve prediction accuracy

1. Add more explicit file mentions in task descriptions
2. Use `--deep` flag for thorough analysis
3. Review and approve parallelization suggestions before execution

### Add safety checks

In `.parallel.yaml`:
```yaml
# Require higher confidence for parallelization
minConfidence: 0.8

# Always dry-run first
dryRunByDefault: true
```

### Pre-merge validation

The MergeOrchestrator already does dry-run merges. If conflicts are still occurring:

```bash
# Manual dry-run before parallel execution
git merge --no-commit --no-ff parallel/task-1
git merge --abort
```

## Verification

After resolution:

1. `git status` shows clean working directory
2. All intended changes are present
3. Tests pass
4. No stale parallel branches remain

## Related Constraints

- **B1**: Parallel work must not introduce merge conflicts
- **T3**: Tasks modifying the same file cannot be parallelized
- **RT-2**: Independent tasks can be identified (no file overlap)
- **O4**: Failed parallel task must not corrupt main worktree
