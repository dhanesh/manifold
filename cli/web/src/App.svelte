<!--
  Manifold visualiser root — vertical story spine that walks the
  emergence axis (m0 → m1 → m2 → m3 → m4) so first-time readers
  experience the manifold the way it was built:

    Outcome (m0) → Backward Sankey (structural map) →
    Constraints (m1) → Tensions (m2) → Required Truths (m3) →
    Solution Space (m3→m4)

  Each row is an accordion whose body shows that element's prose
  inline (extracted from the manifold Markdown) — no jarring scroll
  to a separate narrative section.

  Satisfies: B1, B2, U1, U2, U3, U4, RT-6, RT-7, RT-8, RT-12.
-->
<script lang="ts">
  import { fetchManifoldList, fetchManifoldDetail } from './lib/api';
  import type { ManifoldDetail, ManifoldSummary } from './lib/api';
  import ManifoldIndex from './components/ManifoldIndex.svelte';
  import OutcomeBanner from './components/OutcomeBanner.svelte';
  import ConstraintsPanel from './components/ConstraintsPanel.svelte';
  import TensionsPanel from './components/TensionsPanel.svelte';
  import RequiredTruthsPanel from './components/RequiredTruthsPanel.svelte';
  import SolutionSpacePanel from './components/SolutionSpacePanel.svelte';

  let manifolds = $state<ManifoldSummary[]>([]);
  let active = $state<ManifoldDetail | null>(null);
  let activeFeature = $state<string | null>(null);
  let selectedId = $state<string | null>(null);
  let loadError = $state<string | null>(null);

  let SankeyComponent = $state<any | null>(null);

  $effect(() => {
    fetchManifoldList()
      .then((list) => {
        manifolds = list;
        if (list.length > 0 && !activeFeature) selectFeature(list[0].feature);
      })
      .catch((err) => {
        loadError = err.message;
      });
  });

  $effect(() => {
    if (SankeyComponent) return;
    import('./components/BackwardSankey.svelte').then((mod) => {
      SankeyComponent = mod.default;
    });
  });

  async function selectFeature(feature: string) {
    activeFeature = feature;
    selectedId = null;
    try {
      active = await fetchManifoldDetail(feature);
    } catch (err: any) {
      loadError = err.message;
    }
  }

  function handleSelect(id: string | null) {
    selectedId = id;
  }
</script>

<div class="layout">
  <ManifoldIndex
    manifolds={manifolds}
    activeFeature={activeFeature}
    onSelect={selectFeature}
  />
  <main>
    {#if loadError}
      <p class="error">Failed to load: {loadError}</p>
    {:else if !active}
      <p class="empty">Select a manifold from the sidebar.</p>
    {:else}
      {#key active.feature}
        <OutcomeBanner
          feature={active.feature}
          json={active.json}
          markdown={active.markdown}
        />

        <section class="flow-pane">
          {#if SankeyComponent}
            <SankeyComponent
              json={active.json}
              verify={active.verify}
              onSelect={handleSelect}
            />
          {:else}
            <p class="loading">Loading flow…</p>
          {/if}
        </section>

        <ConstraintsPanel
          json={active.json}
          markdown={active.markdown}
          verify={active.verify}
          onSelect={handleSelect}
          selectedId={selectedId}
        />

        <TensionsPanel
          json={active.json}
          markdown={active.markdown}
          onSelect={handleSelect}
          selectedId={selectedId}
        />

        <RequiredTruthsPanel
          json={active.json}
          markdown={active.markdown}
          onSelect={handleSelect}
          selectedId={selectedId}
        />

        <SolutionSpacePanel
          json={active.json}
          markdown={active.markdown}
          onSelect={handleSelect}
          selectedId={selectedId}
        />
      {/key}
    {/if}
  </main>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: 100vh;
    background: var(--color-bg);
  }
  main {
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--color-bg);
  }
  .flow-pane {
    height: 300px;
    border-bottom: 1px solid var(--color-separator);
    background: var(--color-surface-1);
  }
  .empty,
  .loading,
  .error {
    padding: 1.25rem;
    color: var(--color-fg-tertiary);
    text-align: center;
    font-size: 0.9rem;
  }
  .error { color: var(--color-danger); }
</style>
