<!--
  Constraints panel — accordion list grouped by category, each row showing
  the constraint id, type pill (invariant/boundary/goal), and status chip.
  Body shows the constraint's own prose extracted from the manifold
  Markdown.

  Satisfies: U1 (visual), B2 (legibility), m1 step in the emergence story.
-->
<script lang="ts">
  import type { ManifoldJson, VerifyData } from '../lib/api';
  import AccordionItem from './AccordionItem.svelte';
  import MarkdownInline from './MarkdownInline.svelte';
  import { extractMdBlock } from '../lib/markdown-blocks';

  interface Props {
    json: ManifoldJson;
    markdown: string;
    verify: VerifyData | null;
    onSelect?: (id: string | null) => void;
    selectedId?: string | null;
  }

  const { json, markdown, verify, onSelect, selectedId }: Props = $props();

  const SOFTWARE_CATS: Array<{ key: string; label: string }> = [
    { key: 'business', label: 'Business' },
    { key: 'technical', label: 'Technical' },
    { key: 'user_experience', label: 'User Experience' },
    { key: 'security', label: 'Security' },
    { key: 'operational', label: 'Operational' },
  ];

  const NON_SOFTWARE_CATS: Array<{ key: string; label: string }> = [
    { key: 'obligations', label: 'Obligations' },
    { key: 'desires', label: 'Desires' },
    { key: 'resources', label: 'Resources' },
    { key: 'risks', label: 'Risks' },
    { key: 'dependencies', label: 'Dependencies' },
  ];

  const TYPE_COLOR: Record<string, string> = {
    invariant: 'var(--color-type-invariant)',
    boundary: 'var(--color-type-boundary)',
    goal: 'var(--color-type-goal)',
  };

  const STATUS_COLOR: Record<string, string> = {
    SATISFIED: 'var(--color-success)',
    PARTIAL: 'var(--color-warning)',
    NOT_SATISFIED: 'var(--color-danger)',
    SPECIFICATION_READY: 'var(--color-spec-ready)',
  };

  const cats = $derived(json.domain === 'non-software' ? NON_SOFTWARE_CATS : SOFTWARE_CATS);

  function statusFor(cid: string): string | undefined {
    return verify?.matrix?.find((m) => m.constraint === cid)?.status;
  }

  const totals = $derived.by(() => {
    let satisfied = 0;
    let total = 0;
    for (const cat of cats) {
      const list = json.constraints?.[cat.key] ?? [];
      total += list.length;
      for (const c of list) if (statusFor(c.id) === 'SATISFIED') satisfied++;
    }
    return { satisfied, total };
  });
</script>

<section class="panel" data-section="constraints">
  <header>
    <span class="phase">m1 · constrain</span>
    <h2>Constraints</h2>
    <span class="count">
      {#if verify?.matrix}
        {totals.satisfied}/{totals.total} satisfied
      {:else}
        {totals.total} total
      {/if}
    </span>
  </header>

  {#each cats as cat}
    {@const list = json.constraints?.[cat.key] ?? []}
    {#if list.length}
      <div class="cat-group">
        <h3 class="cat-label">{cat.label} <span class="cat-count">{list.length}</span></h3>
        <ul>
          {#each list as c (c.id)}
            <li>
              <AccordionItem
                id={c.id}
                selectedId={selectedId}
                onToggle={(id, open) => open && onSelect?.(id)}
              >
                {#snippet summary()}
                  <span class="row">
                    <code class="id">{c.id}</code>
                    <span
                      class="type-pill"
                      style:background={TYPE_COLOR[c.type ?? ''] ?? '#7f8c8d'}
                    >
                      {c.type ?? 'unknown'}
                    </span>
                    {#if statusFor(c.id)}
                      <span
                        class="status-pill"
                        style:background={STATUS_COLOR[statusFor(c.id) ?? ''] ?? '#7f8c8d'}
                      >
                        {(statusFor(c.id) ?? '').replace('_', ' ')}
                      </span>
                    {:else}
                      <span class="status-pill no-data">no verify data</span>
                    {/if}
                  </span>
                {/snippet}
                <MarkdownInline source={extractMdBlock(markdown, c.id)} />
              </AccordionItem>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/each}
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
  .cat-group { margin-bottom: 0.25rem; }
  .cat-label {
    font-size: 0.7rem;
    margin: 0.5rem 0 0.15rem 1.5rem;
    color: var(--color-fg-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .cat-count {
    font-family: var(--font-mono);
    color: var(--color-fg-tertiary);
    font-weight: 400;
    margin-left: 0.3rem;
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
  .status-pill {
    font-size: 0.65rem;
    color: var(--color-fg-inverse);
    padding: 0.12em 0.5em;
    border-radius: var(--radius-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .status-pill.no-data {
    background: transparent;
    color: var(--color-fg-tertiary);
    border: 1px solid var(--color-border);
  }
</style>
