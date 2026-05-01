/**
 * Graph Synthesis — derive nodes and edges from manifold JSON, falling back
 * to implicit relations (tension `between[]`, anchor `derived_from[]`,
 * required-truth `seed_from[]`) when `constraint_graph.edges` is empty.
 *
 * Satisfies: RT-5 (graph synthesis when constraint_graph empty),
 *            T5 (multi-schema tolerance v1/v2/v3),
 *            U1 (visual representation of relations).
 */

export type GraphNodeKind =
  | 'constraint'
  | 'tension'
  | 'required_truth'
  | 'artifact';

export type GraphEdgeKind = 'dependency' | 'conflict' | 'satisfies' | 'maps_to';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  group?: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  origin: 'native' | 'synthesised';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  source: 'native' | 'synthesised' | 'mixed';
}

const CONSTRAINT_CATEGORIES = [
  'business',
  'technical',
  'user_experience',
  'security',
  'operational',
  'obligations',
  'desires',
  'resources',
  'risks',
  'dependencies',
] as const;

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function synthesiseGraph(json: any): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const constraints = json?.constraints ?? {};

  for (const category of CONSTRAINT_CATEGORIES) {
    const list = safeArray<any>(constraints[category]);
    for (const c of list) {
      if (!c?.id) continue;
      nodes.set(c.id, {
        id: c.id,
        kind: 'constraint',
        label: c.id,
        group: category,
        meta: { type: c.type, source: c.source, challenger: c.challenger },
      });
    }
  }

  for (const t of safeArray<any>(json?.tensions)) {
    if (!t?.id) continue;
    nodes.set(t.id, {
      id: t.id,
      kind: 'tension',
      label: t.id,
      meta: { type: t.type, status: t.status },
    });
  }

  for (const rt of safeArray<any>(json?.anchors?.required_truths)) {
    if (!rt?.id) continue;
    nodes.set(rt.id, {
      id: rt.id,
      kind: 'required_truth',
      label: rt.id,
      meta: { status: rt.status },
    });
  }

  let nativeCount = 0;
  let synthCount = 0;

  const edgeKey = (s: string, t: string, k: GraphEdgeKind) => `${k}:${s}->${t}`;
  const seen = new Set<string>();
  const pushEdge = (
    source: string,
    target: string,
    kind: GraphEdgeKind,
    origin: GraphEdge['origin'],
  ) => {
    if (!nodes.has(source) || !nodes.has(target)) return;
    const k = edgeKey(source, target, kind);
    if (seen.has(k)) return;
    seen.add(k);
    edges.push({ id: `e${edges.length + 1}`, source, target, kind, origin });
    if (origin === 'native') nativeCount++;
    else synthCount++;
  };

  const native = json?.constraint_graph?.edges ?? {};
  for (const e of safeArray<any>(native.dependencies)) {
    if (e?.from && e?.to) pushEdge(e.from, e.to, 'dependency', 'native');
  }
  for (const e of safeArray<any>(native.conflicts)) {
    if (e?.from && e?.to) pushEdge(e.from, e.to, 'conflict', 'native');
  }
  for (const e of safeArray<any>(native.satisfies)) {
    if (e?.from && e?.to) pushEdge(e.from, e.to, 'satisfies', 'native');
  }

  for (const t of safeArray<any>(json?.tensions)) {
    const between = safeArray<string>(t?.between);
    for (const cid of between) pushEdge(t.id, cid, 'conflict', 'synthesised');
  }

  for (const rt of safeArray<any>(json?.anchors?.required_truths)) {
    const mapsTo = safeArray<string>(rt?.maps_to);
    for (const cid of mapsTo) pushEdge(rt.id, cid, 'maps_to', 'synthesised');
    const derivedFrom = safeArray<string>(rt?.derived_from);
    for (const cid of derivedFrom)
      pushEdge(cid, rt.id, 'satisfies', 'synthesised');
    const seedFrom = safeArray<string>(rt?.seed_from);
    for (const cid of seedFrom) pushEdge(cid, rt.id, 'satisfies', 'synthesised');
  }

  for (const drt of safeArray<any>(json?.draft_required_truths)) {
    const seedFrom = safeArray<string>(drt?.seed_from);
    for (const cid of seedFrom) {
      if (drt?.id && !nodes.has(drt.id)) {
        nodes.set(drt.id, {
          id: drt.id,
          kind: 'required_truth',
          label: drt.id,
          meta: { status: 'DRAFT' },
        });
      }
      if (drt?.id) pushEdge(cid, drt.id, 'satisfies', 'synthesised');
    }
  }

  const source: GraphData['source'] =
    nativeCount > 0 && synthCount > 0
      ? 'mixed'
      : nativeCount > 0
      ? 'native'
      : 'synthesised';

  return { nodes: Array.from(nodes.values()), edges, source };
}
