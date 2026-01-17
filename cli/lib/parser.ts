/**
 * YAML Parser for Manifold CLI
 * Satisfies: RT-1 (Fast/safe YAML parsing), T2 (Schema v1/v2 detection), S1 (Safe parsing)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import * as yaml from 'yaml';

// Schema version detection
export type SchemaVersion = 1 | 2 | 3;

// ============================================================
// v3: Evidence System - Reality Grounding
// ============================================================

export type EvidenceType = 'file_exists' | 'content_match' | 'test_passes' | 'metric_value' | 'manual_review';

export type EvidenceStatus = 'VERIFIED' | 'PENDING' | 'FAILED' | 'STALE';

export interface Evidence {
  type: EvidenceType;
  path: string;                    // File path for file-based evidence
  pattern?: string;                // Regex for content_match
  test_name?: string;              // Test identifier for test_passes
  metric_name?: string;            // Metric name for metric_value
  threshold?: number | string;     // Expected value/threshold
  verified_at?: string;            // ISO timestamp of last verification
  verified_by?: 'cli' | 'ci' | 'human'; // Who/what verified
  status: EvidenceStatus;
  message?: string;                // Verification result message
}

// ============================================================
// v3: Constraint Graph - Temporal Non-Linearity
// ============================================================

export type ConstraintNodeType = 'constraint' | 'tension' | 'required_truth' | 'artifact';
export type ConstraintNodeStatus = 'UNKNOWN' | 'REQUIRED' | 'SATISFIED' | 'BLOCKED' | 'CONFLICTED';

export interface ConstraintNode {
  id: string;
  type: ConstraintNodeType;
  label: string;                   // Human-readable label

  // Graph edges
  depends_on: string[];            // What must be true for this to be satisfied
  blocks: string[];                // What this blocks until satisfied
  conflicts_with: string[];        // Tension edges (bidirectional)

  // Temporal state
  status: ConstraintNodeStatus;
  critical_path: boolean;
  wave_number?: number;            // Which wave this executes in
}

export interface ConstraintGraph {
  version: 1;
  generated_at: string;
  feature: string;

  nodes: Record<string, ConstraintNode>;

  edges: {
    dependencies: [string, string][];     // [from, to] = from depends on to
    conflicts: [string, string][];        // Bidirectional conflict pairs
    satisfies: [string, string][];        // [artifact, constraint]
  };

  execution_plan?: ExecutionPlan;
}

export interface ExecutionPlan {
  generated_at: string;
  strategy: 'forward' | 'backward' | 'hybrid';

  waves: Wave[];
  critical_path: string[];
  parallelization_factor: number;
}

export interface Wave {
  number: number;
  phase: ManifoldPhase;            // Conceptual phase for human comprehension
  parallel_tasks: ParallelTask[];
  blocking_dependencies: string[];
}

export interface ParallelTask {
  id: string;
  node_ids: string[];
  action: string;
  description?: string;
  artifact_paths?: string[];
}

// Manifold phases
export type ManifoldPhase =
  | 'INITIALIZED'
  | 'CONSTRAINED'
  | 'TENSIONED'
  | 'ANCHORED'
  | 'GENERATED'
  | 'VERIFIED';

// Core manifold structure
export interface Manifold {
  schema_version?: SchemaVersion;
  feature: string;
  outcome?: string;
  phase: ManifoldPhase;
  created?: string;

  context?: {
    motivation?: string[];
    prior_art?: string[];
    success_metrics?: string[];
  };

  constraints?: {
    business?: Constraint[];
    technical?: Constraint[];
    user_experience?: Constraint[];
    ux?: Constraint[]; // Deprecated, v1 compatibility
    security?: Constraint[];
    operational?: Constraint[];
  };

  tensions?: Tension[];
  tension_summary?: TensionSummary;

  anchors?: {
    required_truths?: RequiredTruth[];
    recommended_option?: string;
    implementation_phases?: string[];
    anchor_document?: string;
  };

  iterations?: Iteration[];
  convergence?: Convergence;

  generation?: Generation;
  integration?: Integration;

  // Inline verification data (alternative to separate .verify.yaml)
  verification?: {
    timestamp?: string;
    result?: string;
    constraints_verified?: number;
    constraints_satisfied?: number;
    gaps_found?: number;
    gaps_blocking?: number;
    gaps_nonblocking?: number;
    required_truths_satisfied?: string | number;
    coverage?: Record<string, string | number>;
    verify_document?: string;
  };

  // v3: Constraint graph (computed from constraints, tensions, required truths)
  constraint_graph?: ConstraintGraph;
}

export interface Constraint {
  id: string;
  type: 'invariant' | 'goal' | 'boundary';
  statement: string;
  rationale?: string;
  // v3: Implementation linking
  implemented_by?: string[];       // Paths to implementation files
  verified_by?: Evidence[];        // How this is verified
  depends_on?: string[];           // Constraint dependencies
}

export interface Tension {
  id: string;
  type: 'trade_off' | 'resource_tension' | 'hidden_dependency';
  between: string[];
  description: string;
  status: 'resolved' | 'unresolved';
  resolution?: string;
  priority?: number;
}

export interface TensionSummary {
  trade_offs: number;
  resource_tensions: number;
  hidden_dependencies: number;
  total: number;
  resolved: number;
  unresolved: number;
}

export interface RequiredTruth {
  id: string;
  statement: string;
  status: 'SATISFIED' | 'PARTIAL' | 'NOT_SATISFIED' | 'SPECIFICATION_READY';
  priority?: number;
  // v1/v2: Simple evidence string
  evidence?: string | Evidence[];  // Support both string (v1/v2) and Evidence[] (v3)
  // v3: Enhanced tracking
  maps_to_constraints?: string[];  // Constraint IDs this RT satisfies
  last_verified?: string;          // ISO timestamp of last verification
}

export interface Iteration {
  number: number;
  phase: string;
  timestamp: string;
  result: string;
  [key: string]: any; // Additional phase-specific fields
}

export interface Convergence {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'CONVERGED';
  criteria?: {
    all_invariants_satisfied?: boolean;
    all_required_truths_satisfied?: boolean;
    no_blocking_gaps?: boolean;
    all_integrations_complete?: boolean;
    strict_verification_passed?: boolean;
  };
  iterations_to_convergence?: number;
  timestamp?: string;
}

export interface Generation {
  option?: string;
  timestamp?: string;
  iteration?: number;
  artifacts?: Artifact[];
  coverage?: Coverage;
}

export interface Artifact {
  path: string;
  type: string;
  satisfies?: string[];
  status: string;
  description?: string;
}

export interface Coverage {
  constraints_addressed: number;
  constraints_total: number;
  required_truths_addressed: number;
  required_truths_total: number;
  percentage: number;
}

export interface Integration {
  timestamp?: string;
  iteration?: number;
  checklist?: IntegrationItem[];
  summary?: {
    total_points: number;
    completed: number;
    pending: number;
  };
}

export interface IntegrationItem {
  id: string;
  source: string;
  target: string;
  action: string;
  status: 'completed' | 'pending';
  satisfies?: string[];
}

// Anchor document structure
export interface AnchorDocument {
  feature: string;
  anchor_type?: string;
  outcome?: {
    original: string;
    anchored: string;
  };
  required_truths?: AnchorRequiredTruth[];
  dependency_chain?: {
    parallel_tracks?: { [key: string]: string[] };
    sequential?: string[];
    blocking?: string[];
  };
  options?: SolutionOption[];
  recommendation?: {
    selected_option: string;
    name: string;
    rationale?: string[];
    implementation_structure?: any;
    deliverables?: string[];
    build_artifacts?: string[];
  };
  critical_path?: { [phase: string]: CriticalPathPhase };
  validation_gates?: { [phase: string]: string[] };
}

export interface AnchorRequiredTruth {
  id: string;
  statement: string;
  requires?: string[];
  maps_to_constraints?: string[];
  current_state?: string;
  status: string;
  priority?: number;
}

export interface SolutionOption {
  id: string;
  name: string;
  description: string;
  tech_stack?: string;
  commands?: string[];
  satisfies?: string[];
  gaps?: string[];
  effort?: string;
  risk?: string;
}

export interface CriticalPathPhase {
  name: string;
  tasks: string[];
  unblocks?: string[];
}

// Verify document structure
export interface VerifyDocument {
  verification: {
    timestamp: string;
    mode?: string;
    result: 'PASS' | 'FAIL' | 'PARTIAL';
    artifacts?: {
      verified: number;
      total: number;
      status: string;
      details?: any[];
    };
    required_truths?: { [id: string]: RequiredTruthVerification };
    coverage?: CoverageVerification;
  };
  iterations?: Iteration[];
  convergence?: Convergence;
}

export interface RequiredTruthVerification {
  description: string;
  status: 'SATISFIED' | 'PARTIAL' | 'NOT_SATISFIED';
  evidence?: string[];
}

export interface CoverageVerification {
  total_constraints: number;
  satisfied: number;
  partial: number;
  not_addressed: number;
  percentage: number;
  by_category?: { [category: string]: CategoryCoverage };
  by_type?: { [type: string]: TypeCoverage };
}

export interface CategoryCoverage {
  total: number;
  satisfied: number;
  constraints?: string[];
}

export interface TypeCoverage {
  total: number;
  satisfied: number;
  note?: string;
}

/**
 * Parse YAML content safely (no code execution)
 * Satisfies: S1 (Safe parsing - uses yaml library's safe defaults)
 */
export function parseYamlSafe<T = unknown>(content: string): T | null {
  try {
    return yaml.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Detect schema version from manifold data
 * Satisfies: T2 (Schema v1/v2/v3 detection)
 */
export function detectSchemaVersion(manifold: Manifold): SchemaVersion {
  // Explicit schema_version field is authoritative
  if (manifold.schema_version === 3) return 3;
  if (manifold.schema_version === 2) return 2;
  if (manifold.schema_version === 1) return 1;

  // v3 detection: presence of constraint_graph or evidence[]
  if (manifold.constraint_graph) return 3;
  if (Array.isArray(manifold.evidence)) return 3;

  // v2 detection: presence of iterations[] or convergence{}
  if (manifold.iterations?.length || manifold.convergence) return 2;

  // Default to v1 for backward compatibility
  return 1;
}

/**
 * Read and parse a manifold file
 */
export function readManifold(filePath: string): Manifold | null {
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseYamlSafe<Manifold>(content);
  } catch {
    return null;
  }
}

/**
 * Read and parse an anchor document
 */
export function readAnchor(filePath: string): AnchorDocument | null {
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseYamlSafe<AnchorDocument>(content);
  } catch {
    return null;
  }
}

/**
 * Read and parse a verify document
 */
export function readVerify(filePath: string): VerifyDocument | null {
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseYamlSafe<VerifyDocument>(content);
  } catch {
    return null;
  }
}

/**
 * Find .manifold directory from current working directory
 * Satisfies: S2 (File operations restricted to .manifold/)
 */
export function findManifoldDir(cwd: string = process.cwd()): string | null {
  const manifoldDir = join(cwd, '.manifold');

  if (existsSync(manifoldDir) && statSync(manifoldDir).isDirectory()) {
    return manifoldDir;
  }

  return null;
}

/**
 * List all manifold features in the .manifold directory
 * Only returns features that have a main manifold file (not just anchor/verify files)
 */
export function listFeatures(manifoldDir: string): string[] {
  if (!existsSync(manifoldDir)) return [];

  const files = readdirSync(manifoldDir);
  const features = new Set<string>();

  for (const file of files) {
    if (!file.endsWith('.yaml')) continue;

    // Skip anchor and verify files - only count main manifold files
    if (file.endsWith('.anchor.yaml') || file.endsWith('.verify.yaml')) {
      continue;
    }

    // Extract feature name from main manifold filename
    const featureName = file.replace('.yaml', '');
    features.add(featureName);
  }

  return Array.from(features).sort();
}

/**
 * Get all files for a specific feature
 */
export interface FeatureFiles {
  manifold?: string;
  anchor?: string;
  verify?: string;
}

export function getFeatureFiles(manifoldDir: string, feature: string): FeatureFiles {
  const files: FeatureFiles = {};

  const manifoldPath = join(manifoldDir, `${feature}.yaml`);
  const anchorPath = join(manifoldDir, `${feature}.anchor.yaml`);
  const verifyPath = join(manifoldDir, `${feature}.verify.yaml`);

  if (existsSync(manifoldPath)) files.manifold = manifoldPath;
  if (existsSync(anchorPath)) files.anchor = anchorPath;
  if (existsSync(verifyPath)) files.verify = verifyPath;

  return files;
}

/**
 * Load complete feature data
 */
export interface FeatureData {
  feature: string;
  manifold?: Manifold;
  anchor?: AnchorDocument;
  verify?: VerifyDocument;
  schemaVersion: SchemaVersion;
}

export function loadFeature(manifoldDir: string, feature: string): FeatureData | null {
  const files = getFeatureFiles(manifoldDir, feature);

  if (!files.manifold) return null;

  const manifold = readManifold(files.manifold);
  if (!manifold) return null;

  const data: FeatureData = {
    feature,
    manifold,
    schemaVersion: detectSchemaVersion(manifold),
  };

  if (files.anchor) {
    data.anchor = readAnchor(files.anchor) ?? undefined;
  }

  if (files.verify) {
    data.verify = readVerify(files.verify) ?? undefined;
  }

  return data;
}
