/**
 * Multi-schema tolerance — v1, v2, v3 manifolds load through the same
 * collection module without any of them rejecting the others.
 *
 * @constraint T5 — multi-schema tolerance
 * @constraint U4 — multi-manifold index spans all manifolds
 * @constraint RT-4 — multi-schema reader
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { listManifolds, loadManifoldDetail } from '../../cli/lib/manifold-collection.js';

const TMP = join(tmpdir(), `manifold-multi-${Date.now()}`);
const MANIFOLD_DIR = join(TMP, '.manifold');

const v1 = {
  feature: 'legacy-v1',
  phase: 'CONSTRAINED',
  domain: 'software',
  constraints: {
    business: [{ id: 'B1', type: 'invariant' }],
    technical: [],
    user_experience: [],
    security: [],
    operational: [],
  },
  tensions: [],
};

const v2 = {
  schema_version: 2,
  feature: 'legacy-v2',
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
  iterations: [],
};

const v3 = {
  $schema: 'https://example.invalid/schema.json',
  schema_version: 3,
  feature: 'modern-v3',
  phase: 'ANCHORED',
  domain: 'software',
  constraints: {
    business: [{ id: 'B1', type: 'invariant' }],
    technical: [{ id: 'T1', type: 'boundary' }],
    user_experience: [],
    security: [],
    operational: [],
  },
  tensions: [],
  anchors: {
    required_truths: [{ id: 'RT-1', status: 'NOT_SATISFIED', maps_to: ['B1'] }],
  },
  constraint_graph: {
    edges: { dependencies: [{ from: 'T1', to: 'B1' }], conflicts: [], satisfies: [] },
  },
  iterations: [],
  convergence: { status: 'IN_PROGRESS' },
};

const md = (feature: string, outcome: string) =>
  `# ${feature}\n\n## Outcome\n\n${outcome}\n`;

beforeAll(() => {
  mkdirSync(MANIFOLD_DIR, { recursive: true });
  writeFileSync(join(MANIFOLD_DIR, 'legacy-v1.json'), JSON.stringify(v1));
  writeFileSync(join(MANIFOLD_DIR, 'legacy-v1.md'), md('legacy-v1', 'A v1 fixture.'));
  writeFileSync(join(MANIFOLD_DIR, 'legacy-v2.json'), JSON.stringify(v2));
  writeFileSync(join(MANIFOLD_DIR, 'legacy-v2.md'), md('legacy-v2', 'A v2 fixture.'));
  writeFileSync(join(MANIFOLD_DIR, 'modern-v3.json'), JSON.stringify(v3));
  writeFileSync(join(MANIFOLD_DIR, 'modern-v3.md'), md('modern-v3', 'A v3 fixture.'));
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe('listManifolds across schema versions', () => {
  test('all three versions load through the same call (RT-4)', () => {
    const list = listManifolds(MANIFOLD_DIR);
    const features = list.map((m) => m.feature).sort();
    expect(features).toEqual(['legacy-v1', 'legacy-v2', 'modern-v3']);
  });

  test('schema_version is reported per manifold', () => {
    const list = listManifolds(MANIFOLD_DIR);
    const byFeature = Object.fromEntries(list.map((m) => [m.feature, m]));
    expect(byFeature['legacy-v1'].schema_version).toBe(1);
    expect(byFeature['legacy-v2'].schema_version).toBe(2);
    expect(byFeature['modern-v3'].schema_version).toBe(3);
  });
});

describe('loadManifoldDetail synthesises graphs across versions', () => {
  test('v1 manifold → empty graph but loads without throwing', () => {
    const detail = loadManifoldDetail(MANIFOLD_DIR, 'legacy-v1');
    expect(detail).not.toBeNull();
    expect(detail!.graph.source).toBe('synthesised');
    expect(detail!.graph.nodes.length).toBe(1);
  });

  test('v2 manifold → tension edges synthesised', () => {
    const detail = loadManifoldDetail(MANIFOLD_DIR, 'legacy-v2');
    expect(detail!.graph.edges.length).toBeGreaterThan(0);
    expect(detail!.graph.source).toBe('synthesised');
  });

  test('v3 manifold → includes native constraint_graph edges', () => {
    const detail = loadManifoldDetail(MANIFOLD_DIR, 'modern-v3');
    // 'mixed' is expected because the fixture has both a native dependency
    // edge and a required truth that synthesises a maps_to edge.
    expect(['native', 'mixed']).toContain(detail!.graph.source);
    const native = detail!.graph.edges.filter((e) => e.origin === 'native');
    expect(native.length).toBeGreaterThan(0);
  });
});
