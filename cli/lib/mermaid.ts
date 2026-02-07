/**
 * Mermaid Conversion Utilities
 * Satisfies: RT-2 (conversion layer), T4 (reuse solver data), B1 (all commands), B3 (--mermaid export)
 *
 * Converts Manifold data structures to Mermaid diagram syntax
 * and renders them as ASCII/Unicode for terminal display.
 */

import { renderMermaidAscii } from 'beautiful-mermaid';
import type {
  ConstraintGraph,
  ConstraintNode,
  ExecutionPlan,
} from './parser';

// ============================================================
// Mermaid Syntax Helpers
// ============================================================

/**
 * Escape special Mermaid characters in labels.
 * Mermaid uses quotes, parens, brackets, and braces for syntax.
 */
function escapeLabel(label: string): string {
  return label
    .replace(/"/g, "'")
    .replace(/[[\]{}()]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\n/g, ' ');
}

/**
 * Truncate label to max length for readability
 */
function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return label.substring(0, maxLen - 3) + '...';
}

/**
 * Get Mermaid node shape syntax for a constraint node type.
 * - constraint:      [label]        (rectangle)
 * - tension:         {label}        (diamond)
 * - required_truth:  (label)        (rounded)
 * - artifact:        [/label/]      (parallelogram)
 */
function nodeShape(id: string, label: string, type: string): string {
  const escaped = escapeLabel(truncateLabel(label, 40));
  switch (type) {
    case 'constraint':
      return `${id}["${escaped}"]`;
    case 'tension':
      return `${id}{"${escaped}"}`;
    case 'required_truth':
      return `${id}("${escaped}")`;
    case 'artifact':
      return `${id}[/"${escaped}"/]`;
    default:
      return `${id}["${escaped}"]`;
  }
}

/**
 * Get status prefix for node labels
 */
function statusPrefix(status: string): string {
  return status === 'SATISFIED' ? '✓ ' : '○ ';
}

// ============================================================
// Graph → Mermaid Conversion
// Satisfies: RT-2, T4
// ============================================================

/**
 * Convert a ConstraintGraph to Mermaid flowchart syntax (TD direction).
 * Groups nodes into subgraphs by type for readability at scale (TN1 resolution).
 */
export function graphToMermaid(graph: ConstraintGraph): string {
  const lines: string[] = ['graph TD'];

  // Group nodes by type for subgraph grouping
  const byType: Record<string, ConstraintNode[]> = {
    constraint: [],
    tension: [],
    required_truth: [],
    artifact: [],
  };

  for (const node of Object.values(graph.nodes)) {
    byType[node.type]?.push(node);
  }

  // Emit subgraphs for each type that has nodes
  const typeLabels: Record<string, string> = {
    constraint: 'Constraints',
    tension: 'Tensions',
    required_truth: 'Required Truths',
    artifact: 'Artifacts',
  };

  for (const [type, nodes] of Object.entries(byType)) {
    if (nodes.length === 0) continue;

    lines.push(`    subgraph ${typeLabels[type]}`);
    for (const node of nodes) {
      const prefix = statusPrefix(node.status);
      const label = `${prefix}${node.id}: ${node.label}`;
      lines.push(`        ${nodeShape(node.id, label, type)}`);
    }
    lines.push('    end');
  }

  // Emit edges
  // Dependencies: solid arrow -->
  for (const [from, to] of graph.edges.dependencies) {
    lines.push(`    ${from} --> ${to}`);
  }

  // Conflicts: dotted arrow -.->
  for (const [a, b] of graph.edges.conflicts) {
    lines.push(`    ${a} -.-> ${b}`);
  }

  // Satisfies: thick arrow ==>
  for (const [artifact, constraint] of graph.edges.satisfies) {
    lines.push(`    ${artifact} ==> ${constraint}`);
  }

  // Style critical path nodes
  const criticalNodes = Object.values(graph.nodes).filter(n => n.critical_path);
  if (criticalNodes.length > 0) {
    lines.push(`    classDef critical stroke-width:3px`);
    for (const node of criticalNodes) {
      lines.push(`    class ${node.id} critical`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// Execution Plan → Mermaid Conversion
// Satisfies: RT-2, T4
// ============================================================

/**
 * Convert an ExecutionPlan to Mermaid flowchart syntax (LR direction).
 * Each wave is a subgraph, tasks within waves are parallel nodes.
 */
export function executionPlanToMermaid(plan: ExecutionPlan): string {
  const lines: string[] = ['graph LR'];

  for (const wave of plan.waves) {
    lines.push(`    subgraph Wave_${wave.number}["Wave ${wave.number} - ${wave.phase}"]`);

    for (const task of wave.parallel_tasks) {
      const nodeId = task.node_ids[0] || task.id;
      const desc = truncateLabel(task.description || task.action, 35);
      const label = `${task.action}: ${desc}`;
      lines.push(`        ${escapeNodeId(nodeId)}["${escapeLabel(label)}"]`);
    }

    lines.push('    end');
  }

  // Connect waves sequentially via blocking dependencies
  for (let i = 1; i < plan.waves.length; i++) {
    const prevWave = plan.waves[i - 1];
    const currWave = plan.waves[i];

    // Connect last task of previous wave to first task of current wave
    const prevTask = prevWave.parallel_tasks[prevWave.parallel_tasks.length - 1];
    const currTask = currWave.parallel_tasks[0];
    if (prevTask && currTask) {
      const prevId = escapeNodeId(prevTask.node_ids[0] || prevTask.id);
      const currId = escapeNodeId(currTask.node_ids[0] || currTask.id);
      lines.push(`    ${prevId} --> ${currId}`);
    }
  }

  // Show critical path
  if (plan.critical_path.length > 1) {
    lines.push(`    classDef critical stroke-width:3px`);
    for (const nodeId of plan.critical_path) {
      lines.push(`    class ${escapeNodeId(nodeId)} critical`);
    }
  }

  return lines.join('\n');
}

/**
 * Escape node IDs that contain special characters (hyphens, dots)
 * Mermaid requires alphanumeric IDs or quoted IDs
 */
function escapeNodeId(id: string): string {
  // Replace characters that break Mermaid node IDs
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ============================================================
// Backward Reasoning → Mermaid Conversion
// Satisfies: RT-2, T4
// ============================================================

/**
 * Convert backward reasoning result to Mermaid flowchart syntax (TD direction).
 * Target node at top, required conditions cascade down.
 */
export function backwardReasoningToMermaid(
  graph: ConstraintGraph,
  targetId: string,
  requirements: string[]
): string {
  const lines: string[] = ['graph TD'];

  // Target node at the top
  const targetNode = graph.nodes[targetId];
  if (targetNode) {
    const label = `TARGET: ${targetNode.id}: ${targetNode.label}`;
    lines.push(`    ${targetId}("${escapeLabel(truncateLabel(label, 45))}")`);
  }

  // Required condition nodes
  const visited = new Set<string>();
  for (const reqId of requirements) {
    if (visited.has(reqId)) continue;
    visited.add(reqId);

    const node = graph.nodes[reqId];
    if (!node) continue;

    const prefix = statusPrefix(node.status);
    const label = `${prefix}${node.id}: ${node.label}`;
    lines.push(`    ${nodeShape(node.id, label, node.type)}`);

    // Dependency edges
    for (const depId of node.depends_on) {
      lines.push(`    ${node.id} --> ${depId}`);
    }

    // Conflict edges
    for (const conflictId of node.conflicts_with) {
      lines.push(`    ${node.id} -.-> ${conflictId}`);
    }
  }

  // Connect target to its direct dependencies
  if (targetNode) {
    for (const depId of targetNode.depends_on) {
      lines.push(`    ${targetId} --> ${depId}`);
    }
  }

  // Style satisfied vs unsatisfied
  const satisfiedNodes = requirements.filter(id => {
    const node = graph.nodes[id];
    return node && node.status === 'SATISFIED';
  });
  const unsatisfiedNodes = requirements.filter(id => {
    const node = graph.nodes[id];
    return node && node.status !== 'SATISFIED';
  });

  if (satisfiedNodes.length > 0) {
    lines.push(`    classDef satisfied stroke:#0a0,stroke-width:2px`);
    for (const id of satisfiedNodes) {
      lines.push(`    class ${id} satisfied`);
    }
  }
  if (unsatisfiedNodes.length > 0) {
    lines.push(`    classDef unsatisfied stroke:#a00,stroke-width:2px`);
    for (const id of unsatisfiedNodes) {
      lines.push(`    class ${id} unsatisfied`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// Mini Graph for Status/Show Commands
// Satisfies: RT-4, B1
// ============================================================

/**
 * Generate a compact Mermaid graph showing only constraint IDs and edges.
 * Used by `status --graph` and `show --map` for a quick overview.
 */
export function miniGraphToMermaid(graph: ConstraintGraph): string {
  const lines: string[] = ['graph TD'];

  // Nodes with just IDs and status
  for (const [id, node] of Object.entries(graph.nodes)) {
    const prefix = statusPrefix(node.status);
    lines.push(`    ${nodeShape(id, `${prefix}${id}`, node.type)}`);
  }

  // All edges
  for (const [from, to] of graph.edges.dependencies) {
    lines.push(`    ${from} --> ${to}`);
  }
  for (const [a, b] of graph.edges.conflicts) {
    lines.push(`    ${a} -.-> ${b}`);
  }
  for (const [artifact, constraint] of graph.edges.satisfies) {
    lines.push(`    ${artifact} ==> ${constraint}`);
  }

  return lines.join('\n');
}

// ============================================================
// Terminal Rendering
// Satisfies: U1, U2
// ============================================================

/**
 * Render Mermaid syntax to ASCII/Unicode for terminal display.
 * Falls back to raw Mermaid syntax if rendering fails.
 */
export function renderMermaidToTerminal(mermaidSyntax: string): string {
  try {
    return renderMermaidAscii(mermaidSyntax, {
      useAscii: false,  // Use Unicode box-drawing for richer output
      paddingX: 5,
      paddingY: 3,
      boxBorderPadding: 1,
    });
  } catch {
    // Fallback: return raw Mermaid syntax with a note
    return `[Mermaid rendering failed — raw syntax below]\n\n${mermaidSyntax}`;
  }
}
