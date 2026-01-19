/**
 * Schema Validation for Manifold CLI
 * Satisfies: T2 (Parse both schema v1 and v2 correctly), RT-5 (Edge case handling)
 */

import type {
  Manifold,
  ManifoldPhase,
  Constraint,
  Tension,
  SchemaVersion,
  Iteration,
  Convergence
} from './parser.js';

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  schemaVersion: SchemaVersion;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Valid phases
const VALID_PHASES: ManifoldPhase[] = [
  'INITIALIZED',
  'CONSTRAINED',
  'TENSIONED',
  'ANCHORED',
  'GENERATED',
  'VERIFIED'
];

// Valid constraint types
const VALID_CONSTRAINT_TYPES = ['invariant', 'goal', 'boundary'] as const;

// Valid tension types
const VALID_TENSION_TYPES = ['trade_off', 'resource_tension', 'hidden_dependency'] as const;

// Valid tension statuses
const VALID_TENSION_STATUSES = ['resolved', 'unresolved'] as const;

// Valid required truth statuses
const VALID_REQUIRED_TRUTH_STATUSES = ['SATISFIED', 'PARTIAL', 'NOT_SATISFIED', 'SPECIFICATION_READY'] as const;

// Valid convergence statuses
const VALID_CONVERGENCE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'CONVERGED'] as const;

// v3: Valid evidence types
// Satisfies: T1 (v3 evidence validation), RT-2
const VALID_EVIDENCE_TYPES = ['file_exists', 'content_match', 'test_passes', 'metric_value', 'manual_review'] as const;

// v3: Valid evidence statuses
const VALID_EVIDENCE_STATUSES = ['VERIFIED', 'PENDING', 'FAILED', 'STALE'] as const;

// v3: Valid constraint node types
const VALID_NODE_TYPES = ['constraint', 'tension', 'required_truth', 'artifact'] as const;

// v3: Valid constraint node statuses
const VALID_NODE_STATUSES = ['UNKNOWN', 'REQUIRED', 'SATISFIED', 'BLOCKED', 'CONFLICTED'] as const;

/**
 * Validate a manifold against schema rules
 * Supports both v1 and v2 schemas
 */
export function validateManifold(manifold: unknown, strict: boolean = false): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Type guard for manifold object
  if (!manifold || typeof manifold !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Manifold must be an object' }],
      warnings: [],
      schemaVersion: 1
    };
  }

  const m = manifold as Record<string, unknown>;

  // Detect schema version
  const schemaVersion = detectVersion(m);

  // Required fields
  if (!m.feature || typeof m.feature !== 'string') {
    errors.push({ field: 'feature', message: 'Required field "feature" must be a non-empty string' });
  }

  // Phase validation
  if (m.phase) {
    const phase = String(m.phase).toUpperCase();
    if (!VALID_PHASES.includes(phase as ManifoldPhase)) {
      errors.push({
        field: 'phase',
        message: `Invalid phase "${m.phase}". Must be one of: ${VALID_PHASES.join(', ')}`,
        value: m.phase
      });
    }
  } else {
    errors.push({ field: 'phase', message: 'Required field "phase" is missing' });
  }

  // Outcome validation (optional but recommended)
  if (strict && !m.outcome) {
    warnings.push({
      field: 'outcome',
      message: 'No outcome specified',
      suggestion: 'Add an outcome statement describing the desired result'
    });
  }

  // Constraints validation
  if (m.constraints) {
    validateConstraints(m.constraints as Record<string, unknown>, errors, warnings);
  }

  // Tensions validation
  if (m.tensions) {
    validateTensions(m.tensions, errors, warnings);
  }

  // Tension summary validation
  if (m.tension_summary && m.tensions) {
    validateTensionSummary(
      m.tension_summary as Record<string, unknown>,
      m.tensions as unknown[],
      errors,
      warnings
    );
  }

  // Schema v2+ specific validations
  if (schemaVersion >= 2) {
    // Iterations validation
    if (m.iterations) {
      validateIterations(m.iterations, errors, warnings);
    }

    // Convergence validation
    if (m.convergence) {
      validateConvergence(m.convergence as Record<string, unknown>, errors, warnings);
    }
  }

  // Schema v3 specific validations
  // Satisfies: T1 (v3 support), RT-2
  if (schemaVersion === 3) {
    // Evidence validation
    if (m.evidence) {
      validateEvidence(m.evidence, errors, warnings);
    }

    // Constraint graph validation
    if (m.constraint_graph) {
      validateConstraintGraph(m.constraint_graph as Record<string, unknown>, errors, warnings);
    }

    // Collect all constraint IDs for reference validation
    const constraintIds = collectConstraintIds(m);

    // Validate references across the manifold
    // Satisfies: T3 (dangling reference detection), RT-3
    validateReferences(m, constraintIds, errors, warnings);
  }

  // Anchors validation
  if (m.anchors) {
    validateAnchors(m.anchors as Record<string, unknown>, errors, warnings, strict);
  }

  // v1 deprecation warning for 'ux' field
  const constraints = m.constraints as Record<string, unknown> | undefined;
  if (constraints?.ux && !constraints?.user_experience) {
    warnings.push({
      field: 'constraints.ux',
      message: 'Field "ux" is deprecated in schema v2',
      suggestion: 'Rename "ux" to "user_experience" for v2 compliance'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaVersion
  };
}

/**
 * Detect schema version from manifold data
 * Satisfies: T1 (v3 support), B4 (version migration path)
 */
function detectVersion(m: Record<string, unknown>): SchemaVersion {
  // Explicit version takes precedence
  if (m.schema_version === 3) return 3;
  if (m.schema_version === 2) return 2;
  if (m.schema_version === 1) return 1;

  // Implicit v3 detection (evidence[] or constraint_graph)
  if (Array.isArray(m.evidence) && m.evidence.length > 0) return 3;
  if (m.constraint_graph && typeof m.constraint_graph === 'object') return 3;

  // Implicit v2 detection
  if (Array.isArray(m.iterations) && m.iterations.length > 0) return 2;
  if (m.convergence && typeof m.convergence === 'object') return 2;

  // Default to v1
  return 1;
}

/**
 * Validate constraints section
 */
function validateConstraints(
  constraints: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const validCategories = ['business', 'technical', 'user_experience', 'ux', 'security', 'operational'];

  for (const [category, list] of Object.entries(constraints)) {
    if (!validCategories.includes(category)) {
      warnings.push({
        field: `constraints.${category}`,
        message: `Unknown constraint category "${category}"`,
        suggestion: `Valid categories: ${validCategories.join(', ')}`
      });
      continue;
    }

    if (!Array.isArray(list)) {
      errors.push({
        field: `constraints.${category}`,
        message: `Constraint category "${category}" must be an array`
      });
      continue;
    }

    // Validate each constraint
    for (let i = 0; i < list.length; i++) {
      const constraint = list[i] as Record<string, unknown>;
      const fieldPrefix = `constraints.${category}[${i}]`;

      // ID required
      if (!constraint.id || typeof constraint.id !== 'string') {
        errors.push({ field: `${fieldPrefix}.id`, message: 'Constraint must have a string "id"' });
      }

      // Type validation
      if (!constraint.type) {
        errors.push({ field: `${fieldPrefix}.type`, message: 'Constraint must have a "type"' });
      } else if (!VALID_CONSTRAINT_TYPES.includes(constraint.type as any)) {
        errors.push({
          field: `${fieldPrefix}.type`,
          message: `Invalid constraint type "${constraint.type}". Must be: ${VALID_CONSTRAINT_TYPES.join(', ')}`,
          value: constraint.type
        });
      }

      // Statement required
      if (!constraint.statement || typeof constraint.statement !== 'string') {
        errors.push({ field: `${fieldPrefix}.statement`, message: 'Constraint must have a string "statement"' });
      }
    }
  }
}

/**
 * Validate tensions section
 */
function validateTensions(
  tensions: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(tensions)) {
    errors.push({ field: 'tensions', message: 'Tensions must be an array' });
    return;
  }

  for (let i = 0; i < tensions.length; i++) {
    const tension = tensions[i] as Record<string, unknown>;
    const fieldPrefix = `tensions[${i}]`;

    // ID required
    if (!tension.id || typeof tension.id !== 'string') {
      errors.push({ field: `${fieldPrefix}.id`, message: 'Tension must have a string "id"' });
    }

    // Type validation
    if (!tension.type) {
      errors.push({ field: `${fieldPrefix}.type`, message: 'Tension must have a "type"' });
    } else if (!VALID_TENSION_TYPES.includes(tension.type as any)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Invalid tension type "${tension.type}". Must be: ${VALID_TENSION_TYPES.join(', ')}`,
        value: tension.type
      });
    }

    // Between required
    if (!Array.isArray(tension.between) || tension.between.length < 2) {
      errors.push({ field: `${fieldPrefix}.between`, message: 'Tension must have "between" array with at least 2 elements' });
    }

    // Status validation
    if (!tension.status) {
      errors.push({ field: `${fieldPrefix}.status`, message: 'Tension must have a "status"' });
    } else if (!VALID_TENSION_STATUSES.includes(tension.status as any)) {
      errors.push({
        field: `${fieldPrefix}.status`,
        message: `Invalid tension status "${tension.status}". Must be: ${VALID_TENSION_STATUSES.join(', ')}`,
        value: tension.status
      });
    }

    // Resolution required if resolved
    if (tension.status === 'resolved' && !tension.resolution) {
      warnings.push({
        field: `${fieldPrefix}.resolution`,
        message: 'Resolved tension should have a "resolution" explaining how it was resolved'
      });
    }
  }
}

/**
 * Validate tension summary matches actual tensions
 */
function validateTensionSummary(
  summary: Record<string, unknown>,
  tensions: unknown[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Count actual tensions by type
  const counts = {
    trade_offs: 0,
    resource_tensions: 0,
    hidden_dependencies: 0,
    resolved: 0,
    unresolved: 0
  };

  for (const t of tensions) {
    const tension = t as Record<string, unknown>;
    switch (tension.type) {
      case 'trade_off': counts.trade_offs++; break;
      case 'resource_tension': counts.resource_tensions++; break;
      case 'hidden_dependency': counts.hidden_dependencies++; break;
    }
    if (tension.status === 'resolved') counts.resolved++;
    else counts.unresolved++;
  }

  // Validate counts match
  if (summary.trade_offs !== counts.trade_offs) {
    warnings.push({
      field: 'tension_summary.trade_offs',
      message: `trade_offs count (${summary.trade_offs}) doesn't match actual (${counts.trade_offs})`
    });
  }

  if (summary.resource_tensions !== counts.resource_tensions) {
    warnings.push({
      field: 'tension_summary.resource_tensions',
      message: `resource_tensions count (${summary.resource_tensions}) doesn't match actual (${counts.resource_tensions})`
    });
  }

  if (summary.hidden_dependencies !== counts.hidden_dependencies) {
    warnings.push({
      field: 'tension_summary.hidden_dependencies',
      message: `hidden_dependencies count (${summary.hidden_dependencies}) doesn't match actual (${counts.hidden_dependencies})`
    });
  }

  if (summary.resolved !== counts.resolved) {
    warnings.push({
      field: 'tension_summary.resolved',
      message: `resolved count (${summary.resolved}) doesn't match actual (${counts.resolved})`
    });
  }

  if (summary.unresolved !== counts.unresolved) {
    warnings.push({
      field: 'tension_summary.unresolved',
      message: `unresolved count (${summary.unresolved}) doesn't match actual (${counts.unresolved})`
    });
  }
}

/**
 * Validate iterations section (v2 only)
 */
function validateIterations(
  iterations: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(iterations)) {
    errors.push({ field: 'iterations', message: 'Iterations must be an array' });
    return;
  }

  const seenNumbers = new Set<number>();

  for (let i = 0; i < iterations.length; i++) {
    const iteration = iterations[i] as Record<string, unknown>;
    const fieldPrefix = `iterations[${i}]`;

    // Number required
    if (typeof iteration.number !== 'number') {
      errors.push({ field: `${fieldPrefix}.number`, message: 'Iteration must have a numeric "number"' });
    } else {
      if (seenNumbers.has(iteration.number)) {
        errors.push({
          field: `${fieldPrefix}.number`,
          message: `Duplicate iteration number ${iteration.number}`
        });
      }
      seenNumbers.add(iteration.number);
    }

    // Phase required
    if (!iteration.phase || typeof iteration.phase !== 'string') {
      errors.push({ field: `${fieldPrefix}.phase`, message: 'Iteration must have a string "phase"' });
    }

    // Timestamp required
    if (!iteration.timestamp || typeof iteration.timestamp !== 'string') {
      errors.push({ field: `${fieldPrefix}.timestamp`, message: 'Iteration must have a string "timestamp"' });
    }

    // Result required
    if (!iteration.result || typeof iteration.result !== 'string') {
      errors.push({ field: `${fieldPrefix}.result`, message: 'Iteration must have a string "result"' });
    }
  }
}

/**
 * Validate convergence section (v2 only)
 */
function validateConvergence(
  convergence: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Status required
  if (!convergence.status) {
    errors.push({ field: 'convergence.status', message: 'Convergence must have a "status"' });
  } else if (!VALID_CONVERGENCE_STATUSES.includes(convergence.status as any)) {
    errors.push({
      field: 'convergence.status',
      message: `Invalid convergence status "${convergence.status}". Must be: ${VALID_CONVERGENCE_STATUSES.join(', ')}`,
      value: convergence.status
    });
  }

  // If CONVERGED, should have criteria
  if (convergence.status === 'CONVERGED') {
    if (!convergence.criteria) {
      warnings.push({
        field: 'convergence.criteria',
        message: 'Converged manifold should have "criteria" documenting convergence conditions'
      });
    }
  }
}

/**
 * Validate anchors section
 */
function validateAnchors(
  anchors: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  strict: boolean
): void {
  // Required truths validation
  if (anchors.required_truths) {
    if (!Array.isArray(anchors.required_truths)) {
      errors.push({ field: 'anchors.required_truths', message: 'required_truths must be an array' });
    } else {
      for (let i = 0; i < anchors.required_truths.length; i++) {
        const rt = anchors.required_truths[i] as Record<string, unknown>;
        const fieldPrefix = `anchors.required_truths[${i}]`;

        if (!rt.id || typeof rt.id !== 'string') {
          errors.push({ field: `${fieldPrefix}.id`, message: 'Required truth must have a string "id"' });
        }

        if (!rt.statement || typeof rt.statement !== 'string') {
          errors.push({ field: `${fieldPrefix}.statement`, message: 'Required truth must have a string "statement"' });
        }

        if (rt.status && !VALID_REQUIRED_TRUTH_STATUSES.includes(rt.status as any)) {
          errors.push({
            field: `${fieldPrefix}.status`,
            message: `Invalid required truth status "${rt.status}". Must be: ${VALID_REQUIRED_TRUTH_STATUSES.join(', ')}`,
            value: rt.status
          });
        }
      }
    }
  }

  // Strict mode checks
  if (strict) {
    if (!anchors.recommended_option) {
      warnings.push({
        field: 'anchors.recommended_option',
        message: 'No recommended option specified',
        suggestion: 'Add a recommended_option after evaluating solution options'
      });
    }
  }
}

/**
 * Count constraints by category
 */
export function countConstraints(manifold: Manifold): Record<string, number> {
  const counts: Record<string, number> = {
    business: 0,
    technical: 0,
    user_experience: 0,
    security: 0,
    operational: 0,
    total: 0
  };

  if (!manifold.constraints) return counts;

  counts.business = manifold.constraints.business?.length ?? 0;
  counts.technical = manifold.constraints.technical?.length ?? 0;
  counts.user_experience = (manifold.constraints.user_experience?.length ?? 0) +
                           (manifold.constraints.ux?.length ?? 0);
  counts.security = manifold.constraints.security?.length ?? 0;
  counts.operational = manifold.constraints.operational?.length ?? 0;
  counts.total = counts.business + counts.technical + counts.user_experience +
                 counts.security + counts.operational;

  return counts;
}

/**
 * Count constraints by type
 */
export function countConstraintsByType(manifold: Manifold): Record<string, number> {
  const counts: Record<string, number> = {
    invariant: 0,
    goal: 0,
    boundary: 0
  };

  if (!manifold.constraints) return counts;

  const allConstraints: Constraint[] = [
    ...(manifold.constraints.business ?? []),
    ...(manifold.constraints.technical ?? []),
    ...(manifold.constraints.user_experience ?? []),
    ...(manifold.constraints.ux ?? []),
    ...(manifold.constraints.security ?? []),
    ...(manifold.constraints.operational ?? [])
  ];

  for (const c of allConstraints) {
    if (c.type && counts[c.type] !== undefined) {
      counts[c.type]++;
    }
  }

  return counts;
}

// ============================================================
// v3: Evidence Validation
// Satisfies: T1, RT-2, RT-8
// ============================================================

/**
 * Sanitize file path to prevent path traversal attacks
 * Satisfies: S2 (path traversal protection), RT-8
 */
export function sanitizePath(path: string, projectRoot?: string): { valid: boolean; error?: string } {
  // Reject paths with ../ traversal
  if (path.includes('../') || path.includes('..\\')) {
    return { valid: false, error: 'Path contains directory traversal (../)' };
  }

  // Reject absolute paths that don't start with project root
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    if (projectRoot && !path.startsWith(projectRoot)) {
      return { valid: false, error: 'Absolute path outside project root' };
    }
    // If no project root provided, reject all absolute paths for safety
    if (!projectRoot) {
      return { valid: false, error: 'Absolute paths not allowed without project root context' };
    }
  }

  // Reject paths with null bytes (common injection technique)
  if (path.includes('\0')) {
    return { valid: false, error: 'Path contains null byte' };
  }

  return { valid: true };
}

/**
 * Validate evidence array (v3)
 * Satisfies: T1, RT-2
 */
function validateEvidence(
  evidence: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(evidence)) {
    errors.push({ field: 'evidence', message: 'Evidence must be an array' });
    return;
  }

  for (let i = 0; i < evidence.length; i++) {
    const item = evidence[i] as Record<string, unknown>;
    const fieldPrefix = `evidence[${i}]`;

    // Type required
    if (!item.type) {
      errors.push({ field: `${fieldPrefix}.type`, message: 'Evidence must have a "type"' });
    } else if (!VALID_EVIDENCE_TYPES.includes(item.type as any)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Invalid evidence type "${item.type}". Must be: ${VALID_EVIDENCE_TYPES.join(', ')}`,
        value: item.type
      });
    }

    // Status validation
    if (item.status && !VALID_EVIDENCE_STATUSES.includes(item.status as any)) {
      errors.push({
        field: `${fieldPrefix}.status`,
        message: `Invalid evidence status "${item.status}". Must be: ${VALID_EVIDENCE_STATUSES.join(', ')}`,
        value: item.status
      });
    }

    // Type-specific validation
    const evidenceType = item.type as string;
    if (evidenceType === 'file_exists' || evidenceType === 'content_match' || evidenceType === 'test_passes') {
      if (!item.path || typeof item.path !== 'string') {
        errors.push({ field: `${fieldPrefix}.path`, message: `Evidence type "${evidenceType}" requires a "path"` });
      } else {
        // Path traversal check - Satisfies: S2, RT-8
        const pathCheck = sanitizePath(item.path as string);
        if (!pathCheck.valid) {
          errors.push({
            field: `${fieldPrefix}.path`,
            message: pathCheck.error || 'Invalid path',
            value: item.path
          });
        }
      }
    }

    if (evidenceType === 'content_match' && !item.pattern) {
      errors.push({ field: `${fieldPrefix}.pattern`, message: 'Evidence type "content_match" requires a "pattern"' });
    }

    if (evidenceType === 'test_passes' && !item.test_name) {
      warnings.push({
        field: `${fieldPrefix}.test_name`,
        message: 'Evidence type "test_passes" should have a "test_name"',
        suggestion: 'Add test_name for clearer test identification'
      });
    }

    if (evidenceType === 'metric_value') {
      if (!item.metric_name) {
        errors.push({ field: `${fieldPrefix}.metric_name`, message: 'Evidence type "metric_value" requires a "metric_name"' });
      }
      if (item.threshold === undefined) {
        errors.push({ field: `${fieldPrefix}.threshold`, message: 'Evidence type "metric_value" requires a "threshold"' });
      }
    }

    if (evidenceType === 'manual_review' && !item.verified_by) {
      warnings.push({
        field: `${fieldPrefix}.verified_by`,
        message: 'Evidence type "manual_review" should have a "verified_by"',
        suggestion: 'Add verified_by for audit trail'
      });
    }
  }
}

// ============================================================
// v3: Constraint Graph Validation
// Satisfies: T1, RT-2
// ============================================================

/**
 * Validate constraint graph (v3)
 * Satisfies: T1
 */
function validateConstraintGraph(
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
function collectConstraintIds(m: Record<string, unknown>): Set<string> {
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
function validateReferences(
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
