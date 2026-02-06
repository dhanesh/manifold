/**
 * Structure Schema for Manifold JSON Files
 * Satisfies: RT-1 (Guaranteed valid structure via constrained decoding)
 *
 * This schema defines the structure-only format for manifold JSON files.
 * Text content (statements, descriptions, rationale) lives in companion Markdown files.
 * This separation eliminates field name confusion (statement vs description).
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================
// Phase Enum
// ============================================================

export const PhaseSchema = z.enum([
  'INITIALIZED',
  'CONSTRAINED',
  'TENSIONED',
  'ANCHORED',
  'GENERATED',
  'VERIFIED'
]);

export type Phase = z.infer<typeof PhaseSchema>;

// ============================================================
// Constraint Type Enum
// ============================================================

export const ConstraintTypeSchema = z.enum(['invariant', 'goal', 'boundary']);

export type ConstraintType = z.infer<typeof ConstraintTypeSchema>;

// ============================================================
// Tension Type and Status Enums
// ============================================================

export const TensionTypeSchema = z.enum([
  'trade_off',
  'resource_tension',
  'hidden_dependency'
]);

export type TensionType = z.infer<typeof TensionTypeSchema>;

export const TensionStatusSchema = z.enum(['resolved', 'unresolved']);

export type TensionStatus = z.infer<typeof TensionStatusSchema>;

// ============================================================
// Required Truth Status Enum
// ============================================================

export const RequiredTruthStatusSchema = z.enum([
  'SATISFIED',
  'PARTIAL',
  'NOT_SATISFIED',
  'SPECIFICATION_READY'
]);

export type RequiredTruthStatus = z.infer<typeof RequiredTruthStatusSchema>;

// ============================================================
// Convergence Status Enum
// ============================================================

export const ConvergenceStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'CONVERGED'
]);

export type ConvergenceStatus = z.infer<typeof ConvergenceStatusSchema>;

// ============================================================
// Evidence Types (v3)
// ============================================================

export const EvidenceTypeSchema = z.enum([
  'file_exists',
  'content_match',
  'test_passes',
  'metric_value',
  'manual_review'
]);

export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceStatusSchema = z.enum([
  'VERIFIED',
  'PENDING',
  'FAILED',
  'STALE'
]);

export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

// ============================================================
// Constraint Node Types (v3 Graph)
// ============================================================

export const NodeTypeSchema = z.enum([
  'constraint',
  'tension',
  'required_truth',
  'artifact'
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export const NodeStatusSchema = z.enum([
  'UNKNOWN',
  'REQUIRED',
  'SATISFIED',
  'BLOCKED',
  'CONFLICTED'
]);

export type NodeStatus = z.infer<typeof NodeStatusSchema>;

// ============================================================
// Constraint Reference (Structure Only - NO text content)
// ============================================================

/**
 * Constraint ID prefix patterns by category:
 * - Business: B1, B2, ...
 * - Technical: T1, T2, ...
 * - User Experience: U1, U2, ...
 * - Security: S1, S2, ...
 * - Operational: O1, O2, ...
 */
export const ConstraintIdSchema = z.string().regex(
  /^[BTUSO]\d+$/,
  'Constraint ID must match pattern like B1, T2, U3, S4, O5'
);

export const ConstraintRefSchema = z.object({
  id: ConstraintIdSchema,
  type: ConstraintTypeSchema,
});

export type ConstraintRef = z.infer<typeof ConstraintRefSchema>;

// ============================================================
// Tension Reference (Structure Only - NO text content)
// ============================================================

/**
 * Tension ID pattern: TN1, TN2, ...
 */
export const TensionIdSchema = z.string().regex(
  /^TN\d+$/,
  'Tension ID must match pattern like TN1, TN2'
);

export const TensionRefSchema = z.object({
  id: TensionIdSchema,
  type: TensionTypeSchema,
  between: z.array(z.string()).min(2, 'Tension must reference at least 2 constraints'),
  status: TensionStatusSchema,
});

export type TensionRef = z.infer<typeof TensionRefSchema>;

// ============================================================
// Required Truth Reference (Structure Only - NO text content)
// ============================================================

/**
 * Required Truth ID pattern: RT-1, RT-2, ...
 */
export const RequiredTruthIdSchema = z.string().regex(
  /^RT-\d+$/,
  'Required Truth ID must match pattern like RT-1, RT-2'
);

export const RequiredTruthRefSchema = z.object({
  id: RequiredTruthIdSchema,
  status: RequiredTruthStatusSchema,
  maps_to: z.array(z.string()).optional(),
});

export type RequiredTruthRef = z.infer<typeof RequiredTruthRefSchema>;

// ============================================================
// Evidence Reference (v3)
// ============================================================

export const EvidenceRefSchema = z.object({
  id: z.string(),
  type: EvidenceTypeSchema,
  path: z.string().optional(),
  pattern: z.string().optional(),
  test_name: z.string().optional(),
  metric_name: z.string().optional(),
  threshold: z.union([z.string(), z.number()]).optional(),
  status: EvidenceStatusSchema.optional(),
  satisfies: z.array(z.string()).optional(),
});

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

// ============================================================
// Constraint Graph (v3)
// ============================================================

export const ConstraintGraphEdgesSchema = z.object({
  dependencies: z.array(z.array(z.string()).min(2)).optional(),
  conflicts: z.array(z.array(z.string()).min(2)).optional(),
  satisfies: z.array(z.array(z.string()).min(2)).optional(),
});

export type ConstraintGraphEdges = z.infer<typeof ConstraintGraphEdgesSchema>;

export const ConstraintNodeRefSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema.optional(),
  status: NodeStatusSchema.optional(),
  depends_on: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  conflicts_with: z.array(z.string()).optional(),
  critical_path: z.boolean().optional(),
  wave_number: z.number().optional(),
});

export type ConstraintNodeRef = z.infer<typeof ConstraintNodeRefSchema>;

export const ConstraintGraphSchema = z.object({
  version: z.number().optional(),
  feature: z.string().optional(),
  generated_at: z.string().optional(),
  nodes: z.record(z.string(), ConstraintNodeRefSchema).optional(),
  edges: ConstraintGraphEdgesSchema.optional(),
});

export type ConstraintGraph = z.infer<typeof ConstraintGraphSchema>;

// ============================================================
// Constraints By Category
// ============================================================

export const ConstraintsByCategorySchema = z.object({
  business: z.array(ConstraintRefSchema).default([]),
  technical: z.array(ConstraintRefSchema).default([]),
  user_experience: z.array(ConstraintRefSchema).default([]),
  security: z.array(ConstraintRefSchema).default([]),
  operational: z.array(ConstraintRefSchema).default([]),
});

export type ConstraintsByCategory = z.infer<typeof ConstraintsByCategorySchema>;

// ============================================================
// Anchors Section
// ============================================================

export const AnchorsSchema = z.object({
  required_truths: z.array(RequiredTruthRefSchema).default([]),
  recommended_option: z.string().optional(),
  // implementation_phases can be strings or objects (from legacy YAML formats)
  implementation_phases: z.array(z.union([z.string(), z.record(z.any())])).optional(),
  anchor_document: z.string().optional(),
});

export type Anchors = z.infer<typeof AnchorsSchema>;

// ============================================================
// Convergence Section
// ============================================================

export const ConvergenceSchema = z.object({
  status: ConvergenceStatusSchema,
  criteria: z.object({
    all_invariants_satisfied: z.boolean().optional(),
    all_required_truths_satisfied: z.boolean().optional(),
    no_blocking_gaps: z.boolean().optional(),
    all_integrations_complete: z.boolean().optional(),
    strict_verification_passed: z.boolean().optional(),
    verification_passed: z.boolean().optional(), // Legacy alias
  }).optional(),
  iterations_to_convergence: z.number().optional(),
  timestamp: z.string().optional(),
  progress: z.string().optional(),
  converged_at: z.string().optional(),
});

export type Convergence = z.infer<typeof ConvergenceSchema>;

// ============================================================
// Iteration Section
// ============================================================

export const IterationSchema = z.object({
  number: z.number(),
  phase: z.string(),
  timestamp: z.string(),
  result: z.string(),
}).passthrough(); // Allow additional phase-specific fields

export type Iteration = z.infer<typeof IterationSchema>;

// ============================================================
// Generation Section
// ============================================================

export const ArtifactRefSchema = z.object({
  path: z.string(),
  type: z.string(),
  satisfies: z.array(z.string()).optional(),
  status: z.string(),
  description: z.string().optional(),
});

export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

export const GenerationSchema = z.object({
  option: z.string().optional(),
  timestamp: z.string().optional(),
  iteration: z.number().optional(),
  artifacts: z.array(ArtifactRefSchema).optional(),
  coverage: z.object({
    constraints_addressed: z.number(),
    constraints_total: z.number(),
    required_truths_addressed: z.number(),
    required_truths_total: z.number(),
    percentage: z.number(),
  }).optional(),
});

export type Generation = z.infer<typeof GenerationSchema>;

// ============================================================
// Main Manifold Structure Schema
// ============================================================

/**
 * ManifoldStructure - JSON structure file for manifolds
 *
 * Key design principle: NO text content fields.
 * All human-readable content (statements, descriptions, rationale)
 * lives in the companion Markdown file.
 *
 * IDs in this file link to Markdown headings:
 * - {"id": "B1", "type": "invariant"} → #### B1: Title in Markdown
 * - {"id": "TN1", ...} → ### TN1: Title in Markdown
 */
export const ManifoldStructureSchema = z.object({
  // Schema metadata
  $schema: z.string().optional(),
  schema_version: z.literal(3).default(3),

  // Feature identification
  feature: z.string().min(1, 'Feature name is required'),
  phase: PhaseSchema,
  mode: z.enum(['light', 'full']).optional(),

  // Outcome reference (content in Markdown)
  outcome_ref: z.string().optional(),

  // Template info
  template: z.string().optional(),
  template_version: z.number().optional(),

  // Timestamps
  created: z.string().optional(),
  updated: z.string().optional(),

  // Constraints (structure only - content in Markdown)
  constraints: ConstraintsByCategorySchema.optional(),

  // Tensions (structure only - content in Markdown)
  tensions: z.array(TensionRefSchema).default([]),

  // Tension summary (derived)
  tension_summary: z.object({
    trade_offs: z.number(),
    resource_tensions: z.number(),
    hidden_dependencies: z.number(),
    total: z.number(),
    resolved: z.number(),
    unresolved: z.number(),
  }).optional(),

  // Anchors (structure only - content in Markdown)
  anchors: AnchorsSchema.optional(),

  // Iterations
  iterations: z.array(IterationSchema).optional(),

  // Convergence
  convergence: ConvergenceSchema.optional(),

  // Generation tracking
  generation: GenerationSchema.optional(),

  // Evidence (v3)
  evidence: z.array(EvidenceRefSchema).optional(),

  // Constraint graph (v3)
  constraint_graph: ConstraintGraphSchema.optional(),

  // Quick summary for light mode
  quick_summary: z.object({
    started: z.string().optional(),
    completed: z.string().optional(),
    files_changed: z.number().optional(),
    tests_added: z.number().optional(),
  }).optional(),
});

export type ManifoldStructure = z.infer<typeof ManifoldStructureSchema>;

// ============================================================
// JSON Schema Export (for Claude tool_use and IDE support)
// ============================================================

/**
 * Export as JSON Schema for:
 * 1. Claude tool_use constrained decoding (guaranteed valid structure)
 * 2. IDE support and validation
 */
export const manifoldStructureJsonSchema = zodToJsonSchema(ManifoldStructureSchema, {
  name: 'ManifoldStructure',
  $refStrategy: 'none',
});

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Parse and validate a JSON structure file
 */
export function parseManifoldStructure(json: unknown): {
  success: true;
  data: ManifoldStructure;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = ManifoldStructureSchema.safeParse(json);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Validate a JSON structure without parsing
 */
export function validateManifoldStructure(json: unknown): {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
} {
  const result = ManifoldStructureSchema.safeParse(json);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { valid: false, errors };
}

/**
 * Collect all constraint IDs from a manifold structure
 */
export function collectStructureIds(structure: ManifoldStructure): Set<string> {
  const ids = new Set<string>();

  // Collect constraint IDs
  if (structure.constraints) {
    for (const category of ['business', 'technical', 'user_experience', 'security', 'operational'] as const) {
      for (const constraint of structure.constraints[category] || []) {
        ids.add(constraint.id);
      }
    }
  }

  // Collect tension IDs
  for (const tension of structure.tensions || []) {
    ids.add(tension.id);
  }

  // Collect required truth IDs
  if (structure.anchors?.required_truths) {
    for (const rt of structure.anchors.required_truths) {
      ids.add(rt.id);
    }
  }

  return ids;
}

/**
 * Validate that all tension.between references exist
 */
export function validateTensionReferences(structure: ManifoldStructure): Array<{
  tensionId: string;
  missingRef: string;
}> {
  const constraintIds = new Set<string>();

  // Collect all constraint IDs
  if (structure.constraints) {
    for (const category of ['business', 'technical', 'user_experience', 'security', 'operational'] as const) {
      for (const constraint of structure.constraints[category] || []) {
        constraintIds.add(constraint.id);
      }
    }
  }

  // Check tension references
  const errors: Array<{ tensionId: string; missingRef: string }> = [];

  for (const tension of structure.tensions || []) {
    for (const ref of tension.between) {
      if (!constraintIds.has(ref)) {
        errors.push({ tensionId: tension.id, missingRef: ref });
      }
    }
  }

  return errors;
}

/**
 * Validate that all required truth maps_to references exist
 */
export function validateRequiredTruthReferences(structure: ManifoldStructure): Array<{
  truthId: string;
  missingRef: string;
}> {
  const allIds = collectStructureIds(structure);
  const errors: Array<{ truthId: string; missingRef: string }> = [];

  if (structure.anchors?.required_truths) {
    for (const rt of structure.anchors.required_truths) {
      if (rt.maps_to) {
        for (const ref of rt.maps_to) {
          if (!allIds.has(ref)) {
            errors.push({ truthId: rt.id, missingRef: ref });
          }
        }
      }
    }
  }

  return errors;
}

// ============================================================
// Schema Version Constants
// ============================================================

export const SCHEMA_VERSION = 3;
export const VALID_PHASES = PhaseSchema.options;
export const VALID_CONSTRAINT_TYPES = ConstraintTypeSchema.options;
export const VALID_TENSION_TYPES = TensionTypeSchema.options;
export const VALID_TENSION_STATUSES = TensionStatusSchema.options;
export const VALID_REQUIRED_TRUTH_STATUSES = RequiredTruthStatusSchema.options;
export const VALID_CONVERGENCE_STATUSES = ConvergenceStatusSchema.options;
export const VALID_EVIDENCE_TYPES = EvidenceTypeSchema.options;
export const VALID_EVIDENCE_STATUSES = EvidenceStatusSchema.options;
export const VALID_NODE_TYPES = NodeTypeSchema.options;
export const VALID_NODE_STATUSES = NodeStatusSchema.options;
