# Runbook: Parallel Resource Exhaustion

## Overview

This runbook covers recovery procedures when parallel execution exhausts system resources (disk, memory, CPU), causing task failures or system instability.

**Satisfies**: O1 (Resource limits), O2 (Graceful degradation), RT-5 (Resource monitoring)

## Symptoms

- "Resource constraints prevent parallelization" error
- Tasks failing with timeout or OOM errors
- System becoming unresponsive during parallel execution
- Disk full errors when creating worktrees
- High CPU load affecting other processes

## Diagnosis

### 1. Check current resources

```bash
# Disk
df -h .

# Memory
free -h  # Linux
vm_stat  # macOS

# CPU
uptime  # Load average
top -l 1 | head -10  # macOS
top -bn1 | head -10  # Linux
```

### 2. Check worktree disk usage

```bash
du -sh .parallel-worktrees/*/
```

### 3. Check parallel processes

```bash
ps aux | grep -E 'claude|parallel|worktree'
```

### 4. Review resource monitor output

The ResourceMonitor logs thresholds. Check:
- `disk.usedPercent` > 90%
- `memory.usedPercent` > 85%
- `cpu.loadPercent` > 80%

## Resolution Procedures

### Immediate: Stop Parallel Execution

```bash
# If parallel command is running, cancel it
# Ctrl+C or:
pkill -f "parallel"

# Kill any orphaned agent processes
pkill -f "claude-code.*PARALLEL_TASK_ID"
```

### Recover Disk Space

```bash
# Remove parallel worktrees
rm -rf .parallel-worktrees/

# Prune git references
git worktree prune
git gc --prune=now

# Check for large files
find . -type f -size +100M -exec ls -lh {} \;

# Clean node_modules in worktrees (if applicable)
find .parallel-worktrees -name "node_modules" -type d -exec rm -rf {} +
```

### Recover Memory

```bash
# Kill memory-heavy processes
pkill -f "node.*parallel"

# If swap is exhausted, restart may be needed
# Check swap usage:
swapon --show  # Linux
sysctl vm.swapusage  # macOS
```

### Reduce Parallelism

Update `.parallel.yaml`:
```yaml
maxParallel: 2  # Reduce from 4
maxMemoryUsagePercent: 75  # More conservative
maxDiskUsagePercent: 80
maxCpuLoadPercent: 70
```

### Use Smaller Worktrees

If repo is large:
```bash
# Use sparse checkout for worktrees (if supported)
# Or reduce worktree size estimate in config
worktreeSizeEstimateMB: 1000  # Increase estimate to be conservative
```

## Root Cause Analysis

### Why did resource monitoring fail to prevent this?

1. **Burst resource usage**: Tasks consumed resources faster than monitoring interval
   - Solution: Reduce monitoring interval, add per-task resource limits

2. **Inaccurate estimates**: Worktree size or agent memory was underestimated
   - Solution: Increase `worktreeSizeEstimateMB`, add memory per agent estimate

3. **External resource pressure**: Other processes consumed resources after check
   - Solution: More conservative thresholds, real-time monitoring

4. **Cascading failures**: One task's failure triggered others
   - Solution: Better failure isolation, circuit breaker pattern

### Update resource thresholds

Based on observed actual usage, adjust:

```yaml
# More conservative thresholds
maxDiskUsagePercent: 75      # Was 90
maxMemoryUsagePercent: 70    # Was 85
maxCpuLoadPercent: 60        # Was 80
worktreeSizeEstimateMB: 1000 # Was 500
```

## Prevention

### Set up monitoring alerts

```bash
# Add to cron for continuous monitoring
*/5 * * * * df -h . | awk 'NR==2 {if ($5+0 > 80) print "Disk warning: "$5}'
```

### Configure auto-degradation

The system should automatically reduce parallelism when resources are constrained. Verify this is working:

1. Check that fallback to sequential happens when needed
2. Verify resource checks run before each worktree creation
3. Ensure warnings are displayed to user

### Resource budgets

Calculate safe parallelism for your system:

```
Available disk / worktree size = max worktrees
Available memory / agent memory = max agents
(100 - CPU load) / 25 = additional parallel tasks
```

Take the minimum of these as your `maxParallel`.

## Verification

After recovery:

1. `df -h .` shows adequate free space (>10%)
2. `free -h` shows adequate free memory (>1GB)
3. `uptime` shows reasonable load (<cores)
4. No stale parallel processes running
5. Parallel command can start again successfully

## Related Constraints

- **O1**: Maximum concurrent worktrees limited by available resources
- **O2**: Graceful degradation when resources are constrained
- **O4**: Failed parallel task must not corrupt main worktree
- **RT-5**: Resource limits are monitored and respected
