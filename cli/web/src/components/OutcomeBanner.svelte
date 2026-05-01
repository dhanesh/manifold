<!--
  Outcome banner — top of the spine. Pure tokens; no hardcoded colours.
-->
<script lang="ts">
  import type { ManifoldJson } from '../lib/api';

  interface Props {
    feature: string;
    json: ManifoldJson;
    markdown: string;
  }

  const { feature, json, markdown }: Props = $props();

  function extractOutcome(md: string): string {
    const m = md.match(/##\s+Outcome\s*\n+([\s\S]*?)(?=\n##\s|\n---|\n$)/i);
    return (m?.[1] ?? '').trim();
  }

  const outcome = $derived(extractOutcome(markdown));
  const binding = $derived(json.anchors?.binding_constraint?.required_truth_id ?? null);
  const convergence = $derived(json.convergence?.status ?? 'NOT_STARTED');
  const recommended = $derived(json.anchors?.recommended_option ?? null);

  const phaseVar: Record<string, string> = {
    INITIALIZED: 'var(--color-phase-init)',
    CONSTRAINED: 'var(--color-phase-constrained)',
    TENSIONED: 'var(--color-phase-tensioned)',
    ANCHORED: 'var(--color-phase-anchored)',
    GENERATED: 'var(--color-phase-generated)',
    VERIFIED: 'var(--color-phase-verified)',
  };

  const convergenceVar: Record<string, string> = {
    NOT_STARTED: 'var(--color-fg-tertiary)',
    IN_PROGRESS: 'var(--color-warning)',
    CONVERGED: 'var(--color-phase-verified)',
  };
</script>

<header class="banner">
  <div class="title-row">
    <h1>{feature}</h1>
    <span class="pill" style:background={phaseVar[json.phase] ?? 'var(--color-phase-init)'}>
      {json.phase}
    </span>
    <span
      class="pill outline"
      style:border-color={convergenceVar[convergence]}
      style:color={convergenceVar[convergence]}
    >
      {convergence.replace('_', ' ')}
    </span>
    <span class="schema">schema v{json.schema_version}</span>
  </div>

  {#if outcome}
    <p class="outcome">{outcome}</p>
  {/if}

  <div class="meta-row">
    {#if binding}
      <span class="meta">
        <span class="star">★</span> binding constraint <strong>{binding}</strong>
      </span>
    {/if}
    {#if recommended}
      <span class="meta">recommended <strong>Option {recommended}</strong></span>
    {/if}
    {#if json.generation?.coverage?.percentage !== undefined}
      <span class="meta">coverage <strong>{json.generation.coverage.percentage}%</strong></span>
    {/if}
  </div>
</header>

<style>
  .banner {
    padding: 1.1rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--color-separator);
    background: var(--color-surface-1);
  }
  .title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .pill {
    font-size: 0.7rem;
    color: var(--color-fg-inverse);
    padding: 0.18em 0.6em;
    border-radius: var(--radius-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .pill.outline {
    background: transparent;
    border: 1px solid;
  }
  .schema {
    font-size: 0.72rem;
    color: var(--color-fg-tertiary);
    font-family: var(--font-mono);
    margin-left: auto;
  }
  .outcome {
    margin: 0.85rem 0 0.5rem;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--color-fg);
    white-space: pre-wrap;
    max-width: 65ch;
  }
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-top: 0.5rem;
    font-size: 0.78rem;
    color: var(--color-fg-secondary);
  }
  .meta strong { color: var(--color-fg); font-weight: 600; }
  .star { color: var(--color-binding); margin-right: 0.25em; }
</style>
