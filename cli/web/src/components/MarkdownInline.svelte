<!--
  Render an arbitrary markdown string through the sanitised pipeline used
  by the rest of the visualiser. Used for accordion bodies so each card
  can show its own prose in place.

  Satisfies: S2, RT-7 (sanitised markdown).
-->
<script lang="ts">
  import { renderMarkdown } from '../lib/markdown';

  interface Props {
    source: string;
    enabled?: boolean;
  }

  const { source, enabled = true }: Props = $props();
  let html = $state('');

  $effect(() => {
    if (!enabled || !source) {
      html = '';
      return;
    }
    let cancelled = false;
    renderMarkdown(source).then((out) => {
      if (!cancelled) html = out;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

{#if html}
  <div class="md">{@html html}</div>
{:else if enabled && source}
  <div class="md placeholder">…</div>
{/if}

<style>
  .md {
    font-size: 0.86rem;
    line-height: 1.6;
    color: var(--color-fg);
  }
  .md.placeholder {
    color: var(--color-fg-tertiary);
  }
  .md :global(p) {
    margin: 0.5rem 0;
    color: var(--color-fg-secondary);
  }
  .md :global(ul),
  .md :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.4rem;
    color: var(--color-fg-secondary);
  }
  .md :global(li) {
    margin: 0.25rem 0;
  }
  .md :global(blockquote) {
    margin: 0.6rem 0;
    padding: 0.5rem 0.85rem;
    border-left: 3px solid var(--color-accent);
    background: var(--color-accent-muted);
    color: var(--color-fg);
    border-radius: var(--radius-sm);
  }
  .md :global(blockquote p) {
    color: var(--color-fg);
    margin: 0;
  }
  .md :global(code) {
    font: 500 0.8rem var(--font-mono);
    background: var(--color-surface-hover);
    color: var(--color-fg);
    padding: 0.08em 0.4em;
    border-radius: var(--radius-xs);
  }
  .md :global(pre) {
    background: var(--color-surface-hover);
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-size: 0.8rem;
  }
  .md :global(pre code) {
    background: transparent;
    padding: 0;
  }
  .md :global(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.82rem;
    margin: 0.6rem 0;
  }
  .md :global(th),
  .md :global(td) {
    border: 1px solid var(--color-separator);
    padding: 0.4rem 0.6rem;
  }
  .md :global(th) {
    background: var(--color-surface-hover);
    font-weight: 600;
    text-align: left;
  }
  .md :global(strong) {
    color: var(--color-fg);
    font-weight: 600;
  }
  .md :global(a) {
    color: var(--color-link);
    text-decoration: none;
  }
  .md :global(a:hover) {
    text-decoration: underline;
  }
</style>
