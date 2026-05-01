/**
 * Latency budget — /api/manifolds must answer p50 ≤ 800 ms and p99 ≤ 2 s
 * over loopback for a manifold dir of typical size.
 *
 * @constraint T4 — lightweight performance (statistical thresholds)
 * @constraint RT-12 — two-tier API surface
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { startManifoldServer, type RunningServer } from '../../cli/web/server.js';

const TMP = join(tmpdir(), `manifold-perf-${Date.now()}`);
const MANIFOLD_DIR = join(TMP, '.manifold');
const N_FIXTURES = 30;
const N_REQUESTS = 100;
const P50_BUDGET_MS = 800;
const P99_BUDGET_MS = 2000;

let server: RunningServer;
let baseUrl: string;

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

beforeAll(async () => {
  mkdirSync(MANIFOLD_DIR, { recursive: true });
  for (let i = 0; i < N_FIXTURES; i++) {
    writeFileSync(
      join(MANIFOLD_DIR, `feature-${i}.json`),
      JSON.stringify({
        schema_version: 3,
        feature: `feature-${i}`,
        phase: 'INITIALIZED',
        domain: 'software',
        constraints: {
          business: [{ id: 'B1', type: 'invariant' }],
          technical: [{ id: 'T1', type: 'boundary' }],
          user_experience: [],
          security: [],
          operational: [],
        },
        tensions: [],
        anchors: { required_truths: [] },
        iterations: [],
        convergence: { status: 'NOT_STARTED' },
      }),
    );
    writeFileSync(
      join(MANIFOLD_DIR, `feature-${i}.md`),
      `# feature-${i}\n\n## Outcome\n\nPerf fixture #${i}.\n`,
    );
  }

  server = await startManifoldServer({
    manifoldDir: MANIFOLD_DIR,
    host: '127.0.0.1',
    port: 0,
    cliVersion: '0.0.0-perf',
  });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  await server?.stop();
  rmSync(TMP, { recursive: true, force: true });
});

describe('GET /api/manifolds latency budget (T4)', () => {
  test(`p50 ≤ ${P50_BUDGET_MS} ms and p99 ≤ ${P99_BUDGET_MS} ms over ${N_REQUESTS} loopback requests`, async () => {
    // Warm-up: 5 requests to amortise V8 / Bun JIT.
    for (let i = 0; i < 5; i++) {
      await fetch(`${baseUrl}/api/manifolds`);
    }

    const samples: number[] = [];
    for (let i = 0; i < N_REQUESTS; i++) {
      const t0 = performance.now();
      const res = await fetch(`${baseUrl}/api/manifolds`);
      await res.text(); // consume body so timing covers full response
      samples.push(performance.now() - t0);
      expect(res.status).toBe(200);
    }

    samples.sort((a, b) => a - b);
    const p50 = percentile(samples, 0.5);
    const p99 = percentile(samples, 0.99);

    if (process.env.MANIFOLD_PERF_VERBOSE === '1') {
      console.log(
        `  p50=${p50.toFixed(2)}ms  p99=${p99.toFixed(2)}ms  min=${samples[0].toFixed(2)}ms  max=${samples[samples.length - 1].toFixed(2)}ms`,
      );
    }

    expect(p50).toBeLessThanOrEqual(P50_BUDGET_MS);
    expect(p99).toBeLessThanOrEqual(P99_BUDGET_MS);
  });
});
