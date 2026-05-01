# Themes — `manifold serve`

The visualiser ships with three built-in themes:

| Name | Label | Appearance |
|---|---|---|
| `apple-light` | Apple · Light | light |
| `apple-dark` | Apple · Dark | dark |
| `nord` | Nord | dark |

Plus a meta choice **System**, which follows `prefers-color-scheme` at runtime and switches automatically when the OS toggles between light and dark mode.

The theme picker sits in the top-left corner of the sidebar. The choice is persisted to `localStorage` under the key `manifold-theme`.

## How a theme is defined

A theme is a flat map of CSS custom properties applied to `<html>`. Components reference them via `var(--color-…)` etc.; nothing in the UI hard-codes a hex value.

```ts
interface Theme {
  name: string;        // unique key used by localStorage / the picker
  label: string;       // user-facing label in the dropdown
  appearance: 'light' | 'dark';
  vars: Record<string, string>;
}
```

The full token contract lives in [`cli/web/src/lib/themes.ts`](../../cli/web/src/lib/themes.ts) — see `APPLE_DARK` / `APPLE_LIGHT` for the canonical list. Tokens cover backgrounds, text, borders, accent, status colours, constraint-type colours, tension-type colours, propagation effects, phases, reversibility, radii, shadows, fonts, and motion.

## Adding a built-in theme

Add an entry to `cli/web/src/lib/themes.ts`, then rebuild:

```ts
import type { Theme } from './themes';

export const SOLARIZED_DARK: Theme = {
  name: 'solarized-dark',
  label: 'Solarized · Dark',
  appearance: 'dark',
  vars: {
    ...SHARED_TOKENS,
    '--color-bg': '#002b36',
    // … the rest of the tokens
  },
};

// Register it in the same file:
[APPLE_LIGHT, APPLE_DARK, NORD_DARK, SOLARIZED_DARK].forEach((t) =>
  registry.set(t.name, t),
);
```

Then run:

```bash
cd cli/web && bun run build && cd ../..
bun scripts/build-web.ts
```

## Adding a runtime / pluggable theme (no rebuild)

The visualiser exposes `window.manifold.registerTheme(theme)`. Open the browser console and:

```js
window.manifold.registerTheme({
  name: 'my-team',
  label: 'My Team',
  appearance: 'dark',
  vars: {
    '--color-bg': '#101820',
    '--color-surface-1': '#1c2530',
    /* … all tokens … */
    '--font-sans': 'Inter, system-ui, sans-serif',
    '--font-mono': 'JetBrains Mono, monospace',
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '14px',
  },
});
```

The picker updates immediately. The choice persists for the current tab via `localStorage`, but a runtime-registered theme is **not** persisted across reloads — the registration script must run on every page load. Bookmarklet, browser extension, or a small `theme-loader.user.js` UserScript are the typical patterns.

`window.manifold.listThemes()` returns the current registry.

## Required tokens

A theme **must** define at minimum the following tokens (omitting any will cause the related UI element to show as transparent / use a fallback):

```
--color-bg
--color-surface-1
--color-surface-2
--color-surface-hover
--color-surface-active
--color-fg
--color-fg-secondary
--color-fg-tertiary
--color-fg-inverse
--color-border
--color-separator
--color-accent
--color-accent-muted
--color-link
--color-binding
--color-success
--color-warning
--color-danger
--color-info
--color-purple
--color-spec-ready
--color-tension-tradeoff
--color-tension-resource
--color-tension-hidden
--color-effect-tightened
--color-effect-loosened
--color-effect-violated
--color-phase-init
--color-phase-constrained
--color-phase-tensioned
--color-phase-anchored
--color-phase-generated
--color-phase-verified
--color-rev-twoway
--color-rev-cost
--color-rev-oneway
--color-type-invariant
--color-type-boundary
--color-type-goal
--shadow-sm
--shadow-md
--shadow-lg
--scrim-overlay
--font-sans
--font-mono
--radius-xs
--radius-sm
--radius-md
--radius-lg
--radius-xl
--space-xs
--space-sm
--space-md
--space-lg
--space-xl
--ease-standard
--ease-spring
--duration-fast
--duration-base
```

Themes can re-use `SHARED_TOKENS` (exported from `themes.ts`) which provides every non-colour token (radii, spacing, fonts, motion). A theme then only needs to override colours.

## FOUC prevention

`cli/web/index.html` ships a small inline script that reads the stored theme name + the system colour-scheme media query and sets the document background + `data-theme-name` / `data-theme-appearance` attributes **before** the bundle parses. First paint is already themed.
