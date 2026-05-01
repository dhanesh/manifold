<!--
  Tensions panel — accordion list. Each row's accordion body shows the
  tension's full prose (including the > **Resolution:** blockquote) so
  reading happens in place.

  Satisfies: U2, B2, RT-7.
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

  const TYPE_COLOR: Record<string, string> = {
    trade_off: 'var(--color-tension-tradeoff)',
    resource_tension: 'var(--color-tension-resource)',
    hidden_dependency: 'var(--color-tension-hidden)',
  };

  const EFFECT_COLOR: Record<string, string> = {
    TIGHTENED: 'var(--color-effect-tightened)',
    LOOSENED: 'var(--color-effect-loosened)',
    VIOLATED: 'var(--color-effect-violated)',
  };

  const tensions = $derived(json.tensions ?? []);
</script>

<section class="panel" data-section="tensions">
  <header>
    <span class="phase">m2 · tension</span>
    <h2>Tensions</h2>
    <span class="count">{tensions.length}</span>
  </header>

  {#if tensions.length === 0}
    <p class="empty">No tensions surfaced yet for this manifold.</p>
  {:else}
    <ul>
      {#each tensions as tn (tn.id)}
        <li>
          <AccordionItem
            id={tn.id}
            selectedId={selectedId}
            onToggle={(id, open) => open && onSelect?.(id)}
          >
            {#snippet summary()}
              <span class="row">
                <code class="id">{tn.id}</code>
                <span class="type-pill" style:background={TYPE_COLOR[tn.type ?? ''] ?? '#7f8c8d'}>
                  {(tn.type ?? 'tension').replace('_', ' ')}
                </span>
                <span class="status">{tn.status ?? 'unresolved'}</span>
                {#if tn.between && tn.between.length}
                  <span class="between">
                    {#each tn.between as cid, i}
                      <button type="button" class="chip-link" onclick={(e) => { e.stopPropagation(); onSelect?.(cid); }}>{cid}</button>
                      {#if i < (tn.between?.length ?? 0) - 1}<span class="sep">↔</span>{/if}
                    {/each}
                  </span>
                {/if}
                {#if tn.propagation_effects && tn.propagation_effects.length}
                  <span class="propagation" aria-label="propagation effects">
                    {#each tn.propagation_effects as pe}
                      <span class="effect" style:color={EFFECT_COLOR[pe.effect] ?? '#7f8c8d'}>
                        <code>{pe.constraint_id}</code>
                        {#if pe.effect === 'TIGHTENED'}↘{:else if pe.effect === 'LOOSENED'}↗{:else}✗{/if}
                      </span>
                    {/each}
                  </span>
                {/if}
              </span>
            {/snippet}
            <MarkdownInline source={extractMdBlock(markdown, tn.id)} />
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
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .id {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: var(--color-surface-hover);
    color: var(--color-fg);
    padding: 0.1em 0.45em;
    border-radius: var(--radius-xs);
    font-weight: 500;
  }
  .type-pill {
    font-size: 0.65rem;
    color: var(--color-fg-inverse);
    padding: 0.12em 0.5em;
    border-radius: var(--radius-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .status {
    font-size: 0.7rem;
    color: var(--color-fg-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }
  .between {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    font-size: 0.72rem;
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
  .sep { color: var(--color-accent); padding: 0 0.1em; }
  .propagation {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-left: auto;
    font-size: 0.7rem;
  }
  .effect { display: inline-flex; align-items: center; gap: 0.2rem; }
  .effect code {
    background: var(--color-surface-hover);
    padding: 0.05em 0.3em;
    border-radius: var(--radius-xs);
    color: inherit;
  }
</style>
