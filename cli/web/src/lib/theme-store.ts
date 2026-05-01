/**
 * Runtime state for the theme system: persisted choice, system-preference
 * follow mode, and apply logic. The visualiser calls `initThemeSystem()`
 * once at boot.
 */

import { getTheme, listThemes, type Theme } from './themes';

const STORAGE_KEY = 'manifold-theme';
export const SYSTEM = 'system';

function applyVars(theme: Theme): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.themeName = theme.name;
  root.dataset.themeAppearance = theme.appearance;
}

function detectSystemTheme(): Theme {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const t = getTheme(prefersDark ? 'apple-dark' : 'apple-light');
  if (!t) throw new Error('Built-in Apple themes missing from registry');
  return t;
}

export function getActiveThemeName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? SYSTEM;
  } catch {
    return SYSTEM;
  }
}

function applyChosenTheme(name: string): void {
  if (name === SYSTEM) {
    applyVars(detectSystemTheme());
    document.documentElement.dataset.themeName = SYSTEM;
    return;
  }
  const t = getTheme(name);
  if (t) applyVars(t);
  else applyVars(detectSystemTheme());
}

export function setActiveTheme(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* private mode etc — ignore */
  }
  applyChosenTheme(name);
  window.dispatchEvent(new CustomEvent('manifold:theme-change', { detail: name }));
}

export function initThemeSystem(): () => void {
  applyChosenTheme(getActiveThemeName());
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (getActiveThemeName() === SYSTEM) applyChosenTheme(SYSTEM);
  };
  mq.addEventListener('change', onSystemChange);
  const onRegistry = () => applyChosenTheme(getActiveThemeName());
  window.addEventListener('manifold:theme-registry-changed', onRegistry);
  return () => {
    mq.removeEventListener('change', onSystemChange);
    window.removeEventListener('manifold:theme-registry-changed', onRegistry);
  };
}

export { listThemes };
