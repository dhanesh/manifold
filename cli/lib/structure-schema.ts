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
// Evidence Reference (v3)
// ============================================================
// NOTE: Defined before Constraint/RequiredTruth refs so they can
// reference EvidenceRefSchema for verified_by/evidence fields.

// Satisfaction levels: tiered verification depth (GAP-05)
export const SatisfactionLevelSchema = z.enum([
  'DOCUMENTED',    // Constraint acknowledged in docs/specs
  'IMPLEMENTED',   // Code exists that addresses constraint
  'TESTED',        // Tests verify constraint behavior
  'VERIFIED'       // Automated verification confirms satisfaction
]);

export type SatisfactionLevel = z.infer<typeof SatisfactionLevelSchema>;

// Test tier classification (GAP-02)
export const TestTierSchema = z.enum(['unit', 'integration', 'e2e']);

export type TestTier = z.infer<typeof TestTierSchema>;

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
  // v3.1: Framework gap remediation additions
  test_tier: TestTierSchema.optional(),              // GAP-02: test tier classification
  validation_criteria: z.string().optional(),         // GAP-08: tension resolution verification
  file_hash: z.string().optional(),                   // GAP-07: drift detection baseline
});

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

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

// Enhancement 2: Constraint genealogy source taxonomy
export const ConstraintSourceSchema = z.enum(['interview', 'pre-mortem', 'assumption']);
export type ConstraintSource = z.infer<typeof ConstraintSourceSchema>;

// Enhancement 2: Constraint genealogy challenger taxonomy
export const ConstraintChallengerSchema = z.enum([
  'regulation',
  'stakeholder',
  'technical-reality',
  'assumption'
]);
export type ConstraintChallenger = z.infer<typeof ConstraintChallengerSchema>;

// Enhancement 6: Probabilistic constraint threshold
export const ThresholdKindSchema = z.enum(['deterministic', 'statistical']);
export type ThresholdKind = z.infer<typeof ThresholdKindSchema>;

export const ConstraintThresholdSchema = z.object({
  kind: ThresholdKindSchema,
  // Deterministic fields
  ceiling: z.string().optional(),
  // Statistical fields
  p99: z.string().optional(),
  p50: z.string().optional(),
  failure_rate: z.string().optional(),
  window: z.string().optional(),
}).passthrough();
export type ConstraintThreshold = z.infer<typeof ConstraintThresholdSchema>;

export const ConstraintRefSchema = z.object({
  id: ConstraintIdSchema,
  type: ConstraintTypeSchema,
  verified_by: z.array(EvidenceRefSchema).optional(),  // v3: evidence verifying this constraint
  // Enhancement 2: Constraint genealogy (optional, defaults inferred by AI)
  source: ConstraintSourceSchema.optional(),
  challenger: ConstraintChallengerSchema.optional(),
  // Enhancement 6: Probabilistic constraint bounds (optional, metric constraints only)
  threshold: ConstraintThresholdSchema.optional(),
  // Constraint quality scoring (specificity, measurability, testability: 1-3 each)
  quality: z.object({
    specificity: z.number().min(1).max(3),
    measurability: z.number().min(1).max(3),
    testability: z.number().min(1).max(3),
  }).optional(),
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

// Enhancement 8: Propagation effect on a constraint after tension resolution
export const PropagationEffectSchema = z.enum(['TIGHTENED', 'LOOSENED', 'VIOLATED']);
export type PropagationEffect = z.infer<typeof PropagationEffectSchema>;

export const PropagationEntrySchema = z.object({
  constraint_id: z.string(),
  effect: PropagationEffectSchema,
  note: z.string().optional(),
});
export type PropagationEntry = z.infer<typeof PropagationEntrySchema>;

export const TensionRefSchema = z.object({
  id: TensionIdSchema,
  type: TensionTypeSchema,
  between: z.array(z.string()).min(2, 'Tension must reference at least 2 constraints'),
  status: TensionStatusSchema,
  // v3.1: Testable resolution criteria (GAP-08)
  validation_criteria: z.array(z.string()).optional(),
  // Enhancement 3: TRIZ principles applied during resolution
  triz_principles: z.array(z.string()).optional(),
  // Enhancement 8: Directional constraint propagation effects
  propagation_effects: z.array(PropagationEntrySchema).optional(),
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

// Enhancement 7: Recursive backward chaining - sub-truth IDs use dotted notation (RT-1.1, RT-1.1.2)
export const RequiredTruthRefSchema: z.ZodType<any> = z.object({
  id: z.string().regex(/^RT-[\d.]+$/, 'Required Truth ID must match pattern like RT-1, RT-1.1, RT-1.1.2'),
  status: RequiredTruthStatusSchema,
  maps_to: z.array(z.string()).optional(),
  evidence: z.array(EvidenceRefSchema).optional(),  // v3: evidence for this RT
  // Enhancement 7: Recursive backward chaining
  depth: z.number().optional(),
  children: z.lazy(() => z.array(RequiredTruthRefSchema)).optional(),
});

export type RequiredTruthRef = z.infer<typeof RequiredTruthRefSchema>;

// ============================================================
// Constraint Graph (v3)
// ============================================================

// Edges can be arrays of [string, string] pairs OR objects with {from, to, reason}
const EdgeItemSchema = z.union([
  z.array(z.string()).min(2),
  z.record(z.any()),
]);

export const ConstraintGraphEdgesSchema = z.object({
  dependencies: z.array(EdgeItemSchema).optional(),
  conflicts: z.array(EdgeItemSchema).optional(),
  satisfies: z.array(EdgeItemSchema).optional(),
});

export type ConstraintGraphEdges = z.infer<typeof ConstraintGraphEdgesSchema>;

export const ConstraintNodeRefSchema = z.object({
  id: z.string().optional(), // Optional when used as record value (key is the ID)
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

// Enhancement 5: Theory of Constraints binding constraint
export const BindingConstraintSchema = z.object({
  required_truth_id: z.string(),
  reason: z.string().optional(),
  dependency_chain: z.array(z.string()).optional(),
});
export type BindingConstraint = z.infer<typeof BindingConstraintSchema>;

export const AnchorsSchema = z.object({
  required_truths: z.array(RequiredTruthRefSchema).default([]),
  recommended_option: z.string().optional(),
  // implementation_phases can be strings or objects (from legacy YAML formats)
  implementation_phases: z.array(z.union([z.string(), z.record(z.any())])).optional(),
  anchor_document: z.string().optional(),
  // Enhancement 5: Theory of Constraints bottleneck identification
  binding_constraint: BindingConstraintSchema.optional(),
  // Cross-phase feedback: solution option validates m2 tension resolutions
  tension_validation: z.array(z.object({
    tension_id: z.string(),
    status: z.enum(['CONFIRMED', 'REOPENED']),
    by_option: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
});

export type Anchors = z.infer<typeof AnchorsSchema>;

// ============================================================
// Convergence Section
// ============================================================

export const ConvergenceSchema = z.object({
  status: ConvergenceStatusSchema,
  // Criteria can be a structured object or a plain string summary
  criteria: z.union([
    z.object({
      all_invariants_satisfied: z.boolean().optional(),
      all_required_truths_satisfied: z.boolean().optional(),
      no_blocking_gaps: z.boolean().optional(),
      all_integrations_complete: z.boolean().optional(),
      strict_verification_passed: z.boolean().optional(),
      verification_passed: z.boolean().optional(), // Legacy alias
    }),
    z.string(),
  ]).optional(),
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

// Artifact classification (GAP-13)
export const ArtifactClassSchema = z.enum(['substantive', 'structural']);

export type ArtifactClass = z.infer<typeof ArtifactClassSchema>;

export const ArtifactRefSchema = z.object({
  path: z.string(),
  type: z.string(),
  satisfies: z.array(z.string()).optional(),
  status: z.string(),
  description: z.string().optional(),
  // v3.1: Framework gap remediation additions
  file_hash: z.string().optional(),                   // GAP-07: drift detection for artifacts
  artifact_class: ArtifactClassSchema.optional(),      // GAP-13: substantive vs structural
});

export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

export const GenerationSchema = z.object({
  option: z.string().optional(),
  timestamp: z.string().optional(),
  iteration: z.number().optional(),
  artifacts: z.array(ArtifactRefSchema).optional(),
  // Coverage fields are all optional to support varying manifold formats
  coverage: z.object({
    constraints_addressed: z.number().optional(),
    constraints_total: z.number().optional(),
    required_truths_addressed: z.number().optional(),
    required_truths_total: z.number().optional(),
    percentage: z.number().optional(),
  }).passthrough().optional(),
});

export type Generation = z.infer<typeof GenerationSchema>;

// ============================================================
// Suggested Constraints (TN3: staging area for auto-generated)
// ============================================================

export const SuggestedConstraintSchema = z.object({
  id: z.string(),
  category: z.enum(['business', 'technical', 'user_experience', 'security', 'operational']),
  type: ConstraintTypeSchema,
  source_constraint: z.string(),   // ID of constraint that triggered auto-generation
  auto_generated: z.literal(true),
  promoted: z.boolean().default(false),
});

export type SuggestedConstraint = z.infer<typeof SuggestedConstraintSchema>;

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
  // Non-software domain: translation layer for non-engineering contexts
  domain: z.enum(['software', 'non-software']).optional(),

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

  // Enhancement 4: Reversibility tagging per decision
  reversibility_log: z.array(z.object({
    action_step: z.number(),
    description: z.string(),
    reversibility: z.enum(['TWO_WAY', 'REVERSIBLE_WITH_COST', 'ONE_WAY']),
    one_way_consequence: z.string().optional(),
  })).optional(),

  // Evidence (v3)
  evidence: z.array(EvidenceRefSchema).optional(),

  // Constraint graph (v3)
  constraint_graph: ConstraintGraphSchema.optional(),

  // Suggested constraints (v3.1: TN3 staging area)
  suggested_constraints: z.array(SuggestedConstraintSchema).optional(),

  // GAP checklist compliance (mandatory-or-skip tracking from m1)
  gap_checklist_compliance: z.array(z.object({
    gap: z.string(),
    status: z.enum(['COMPLETED', 'SKIPPED']),
    skip_reason: z.string().optional(),
  })).optional(),

  // Draft required truths seeded by m1 for m3 consumption
  draft_required_truths: z.array(z.object({
    id: z.string(),
    seed_from: z.array(z.string()),
    draft_statement: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  })).optional(),

  // Blocking dependencies exported by m2 for m3 prioritization
  blocking_dependencies: z.array(z.object({
    blocker: z.string(),
    blocked: z.string(),
    tension_id: z.string(),
  })).optional(),

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
  $refStrategy: 'root',
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
export const VALID_SATISFACTION_LEVELS = SatisfactionLevelSchema.options;
export const VALID_TEST_TIERS = TestTierSchema.options;
export const VALID_ARTIFACT_CLASSES = ArtifactClassSchema.options;
export const VALID_CONSTRAINT_SOURCES = ConstraintSourceSchema.options;
export const VALID_CONSTRAINT_CHALLENGERS = ConstraintChallengerSchema.options;
export const VALID_THRESHOLD_KINDS = ThresholdKindSchema.options;
export const VALID_PROPAGATION_EFFECTS = PropagationEffectSchema.options;
