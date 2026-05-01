/**
 * Browser-level smoke tests for the manifold visualiser.
 *
 * The visualiser is a vertical story spine that walks the emergence axis:
 *   sidebar → outcome banner → backward-reasoning Sankey →
 *   constraints (m1) → tensions (m2) → required truths (m3) →
 *   solution space (m3→m4).
 *
 * Each row is a `<details>` accordion whose body shows that element's
 * prose extracted from the manifold Markdown — there is no separate
 * narrative pane to scroll-jump to.
 *
 * @constraint U1 — backward-reasoning Sankey renders an SVG flow
 * @constraint U2 — clicking a chip expands the matching accordion in place
 * @constraint U3 — service worker registers on first load
 * @constraint U4 — sidebar lists multiple manifolds
 * @constraint RT-6, RT-7, RT-8, RT-9
 */

import { expect, test } from '@playwright/test';

test.describe('manifold visualiser PWA', () => {
  test('sidebar lists multiple manifolds and one is auto-selected (U4)', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside.sidebar');
    await expect(sidebar).toBeVisible();
    const items = sidebar.locator('li');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(sidebar.locator('li.active')).toHaveCount(1, { timeout: 5_000 });
  });

  test('outcome banner shows phase + binding constraint badge', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('header.banner').first();
    await expect(banner).toBeVisible();
    await expect(banner.locator('h1')).toBeVisible();
    await expect(banner.locator('.pill').first()).toBeVisible();
  });

  test('backward Sankey renders an SVG flow with constraint and RT nodes (U1, RT-6)', async ({
    page,
  }) => {
    await page.goto('/');
    const svg = page.locator('section.flow-pane svg').first();
    await expect(svg).toBeVisible({ timeout: 15_000 });
    const nodes = svg.locator('g.node');
    await expect(nodes.first()).toBeVisible({ timeout: 10_000 });
    expect(await nodes.count()).toBeGreaterThanOrEqual(3);
  });

  test('spine sections appear in emergence order m1 → m2 → m3 → m4', async ({ page }) => {
    await page.goto('/');
    const sections = page.locator('section[data-section]');
    await expect(sections.first()).toBeVisible({ timeout: 10_000 });
    const order = await sections.evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.section),
    );
    const idx = (name: string) => order.indexOf(name);
    expect(idx('constraints')).toBeGreaterThanOrEqual(0);
    expect(idx('constraints')).toBeLessThan(idx('tensions'));
    expect(idx('tensions')).toBeLessThan(idx('required-truths'));
    expect(idx('required-truths')).toBeLessThan(idx('solution-space'));
  });

  test('clicking a constraint accordion expands its body in place (U2)', async ({ page }) => {
    await page.goto('/');
    const constraintsPanel = page.locator('section[data-section="constraints"]');
    await expect(constraintsPanel).toBeVisible();
    const firstAccordion = constraintsPanel.locator('details').first();
    await expect(firstAccordion).toBeVisible();
    expect(await firstAccordion.evaluate((d: HTMLDetailsElement) => d.open)).toBe(false);
    await firstAccordion.locator('summary').click();
    expect(await firstAccordion.evaluate((d: HTMLDetailsElement) => d.open)).toBe(true);
    await expect(firstAccordion.locator('.body')).toBeVisible();
  });

  test('chip in a tension expands the matching constraint accordion', async ({ page }) => {
    await page.goto('/');
    const tensionsPanel = page.locator('section[data-section="tensions"]');
    const firstChip = tensionsPanel.locator('button.chip-link').first();
    await expect(firstChip).toBeVisible();
    const targetId = (await firstChip.textContent())?.trim();
    expect(targetId).toBeTruthy();
    await firstChip.click();
    const target = page.locator(
      `section[data-section="constraints"] details[data-element-id="${targetId}"]`,
    );
    await expect(target).toBeVisible();
    expect(await target.evaluate((d: HTMLDetailsElement) => d.open)).toBe(true);
  });

  test('Solution Space section pins the recommended option first', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('section[data-section="solution-space"]');
    await expect(panel).toBeVisible();
    const firstSummary = panel.locator('details').first().locator('summary');
    await expect(firstSummary.locator('.star')).toBeVisible();
  });

  test('manifold-version meta tag is injected from the running binary (RT-9)', async ({
    page,
  }) => {
    await page.goto('/');
    const metaContent = await page
      .locator('meta[name="manifold-version"]')
      .first()
      .getAttribute('content');
    expect(metaContent).toBeTruthy();
    expect(metaContent).not.toBe('dev');
    expect(metaContent).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('service worker registers on first load (U3, RT-8)', async ({ page }) => {
    await page.goto('/');
    const registered = await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false;
        const reg = await navigator.serviceWorker.getRegistration();
        return Boolean(reg);
      },
      undefined,
      { timeout: 15_000 },
    );
    expect(await registered.jsonValue()).toBe(true);
  });
});
