/**
 * Cross-version SW cache flip — when a new CLI binary is installed, the
 * previously cached assets must be invalidated on next visit because the
 * cache namespace key embeds the binary version.
 *
 * The cli/web/dist/workbox-*.js bundles the version literally, and the
 * server stamps it into the served HTML meta tag. On a real upgrade those
 * two values change together; this spec proves the cache namespace key
 * follows from the meta tag the page loads.
 *
 * @constraint O3 — service-worker cache versioning
 * @constraint RT-9 — SW cache namespace versioned by binary version
 * @constraint TN2 — sealed bundle vs cache invalidation
 */

import { expect, test } from '@playwright/test';

test.describe('SW cache namespace tracks the served manifold-version', () => {
  test('cache keys created during this session prefix with the version meta tag', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for SW + initial cache population.
    await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false;
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return false;
        // Wait for at least one cache to exist (workbox precache).
        const names = await caches.keys();
        return names.length > 0;
      },
      undefined,
      { timeout: 20_000 },
    );

    const version = await page
      .locator('meta[name="manifold-version"]')
      .first()
      .getAttribute('content');
    expect(version).toBeTruthy();

    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames.length).toBeGreaterThan(0);

    const namespacedToVersion = cacheNames.some((n) => n.includes(`manifold-${version}`));
    // Workbox cacheId becomes the prefix on every runtime + precache cache,
    // so at least one cache namespace must contain manifold-<version>.
    expect(namespacedToVersion).toBe(true);
  });
});
