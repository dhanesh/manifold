/**
 * Theme registry for the manifold visualiser. Each theme is a flat map of
 * CSS custom properties applied to the document root. Built-in themes
 * follow Apple's macOS design vocabulary (system colours, hairlines,
 * subtle elevation). Third-party themes can register at runtime via
 * `window.manifold.registerTheme(theme)`.
 *
 * Satisfies: U2 (legibility across audiences), B2 (cross-audience),
 *            and the user's request for Apple design + light/dark + plug-
 *            in themes.
 */

export type ThemeVars = Record<string, string>;

export interface Theme {
  name: string;
  label: string;
  appearance: 'light' | 'dark';
  vars: ThemeVars;
}

const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';
const FONT_MONO =
  '"SF Mono", ui-monospace, "Menlo", "Cascadia Code", Consolas, monospace';

const SHARED_TOKENS: ThemeVars = {
  '--font-sans': FONT_SANS,
  '--font-mono': FONT_MONO,

  '--radius-xs': '4px',
  '--radius-sm': '6px',
  '--radius-md': '10px',
  '--radius-lg': '14px',
  '--radius-xl': '20px',

  '--space-xs': '0.25rem',
  '--space-sm': '0.5rem',
  '--space-md': '1rem',
  '--space-lg': '1.5rem',
  '--space-xl': '2rem',

  '--ease-standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--ease-spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
  '--duration-fast': '120ms',
  '--duration-base': '200ms',
};

export const APPLE_DARK: Theme = {
  name: 'apple-dark',
  label: 'Apple · Dark',
  appearance: 'dark',
  vars: {
    ...SHARED_TOKENS,

    '--color-bg': '#1c1c1e',
    '--color-surface-1': '#2c2c2e',
    '--color-surface-2': '#3a3a3c',
    '--color-surface-hover': 'rgba(255,255,255,0.06)',
    '--color-surface-active': 'rgba(255,255,255,0.10)',

    '--color-fg': '#f5f5f7',
    '--color-fg-secondary': 'rgba(235,235,245,0.62)',
    '--color-fg-tertiary': 'rgba(235,235,245,0.42)',
    '--color-fg-inverse': '#ffffff',

    '--color-border': 'rgba(84,84,88,0.65)',
    '--color-separator': 'rgba(84,84,88,0.30)',

    '--color-accent': '#0a84ff',
    '--color-accent-muted': 'rgba(10,132,255,0.18)',
    '--color-link': '#0a84ff',

    '--color-binding': '#ffd60a',
    '--color-success': '#30d158',
    '--color-warning': '#ff9f0a',
    '--color-danger': '#ff453a',
    '--color-info': '#0a84ff',
    '--color-purple': '#bf5af2',
    '--color-spec-ready': '#5e5ce6',

    '--color-tension-tradeoff': '#ff9f0a',
    '--color-tension-resource': '#bf5af2',
    '--color-tension-hidden': '#0a84ff',

    '--color-effect-tightened': '#ff453a',
    '--color-effect-loosened': '#30d158',
    '--color-effect-violated': '#ff375f',

    '--color-phase-init': '#8e8e93',
    '--color-phase-constrained': '#0a84ff',
    '--color-phase-tensioned': '#ff9f0a',
    '--color-phase-anchored': '#bf5af2',
    '--color-phase-generated': '#30d158',
    '--color-phase-verified': '#64d2ff',

    '--color-rev-twoway': '#30d158',
    '--color-rev-cost': '#ff9f0a',
    '--color-rev-oneway': '#ff453a',

    '--color-type-invariant': '#ff453a',
    '--color-type-boundary': '#0a84ff',
    '--color-type-goal': '#30d158',

    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.30)',
    '--shadow-md': '0 4px 16px rgba(0,0,0,0.40)',
    '--shadow-lg': '0 12px 32px rgba(0,0,0,0.50)',

    '--scrim-overlay': 'rgba(0,0,0,0.40)',
  },
};

export const APPLE_LIGHT: Theme = {
  name: 'apple-light',
  label: 'Apple · Light',
  appearance: 'light',
  vars: {
    ...SHARED_TOKENS,

    '--color-bg': '#f2f2f7',
    '--color-surface-1': '#ffffff',
    '--color-surface-2': '#f9f9fb',
    '--color-surface-hover': 'rgba(0,0,0,0.04)',
    '--color-surface-active': 'rgba(0,0,0,0.07)',

    '--color-fg': '#1d1d1f',
    '--color-fg-secondary': 'rgba(60,60,67,0.62)',
    '--color-fg-tertiary': 'rgba(60,60,67,0.42)',
    '--color-fg-inverse': '#ffffff',

    '--color-border': 'rgba(60,60,67,0.18)',
    '--color-separator': 'rgba(60,60,67,0.12)',

    '--color-accent': '#007aff',
    '--color-accent-muted': 'rgba(0,122,255,0.12)',
    '--color-link': '#007aff',

    '--color-binding': '#ff9f0a',
    '--color-success': '#34c759',
    '--color-warning': '#ff9500',
    '--color-danger': '#ff3b30',
    '--color-info': '#007aff',
    '--color-purple': '#af52de',
    '--color-spec-ready': '#5856d6',

    '--color-tension-tradeoff': '#ff9500',
    '--color-tension-resource': '#af52de',
    '--color-tension-hidden': '#007aff',

    '--color-effect-tightened': '#ff3b30',
    '--color-effect-loosened': '#34c759',
    '--color-effect-violated': '#ff2d55',

    '--color-phase-init': '#8e8e93',
    '--color-phase-constrained': '#007aff',
    '--color-phase-tensioned': '#ff9500',
    '--color-phase-anchored': '#af52de',
    '--color-phase-generated': '#34c759',
    '--color-phase-verified': '#5ac8fa',

    '--color-rev-twoway': '#34c759',
    '--color-rev-cost': '#ff9500',
    '--color-rev-oneway': '#ff3b30',

    '--color-type-invariant': '#ff3b30',
    '--color-type-boundary': '#007aff',
    '--color-type-goal': '#34c759',

    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.04)',
    '--shadow-md': '0 4px 16px rgba(0,0,0,0.06)',
    '--shadow-lg': '0 12px 32px rgba(0,0,0,0.08)',

    '--scrim-overlay': 'rgba(0,0,0,0.20)',
  },
};

/**
 * Demo of a third theme to prove the registry isn't Apple-only. Adding
 * more is a single registry entry — see docs/manifold-serve/THEMES.md.
 */
export const NORD_DARK: Theme = {
  name: 'nord',
  label: 'Nord',
  appearance: 'dark',
  vars: {
    ...SHARED_TOKENS,

    '--color-bg': '#2e3440',
    '--color-surface-1': '#3b4252',
    '--color-surface-2': '#434c5e',
    '--color-surface-hover': 'rgba(255,255,255,0.05)',
    '--color-surface-active': 'rgba(255,255,255,0.09)',

    '--color-fg': '#eceff4',
    '--color-fg-secondary': 'rgba(216,222,233,0.70)',
    '--color-fg-tertiary': 'rgba(216,222,233,0.45)',
    '--color-fg-inverse': '#2e3440',

    '--color-border': 'rgba(216,222,233,0.12)',
    '--color-separator': 'rgba(216,222,233,0.08)',

    '--color-accent': '#88c0d0',
    '--color-accent-muted': 'rgba(136,192,208,0.18)',
    '--color-link': '#88c0d0',

    '--color-binding': '#ebcb8b',
    '--color-success': '#a3be8c',
    '--color-warning': '#ebcb8b',
    '--color-danger': '#bf616a',
    '--color-info': '#81a1c1',
    '--color-purple': '#b48ead',
    '--color-spec-ready': '#5e81ac',

    '--color-tension-tradeoff': '#d08770',
    '--color-tension-resource': '#b48ead',
    '--color-tension-hidden': '#81a1c1',

    '--color-effect-tightened': '#bf616a',
    '--color-effect-loosened': '#a3be8c',
    '--color-effect-violated': '#bf616a',

    '--color-phase-init': '#4c566a',
    '--color-phase-constrained': '#81a1c1',
    '--color-phase-tensioned': '#d08770',
    '--color-phase-anchored': '#b48ead',
    '--color-phase-generated': '#a3be8c',
    '--color-phase-verified': '#88c0d0',

    '--color-rev-twoway': '#a3be8c',
    '--color-rev-cost': '#ebcb8b',
    '--color-rev-oneway': '#bf616a',

    '--color-type-invariant': '#bf616a',
    '--color-type-boundary': '#81a1c1',
    '--color-type-goal': '#a3be8c',

    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.30)',
    '--shadow-md': '0 4px 16px rgba(0,0,0,0.40)',
    '--shadow-lg': '0 12px 32px rgba(0,0,0,0.50)',

    '--scrim-overlay': 'rgba(0,0,0,0.40)',
  },
};

const registry = new Map<string, Theme>();
[APPLE_LIGHT, APPLE_DARK, NORD_DARK].forEach((t) => registry.set(t.name, t));

export function registerTheme(theme: Theme): void {
  if (!theme?.name || !theme.vars) {
    throw new Error('registerTheme: theme must have a `name` and `vars`.');
  }
  registry.set(theme.name, theme);
  window.dispatchEvent(new CustomEvent('manifold:theme-registry-changed'));
}

export function listThemes(): Theme[] {
  return Array.from(registry.values());
}

export function getTheme(name: string): Theme | undefined {
  return registry.get(name);
}

if (typeof window !== 'undefined') {
  const w = window as unknown as { manifold?: Record<string, unknown> };
  w.manifold = w.manifold ?? {};
  (w.manifold as Record<string, unknown>).registerTheme = registerTheme;
  (w.manifold as Record<string, unknown>).listThemes = listThemes;
}
