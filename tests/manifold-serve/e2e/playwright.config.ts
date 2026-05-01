/**
 * Playwright config for browser-level manifold-serve tests.
 *
 * Runs `manifold serve` as the webServer so the suite is self-contained.
 * Set MANIFOLD_E2E_BASE_URL to test against an already-running instance.
 *
 * Satisfies: RT-6 (graph render verification), RT-8 (PWA registration),
 *            U1, U2 (graph + narrative coupling).
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.MANIFOLD_E2E_PORT ?? 6358);
const baseURL = process.env.MANIFOLD_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: process.env.MANIFOLD_E2E_BASE_URL
    ? undefined
    : {
        command: `bun cli/index.ts serve --port ${PORT}`,
        cwd: '../../..',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 30_000,
      },
});
