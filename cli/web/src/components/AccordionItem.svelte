<!--
  Single accordion row. Built on <details>/<summary> for native keyboard
  + screen-reader accessibility. The body is lazy-rendered and the
  details element auto-opens (with smooth scroll into view) when the
  globally-selected element matches this row's id.

  Satisfies: U2 (in-place narrative reading, no jarring jumps),
             B2 (legibility), RT-7 (sanitised inline markdown).
-->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    id: string;
    selectedId?: string | null;
    onToggle?: (id: string, open: boolean) => void;
    summary?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  const { id, selectedId, onToggle, summary, children }: Props = $props();

  let detailsEl: HTMLDetailsElement | undefined = $state();
  let isOpen = $state(false);
  let hasOpened = $state(false);

  function handleToggle() {
    if (!detailsEl) return;
    isOpen = detailsEl.open;
    if (isOpen) hasOpened = true;
    onToggle?.(id, isOpen);
  }

  $effect(() => {
    if (selectedId === id && detailsEl && !detailsEl.open) {
      detailsEl.open = true;
      isOpen = true;
      hasOpened = true;
      // Scroll to the row in its current spot rather than to the top of
      // a separate narrative section — this is the whole point of the
      // accordion model: reading flow stays in place.
      detailsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  onMount(() => {
    if (selectedId === id && detailsEl) {
      detailsEl.open = true;
      isOpen = true;
      hasOpened = true;
    }
  });
</script>

<details
  bind:this={detailsEl}
  ontoggle={handleToggle}
  class:active={selectedId === id}
  data-element-id={id}
>
  <summary>
    {@render summary?.()}
  </summary>
  {#if hasOpened}
    <div class="body">
      {@render children?.()}
    </div>
  {/if}
</details>

<style>
  details {
    border-top: 1px solid var(--color-separator);
    transition: background var(--duration-fast) var(--ease-standard);
  }
  details[open] {
    background: var(--color-surface-2);
  }
  details.active {
    box-shadow: inset 3px 0 0 var(--color-binding);
  }
  summary {
    cursor: pointer;
    list-style: none;
    padding: 0.65rem 1rem 0.65rem 1.6rem;
    position: relative;
    user-select: none;
    transition: background var(--duration-fast) var(--ease-standard);
  }
  summary::-webkit-details-marker { display: none; }
  summary::before {
    content: '';
    position: absolute;
    left: 0.6rem;
    top: 50%;
    width: 0.55rem;
    height: 0.55rem;
    transform: translateY(-50%) rotate(0deg);
    border-right: 1.5px solid var(--color-fg-tertiary);
    border-bottom: 1.5px solid var(--color-fg-tertiary);
    transform-origin: 50% 50%;
    transform: translateY(-65%) rotate(-45deg);
    transition: transform var(--duration-base) var(--ease-spring), border-color var(--duration-fast) var(--ease-standard);
  }
  details[open] summary::before {
    transform: translateY(-30%) rotate(45deg);
    border-color: var(--color-accent);
  }
  summary:hover {
    background: var(--color-surface-hover);
  }
  summary:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }
  .body {
    padding: 0.5rem 1rem 1rem 1.6rem;
    border-top: 1px dashed var(--color-separator);
  }
</style>
