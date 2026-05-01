<!--
  Solution Space panel — accordion list of options. The recommended option
  is starred and pinned first. Each row's body shows the option's prose
  extracted from the manifold Markdown (typically `### Option A: …`).

  Satisfies: B1 (one-command visualisation surfaces *why* this option),
             B2 (legibility), m4 step in the emergence story.
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

  const REVERSIBILITY_COLOR: Record<string, string> = {
    TWO_WAY: 'var(--color-rev-twoway)',
    REVERSIBLE_WITH_COST: 'var(--color-rev-cost)',
    ONE_WAY: 'var(--color-rev-oneway)',
  };

  const recommendedId = $derived(json.anchors?.recommended_option ?? null);

  /**
   * Older manifolds (e.g. manifold-enhancements) record `recommended_option`
   * but never persisted a structured `solution_options` array — the prose
   * lives only in the Markdown. Discover options from `### Option X: Name`
   * headings so the panel still has something to render.
   */
  function discoverOptionsFromMarkdown(md: string) {
    const re = /^###\s+Option\s+([A-Za-z0-9]+):\s*(.+)$/gm;
    const out: Array<{ id: string; name: string }> = [];
    for (const m of md.matchAll(re)) {
      out.push({ id: m[1], name: m[2].trim() });
    }
    return out;
  }

  const options = $derived.by(() => {
    const declared = json.anchors?.solution_options ?? [];
    let base: Array<{
      id: string;
      name: string;
      reversibility?: string;
      satisfies?: string[];
      gaps?: string[];
      note?: string;
    }> = declared.length > 0 ? [...declared] : discoverOptionsFromMarkdown(markdown);

    // Last resort: a manifold with `recommended_option` set but no detail
    // anywhere. Show a single placeholder so the reader at least sees the
    // selection, rather than an empty section.
    if (base.length === 0 && recommendedId) {
      base = [{ id: recommendedId, name: `Option ${recommendedId} (no detail recorded)` }];
    }

    return base.sort((a, b) => {
      if (a.id === recommendedId) return -1;
      if (b.id === recommendedId) return 1;
      return a.id.localeCompare(b.id);
    });
  });

  function blockId(opt: { id: string; name?: string }): string {
    // Heading in markdown is `### Option A: Name`
    return `Option ${opt.id}`;
  }

  function isRecommended(id: string): boolean {
    return id === recommendedId;
  }
</script>

<section class="panel" data-section="solution-space">
  <header>
    <span class="phase">m3 → m4 · solution space</span>
    <h2>Solution Space</h2>
    <span class="count">{options.length}</span>
  </header>

  {#if options.length === 0}
    <p class="empty">No solution options recorded for this manifold yet.</p>
  {:else}
    <ul>
      {#each options as opt (opt.id)}
        <li>
          <AccordionItem
            id={blockId(opt)}
            selectedId={selectedId}
            onToggle={(id, open) => open && onSelect?.(id)}
          >
            {#snippet summary()}
              <span class="row">
                {#if isRecommended(opt.id)}<span class="star" title="recommended">★</span>{/if}
                <code class="id">Option {opt.id}</code>
                <span class="name">{opt.name}</span>
                {#if opt.reversibility}
                  <span
                    class="rev-pill"
                    style:background={REVERSIBILITY_COLOR[opt.reversibility] ?? '#7f8c8d'}
                  >
                    {opt.reversibility.replace(/_/g, ' ')}
                  </span>
                {/if}
                {#if opt.satisfies}
                  <span class="counts">
                    satisfies <strong>{opt.satisfies.length}</strong>
                  </span>
                {/if}
                {#if opt.gaps && opt.gaps.length}
                  <span class="counts">
                    gaps <strong>{opt.gaps.length}</strong>
                  </span>
                {/if}
              </span>
            {/snippet}
            <MarkdownInline source={extractMdBlock(markdown, blockId(opt))} />
            {#if opt.note}
              <p class="note">{opt.note}</p>
            {/if}
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
  .name {
    font-size: 0.85rem;
    color: var(--color-fg);
    font-weight: 500;
  }
  .rev-pill {
    font-size: 0.65rem;
    color: var(--color-fg-inverse);
    padding: 0.12em 0.5em;
    border-radius: var(--radius-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .counts {
    font-size: 0.72rem;
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
  }
  .counts strong { color: var(--color-fg); font-weight: 600; }
  .note {
    margin: 0.5rem 0 0;
    font-size: 0.78rem;
    color: var(--color-fg-secondary);
    font-style: italic;
  }
</style>
