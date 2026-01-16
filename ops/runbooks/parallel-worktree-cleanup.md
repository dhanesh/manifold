# Runbook: Parallel Worktree Cleanup

## Overview

This runbook covers procedures for cleaning up git worktrees created by the parallel-agents system when automatic cleanup fails or manual intervention is required.

**Satisfies**: T5 (Worktrees must be cleaned up), S2 (Remove sensitive data)

## Symptoms

- Disk space running low unexpectedly
- `git worktree list` shows stale entries
- `.parallel-worktrees` directory contains old worktrees
- Error messages about existing worktrees when creating new ones

## Diagnosis

### 1. List all worktrees

```bash
git worktree list
```

Expected output shows main worktree plus any active parallel worktrees:
```
/path/to/repo                 abc1234 [main]
/path/to/repo/.parallel-worktrees/task-1  def5678 [parallel/task-1]
```

### 2. Check worktree directory

```bash
ls -la .parallel-worktrees/
```

### 3. Check for orphaned branches

```bash
git branch | grep parallel/
```

## Resolution Procedures

### Standard Cleanup

For each worktree that needs cleanup:

```bash
# Remove worktree
git worktree remove .parallel-worktrees/task-1 --force

# Prune stale references
git worktree prune

# Delete the branch
git branch -D parallel/task-1
```

### Bulk Cleanup

Clean all parallel worktrees at once:

```bash
# Remove all parallel worktrees
for dir in .parallel-worktrees/*/; do
  git worktree remove "$dir" --force 2>/dev/null || rm -rf "$dir"
done

# Prune stale worktree references
git worktree prune

# Delete all parallel branches
git branch | grep 'parallel/' | xargs -r git branch -D
```

### Nuclear Option

If worktrees are corrupted and standard cleanup fails:

```bash
# Force remove directory
rm -rf .parallel-worktrees/

# Prune all stale worktree references
git worktree prune --verbose

# Clean up git internals
git gc --prune=now

# Delete all parallel branches
git for-each-ref --format='%(refname:short)' refs/heads/parallel/ | xargs -r git branch -D
```

## Prevention

### Configure automatic cleanup

In `.parallel.yaml`:
```yaml
cleanupOnComplete: true
cleanupOnFail: true
```

### Monitor disk usage

The ResourceMonitor checks disk space before creating worktrees. If cleanup failures are frequent, consider:

1. Lowering `maxParallel` to reduce concurrent worktrees
2. Increasing `minDiskGB` threshold
3. Setting up disk space alerts

### Regular maintenance

Add to cron or CI:
```bash
# Weekly cleanup of stale parallel artifacts
git worktree prune
git branch | grep 'parallel/' | while read branch; do
  if ! git worktree list | grep -q "$branch"; then
    git branch -D "$branch"
  fi
done
```

## Verification

After cleanup, verify:

1. `git worktree list` shows only main worktree
2. `ls .parallel-worktrees/` is empty or doesn't exist
3. `git branch | grep parallel/` returns nothing
4. Disk space has been recovered

## Related Constraints

- **T5**: Worktrees must be cleaned up after task completion
- **S2**: Worktree cleanup should remove any sensitive data
- **O1**: Maximum concurrent worktrees limited by available resources
- **O4**: Failed parallel task must not corrupt main worktree
