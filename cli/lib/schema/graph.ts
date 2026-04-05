/**
 * Constraint Graph and Reference Validation for Manifold CLI (v3)
 * Satisfies: T1, T3 (< 500 lines), T6, RT-2, RT-3
 */

import {
  VALID_NODE_TYPES,
  VALID_NODE_STATUSES,
} from '../structure-schema.js';
import type { ValidationError, ValidationWarning } from './types.js';

// ============================================================
// v3: Constraint Graph Validation
// Satisfies: T1, RT-2
// ============================================================

/**
 * Validate constraint graph (v3)
 * Satisfies: T1
 */
export function validateConstraintGraph(
  graph: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Version required
  if (graph.version === undefined) {
    warnings.push({
      field: 'constraint_graph.version',
      message: 'Constraint graph should have a "version"',
      suggestion: 'Add version: 1'
    });
  }

  // Feature should match
  if (!graph.feature) {
    warnings.push({
      field: 'constraint_graph.feature',
      message: 'Constraint graph should specify "feature"'
    });
  }

  // Nodes validation
  if (graph.nodes) {
    validateConstraintNodes(graph.nodes as Record<string, unknown>, errors, warnings);
  }

  // Edges validation
  if (graph.edges) {
    const edges = graph.edges as Record<string, unknown>;
    const nodeIds = graph.nodes ? Object.keys(graph.nodes as object) : [];

    validateEdgeArray(edges.dependencies, 'constraint_graph.edges.dependencies', nodeIds, errors, warnings);
    validateEdgeArray(edges.conflicts, 'constraint_graph.edges.conflicts', nodeIds, errors, warnings);
    validateEdgeArray(edges.satisfies, 'constraint_graph.edges.satisfies', nodeIds, errors, warnings);
  }
}

/**
 * Validate constraint nodes
 */
function validateConstraintNodes(
  nodes: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const [nodeId, nodeData] of Object.entries(nodes)) {
    const node = nodeData as Record<string, unknown>;
    const fieldPrefix = `constraint_graph.nodes.${nodeId}`;

    // ID must match key
    if (node.id && node.id !== nodeId) {
      warnings.push({
        field: `${fieldPrefix}.id`,
        message: `Node ID "${node.id}" doesn't match key "${nodeId}"`,
        suggestion: 'Ensure node ID matches its key in the nodes object'
      });
    }

    // Type validation
    if (node.type && !VALID_NODE_TYPES.includes(node.type as any)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Invalid node type "${node.type}". Must be: ${VALID_NODE_TYPES.join(', ')}`,
        value: node.type
      });
    }

    // Status validation
    if (node.status && !VALID_NODE_STATUSES.includes(node.status as any)) {
      errors.push({
        field: `${fieldPrefix}.status`,
        message: `Invalid node status "${node.status}". Must be: ${VALID_NODE_STATUSES.join(', ')}`,
        value: node.status
      });
    }

    // depends_on and blocks should be arrays
    if (node.depends_on && !Array.isArray(node.depends_on)) {
      errors.push({ field: `${fieldPrefix}.depends_on`, message: 'depends_on must be an array' });
    }
    if (node.blocks && !Array.isArray(node.blocks)) {
      errors.push({ field: `${fieldPrefix}.blocks`, message: 'blocks must be an array' });
    }
    if (node.conflicts_with && !Array.isArray(node.conflicts_with)) {
      errors.push({ field: `${fieldPrefix}.conflicts_with`, message: 'conflicts_with must be an array' });
    }
  }
}

/**
 * Validate edge array
 */
function validateEdgeArray(
  edges: unknown,
  fieldPath: string,
  validNodeIds: string[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!edges) return;

  if (!Array.isArray(edges)) {
    errors.push({ field: fieldPath, message: 'Edges must be an array' });
    return;
  }

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!Array.isArray(edge) || edge.length < 2) {
      errors.push({ field: `${fieldPath}[${i}]`, message: 'Each edge must be an array of at least 2 node IDs' });
      continue;
    }

    // Check if referenced nodes exist (if we have node IDs to check against)
    if (validNodeIds.length > 0) {
      for (const nodeId of edge) {
        if (!validNodeIds.includes(nodeId)) {
          warnings.push({
            field: `${fieldPath}[${i}]`,
            message: `Edge references unknown node "${nodeId}"`,
            suggestion: `Ensure "${nodeId}" exists in constraint_graph.nodes`
          });
        }
      }
    }
  }
}

// ============================================================
// v3: Reference Validation (Dangling ID Detection)
// Satisfies: T3, RT-3
// ============================================================

/**
 * Collect all constraint IDs from the manifold
 * Returns a set of valid IDs that can be referenced
 */
export function collectConstraintIds(m: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();

  // Collect from constraints
  const constraints = m.constraints as Record<string, unknown[]> | undefined;
  if (constraints) {
    for (const category of ['business', 'technical', 'user_experience', 'ux', 'security', 'operational']) {
      const list = constraints[category];
      if (Array.isArray(list)) {
        for (const c of list) {
          const constraint = c as Record<string, unknown>;
          if (constraint.id) ids.add(constraint.id as string);
        }
      }
    }
  }

  // Collect from tensions
  const tensions = m.tensions as unknown[];
  if (Array.isArray(tensions)) {
    for (const t of tensions) {
      const tension = t as Record<string, unknown>;
      if (tension.id) ids.add(tension.id as string);
    }
  }

  // Collect from required truths
  const anchors = m.anchors as Record<string, unknown> | undefined;
  if (anchors?.required_truths) {
    const rts = anchors.required_truths as unknown[];
    if (Array.isArray(rts)) {
      for (const rt of rts) {
        const requiredTruth = rt as Record<string, unknown>;
        if (requiredTruth.id) ids.add(requiredTruth.id as string);
      }
    }
  }

  return ids;
}

/**
 * Validate all references in the manifold
 * Satisfies: T3 (dangling reference detection), RT-3
 */
export function validateReferences(
  m: Record<string, unknown>,
  validIds: Set<string>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check tension.between[] references
  const tensions = m.tensions as unknown[];
  if (Array.isArray(tensions)) {
    for (let i = 0; i < tensions.length; i++) {
      const tension = tensions[i] as Record<string, unknown>;
      const between = tension.between as string[];
      if (Array.isArray(between)) {
        for (const ref of between) {
          if (!validIds.has(ref)) {
            errors.push({
              field: `tensions[${i}].between`,
              message: `References unknown constraint "${ref}"`,
              value: ref
            });
          }
        }
      }
    }
  }

  // Check required_truth.maps_to_constraints[] references
  const anchors = m.anchors as Record<string, unknown> | undefined;
  if (anchors?.required_truths) {
    const rts = anchors.required_truths as unknown[];
    if (Array.isArray(rts)) {
      for (let i = 0; i < rts.length; i++) {
        const rt = rts[i] as Record<string, unknown>;
        const mapsTo = rt.maps_to_constraints as string[];
        if (Array.isArray(mapsTo)) {
          for (const ref of mapsTo) {
            if (!validIds.has(ref)) {
              warnings.push({
                field: `anchors.required_truths[${i}].maps_to_constraints`,
                message: `References unknown constraint "${ref}"`,
                suggestion: `Ensure constraint "${ref}" exists in the constraints section`
              });
            }
          }
        }
      }
    }
  }

  // Check constraint_graph edge references (if graph nodes exist)
  const graph = m.constraint_graph as Record<string, unknown> | undefined;
  if (graph?.edges) {
    const edges = graph.edges as Record<string, unknown>;
    const graphNodes = graph.nodes as Record<string, unknown> | undefined;
    const graphNodeIds = graphNodes ? new Set(Object.keys(graphNodes)) : new Set<string>();

    // Merge constraint IDs with graph node IDs for comprehensive checking
    const allValidIds = new Set([...validIds, ...graphNodeIds]);

    // Check dependency edges
    checkEdgeReferences(edges.dependencies, 'constraint_graph.edges.dependencies', allValidIds, warnings);
    checkEdgeReferences(edges.conflicts, 'constraint_graph.edges.conflicts', allValidIds, warnings);
    checkEdgeReferences(edges.satisfies, 'constraint_graph.edges.satisfies', allValidIds, warnings);
  }
}

/**
 * Check edge references against valid IDs
 */
function checkEdgeReferences(
  edges: unknown,
  fieldPath: string,
  validIds: Set<string>,
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(edges)) return;

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!Array.isArray(edge)) continue;

    for (const nodeId of edge) {
      if (typeof nodeId === 'string' && !validIds.has(nodeId)) {
        warnings.push({
          field: `${fieldPath}[${i}]`,
          message: `References unknown node "${nodeId}"`,
          suggestion: `Ensure "${nodeId}" exists in constraints or constraint_graph.nodes`
        });
      }
    }
  }
}
