/**
 * Graph synthesis behaviour — derive edges from manifold JSON, especially
 * when constraint_graph is empty (legacy v1/v2 manifolds).
 *
 * @constraint T5 — multi-schema tolerance v1/v2/v3
 * @constraint U1 — visual representation of relations
 * @constraint RT-5 — synthesis when constraint_graph is empty
 */

import { describe, test, expect } from 'bun:test';
import { synthesiseGraph } from '../../cli/lib/graph-synthesis.js';

describe('synthesiseGraph', () => {
  test('produces nodes for constraints across categories (RT-5)', () => {
    const graph = synthesiseGraph({
      schema_version: 3,
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
        user_experience: [],
        security: [{ id: 'S1', type: 'invariant' }],
        operational: [],
      },
    });
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['B1', 'S1', 'T1']);
    expect(graph.nodes.find((n) => n.id === 'B1')?.kind).toBe('constraint');
  });

  test('synthesises conflict edges from tension between[] when constraint_graph is empty', () => {
    const graph = synthesiseGraph({
      schema_version: 1,
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
        user_experience: [],
        security: [],
        operational: [],
      },
      tensions: [{ id: 'TN1', type: 'trade_off', between: ['B1', 'T1'] }],
    });

    expect(graph.source).toBe('synthesised');
    const edges = graph.edges.filter((e) => e.kind === 'conflict');
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.origin === 'synthesised')).toBe(true);
    const involves = new Set(edges.flatMap((e) => [e.source, e.target]));
    expect(involves).toContain('TN1');
    expect(involves).toContain('B1');
    expect(involves).toContain('T1');
  });

  test('uses native constraint_graph edges when present', () => {
    const graph = synthesiseGraph({
      schema_version: 3,
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
        user_experience: [],
        security: [],
        operational: [],
      },
      tensions: [],
      constraint_graph: {
        edges: {
          dependencies: [{ from: 'T1', to: 'B1' }],
          conflicts: [],
          satisfies: [],
        },
      },
    });

    expect(graph.source).toBe('native');
    const dep = graph.edges.find((e) => e.kind === 'dependency');
    expect(dep?.source).toBe('T1');
    expect(dep?.target).toBe('B1');
    expect(dep?.origin).toBe('native');
  });

  test('mixes native and synthesised edges and reports source=mixed', () => {
    const graph = synthesiseGraph({
      schema_version: 3,
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
        user_experience: [],
        security: [],
        operational: [],
      },
      tensions: [{ id: 'TN1', type: 'trade_off', between: ['B1', 'T1'] }],
      constraint_graph: {
        edges: {
          dependencies: [{ from: 'T1', to: 'B1' }],
          conflicts: [],
          satisfies: [],
        },
      },
    });

    expect(graph.source).toBe('mixed');
  });

  test('tolerates missing constraint_graph and missing v3-only fields (T5)', () => {
    const graph = synthesiseGraph({
      schema_version: 1,
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [],
        user_experience: [],
        security: [],
        operational: [],
      },
    });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
    expect(graph.source).toBe('synthesised');
  });

  test('drops edges that point at unknown nodes (S3 robustness)', () => {
    const graph = synthesiseGraph({
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [],
        user_experience: [],
        security: [],
        operational: [],
      },
      tensions: [{ id: 'TN1', type: 'trade_off', between: ['B1', 'T999'] }],
    });
    const orphan = graph.edges.filter((e) => e.target === 'T999' || e.source === 'T999');
    expect(orphan).toHaveLength(0);
  });
});
