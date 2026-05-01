<!--
  Sidebar — the project's manifold list, sorted newest first. Theme-aware
  via CSS custom properties. Hosts the theme toggle in its header so the
  control sits at a stable, predictable location regardless of which
  manifold the reader is viewing.

  Satisfies: U4 (multi-manifold index).
-->
<script lang="ts">
  import type { ManifoldSummary } from '../lib/api';
  import ThemeToggle from './ThemeToggle.svelte';

  interface Props {
    manifolds: ManifoldSummary[];
    activeFeature: string | null;
    onSelect: (feature: string) => void;
  }

  const { manifolds, activeFeature, onSelect }: Props = $props();

  const phaseVar: Record<string, string> = {
    INITIALIZED: 'var(--color-phase-init)',
    CONSTRAINED: 'var(--color-phase-constrained)',
    TENSIONED: 'var(--color-phase-tensioned)',
    ANCHORED: 'var(--color-phase-anchored)',
    GENERATED: 'var(--color-phase-generated)',
    VERIFIED: 'var(--color-phase-verified)',
  };
</script>

<aside class="sidebar">
  <header>
    <h2>Manifolds</h2>
    <span class="count">{manifolds.length}</span>
    <ThemeToggle />
  </header>
  <ul>
    {#each manifolds as m (m.feature)}
      <li class:active={m.feature === activeFeature}>
        <button type="button" onclick={() => onSelect(m.feature)}>
          <span class="feature">{m.feature}</span>
          <span class="phase" style:background={phaseVar[m.phase] ?? 'var(--color-phase-init)'}>
            {m.phase}
          </span>
          {#if m.outcome}
            <span class="outcome">{m.outcome}</span>
          {/if}
          <span class="counts">
            {m.counts.constraints} C · {m.counts.tensions} T · {m.counts.required_truths} RT
          </span>
        </button>
      </li>
    {/each}
  </ul>
</aside>

<style>
  .sidebar {
    background: var(--color-surface-1);
    border-right: 1px solid var(--color-separator);
    overflow-y: auto;
    height: 100%;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--color-separator);
    background: var(--color-surface-1);
    position: sticky;
    top: 0;
    z-index: 1;
    backdrop-filter: saturate(180%) blur(20px);
  }
  h2 {
    font-size: 0.75rem;
    margin: 0;
    color: var(--color-fg);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .count {
    font-size: 0.72rem;
    color: var(--color-fg-tertiary);
    font-family: var(--font-mono);
  }
  ul {
    list-style: none;
    padding: var(--space-xs);
    margin: 0;
  }
  li.active button {
    background: var(--color-accent-muted);
  }
  button {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    color: var(--color-fg);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.25rem 0.5rem;
    border-radius: var(--radius-md);
    transition: background var(--duration-fast) var(--ease-standard);
  }
  li + li button { margin-top: 2px; }
  button:hover {
    background: var(--color-surface-hover);
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }
  .feature {
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: -0.005em;
  }
  .phase {
    font-size: 0.65rem;
    padding: 0.12em 0.5em;
    border-radius: var(--radius-xs);
    color: var(--color-fg-inverse);
    align-self: center;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .outcome {
    grid-column: 1 / -1;
    font-size: 0.78rem;
    color: var(--color-fg-secondary);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .counts {
    grid-column: 1 / -1;
    font-size: 0.7rem;
    color: var(--color-fg-tertiary);
    font-family: var(--font-mono);
  }
</style>
