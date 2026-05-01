<!--
  Backward-reasoning Sankey — Constraints flow into Required Truths flow into
  Outcome. Reads left-to-right as "these constraints support these required
  truths, which support the outcome." Width = number of dependency links.

  Status colouring:
   - SATISFIED   → green
   - PARTIAL     → amber
   - NOT_SATISFIED / SPEC_READY → red / blue
   - binding RT  → gold border + bold

  Satisfies: U1 (visual representation of relations), U2 (alongside narrative),
             RT-5 (synthesised graph), RT-6 (visualisation).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ManifoldJson, VerifyData } from '../lib/api';

  interface Props {
    json: ManifoldJson;
    verify: VerifyData | null;
    onSelect?: (id: string | null) => void;
  }

  const { json, verify, onSelect }: Props = $props();

  let host: HTMLDivElement;
  let svgEl = $state<SVGSVGElement | null>(null);
  let width = $state(800);
  let height = $state(320);
  let resizeObs: ResizeObserver | null = null;

  type FlowNode = {
    id: string;
    kind: 'outcome' | 'rt' | 'constraint';
    label: string;
    status?: string;
    binding?: boolean;
  };
  type FlowLink = { source: number; target: number; value: number };

  const STATUS_COLOR: Record<string, string> = {
    SATISFIED: 'var(--color-success)',
    PARTIAL: 'var(--color-warning)',
    NOT_SATISFIED: 'var(--color-danger)',
    SPECIFICATION_READY: 'var(--color-spec-ready)',
    DOCUMENTED: 'var(--color-fg-tertiary)',
    IMPLEMENTED: 'var(--color-info)',
    TESTED: 'var(--color-success)',
    VERIFIED: 'var(--color-success)',
  };

  function statusFromVerify(constraintId: string): string | undefined {
    return verify?.matrix?.find((m) => m.constraint === constraintId)?.status;
  }

  const data = $derived.by((): { nodes: FlowNode[]; links: FlowLink[] } => {
    const nodes: FlowNode[] = [];
    const links: FlowLink[] = [];
    const idx = new Map<string, number>();
    const push = (n: FlowNode) => {
      idx.set(n.id, nodes.length);
      nodes.push(n);
    };

    push({ id: '__outcome', kind: 'outcome', label: 'Outcome' });

    const bindingId = json.anchors?.binding_constraint?.required_truth_id ?? null;
    const rts = json.anchors?.required_truths ?? [];

    for (const rt of rts) {
      push({
        id: rt.id,
        kind: 'rt',
        label: rt.id,
        status: rt.status,
        binding: rt.id === bindingId,
      });
    }

    const seenConstraints = new Set<string>();
    for (const rt of rts) {
      const mt = rt.maps_to ?? [];
      for (const cid of mt) {
        if (!seenConstraints.has(cid)) {
          seenConstraints.add(cid);
          push({
            id: cid,
            kind: 'constraint',
            label: cid,
            status: statusFromVerify(cid),
          });
        }
      }
    }

    for (const rt of rts) {
      const rtIdx = idx.get(rt.id);
      if (rtIdx === undefined) continue;
      links.push({ source: rtIdx, target: idx.get('__outcome')!, value: 1 });
      for (const cid of rt.maps_to ?? []) {
        const cIdx = idx.get(cid);
        if (cIdx !== undefined) links.push({ source: cIdx, target: rtIdx, value: 1 });
      }
    }

    return { nodes, links };
  });

  let selected = $state<string | null>(null);

  function nodeFill(n: FlowNode): string {
    if (n.kind === 'outcome') return 'var(--color-accent)';
    if (n.status && STATUS_COLOR[n.status]) return STATUS_COLOR[n.status];
    if (n.kind === 'rt') return 'var(--color-purple)';
    return 'var(--color-fg-tertiary)';
  }

  function nodeStroke(n: FlowNode): string {
    return n.binding ? 'var(--color-binding)' : 'transparent';
  }

  function isHighlighted(nId: string): boolean {
    if (!selected) return true;
    if (selected === nId) return true;
    const sel = data.nodes.findIndex((n) => n.id === selected);
    const me = data.nodes.findIndex((n) => n.id === nId);
    if (sel < 0 || me < 0) return false;
    return data.links.some(
      (l) =>
        (l.source === sel && l.target === me) ||
        (l.target === sel && l.source === me) ||
        (l.source === me && l.target === sel) ||
        (l.target === me && l.source === sel),
    );
  }

  function selectNode(id: string | null) {
    selected = id === selected ? null : id;
    onSelect?.(selected);
  }

  let layout = $state<{
    nodes: (FlowNode & { x0: number; x1: number; y0: number; y1: number })[];
    links: { source: any; target: any; width: number; path: string }[];
  } | null>(null);

  async function relayout() {
    if (!data.nodes.length) {
      layout = null;
      return;
    }
    const { sankey, sankeyLeft, sankeyLinkHorizontal } = await import('d3-sankey');

    const margin = { top: 8, right: 80, bottom: 8, left: 80 };
    const innerWidth = Math.max(400, width - margin.left - margin.right);
    const innerHeight = Math.max(200, height - margin.top - margin.bottom);

    // Default index-based node lookup is what we want — our links use
    // numeric indices into the nodes array. Setting `.nodeId(d => d.id)`
    // would force d3-sankey to treat `link.source` as a string id and
    // every lookup would miss → all node heights collapse to 0 → blank
    // canvas. Don't call nodeId.
    const sk = sankey<FlowNode, FlowLink>()
      .nodeAlign(sankeyLeft)
      .nodeWidth(14)
      .nodePadding(10)
      .extent([
        [margin.left, margin.top],
        [margin.left + innerWidth, margin.top + innerHeight],
      ]);

    // Clone so d3 mutations don't poison reactivity
    const graph = sk({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    });

    const linkGen = sankeyLinkHorizontal();
    layout = {
      nodes: graph.nodes as any,
      links: graph.links.map((l: any) => ({
        source: l.source,
        target: l.target,
        width: Math.max(1, l.width),
        path: linkGen(l) ?? '',
      })),
    };
  }

  $effect(() => {
    void data;
    void width;
    void height;
    void relayout();
  });

  onMount(() => {
    if (!host) return;
    width = host.clientWidth;
    height = host.clientHeight;
    resizeObs = new ResizeObserver(() => {
      if (!host) return;
      width = host.clientWidth;
      height = host.clientHeight;
    });
    resizeObs.observe(host);
    return () => {
      resizeObs?.disconnect();
      resizeObs = null;
    };
  });

  function nodeLabel(n: FlowNode): string {
    if (n.kind === 'outcome') return 'Outcome';
    return n.label;
  }
</script>

<div class="wrap" bind:this={host}>
  {#if !data.nodes.length}
    <p class="empty">No required truths yet — backward reasoning hasn't begun for this manifold.</p>
  {:else}
    <svg
      bind:this={svgEl}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Backward-reasoning Sankey: Constraints → Required Truths → Outcome"
    >
      {#if layout}
        <g class="layer-labels">
          <text x="14" y="14">CONSTRAINTS</text>
          <text x={width / 2 - 36} y="14">REQUIRED TRUTHS</text>
          <text x={width - 14} y="14" text-anchor="end">OUTCOME</text>
        </g>
        <g class="links" fill="none">
          {#each layout.links as link, i (i)}
            {@const lit = isHighlighted((link.source as any).id) && isHighlighted((link.target as any).id)}
            <path
              d={link.path}
              class:lit
              stroke-width={link.width}
            />
          {/each}
        </g>
        <g class="nodes">
          {#each layout.nodes as n (n.id)}
            <g
              class="node"
              class:dim={!isHighlighted(n.id)}
              transform={`translate(${n.x0},${n.y0})`}
              role="button"
              tabindex="0"
              onclick={() => selectNode(n.id)}
              onkeydown={(e) => e.key === 'Enter' && selectNode(n.id)}
            >
              <rect
                width={n.x1 - n.x0}
                height={Math.max(2, n.y1 - n.y0)}
                fill={nodeFill(n)}
                stroke={nodeStroke(n)}
                stroke-width={n.binding ? 2 : 0}
                rx="3"
              />
              <text
                class="node-label"
                x={n.kind === 'constraint' ? -6 : (n.x1 - n.x0) + 6}
                y={(n.y1 - n.y0) / 2}
                dy="0.32em"
                text-anchor={n.kind === 'constraint' ? 'end' : 'start'}
              >
                {nodeLabel(n)}
              </text>
              {#if n.binding}
                <text
                  class="binding-label"
                  x={(n.x1 - n.x0) + 6}
                  y={(n.y1 - n.y0) / 2 + 12}
                >
                  ★ binding
                </text>
              {/if}
            </g>
          {/each}
        </g>
      {/if}
    </svg>
  {/if}
</div>

<style>
  .wrap {
    width: 100%;
    height: 100%;
    min-height: 240px;
    background: var(--color-surface-1);
  }
  .empty {
    padding: 1rem;
    color: var(--color-fg-tertiary);
    text-align: center;
    font-size: 0.85rem;
  }
  svg { display: block; }
  .layer-labels text {
    font: 600 9px var(--font-mono);
    fill: var(--color-fg-tertiary);
    letter-spacing: 0.06em;
  }
  .links path {
    stroke: var(--color-separator);
    stroke-opacity: 0.5;
    transition: stroke-opacity var(--duration-fast) var(--ease-standard), stroke var(--duration-fast) var(--ease-standard);
  }
  .links path.lit {
    stroke: var(--color-accent);
    stroke-opacity: 0.55;
  }
  .node-label {
    font: 500 10px var(--font-mono);
    fill: var(--color-fg);
  }
  .binding-label {
    font: 600 8px var(--font-mono);
    fill: var(--color-binding);
  }
  .node { cursor: pointer; transition: opacity var(--duration-base) var(--ease-standard); }
  .node.dim { opacity: 0.22; }
  .node:hover rect { filter: brightness(1.15); }
  text { user-select: none; pointer-events: none; }
</style>
