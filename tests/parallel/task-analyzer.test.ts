/**
 * TaskAnalyzer Tests
 * Validates: B3, T4, T6, RT-1
 */

import { describe, it, expect } from 'bun:test';
import { TaskAnalyzer, Task } from '../../lib/parallel/task-analyzer';

describe('TaskAnalyzer', () => {
  let analyzer: TaskAnalyzer;

  beforeEach(() => {
    analyzer = new TaskAnalyzer();
  });

  describe('parseTaskDescriptions', () => {
    it('should parse simple task descriptions', () => {
      // Validates: RT-1 (task analysis capability)
      const descriptions = [
        'Add login form to auth.ts',
        'Update user model in models/user.ts',
        'Add tests for authentication',
      ];

      const tasks = analyzer.parseTaskDescriptions(descriptions);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].id).toBe('task-1');
      expect(tasks[0].type).toBe('feature');
      expect(tasks[0].estimatedFiles).toContain('auth.ts');
    });

    it('should extract file mentions', () => {
      const descriptions = [
        'Update src/components/Button.tsx and src/styles/button.css',
      ];

      const tasks = analyzer.parseTaskDescriptions(descriptions);

      expect(tasks[0].estimatedFiles).toContain('src/components/Button.tsx');
      expect(tasks[0].estimatedFiles).toContain('src/styles/button.css');
    });

    it('should infer task types', () => {
      const descriptions = [
        'Create new UserService class',       // module
        'Implement dark mode feature',         // feature
        'Update config.json file',             // file
      ];

      const tasks = analyzer.parseTaskDescriptions(descriptions);

      expect(tasks[0].type).toBe('module');
      expect(tasks[1].type).toBe('feature');
      expect(tasks[2].type).toBe('file');
    });

    it('should detect dependency hints', () => {
      const descriptions = [
        'Set up database connection',
        'After task 1, create user table',
        'Add authentication depends on task 2',
      ];

      const tasks = analyzer.parseTaskDescriptions(descriptions);

      expect(tasks[1].dependencies).toContain('task-1');
      expect(tasks[2].dependencies).toContain('task-2');
    });
  });

  describe('analyze', () => {
    it('should identify parallelizable tasks', () => {
      // Validates: B3 (auto-identify parallelization)
      const tasks: Task[] = [
        { id: 'task-1', description: 'Add login', type: 'feature' },
        { id: 'task-2', description: 'Add signup', type: 'feature' },
        { id: 'task-3', description: 'Add logout', type: 'feature' },
      ];

      const result = analyzer.analyze(tasks);

      expect(result.analysis.parallelizableTasks).toBeGreaterThan(0);
      expect(result.parallelGroups.length).toBeGreaterThan(0);
    });

    it('should respect dependencies', () => {
      // Validates: T4 (dependency detection)
      const tasks: Task[] = [
        { id: 'task-1', description: 'Set up database', type: 'feature' },
        { id: 'task-2', description: 'Create tables', type: 'feature', dependencies: ['task-1'] },
        { id: 'task-3', description: 'Add seeds', type: 'feature', dependencies: ['task-2'] },
      ];

      const result = analyzer.analyze(tasks);

      // Sequential tasks should be identified
      expect(result.sequentialTasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate speedup estimate', () => {
      const tasks: Task[] = [
        { id: 'task-1', description: 'Task 1', type: 'feature' },
        { id: 'task-2', description: 'Task 2', type: 'feature' },
        { id: 'task-3', description: 'Task 3', type: 'feature' },
        { id: 'task-4', description: 'Task 4', type: 'feature' },
      ];

      const result = analyzer.analyze(tasks);

      expect(result.analysis.estimatedSpeedup).toBeGreaterThan(1);
    });
  });

  describe('buildGraph', () => {
    it('should build correct dependency graph', () => {
      // Validates: T4 (implicit dependencies)
      const tasks: Task[] = [
        { id: 'A', description: 'A', type: 'feature' },
        { id: 'B', description: 'B', type: 'feature', dependencies: ['A'] },
        { id: 'C', description: 'C', type: 'feature', dependencies: ['A'] },
        { id: 'D', description: 'D', type: 'feature', dependencies: ['B', 'C'] },
      ];

      const graph = analyzer.buildGraph(tasks);

      // A has no dependencies
      expect(graph.nodes.get('A')?.dependencies.size).toBe(0);

      // B and C depend on A
      expect(graph.nodes.get('B')?.dependencies.has('A')).toBe(true);
      expect(graph.nodes.get('C')?.dependencies.has('A')).toBe(true);

      // D depends on B and C
      expect(graph.nodes.get('D')?.dependencies.has('B')).toBe(true);
      expect(graph.nodes.get('D')?.dependencies.has('C')).toBe(true);

      // A has B and C as dependents
      expect(graph.nodes.get('A')?.dependents.has('B')).toBe(true);
      expect(graph.nodes.get('A')?.dependents.has('C')).toBe(true);
    });

    it('should identify parallel levels', () => {
      // Validates: T6 (file and module level parallelization)
      const tasks: Task[] = [
        { id: 'A', description: 'A', type: 'feature' },
        { id: 'B', description: 'B', type: 'feature' },
        { id: 'C', description: 'C', type: 'feature', dependencies: ['A', 'B'] },
      ];

      const graph = analyzer.buildGraph(tasks);

      // A and B should be in the same parallel level
      expect(graph.parallelizable.some(
        level => level.includes('A') && level.includes('B')
      )).toBe(true);
    });
  });

  describe('generateSummary', () => {
    it('should generate readable summary', () => {
      const tasks: Task[] = [
        { id: 'task-1', description: 'Add login', type: 'feature' },
        { id: 'task-2', description: 'Add signup', type: 'feature' },
      ];

      const result = analyzer.analyze(tasks);
      const summary = analyzer.generateSummary(result);

      expect(summary).toContain('Task Analysis Summary');
      expect(summary).toContain('Total tasks: 2');
      expect(summary).toContain('Parallel Groups');
    });
  });
});
