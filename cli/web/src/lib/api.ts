/**
 * API client for the two-tier /api/manifolds surface.
 * Satisfies: RT-12 (two-tier API surface), U4 (multi-manifold index).
 */

export interface ManifoldSummary {
  feature: string;
  phase: string;
  outcome: string;
  domain: 'software' | 'non-software';
  schema_version: number;
  format: string;
  /** ISO timestamp; falls back to file mtime when JSON has no `created`. */
  created: string;
  counts: {
    constraints: number;
    tensions: number;
    required_truths: number;
  };
}

export interface GraphNode {
  id: string;
  kind: 'constraint' | 'tension' | 'required_truth' | 'artifact';
  label: string;
  group?: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: 'dependency' | 'conflict' | 'satisfies' | 'maps_to';
  origin: 'native' | 'synthesised';
}

export interface VerifyMatrixEntry {
  constraint: string;
  type?: string;
  title?: string;
  status?: string;
  level?: string;
  evidence?: string;
}

export interface VerifyData {
  result?: string;
  convergence_status?: string;
  matrix?: VerifyMatrixEntry[];
  coverage?: unknown;
  gaps?: unknown[];
  closed_gaps?: unknown[];
}

export interface ManifoldJson {
  feature: string;
  phase: string;
  schema_version: number;
  domain: 'software' | 'non-software';
  outcome?: string;
  constraints?: Record<string, Array<{ id: string; type?: string; threshold?: unknown; quality?: unknown; source?: string; challenger?: string }>>;
  tensions?: Array<{
    id: string;
    type?: string;
    between?: string[];
    status?: string;
    triz_principles?: string[];
    propagation_effects?: Array<{ constraint_id: string; effect: string; note?: string }>;
    validation_criteria?: string[];
  }>;
  anchors?: {
    required_truths?: Array<{ id: string; status?: string; maps_to?: string[]; evidence?: Array<{ id?: string; type?: string; status?: string; path?: string }> }>;
    binding_constraint?: { required_truth_id?: string; reason?: string; dependency_chain?: string[] };
    recommended_option?: string;
    solution_options?: Array<{ id: string; name: string; reversibility?: string; satisfies?: string[]; gaps?: string[]; note?: string }>;
  };
  convergence?: { status?: string; summary?: string; blockers?: string[] };
  iterations?: Array<{ number: number; phase: string; result: string; timestamp?: string }>;
  generation?: { option?: string; coverage?: { percentage?: number } };
}

export interface ManifoldDetail extends ManifoldSummary {
  json: ManifoldJson;
  markdown: string;
  graph: { nodes: GraphNode[]; edges: GraphEdge[]; source: string };
  verify: VerifyData | null;
}

export async function fetchManifoldList(): Promise<ManifoldSummary[]> {
  const res = await fetch('./api/manifolds');
  if (!res.ok) throw new Error(`Failed to load manifold index (${res.status})`);
  const body = (await res.json()) as { manifolds: ManifoldSummary[] };
  return body.manifolds;
}

export async function fetchManifoldDetail(
  feature: string,
): Promise<ManifoldDetail> {
  const res = await fetch(`./api/manifolds/${encodeURIComponent(feature)}`);
  if (!res.ok) throw new Error(`Failed to load manifold "${feature}" (${res.status})`);
  return (await res.json()) as ManifoldDetail;
}
