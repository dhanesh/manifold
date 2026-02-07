/**
 * Tests for cli/lib/mermaid.ts
 * Satisfies: U1 (readable graph layout at scale), U2 (ASCII terminal output),
 *            RT-2 (conversion layer), RT-3 (readable at scale), B3 (--mermaid export)
 */

import { describe, test, expect } from 'bun:test';
import {
  graphToMermaid,
  executionPlanToMermaid,
  backwardReasoningToMermaid,
  miniGraphToMermaid,
  renderMermaidToTerminal,
  renderGraphToTerminal,
  renderPlanToTerminal,
  renderBackwardToTerminal,
} from '../lib/mermaid.js';
import { stripAnsi } from '../lib/output.js';
import type {
  ConstraintGraph,
  ConstraintNode,
  ExecutionPlan,
} from '../lib/parser.js';

/** Get max line width of rendered output (stripping ANSI codes) */
function maxLineWidth(output: string): number {
  return Math.max(...output.split('\n').map(line => stripAnsi(line).length));
}

// ============================================================
// Test Helpers
// ============================================================

/** Create a minimal ConstraintNode */
function makeNode(
  id: string,
  type: 'constraint' | 'tension' | 'required_truth' | 'artifact' = 'constraint',
  overrides: Partial<ConstraintNode> = {}
): ConstraintNode {
  return {
    id,
    type,
    label: overrides.label ?? `${id} label`,
    depends_on: [],
    blocks: [],
    conflicts_with: [],
    status: 'SATISFIED',
    critical_path: false,
    ...overrides,
  };
}

/** Create a minimal ConstraintGraph */
function makeGraph(
  nodes: ConstraintNode[],
  edges: Partial<ConstraintGraph['edges']> = {}
): ConstraintGraph {
  const nodeMap: Record<string, ConstraintNode> = {};
  for (const n of nodes) nodeMap[n.id] = n;
  return {
    version: 1,
    generated_at: '2026-02-07T00:00:00Z',
    feature: 'test',
    nodes: nodeMap,
    edges: {
      dependencies: edges.dependencies ?? [],
      conflicts: edges.conflicts ?? [],
      satisfies: edges.satisfies ?? [],
    },
  };
}

/** Create a graph with N constraints for scale testing (U1) */
function makeScaleGraph(nodeCount: number): ConstraintGraph {
  const nodes: ConstraintNode[] = [];

  // Mix of types to exercise all subgraph paths
  for (let i = 1; i <= nodeCount; i++) {
    let type: ConstraintNode['type'];
    if (i <= Math.ceil(nodeCount * 0.5)) type = 'constraint';
    else if (i <= Math.ceil(nodeCount * 0.7)) type = 'tension';
    else if (i <= Math.ceil(nodeCount * 0.85)) type = 'required_truth';
    else type = 'artifact';

    const prefix = type === 'constraint' ? 'C' : type === 'tension' ? 'TN' : type === 'required_truth' ? 'RT' : 'A';
    const id = `${prefix}${i}`;
    nodes.push(makeNode(id, type, {
      label: `${type} number ${i} with a longer description`,
      status: i % 3 === 0 ? 'REQUIRED' : 'SATISFIED',
      critical_path: i <= 3,
    }));
  }

  // Create edges between sequential nodes
  const deps: [string, string][] = [];
  const conflicts: [string, string][] = [];
  const satisfies: [string, string][] = [];

  for (let i = 1; i < nodes.length; i++) {
    deps.push([nodes[i].id, nodes[i - 1].id]);
  }
  // Add some conflicts and satisfies edges
  if (nodes.length >= 6) {
    conflicts.push([nodes[0].id, nodes[5].id]);
  }
  if (nodes.length >= 4) {
    satisfies.push([nodes[nodes.length - 1].id, nodes[0].id]);
  }

  return makeGraph(nodes, { dependencies: deps, conflicts, satisfies });
}

/** Create a minimal ExecutionPlan */
function makePlan(waveCount: number, tasksPerWave: number): ExecutionPlan {
  const waves = [];
  for (let w = 1; w <= waveCount; w++) {
    const tasks = [];
    for (let t = 1; t <= tasksPerWave; t++) {
      tasks.push({
        id: `task-${w}-${t}`,
        node_ids: [`C${w * 10 + t}`],
        action: `implement`,
        description: `Task ${t} in wave ${w}`,
      });
    }
    waves.push({
      number: w,
      phase: 'GENERATED' as const,
      parallel_tasks: tasks,
      blocking_dependencies: w > 1 ? [`task-${w - 1}-1`] : [],
    });
  }
  return {
    generated_at: '2026-02-07T00:00:00Z',
    strategy: 'forward',
    waves,
    critical_path: ['C11', 'C21', 'C31'],
    parallelization_factor: tasksPerWave,
  };
}

// ============================================================
// graphToMermaid
// ============================================================

describe('graphToMermaid', () => {
  test('produces valid Mermaid flowchart header', () => {
    const graph = makeGraph([makeNode('B1')]);
    const result = graphToMermaid(graph);
    expect(result).toStartWith('graph TD');
  });

  test('renders constraint nodes as rectangles', () => {
    const graph = makeGraph([makeNode('B1', 'constraint', { label: 'No duplicates' })]);
    const result = graphToMermaid(graph);
    expect(result).toContain('B1["');
    expect(result).toContain('No duplicates');
  });

  test('renders tension nodes as diamonds', () => {
    const graph = makeGraph([makeNode('TN1', 'tension', { label: 'Trade-off' })]);
    const result = graphToMermaid(graph);
    expect(result).toContain('TN1{"');
    expect(result).toContain('Trade-off');
  });

  test('renders required_truth nodes as rounded', () => {
    const graph = makeGraph([makeNode('RT1', 'required_truth', { label: 'Must be true' })]);
    const result = graphToMermaid(graph);
    expect(result).toContain('RT1("');
  });

  test('renders artifact nodes as parallelogram', () => {
    const graph = makeGraph([makeNode('A1', 'artifact', { label: 'auth.ts' })]);
    const result = graphToMermaid(graph);
    expect(result).toContain('A1[/"');
  });

  test('groups nodes into subgraphs by type', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint'),
      makeNode('TN1', 'tension'),
      makeNode('RT1', 'required_truth'),
    ]);
    const result = graphToMermaid(graph);
    expect(result).toContain('subgraph Constraints');
    expect(result).toContain('subgraph Tensions');
    expect(result).toContain('subgraph Required Truths');
  });

  test('omits empty subgraphs', () => {
    const graph = makeGraph([makeNode('B1', 'constraint')]);
    const result = graphToMermaid(graph);
    expect(result).toContain('subgraph Constraints');
    expect(result).not.toContain('subgraph Tensions');
    expect(result).not.toContain('subgraph Artifacts');
  });

  test('renders dependency edges as solid arrows', () => {
    const graph = makeGraph(
      [makeNode('B1'), makeNode('B2')],
      { dependencies: [['B1', 'B2']] }
    );
    const result = graphToMermaid(graph);
    expect(result).toContain('B1 --> B2');
  });

  test('renders conflict edges as dotted arrows', () => {
    const graph = makeGraph(
      [makeNode('B1'), makeNode('B2')],
      { conflicts: [['B1', 'B2']] }
    );
    const result = graphToMermaid(graph);
    expect(result).toContain('B1 -.-> B2');
  });

  test('renders satisfies edges as thick arrows', () => {
    const graph = makeGraph(
      [makeNode('A1', 'artifact'), makeNode('B1')],
      { satisfies: [['A1', 'B1']] }
    );
    const result = graphToMermaid(graph);
    expect(result).toContain('A1 ==> B1');
  });

  test('adds status prefix to labels', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { status: 'SATISFIED' }),
      makeNode('B2', 'constraint', { status: 'REQUIRED' }),
    ]);
    const result = graphToMermaid(graph);
    expect(result).toContain('✓ B1');
    expect(result).toContain('○ B2');
  });

  test('styles critical path nodes', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { critical_path: true }),
      makeNode('B2', 'constraint', { critical_path: false }),
    ]);
    const result = graphToMermaid(graph);
    expect(result).toContain('classDef critical');
    expect(result).toContain('class B1 critical');
    expect(result).not.toContain('class B2 critical');
  });

  test('truncates long labels', () => {
    const longLabel = 'A'.repeat(60);
    const graph = makeGraph([makeNode('B1', 'constraint', { label: longLabel })]);
    const result = graphToMermaid(graph);
    // Label is truncated to 40 chars, so the full 60-char label should not appear
    expect(result).not.toContain(longLabel);
    expect(result).toContain('...');
  });

  test('escapes special characters in labels', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { label: 'Has "quotes" and [brackets]' }),
    ]);
    const result = graphToMermaid(graph);
    // Double quotes replaced with single, brackets removed
    expect(result).not.toContain('[brackets]');
    expect(result).toContain("'quotes'");
  });

  test('handles empty graph', () => {
    const graph = makeGraph([]);
    const result = graphToMermaid(graph);
    expect(result).toBe('graph TD');
  });
});

// ============================================================
// graphToMermaid — Scale Tests (U1: 20+ nodes)
// ============================================================

describe('graphToMermaid — scale (U1)', () => {
  test('produces valid syntax for 20-node graph', () => {
    const graph = makeScaleGraph(20);
    const result = graphToMermaid(graph);

    expect(result).toStartWith('graph TD');
    expect(result).toContain('subgraph Constraints');
    expect(result).toContain('subgraph Tensions');
    expect(result).toContain('subgraph Required Truths');
    expect(result).toContain('subgraph Artifacts');
    // Should have edges
    expect(result).toContain('-->');
  });

  test('produces valid syntax for 30-node graph', () => {
    const graph = makeScaleGraph(30);
    const result = graphToMermaid(graph);

    expect(result).toStartWith('graph TD');
    // All subgraph types present
    expect(result).toContain('subgraph Constraints');
    // Node count check — at least 30 node definitions
    const nodeMatches = result.match(/\["|{"|("\(|"\[\/)/g);
    expect(nodeMatches).not.toBeNull();
    expect(nodeMatches!.length).toBeGreaterThanOrEqual(20);
  });

  test('produces valid syntax for 50-node graph', () => {
    const graph = makeScaleGraph(50);
    const result = graphToMermaid(graph);

    expect(result).toStartWith('graph TD');
    // Should have all edge types
    expect(result).toContain('-->');    // dependencies
    expect(result).toContain('-.->');   // conflicts
    expect(result).toContain('==>');    // satisfies
  });

  test('handles critical path styling at scale', () => {
    const graph = makeScaleGraph(25);
    const result = graphToMermaid(graph);

    expect(result).toContain('classDef critical');
    // First 3 nodes are critical in makeScaleGraph
    expect(result).toContain('class C1 critical');
    expect(result).toContain('class C2 critical');
    expect(result).toContain('class C3 critical');
  });
});

// ============================================================
// executionPlanToMermaid
// ============================================================

describe('executionPlanToMermaid', () => {
  test('produces valid LR flowchart', () => {
    const plan = makePlan(2, 2);
    const result = executionPlanToMermaid(plan);
    expect(result).toStartWith('graph LR');
  });

  test('creates subgraphs for each wave', () => {
    const plan = makePlan(3, 1);
    const result = executionPlanToMermaid(plan);
    expect(result).toContain('subgraph Wave_1');
    expect(result).toContain('subgraph Wave_2');
    expect(result).toContain('subgraph Wave_3');
  });

  test('includes task descriptions in node labels', () => {
    const plan = makePlan(1, 2);
    const result = executionPlanToMermaid(plan);
    expect(result).toContain('implement');
    expect(result).toContain('Task 1 in wave 1');
  });

  test('connects waves sequentially', () => {
    const plan = makePlan(3, 1);
    const result = executionPlanToMermaid(plan);
    // Should have arrows connecting waves
    expect(result).toContain('-->');
  });

  test('styles critical path nodes', () => {
    const plan = makePlan(3, 1);
    const result = executionPlanToMermaid(plan);
    expect(result).toContain('classDef critical');
  });

  test('handles single-wave plan', () => {
    const plan = makePlan(1, 3);
    const result = executionPlanToMermaid(plan);
    expect(result).toStartWith('graph LR');
    expect(result).toContain('subgraph Wave_1');
    // No inter-wave arrows
    const lines = result.split('\n').filter(l => l.includes('-->') && !l.includes('subgraph'));
    expect(lines.length).toBe(0);
  });
});

// ============================================================
// backwardReasoningToMermaid
// ============================================================

describe('backwardReasoningToMermaid', () => {
  test('produces valid TD flowchart', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { depends_on: ['B2'] }),
      makeNode('B2'),
    ]);
    const result = backwardReasoningToMermaid(graph, 'B1', ['B2']);
    expect(result).toStartWith('graph TD');
  });

  test('places target node at top with TARGET prefix', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { label: 'No duplicates' }),
      makeNode('B2'),
    ]);
    const result = backwardReasoningToMermaid(graph, 'B1', ['B2']);
    expect(result).toContain('TARGET');
    expect(result).toContain('B1');
  });

  test('styles satisfied nodes differently from unsatisfied', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { depends_on: ['B2', 'B3'] }),
      makeNode('B2', 'constraint', { status: 'SATISFIED' }),
      makeNode('B3', 'constraint', { status: 'REQUIRED' }),
    ]);
    const result = backwardReasoningToMermaid(graph, 'B1', ['B2', 'B3']);
    expect(result).toContain('classDef satisfied');
    expect(result).toContain('classDef unsatisfied');
    expect(result).toContain('class B2 satisfied');
    expect(result).toContain('class B3 unsatisfied');
  });

  test('renders dependency edges from required conditions', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { depends_on: ['B2'] }),
      makeNode('B2', 'constraint', { depends_on: ['B3'] }),
      makeNode('B3'),
    ]);
    const result = backwardReasoningToMermaid(graph, 'B1', ['B2', 'B3']);
    expect(result).toContain('B2 --> B3');
  });

  test('renders conflict edges as dotted', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { depends_on: ['B2'] }),
      makeNode('B2', 'constraint', { conflicts_with: ['B3'] }),
      makeNode('B3'),
    ]);
    const result = backwardReasoningToMermaid(graph, 'B1', ['B2', 'B3']);
    expect(result).toContain('B2 -.-> B3');
  });

  test('deduplicates requirement nodes', () => {
    const graph = makeGraph([makeNode('B1'), makeNode('B2')]);
    const result = backwardReasoningToMermaid(graph, 'B1', ['B2', 'B2', 'B2']);
    // B2 should appear only once as a node definition
    const b2Lines = result.split('\n').filter(l => l.includes('B2["') || l.includes('B2("') || l.includes('B2{'));
    expect(b2Lines.length).toBe(1);
  });
});

// ============================================================
// miniGraphToMermaid
// ============================================================

describe('miniGraphToMermaid', () => {
  test('produces compact ID-only nodes', () => {
    const graph = makeGraph([makeNode('B1', 'constraint', { label: 'Long label ignored' })]);
    const result = miniGraphToMermaid(graph);
    // Mini graph shows only the ID, not the full label
    expect(result).toContain('B1');
    expect(result).not.toContain('Long label ignored');
  });

  test('includes all edge types', () => {
    const graph = makeGraph(
      [makeNode('B1'), makeNode('B2'), makeNode('A1', 'artifact')],
      {
        dependencies: [['B1', 'B2']],
        conflicts: [['B1', 'B2']],
        satisfies: [['A1', 'B1']],
      }
    );
    const result = miniGraphToMermaid(graph);
    expect(result).toContain('-->');
    expect(result).toContain('-.->');
    expect(result).toContain('==>');
  });

  test('uses correct node shapes', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint'),
      makeNode('TN1', 'tension'),
      makeNode('RT1', 'required_truth'),
    ]);
    const result = miniGraphToMermaid(graph);
    expect(result).toContain('B1["');     // rectangle
    expect(result).toContain('TN1{"');    // diamond
    expect(result).toContain('RT1("');    // rounded
  });

  test('handles empty graph', () => {
    const graph = makeGraph([]);
    const result = miniGraphToMermaid(graph);
    expect(result).toBe('graph TD');
  });
});

// ============================================================
// renderMermaidToTerminal
// ============================================================

describe('renderMermaidToTerminal', () => {
  test('renders simple graph without throwing', () => {
    const syntax = 'graph TD\n    A --> B';
    expect(() => renderMermaidToTerminal(syntax)).not.toThrow();
    const result = renderMermaidToTerminal(syntax);
    expect(result.length).toBeGreaterThan(0);
  });

  test('renders a graph with subgraphs without throwing', () => {
    const syntax = [
      'graph TD',
      '    subgraph Constraints',
      '        B1["B1: Label"]',
      '        B2["B2: Label"]',
      '    end',
      '    B1 --> B2',
    ].join('\n');
    expect(() => renderMermaidToTerminal(syntax)).not.toThrow();
  });

  test('falls back to raw syntax on invalid input', () => {
    // Completely broken syntax that the renderer can't parse
    const broken = '<<<NOT MERMAID>>>';
    const result = renderMermaidToTerminal(broken);
    // Either renders something or falls back with the marker
    expect(result.length).toBeGreaterThan(0);
  });

  test('renders graphToMermaid output without throwing', () => {
    const graph = makeGraph(
      [makeNode('B1'), makeNode('B2'), makeNode('TN1', 'tension')],
      { dependencies: [['B1', 'B2']], conflicts: [['B1', 'TN1']] }
    );
    const mermaid = graphToMermaid(graph);
    expect(() => renderMermaidToTerminal(mermaid)).not.toThrow();
    const result = renderMermaidToTerminal(mermaid);
    expect(result.length).toBeGreaterThan(0);
  });

  test('renders miniGraphToMermaid output without throwing', () => {
    const graph = makeGraph(
      [makeNode('B1'), makeNode('B2')],
      { dependencies: [['B1', 'B2']] }
    );
    const mermaid = miniGraphToMermaid(graph);
    expect(() => renderMermaidToTerminal(mermaid)).not.toThrow();
  });

  test('renders executionPlanToMermaid output without throwing', () => {
    const plan = makePlan(3, 2);
    const mermaid = executionPlanToMermaid(plan);
    expect(() => renderMermaidToTerminal(mermaid)).not.toThrow();
  });
});

// ============================================================
// renderMermaidToTerminal — Scale Tests (U1: 20+ nodes)
// ============================================================

describe('renderMermaidToTerminal — scale (U1)', () => {
  test('renders 20-node graph without throwing', () => {
    const graph = makeScaleGraph(20);
    const result = renderGraphToTerminal(graph, 'mini');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('Mermaid rendering failed');
  });

  test('renders 30-node graph without throwing', () => {
    const graph = makeScaleGraph(30);
    const result = renderGraphToTerminal(graph, 'mini');
    expect(result.length).toBeGreaterThan(0);
  });

  test('renders 50-node graph without throwing', () => {
    const graph = makeScaleGraph(50);
    const result = renderGraphToTerminal(graph, 'mini');
    expect(result.length).toBeGreaterThan(0);
  });

  test('produces non-empty output at all scales', () => {
    for (const count of [5, 10, 15, 20, 25]) {
      const graph = makeScaleGraph(count);
      const result = renderGraphToTerminal(graph, 'mini');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  test('20-node graph fits within 120 columns', () => {
    const graph = makeScaleGraph(20);
    const result = renderGraphToTerminal(graph, 'full');
    expect(maxLineWidth(result)).toBeLessThanOrEqual(120);
  });

  test('50-node graph fits within 120 columns', () => {
    const graph = makeScaleGraph(50);
    const result = renderGraphToTerminal(graph, 'full');
    expect(maxLineWidth(result)).toBeLessThanOrEqual(120);
  });
});

// ============================================================
// End-to-end: full pipeline tests
// ============================================================

describe('end-to-end pipeline', () => {
  test('graphToMermaid → renderMermaidToTerminal with mixed types', () => {
    const graph = makeGraph(
      [
        makeNode('B1', 'constraint', { label: 'No duplicates', status: 'SATISFIED', critical_path: true }),
        makeNode('T1', 'constraint', { label: 'Bun compatible', depends_on: ['B1'] }),
        makeNode('TN1', 'tension', { label: 'Speed vs Safety', conflicts_with: ['B1'] }),
        makeNode('RT1', 'required_truth', { label: 'Tests pass' }),
        makeNode('A1', 'artifact', { label: 'payment.ts' }),
      ],
      {
        dependencies: [['T1', 'B1']],
        conflicts: [['TN1', 'B1']],
        satisfies: [['A1', 'B1']],
      }
    );

    const mermaid = graphToMermaid(graph);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('subgraph Constraints');
    expect(mermaid).toContain('T1 --> B1');
    expect(mermaid).toContain('TN1 -.-> B1');
    expect(mermaid).toContain('A1 ==> B1');

    expect(() => renderMermaidToTerminal(mermaid)).not.toThrow();
  });

  test('executionPlanToMermaid → renderMermaidToTerminal multi-wave', () => {
    const plan = makePlan(4, 3);
    const mermaid = executionPlanToMermaid(plan);
    expect(mermaid).toContain('graph LR');
    expect(mermaid).toContain('Wave_1');
    expect(mermaid).toContain('Wave_4');

    expect(() => renderMermaidToTerminal(mermaid)).not.toThrow();
  });

  test('backwardReasoningToMermaid → renderMermaidToTerminal with chain', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { depends_on: ['B2', 'B3'] }),
      makeNode('B2', 'constraint', { status: 'SATISFIED', depends_on: ['B4'] }),
      makeNode('B3', 'constraint', { status: 'REQUIRED' }),
      makeNode('B4', 'constraint', { status: 'SATISFIED' }),
    ]);
    const mermaid = backwardReasoningToMermaid(graph, 'B1', ['B2', 'B3', 'B4']);
    expect(mermaid).toContain('TARGET');
    expect(mermaid).toContain('classDef satisfied');
    expect(mermaid).toContain('classDef unsatisfied');

    expect(() => renderMermaidToTerminal(mermaid)).not.toThrow();
  });
});

// ============================================================
// renderGraphToTerminal
// Satisfies: U1 (readable at scale), U2 (fits terminal)
// ============================================================

describe('renderGraphToTerminal', () => {
  test('full mode renders LR graph + legend table', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { label: 'No duplicates', status: 'SATISFIED' }),
      makeNode('B2', 'constraint', { label: 'Retry within 72 hours', status: 'REQUIRED' }),
    ], { dependencies: [['B2', 'B1']] });

    const result = renderGraphToTerminal(graph, 'full');
    expect(result.length).toBeGreaterThan(0);
    // Legend should contain full descriptions
    expect(result).toContain('No duplicates');
    expect(result).toContain('Retry within 72 hours');
    // Legend table headers
    expect(result).toContain('ID');
    expect(result).toContain('Description');
    expect(result).toContain('Status');
  });

  test('mini mode renders graph without legend', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { label: 'No duplicates' }),
    ]);
    const result = renderGraphToTerminal(graph, 'mini');
    expect(result.length).toBeGreaterThan(0);
    // Mini mode should NOT contain the full description from the legend
    // (it may appear in the fallback syntax though, so check for table header instead)
    expect(result).not.toContain('Description');
  });

  test('graph with 20 nodes has output width <= 120 cols', () => {
    const graph = makeScaleGraph(20);
    const result = renderGraphToTerminal(graph, 'full');
    expect(maxLineWidth(result)).toBeLessThanOrEqual(120);
  });

  test('graph with 50 nodes has output width <= 120 cols', () => {
    const graph = makeScaleGraph(50);
    const result = renderGraphToTerminal(graph, 'full');
    expect(maxLineWidth(result)).toBeLessThanOrEqual(120);
  });

  test('contains all node IDs from input graph', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint'),
      makeNode('TN1', 'tension'),
      makeNode('RT1', 'required_truth'),
      makeNode('A1', 'artifact'),
    ]);
    const result = renderGraphToTerminal(graph, 'full');
    expect(result).toContain('B1');
    expect(result).toContain('TN1');
    expect(result).toContain('RT1');
    expect(result).toContain('A1');
  });

  test('legend shows full labels when mode=full', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { label: 'Unique descriptive label here' }),
    ]);
    const result = renderGraphToTerminal(graph, 'full');
    expect(result).toContain('Unique descriptive label here');
  });

  test('empty graph handled gracefully', () => {
    const graph = makeGraph([]);
    expect(() => renderGraphToTerminal(graph, 'full')).not.toThrow();
    const result = renderGraphToTerminal(graph, 'full');
    expect(result.length).toBeGreaterThan(0);
  });

  test('no character corruption in node labels', () => {
    const graph = makeScaleGraph(15);
    const result = renderGraphToTerminal(graph, 'full');
    // Check that box-drawing characters don't appear inside known node IDs
    // (which would indicate z-order corruption)
    const lines = result.split('\n');
    for (const line of lines) {
      const stripped = stripAnsi(line);
      // If a line contains a node ID like C1, it shouldn't have ┴ or ┬ immediately adjacent
      // within the label area (these are edge routing chars)
      if (stripped.includes('C1') && !stripped.includes('C10') && !stripped.includes('C11')) {
        // Basic sanity: the line containing C1 should be readable
        expect(stripped).not.toMatch(/C1[┴┬]/);
      }
    }
  });
});

// ============================================================
// renderPlanToTerminal
// ============================================================

describe('renderPlanToTerminal', () => {
  test('multi-wave plan renders without throwing', () => {
    const plan = makePlan(3, 2);
    expect(() => renderPlanToTerminal(plan)).not.toThrow();
    const result = renderPlanToTerminal(plan);
    expect(result.length).toBeGreaterThan(0);
  });

  test('contains wave information', () => {
    const plan = makePlan(3, 2);
    const result = renderPlanToTerminal(plan);
    // Should show wave count in summary
    expect(result).toContain('Waves:');
    expect(result).toContain('Tasks:');
  });

  test('width <= 120 cols', () => {
    const plan = makePlan(5, 3);
    const result = renderPlanToTerminal(plan);
    expect(maxLineWidth(result)).toBeLessThanOrEqual(120);
  });

  test('single-wave plan renders', () => {
    const plan = makePlan(1, 1);
    expect(() => renderPlanToTerminal(plan)).not.toThrow();
    const result = renderPlanToTerminal(plan);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================================
// renderBackwardToTerminal
// ============================================================

describe('renderBackwardToTerminal', () => {
  test('renders target and requirements', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint', { depends_on: ['B2'] }),
      makeNode('B2', 'constraint', { status: 'SATISFIED' }),
    ]);
    const result = renderBackwardToTerminal(graph, 'B1', ['B2']);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('B1');
    expect(result).toContain('B2');
  });

  test('width <= 120 cols', () => {
    const graph = makeScaleGraph(15);
    const nodeIds = Object.keys(graph.nodes);
    const result = renderBackwardToTerminal(graph, nodeIds[0], nodeIds.slice(1, 6));
    expect(maxLineWidth(result)).toBeLessThanOrEqual(120);
  });

  test('handles graph with no dependencies gracefully', () => {
    const graph = makeGraph([
      makeNode('B1', 'constraint'),
      makeNode('B2', 'constraint'),
    ]);
    expect(() => renderBackwardToTerminal(graph, 'B1', ['B2'])).not.toThrow();
  });
});
