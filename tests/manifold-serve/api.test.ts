/**
 * Two-tier /api/manifolds contract — index endpoint returns metadata only,
 * detail endpoint returns full content + synthesised graph.
 *
 * @constraint U4 — multi-manifold index
 * @constraint T4 — lightweight (index payload bounded by metadata-only shape)
 * @constraint RT-12 — two-tier API surface
 * @constraint S3 — feature names validated, no path traversal
 * @constraint T2 — read-only (HEAD/GET only, no body mutation)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  startManifoldServer,
  type RunningServer,
  type ServeContext,
} from '../../cli/web/server.js';

const TMP = join(tmpdir(), `manifold-api-${Date.now()}`);
const MANIFOLD_DIR = join(TMP, '.manifold');

const sampleJson = {
  $schema: 'https://example.invalid/schema.json',
  schema_version: 3,
  feature: 'sample',
  phase: 'TENSIONED',
  domain: 'software',
  constraints: {
    business: [{ id: 'B1', type: 'invariant' }],
    technical: [{ id: 'T1', type: 'boundary' }],
    user_experience: [],
    security: [],
    operational: [],
  },
  tensions: [{ id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' }],
  anchors: { required_truths: [] },
  iterations: [],
  convergence: { status: 'NOT_STARTED' },
};

const sampleMd = `# sample\n\n## Outcome\n\nA tiny test manifold.\n`;

let server: RunningServer;
let baseUrl: string;

beforeAll(async () => {
  mkdirSync(MANIFOLD_DIR, { recursive: true });
  writeFileSync(join(MANIFOLD_DIR, 'sample.json'), JSON.stringify(sampleJson));
  writeFileSync(join(MANIFOLD_DIR, 'sample.md'), sampleMd);

  const ctx: ServeContext = {
    manifoldDir: MANIFOLD_DIR,
    host: '127.0.0.1',
    port: 0, // Bun picks a free port
    cliVersion: '0.0.0-test',
  };
  server = await startManifoldServer(ctx);
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  await server?.stop();
  rmSync(TMP, { recursive: true, force: true });
});

describe('GET /api/manifolds (index)', () => {
  test('returns metadata-only summaries (RT-12)', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.manifolds).toBeDefined();
    const sample = body.manifolds.find((m: any) => m.feature === 'sample');
    expect(sample).toBeDefined();
    expect(sample.phase).toBe('TENSIONED');
    expect(sample.counts.constraints).toBe(2);
    expect(sample.counts.tensions).toBe(1);
    // Metadata-only — no full json/markdown payload
    expect(sample.json).toBeUndefined();
    expect(sample.markdown).toBeUndefined();
  });

  test('emits the binary version header (RT-9)', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds`);
    const body = await res.json();
    expect(body.version).toBe('0.0.0-test');
  });
});

describe('GET /api/manifolds/<feature> (detail)', () => {
  test('returns full content + synthesised graph (RT-12)', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds/sample`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.json.feature).toBe('sample');
    expect(body.markdown).toContain('Outcome');
    expect(body.graph.nodes.length).toBeGreaterThanOrEqual(3); // B1, T1, TN1
    expect(body.graph.edges.length).toBeGreaterThan(0);
  });

  test('returns 404 for unknown feature names', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds/does-not-exist`);
    expect(res.status).toBe(404);
  });

  test('rejects feature names containing path-traversal sequences (S3)', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds/..%2Fetc%2Fpasswd`);
    expect(res.status).toBe(404);
  });
});

describe('safe methods only (T2)', () => {
  test('rejects POST', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds`, { method: 'POST' });
    expect(res.status).toBe(405);
  });

  test('rejects DELETE', async () => {
    const res = await fetch(`${baseUrl}/api/manifolds/sample`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(405);
  });
});
