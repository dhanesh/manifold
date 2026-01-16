/**
 * Task Analyzer
 * Satisfies: B3 (auto-identify parallelization), T4 (dependency detection), T6 (file/module-level)
 * Required Truths: RT-1 (Task graph can be analyzed for parallelization opportunities)
 */

export interface Task {
  id: string;
  description: string;
  type: 'file' | 'module' | 'feature';
  estimatedFiles?: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskNode {
  task: Task;
  dependencies: Set<string>;
  dependents: Set<string>;
  predictedFiles: Set<string>;
}

export interface TaskGraph {
  nodes: Map<string, TaskNode>;
  parallelizable: string[][];  // Groups that can run in parallel
  sequential: string[];        // Must run sequentially
}

export interface AnalysisResult {
  graph: TaskGraph;
  parallelGroups: ParallelGroup[];
  sequentialTasks: Task[];
  analysis: {
    totalTasks: number;
    parallelizableTasks: number;
    sequentialTasks: number;
    maxParallelism: number;
    estimatedSpeedup: number;
  };
}

export interface ParallelGroup {
  id: string;
  tasks: Task[];
  predictedFiles: string[];
  canRunWith: string[];  // Other group IDs that can run concurrently
}

/**
 * Analyzes tasks and builds a dependency graph
 * Satisfies: RT-1 (Task graph can be analyzed for parallelization opportunities)
 */
export class TaskAnalyzer {
  /**
   * Analyze tasks and identify parallelization opportunities
   * Satisfies: B3 (Framework should automatically identify parallelization opportunities)
   */
  analyze(tasks: Task[]): AnalysisResult {
    const graph = this.buildGraph(tasks);
    const parallelGroups = this.findParallelGroups(graph);
    const sequentialTasks = this.findSequentialTasks(graph);

    const parallelizableTasks = parallelGroups.reduce(
      (sum, group) => sum + group.tasks.length,
      0
    );

    const maxParallelism = Math.max(
      1,
      ...parallelGroups.map(g => g.tasks.length)
    );

    // Estimate speedup: parallel time / sequential time
    const sequentialTime = tasks.length;
    const parallelTime = parallelGroups.length + sequentialTasks.length;
    const estimatedSpeedup = parallelTime > 0 ? sequentialTime / parallelTime : 1;

    return {
      graph,
      parallelGroups,
      sequentialTasks,
      analysis: {
        totalTasks: tasks.length,
        parallelizableTasks,
        sequentialTasks: sequentialTasks.length,
        maxParallelism,
        estimatedSpeedup: Math.round(estimatedSpeedup * 100) / 100,
      },
    };
  }

  /**
   * Build task dependency graph
   * Satisfies: T4 (Dependency analysis should detect implicit dependencies)
   */
  buildGraph(tasks: Task[]): TaskGraph {
    const nodes = new Map<string, TaskNode>();

    // Create nodes
    for (const task of tasks) {
      nodes.set(task.id, {
        task,
        dependencies: new Set(task.dependencies || []),
        dependents: new Set(),
        predictedFiles: new Set(task.estimatedFiles || []),
      });
    }

    // Build reverse dependency (dependent) links
    for (const [id, node] of nodes) {
      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.add(id);
        }
      }
    }

    // Find parallelizable groups and sequential tasks
    const parallelizable = this.identifyParallelizableGroups(nodes);
    const sequential = this.identifySequentialTasks(nodes);

    return { nodes, parallelizable, sequential };
  }

  /**
   * Identify groups of tasks that can run in parallel
   */
  private identifyParallelizableGroups(nodes: Map<string, TaskNode>): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    // Group tasks by their dependency level (topological sort approach)
    const levels = this.topologicalLevels(nodes);

    for (const level of levels) {
      if (level.length > 1) {
        // Multiple tasks at same level can potentially run in parallel
        // (subject to file overlap checking later)
        groups.push(level);
      }
      level.forEach(id => processed.add(id));
    }

    return groups;
  }

  /**
   * Identify tasks that must run sequentially
   */
  private identifySequentialTasks(nodes: Map<string, TaskNode>): string[] {
    const sequential: string[] = [];

    for (const [id, node] of nodes) {
      // Task is sequential if it has both dependencies and dependents
      // (it's in the middle of a chain)
      if (node.dependencies.size > 0 && node.dependents.size > 0) {
        sequential.push(id);
      }
    }

    return sequential;
  }

  /**
   * Perform topological sort and group by levels
   */
  private topologicalLevels(nodes: Map<string, TaskNode>): string[][] {
    const levels: string[][] = [];
    const inDegree = new Map<string, number>();
    const remaining = new Set<string>();

    // Initialize in-degrees
    for (const [id, node] of nodes) {
      inDegree.set(id, node.dependencies.size);
      remaining.add(id);
    }

    while (remaining.size > 0) {
      const level: string[] = [];

      // Find all nodes with no remaining dependencies
      for (const id of remaining) {
        if ((inDegree.get(id) ?? 0) === 0) {
          level.push(id);
        }
      }

      if (level.length === 0) {
        // Circular dependency detected
        console.warn('Circular dependency detected in task graph');
        // Add remaining tasks to final level
        levels.push(Array.from(remaining));
        break;
      }

      // Remove processed nodes and update in-degrees
      for (const id of level) {
        remaining.delete(id);
        const node = nodes.get(id);
        if (node) {
          for (const dependentId of node.dependents) {
            const currentDegree = inDegree.get(dependentId) ?? 0;
            inDegree.set(dependentId, currentDegree - 1);
          }
        }
      }

      levels.push(level);
    }

    return levels;
  }

  /**
   * Find parallel groups with file predictions
   */
  findParallelGroups(graph: TaskGraph): ParallelGroup[] {
    const groups: ParallelGroup[] = [];

    for (let i = 0; i < graph.parallelizable.length; i++) {
      const taskIds = graph.parallelizable[i];
      const tasks = taskIds
        .map(id => graph.nodes.get(id)?.task)
        .filter((t): t is Task => t !== undefined);

      const predictedFiles = taskIds
        .flatMap(id => Array.from(graph.nodes.get(id)?.predictedFiles || []));

      groups.push({
        id: `group-${i}`,
        tasks,
        predictedFiles,
        canRunWith: [], // Will be populated by overlap detector
      });
    }

    return groups;
  }

  /**
   * Find tasks that must run sequentially
   */
  findSequentialTasks(graph: TaskGraph): Task[] {
    return graph.sequential
      .map(id => graph.nodes.get(id)?.task)
      .filter((t): t is Task => t !== undefined);
  }

  /**
   * Parse natural language task descriptions into structured tasks
   * Satisfies: T6 (Support both file-level and module-level parallelization)
   */
  parseTaskDescriptions(descriptions: string[]): Task[] {
    return descriptions.map((desc, index) => {
      const task: Task = {
        id: `task-${index + 1}`,
        description: desc,
        type: this.inferTaskType(desc),
      };

      // Try to extract file mentions
      const fileMatches = desc.match(/[\w\-./]+\.(ts|js|tsx|jsx|json|yaml|yml|md)/gi);
      if (fileMatches) {
        task.estimatedFiles = fileMatches;
      }

      // Try to extract dependency hints
      const dependencyHints = this.extractDependencyHints(desc, index);
      if (dependencyHints.length > 0) {
        task.dependencies = dependencyHints;
      }

      return task;
    });
  }

  /**
   * Infer task type from description
   */
  private inferTaskType(description: string): 'file' | 'module' | 'feature' {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('module') || lowerDesc.includes('component') ||
        lowerDesc.includes('service') || lowerDesc.includes('class')) {
      return 'module';
    }

    if (lowerDesc.includes('feature') || lowerDesc.includes('implement') ||
        lowerDesc.includes('add') || lowerDesc.includes('create')) {
      return 'feature';
    }

    return 'file';
  }

  /**
   * Extract dependency hints from description
   */
  private extractDependencyHints(description: string, currentIndex: number): string[] {
    const hints: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Look for "after", "depends on", "requires" patterns
    const afterMatch = lowerDesc.match(/after\s+task[s]?\s*(\d+)/i);
    if (afterMatch) {
      hints.push(`task-${afterMatch[1]}`);
    }

    const dependsMatch = lowerDesc.match(/depends\s+on\s+task[s]?\s*(\d+)/i);
    if (dependsMatch) {
      hints.push(`task-${dependsMatch[1]}`);
    }

    // Look for "then" indicating sequence
    if (lowerDesc.includes('then') && currentIndex > 0) {
      hints.push(`task-${currentIndex}`);
    }

    return hints;
  }

  /**
   * Generate a summary of the analysis
   */
  generateSummary(result: AnalysisResult): string {
    const { analysis, parallelGroups, sequentialTasks } = result;

    const lines = [
      '## Task Analysis Summary',
      '',
      `Total tasks: ${analysis.totalTasks}`,
      `Parallelizable: ${analysis.parallelizableTasks} (${Math.round(analysis.parallelizableTasks / analysis.totalTasks * 100)}%)`,
      `Sequential: ${analysis.sequentialTasks}`,
      `Maximum parallelism: ${analysis.maxParallelism}`,
      `Estimated speedup: ${analysis.estimatedSpeedup}x`,
      '',
      '### Parallel Groups',
    ];

    for (const group of parallelGroups) {
      lines.push(`- ${group.id}: ${group.tasks.map(t => t.id).join(', ')}`);
      if (group.predictedFiles.length > 0) {
        lines.push(`  Files: ${group.predictedFiles.slice(0, 5).join(', ')}${group.predictedFiles.length > 5 ? '...' : ''}`);
      }
    }

    if (sequentialTasks.length > 0) {
      lines.push('', '### Sequential Tasks');
      for (const task of sequentialTasks) {
        lines.push(`- ${task.id}: ${task.description.slice(0, 50)}...`);
      }
    }

    return lines.join('\n');
  }
}

export default TaskAnalyzer;
