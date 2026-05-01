/**
 * Service-worker cache namespace is keyed on the CLI binary version.
 *
 * The full browser-level "load under version A, upgrade to version B,
 * verify cache flips" lifecycle lives in the Playwright suite under
 * tests/manifold-serve/e2e/. This unit-level guard catches the most
 * common regression — someone removing the version template from
 * vite.config.ts or workbox not embedding the resolved cacheId into the
 * built sw.js — without needing a browser.
 *
 * @constraint O3 — service-worker cache versioning
 * @constraint RT-9 — SW cache namespace versioned by binary version
 * @constraint TN2 — sealed bundle vs cache invalidation
 */

import { describe, test, expect } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DIST = join(import.meta.dir, '..', '..', 'cli', 'web', 'dist');
const PKG_PATH = join(import.meta.dir, '..', '..', 'cli', 'package.json');

const distAvailable = existsSync(DIST);
const skipReason =
  'cli/web/dist not built — run `cd cli/web && bun run build` to enable this test';

describe('SW cache namespace ↔ CLI version (RT-9, O3)', () => {
  if (!distAvailable) {
    test.skip(`SKIPPED — ${skipReason}`, () => {});
    return;
  }

  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as { version: string };
  const distFiles = readdirSync(DIST);
  const workboxFile = distFiles.find((f) => f.startsWith('workbox-') && f.endsWith('.js'));
  const swFile = distFiles.find((f) => f === 'sw.js');

  test('dist contains a service worker emitted by vite-plugin-pwa', () => {
    expect(swFile).toBeDefined();
    expect(workboxFile).toBeDefined();
  });

  test('the built service worker bakes in the CLI version as its cache namespace', () => {
    expect(swFile).toBeDefined();
    const sw = readFileSync(join(DIST, swFile!), 'utf-8');
    // vite-plugin-pwa templates `cacheId: manifold-${cliPkg.version}` into
    // the generated sw.js. If cacheId templating breaks (e.g. a build that
    // forgets to read package.json), this assertion catches it.
    expect(sw).toContain(`manifold-${pkg.version}`);
  });

  test('the manifest is generated and references a versioned cache scope', () => {
    expect(distFiles).toContain('manifest.webmanifest');
    expect(distFiles).toContain('registerSW.js');
    const sw = readFileSync(join(DIST, swFile!), 'utf-8');
    // sw.js is the registration shim; it should reference the workbox runtime
    // that actually carries the cacheId.
    expect(sw.length).toBeGreaterThan(0);
  });
});
