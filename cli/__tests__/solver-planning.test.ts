/**
 * Tests for execution planning + cycle detection in solver/planning.ts
 * Satisfies: T3, T6, RT-4 (correct ordering); regression guard for the
 * base-in-reality audit finding "topological sort omits cycle detection".
 */

import { describe, test, expect } from 'bun:test';
import {
  topologicalSort,
  topologicalSortGraph,
  generateWaves,
  findCriticalPathInGraph,
} from '../lib/solver/planning.js';
import { detectConstraintCycle } from '../lib/solver.js';
import type { ConstraintGraph, ConstraintNode, Manifold } from '../lib/parser.js';

/**
 * Build a minimal ConstraintGraph from {id, depends_on} specs.
 * `blocks` (reverse edges) are derived so critical-path tests work.
 */
function mkGraph(specs: Array<{ id: string; depends_on?: string[] }>): ConstraintGraph {
  const nodes: Record<string, ConstraintNode> = {};
  for (const s of specs) {
    nodes[s.id] = {
      id: s.id,
      type: 'constraint',
      label: s.id,
      depends_on: s.depends_on ?? [],
      blocks: [],
      conflicts_with: [],
      status: 'REQUIRED',
      critical_path: false,
    };
  }
  // Derive reverse edges: if X depends_on Y, then Y blocks X.
  for (const s of specs) {
    for (const dep of s.depends_on ?? []) {
      if (nodes[dep] && !nodes[dep].blocks.includes(s.id)) nodes[dep].blocks.push(s.id);
    }
  }
  return {
    version: 1,
    generated_at: '2026-01-01T00:00:00.000Z',
    feature: 'test',
    nodes,
    edges: { dependencies: [], conflicts: [], satisfies: [] },
  };
}

describe('topologicalSort — acyclic', () => {
  test('orders dependencies before dependents', () => {
    // C depends on B depends on A  =>  A before B before C
    const g = mkGraph([{ id: 'A' }, { id: 'B', depends_on: ['A'] }, { id: 'C', depends_on: ['B'] }]);
    const { order, hasCycle, cycleNodes } = topologicalSort(g);

    expect(hasCycle).toBe(false);
    expect(cycleNodes).toHaveLength(0);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
  });

  test('a cross/forward edge to a fully-explored node is NOT a cycle', () => {
    // Diamond: D->B->A, D->C->A. A is revisited (BLACK) but there is no cycle.
    const g = mkGraph([
      { id: 'A' },
      { id: 'B', depends_on: ['A'] },
      { id: 'C', depends_on: ['A'] },
      { id: 'D', depends_on: ['B', 'C'] },
    ]);
    expect(topologicalSort(g).hasCycle).toBe(false);
  });

  test('back-compat wrapper returns the order array', () => {
    const g = mkGraph([{ id: 'A' }, { id: 'B', depends_on: ['A'] }]);
    expect(topologicalSortGraph(g)).toEqual(topologicalSort(g).order);
  });
});

describe('topologicalSort — cyclic (the regression this fix targets)', () => {
  test('detects a 2-node back edge instead of silently ordering it', () => {
    // A <-> B
    const g = mkGraph([{ id: 'A', depends_on: ['B'] }, { id: 'B', depends_on: ['A'] }]);
    const { hasCycle, cycleNodes } = topologicalSort(g);

    expect(hasCycle).toBe(true);
    expect(cycleNodes.sort()).toEqual(['A', 'B']);
  });

  test('detects a longer cycle and still returns every node in order', () => {
    // A->B->C->A
    const g = mkGraph([
      { id: 'A', depends_on: ['C'] },
      { id: 'B', depends_on: ['A'] },
      { id: 'C', depends_on: ['B'] },
    ]);
    const { order, hasCycle, cycleNodes } = topologicalSort(g);

    expect(hasCycle).toBe(true);
    expect(cycleNodes.sort()).toEqual(['A', 'B', 'C']);
    expect(order.sort()).toEqual(['A', 'B', 'C']); // best-effort: no node dropped
  });
});

describe('generateWaves — cycle handling', () => {
  test('clean DAG produces ordered, untagged waves', () => {
    const g = mkGraph([{ id: 'A' }, { id: 'B', depends_on: ['A'] }]);
    const waves = generateWaves(g);

    expect(waves.every((w) => !w.cycle_broken)).toBe(true);
    const aWave = waves.find((w) => w.parallel_tasks.some((t) => t.node_ids.includes('A')))!;
    const bWave = waves.find((w) => w.parallel_tasks.some((t) => t.node_ids.includes('B')))!;
    expect(aWave.number).toBeLessThan(bWave.number);
  });

  test('tags the wave that force-schedules a node to break a cycle', () => {
    const g = mkGraph([{ id: 'A', depends_on: ['B'] }, { id: 'B', depends_on: ['A'] }]);
    const waves = generateWaves(g);

    const broken = waves.find((w) => w.cycle_broken);
    expect(broken).toBeDefined();
    expect(['A', 'B']).toContain(broken!.cycle_broken_node!);
    // Every node is still scheduled exactly once.
    const scheduled = waves.flatMap((w) => w.parallel_tasks.flatMap((t) => t.node_ids)).sort();
    expect(scheduled).toEqual(['A', 'B']);
  });

  test('cycle break is deterministic — fewest unresolved deps wins', () => {
    // Cycle A<->B, plus C depends on both. A and B each have 1 unresolved dep
    // inside the cycle; tie broken by id => 'A' chosen first, reproducibly.
    const g = mkGraph([
      { id: 'A', depends_on: ['B'] },
      { id: 'B', depends_on: ['A'] },
      { id: 'C', depends_on: ['A', 'B'] },
    ]);
    expect(generateWaves(g).find((w) => w.cycle_broken)!.cycle_broken_node).toBe('A');
  });
});

describe('findCriticalPathInGraph', () => {
  test('returns the longest dependency chain on a DAG', () => {
    const g = mkGraph([{ id: 'A' }, { id: 'B', depends_on: ['A'] }, { id: 'C', depends_on: ['B'] }]);
    expect(findCriticalPathInGraph(g)).toEqual(['A', 'B', 'C']);
  });

  test('degrades gracefully (no throw) on a cyclic graph', () => {
    const g = mkGraph([{ id: 'A', depends_on: ['B'] }, { id: 'B', depends_on: ['A'] }]);
    expect(() => findCriticalPathInGraph(g)).not.toThrow();
  });
});

describe('detectConstraintCycle — shared by validate & doctor', () => {
  test('flags a cyclic depends_on chain among constraints', () => {
    const manifold: Manifold = {
      feature: 'cyclic',
      phase: 'CONSTRAINED',
      constraints: {
        business: [
          { id: 'B1', type: 'invariant', statement: 'one', depends_on: ['B2'] },
          { id: 'B2', type: 'invariant', statement: 'two', depends_on: ['B1'] },
        ],
      },
    };
    const { hasCycle, cycleNodes } = detectConstraintCycle(manifold);
    expect(hasCycle).toBe(true);
    expect(cycleNodes.sort()).toEqual(['B1', 'B2']);
  });

  test('passes a clean acyclic manifold', () => {
    const manifold: Manifold = {
      feature: 'clean',
      phase: 'CONSTRAINED',
      constraints: {
        business: [
          { id: 'B1', type: 'invariant', statement: 'one' },
          { id: 'B2', type: 'goal', statement: 'two', depends_on: ['B1'] },
        ],
      },
    };
    expect(detectConstraintCycle(manifold).hasCycle).toBe(false);
  });
});
