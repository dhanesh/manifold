/**
 * Vite config for the manifold visualiser PWA.
 *
 * Satisfies: RT-8 (PWA shell), RT-10 (critical chunk ≤ 500 KB gz + lazy chunks),
 *            T1 (fully self-contained — no CDN), T4 (lightweight),
 *            U3 (offline-capable), O3 (cache namespace versioned).
 */

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'),
) as { version: string };

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'flow': ['d3-sankey', 'd3-array', 'd3-shape'],
          'markdown': [
            'unified',
            'remark-parse',
            'remark-gfm',
            'remark-rehype',
            'rehype-sanitize',
            'rehype-stringify',
          ],
        },
      },
    },
  },
  define: {
    __MANIFOLD_VERSION__: JSON.stringify(cliPkg.version),
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Manifold Visualiser',
        short_name: 'Manifold',
        description: 'Browse the constraint manifolds in this project.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0e1116',
        theme_color: '#0e1116',
        icons: [],
      },
      workbox: {
        cacheId: `manifold-${cliPkg.version}`,
        globPatterns: ['**/*.{html,js,css,svg,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
