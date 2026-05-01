<!--
  Required Truths panel — accordion list. Binding constraint pinned first,
  remainder sorted NOT_SATISFIED → PARTIAL → SPECIFICATION_READY → SATISFIED.
  The accordion body shows the RT's own prose extracted from the manifold
  Markdown — no jarring scroll to a separate narrative section.

  Satisfies: U1, U2, RT-6, B2.
-->
<script lang="ts">
  import type { ManifoldJson } from '../lib/api';
  import AccordionItem from './AccordionItem.svelte';
  import MarkdownInline from './MarkdownInline.svelte';
  import { extractMdBlock } from '../lib/markdown-blocks';

  interface Props {
    json: ManifoldJson;
    markdown: string;
    onSelect?: (id: string | null) => void;
    selectedId?: string | null;
  }

  const { json, markdown, onSelect, selectedId }: Props = $props();

  const STATUS_COLOR: Record<string, string> = {
    SATISFIED: 'var(--color-success)',
    PARTIAL: 'var(--color-warning)',
    NOT_SATISFIED: 'var(--color-danger)',
    SPECIFICATION_READY: 'var(--color-spec-ready)',
  };

  const ORDER: Record<string, number> = {
    NOT_SATISFIED: 0,
    PARTIAL: 1,
    SPECIFICATION_READY: 2,
    SATISFIED: 3,
  };

  const sorted = $derived.by(() => {
    const rts = json.anchors?.required_truths ?? [];
    const bindingId = json.anchors?.binding_constraint?.required_truth_id;
    return [...rts].sort((a, b) => {
      if (a.id === bindingId) return -1;
      if (b.id === bindingId) return 1;
      return (ORDER[a.status ?? ''] ?? 9) - (ORDER[b.status ?? ''] ?? 9);
    });
  });

  function evidenceCount(rt: any): { verified: number; total: number } {
    const ev = rt.evidence ?? [];
    return {
      verified: ev.filter((e: any) => e.status === 'VERIFIED').length,
      total: ev.length,
    };
  }

  function isBinding(id: string) {
    return json.anchors?.binding_constraint?.required_truth_id === id;
  }
</script>

<section class="panel" data-section="required-truths">
  <header>
    <span class="phase">m3 · anchor</span>
    <h2>Required Truths</h2>
    <span class="count">{sorted.length}</span>
  </header>

  {#if sorted.length === 0}
    <p class="empty">Backward reasoning hasn't been run for this manifold yet.</p>
  {:else}
    <ul>
      {#each sorted as rt (rt.id)}
        {@const ev = evidenceCount(rt)}
        <li>
          <AccordionItem
            id={rt.id}
            selectedId={selectedId}
            onToggle={(id, open) => open && onSelect?.(id)}
          >
            {#snippet summary()}
              <span class="row">
                {#if isBinding(rt.id)}<span class="star" title="binding constraint">★</span>{/if}
                <code class="id">{rt.id}</code>
                <span
                  class="status-pill"
                  style:background={STATUS_COLOR[rt.status ?? ''] ?? '#7f8c8d'}
                >
                  {(rt.status ?? 'UNKNOWN').replace('_', ' ')}
                </span>
                <span class="evidence">{ev.verified}/{ev.total} evidence</span>
                {#if rt.maps_to && rt.maps_to.length}
                  <span class="maps-to">
                    maps to:
                    {#each rt.maps_to as cid}
                      <button type="button" class="chip-link" onclick={(e) => { e.stopPropagation(); onSelect?.(cid); }}>{cid}</button>
                    {/each}
                  </span>
                {/if}
              </span>
            {/snippet}
            <MarkdownInline source={extractMdBlock(markdown, rt.id)} />
          </AccordionItem>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .panel { border-bottom: 1px solid var(--color-separator); }
  header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 1rem 1.5rem 0.5rem;
  }
  .phase {
    font-size: 0.65rem;
    color: var(--color-fg-tertiary);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  h2 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-fg);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .count {
    font-size: 0.72rem;
    color: var(--color-fg-tertiary);
    font-family: var(--font-mono);
    margin-left: auto;
  }
  .empty {
    padding: 0 1.5rem 1rem;
    color: var(--color-fg-tertiary);
    font-size: 0.85rem;
  }
  ul { list-style: none; padding: 0; margin: 0; }

  .row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-wrap: wrap;
  }
  .star { color: var(--color-binding); }
  .id {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: var(--color-surface-hover);
    color: var(--color-fg);
    padding: 0.1em 0.45em;
    border-radius: var(--radius-xs);
    font-weight: 500;
  }
  .status-pill {
    font-size: 0.65rem;
    color: var(--color-fg-inverse);
    padding: 0.12em 0.5em;
    border-radius: var(--radius-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .evidence {
    font-size: 0.72rem;
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
  }
  .maps-to {
    font-size: 0.72rem;
    color: var(--color-fg-tertiary);
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
    margin-left: auto;
  }
  .chip-link {
    background: var(--color-surface-hover);
    color: var(--color-accent);
    border: 0;
    font-family: var(--font-mono);
    padding: 0.1em 0.45em;
    border-radius: var(--radius-xs);
    cursor: pointer;
    font-size: 0.72rem;
    font-weight: 500;
    transition: background var(--duration-fast) var(--ease-standard);
  }
  .chip-link:hover { background: var(--color-accent-muted); }
</style>
