<!--
  Theme picker. Sits in the sidebar header. Persists choice to localStorage
  and follows `prefers-color-scheme` when set to "system".
-->
<script lang="ts">
  import { listThemes, getActiveThemeName, setActiveTheme, SYSTEM } from '../lib/theme-store';
  import type { Theme } from '../lib/themes';

  let current = $state(getActiveThemeName());
  let themes = $state<Theme[]>(listThemes());

  function refreshThemes() {
    themes = listThemes();
  }

  $effect(() => {
    window.addEventListener('manifold:theme-registry-changed', refreshThemes);
    return () => window.removeEventListener('manifold:theme-registry-changed', refreshThemes);
  });

  function pick(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value;
    current = v;
    setActiveTheme(v);
  }
</script>

<label class="theme-toggle">
  <span class="lbl">Theme</span>
  <select value={current} onchange={pick}>
    <option value={SYSTEM}>System</option>
    {#each themes as t}
      <option value={t.name}>{t.label}</option>
    {/each}
  </select>
</label>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
  }
  .lbl {
    font-size: 0.7rem;
    color: var(--color-fg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  select {
    background: var(--color-surface-2);
    color: var(--color-fg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.5rem;
    font-size: 0.78rem;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-standard);
  }
  select:hover {
    background: var(--color-surface-active);
  }
  select:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
</style>
