/**
 * Overlap Detector
 * Satisfies: T3 (no file overlap for parallel tasks), B1 (no merge conflicts)
 * Required Truths: RT-2 (Independent tasks can be identified - no file overlap)
 */

import { FilePrediction } from './file-predictor';

export interface OverlapResult {
  hasOverlap: boolean;
  overlappingFiles: string[];
  taskPairs: TaskOverlapPair[];
  safeGroups: SafeGroup[];
}

export interface TaskOverlapPair {
  task1: string;
  task2: string;
  overlappingFiles: string[];
  severity: 'critical' | 'warning' | 'info';
}

export interface SafeGroup {
  id: string;
  taskIds: string[];
  files: string[];
  canRunInParallel: boolean;
}

export interface OverlapAnalysis {
  totalTasks: number;
  parallelizable: number;
  blocked: number;
  overlapMatrix: Map<string, Set<string>>;
  recommendations: string[];
}

/**
 * Detects file overlaps between parallel tasks
 * Satisfies: B1 (Parallel work must not introduce merge conflicts)
 */
export class OverlapDetector {
  /**
   * Detect overlaps between all task file predictions
   * Satisfies: T3 (Tasks modifying the same file cannot be parallelized)
   */
  detect(predictions: FilePrediction[]): OverlapResult {
    const overlapPairs: TaskOverlapPair[] = [];
    const fileToTasks = new Map<string, string[]>();

    // Build file -> tasks mapping
    for (const prediction of predictions) {
      for (const file of prediction.predictedFiles) {
        const existing = fileToTasks.get(file) || [];
        existing.push(prediction.taskId);
        fileToTasks.set(file, existing);
      }
    }

    // Find overlapping files
    const overlappingFiles: string[] = [];
    for (const [file, tasks] of fileToTasks) {
      if (tasks.length > 1) {
        overlappingFiles.push(file);

        // Create pairs for each combination
        for (let i = 0; i < tasks.length; i++) {
          for (let j = i + 1; j < tasks.length; j++) {
            const existingPair = overlapPairs.find(
              p => (p.task1 === tasks[i] && p.task2 === tasks[j]) ||
                   (p.task1 === tasks[j] && p.task2 === tasks[i])
            );

            if (existingPair) {
              existingPair.overlappingFiles.push(file);
            } else {
              overlapPairs.push({
                task1: tasks[i],
                task2: tasks[j],
                overlappingFiles: [file],
                severity: this.assessSeverity(file),
              });
            }
          }
        }
      }
    }

    // Build safe groups (tasks that can run together)
    const safeGroups = this.buildSafeGroups(predictions, overlapPairs);

    return {
      hasOverlap: overlappingFiles.length > 0,
      overlappingFiles,
      taskPairs: overlapPairs,
      safeGroups,
    };
  }

  /**
   * Check if two specific tasks can run in parallel
   * Satisfies: RT-2 (Independent tasks can be identified - no file overlap)
   */
  canRunInParallel(prediction1: FilePrediction, prediction2: FilePrediction): {
    canParallelize: boolean;
    reason?: string;
    overlappingFiles?: string[];
  } {
    const overlapping = this.findOverlap(
      prediction1.predictedFiles,
      prediction2.predictedFiles
    );

    if (overlapping.length === 0) {
      return { canParallelize: true };
    }

    return {
      canParallelize: false,
      reason: `Tasks would modify ${overlapping.length} common file(s)`,
      overlappingFiles: overlapping,
    };
  }

  /**
   * Analyze overlaps and provide recommendations
   */
  analyze(predictions: FilePrediction[]): OverlapAnalysis {
    const result = this.detect(predictions);
    const overlapMatrix = new Map<string, Set<string>>();
    const recommendations: string[] = [];

    // Build overlap matrix
    for (const pair of result.taskPairs) {
      const set1 = overlapMatrix.get(pair.task1) || new Set();
      set1.add(pair.task2);
      overlapMatrix.set(pair.task1, set1);

      const set2 = overlapMatrix.get(pair.task2) || new Set();
      set2.add(pair.task1);
      overlapMatrix.set(pair.task2, set2);
    }

    // Count parallelizable tasks
    const blocked = new Set<string>();
    for (const pair of result.taskPairs) {
      if (pair.severity === 'critical') {
        blocked.add(pair.task1);
        blocked.add(pair.task2);
      }
    }

    const parallelizable = predictions.length - blocked.size;

    // Generate recommendations
    if (result.hasOverlap) {
      recommendations.push(
        'Consider splitting tasks to avoid file overlaps for better parallelization.'
      );

      // Find most conflicting files
      const fileConflictCounts = new Map<string, number>();
      for (const pair of result.taskPairs) {
        for (const file of pair.overlappingFiles) {
          fileConflictCounts.set(file, (fileConflictCounts.get(file) || 0) + 1);
        }
      }

      const topConflicting = Array.from(fileConflictCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topConflicting.length > 0) {
        recommendations.push(
          `Most conflicting files: ${topConflicting.map(([f]) => f).join(', ')}`
        );
      }
    } else {
      recommendations.push('All tasks can be safely parallelized.');
    }

    // Suggest optimal grouping
    if (result.safeGroups.length > 0) {
      const maxGroupSize = Math.max(...result.safeGroups.map(g => g.taskIds.length));
      recommendations.push(
        `Maximum parallel group size: ${maxGroupSize} tasks`
      );
    }

    return {
      totalTasks: predictions.length,
      parallelizable,
      blocked: blocked.size,
      overlapMatrix,
      recommendations,
    };
  }

  /**
   * Build groups of tasks that can safely run together
   */
  private buildSafeGroups(
    predictions: FilePrediction[],
    overlapPairs: TaskOverlapPair[]
  ): SafeGroup[] {
    const groups: SafeGroup[] = [];
    const assigned = new Set<string>();

    // Build conflict graph
    const conflicts = new Map<string, Set<string>>();
    for (const prediction of predictions) {
      conflicts.set(prediction.taskId, new Set());
    }
    for (const pair of overlapPairs) {
      conflicts.get(pair.task1)?.add(pair.task2);
      conflicts.get(pair.task2)?.add(pair.task1);
    }

    // Greedy grouping: assign tasks to groups avoiding conflicts
    let groupId = 0;
    for (const prediction of predictions) {
      if (assigned.has(prediction.taskId)) continue;

      const group: SafeGroup = {
        id: `safe-group-${groupId++}`,
        taskIds: [prediction.taskId],
        files: [...prediction.predictedFiles],
        canRunInParallel: true,
      };

      assigned.add(prediction.taskId);

      // Try to add more tasks to this group
      for (const other of predictions) {
        if (assigned.has(other.taskId)) continue;

        // Check if other conflicts with any task in current group
        const hasConflict = group.taskIds.some(
          taskId => conflicts.get(taskId)?.has(other.taskId)
        );

        if (!hasConflict) {
          group.taskIds.push(other.taskId);
          group.files.push(...other.predictedFiles);
          assigned.add(other.taskId);
        }
      }

      group.files = [...new Set(group.files)];
      groups.push(group);
    }

    return groups;
  }

  /**
   * Find overlapping files between two arrays
   */
  private findOverlap(files1: string[], files2: string[]): string[] {
    const set1 = new Set(files1);
    return files2.filter(f => set1.has(f));
  }

  /**
   * Assess the severity of a file overlap
   */
  private assessSeverity(file: string): 'critical' | 'warning' | 'info' {
    // Critical: source files that are likely to have merge conflicts
    if (file.match(/\.(ts|tsx|js|jsx|py|java|go|rs|rb)$/)) {
      return 'critical';
    }

    // Warning: config and data files
    if (file.match(/\.(json|yaml|yml|toml|xml)$/)) {
      return 'warning';
    }

    // Info: documentation and other files
    return 'info';
  }

  /**
   * Generate a formatted overlap report
   */
  generateReport(predictions: FilePrediction[]): string {
    const result = this.detect(predictions);
    const analysis = this.analyze(predictions);

    const lines = [
      '## File Overlap Analysis',
      '',
      `Total tasks: ${analysis.totalTasks}`,
      `Parallelizable: ${analysis.parallelizable}`,
      `Blocked by overlaps: ${analysis.blocked}`,
      '',
    ];

    if (result.hasOverlap) {
      lines.push('### Overlapping File Pairs');
      lines.push('');

      for (const pair of result.taskPairs) {
        const icon = pair.severity === 'critical' ? '🔴' :
                     pair.severity === 'warning' ? '🟡' : '🟢';
        lines.push(`${icon} ${pair.task1} ↔ ${pair.task2}`);
        lines.push(`   Files: ${pair.overlappingFiles.join(', ')}`);
      }

      lines.push('');
    }

    lines.push('### Safe Parallel Groups');
    lines.push('');

    for (const group of result.safeGroups) {
      lines.push(`- ${group.id}: ${group.taskIds.join(', ')}`);
    }

    lines.push('');
    lines.push('### Recommendations');
    lines.push('');

    for (const rec of analysis.recommendations) {
      lines.push(`- ${rec}`);
    }

    return lines.join('\n');
  }

  /**
   * Check if predictions form a conflict-free set
   * Critical for ensuring B1 (no merge conflicts)
   */
  isConflictFree(predictions: FilePrediction[]): boolean {
    const result = this.detect(predictions);
    return !result.hasOverlap || result.taskPairs.every(p => p.severity !== 'critical');
  }

  /**
   * Get the maximum parallelization possible given overlaps
   */
  getMaxParallelization(predictions: FilePrediction[]): number {
    const result = this.detect(predictions);
    return Math.max(...result.safeGroups.map(g => g.taskIds.length), 1);
  }
}

export default OverlapDetector;
