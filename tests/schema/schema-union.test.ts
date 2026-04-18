/**
 * Schema discriminated union test (prompt-eval-fixes-v2)
 *
 * Satisfies: RT-1 (non-software domain works end-to-end), RT-1.1 (schema accepts non-software category keys),
 * B1 (non-software manifolds validate cleanly), RT-3 (schema enforces domain↔categories coherence).
 *
 * This test is EXPECTED TO FAIL today and PASS after the ONE_WAY schema EDIT (step 1 in
 * reversibility_log) lands in `cli/lib/structure-schema.ts`. The current schema uses a single
 * `ConstraintsByCategorySchema` shape; after Option A it becomes a discriminated union on `domain`.
 */
import { describe, test, expect } from 'bun:test';
import { parseManifoldStructure } from '../../cli/lib/structure-schema';

const softwareManifold = {
  $schema:
    'https://raw.githubusercontent.com/dhanesh/manifold/main/install/manifold-structure.schema.json',
  schema_version: 3,
  feature: 'sw-fixture',
  phase: 'INITIALIZED',
  domain: 'software',
  created: '2026-04-18T00:00:00Z',
  constraints: {
    business: [{ id: 'B1', type: 'invariant' }],
    technical: [],
    user_experience: [],
    security: [],
    operational: [],
  },
  tensions: [],
  anchors: { required_truths: [] },
  iterations: [],
  convergence: { status: 'NOT_STARTED' },
};

const nonSoftwareManifold = {
  ...softwareManifold,
  feature: 'ns-fixture',
  domain: 'non-software',
  constraints: {
    obligations: [{ id: 'OB1', type: 'invariant' }],
    desires: [{ id: 'D1', type: 'goal' }],
    resources: [{ id: 'R1', type: 'boundary' }],
    risks: [{ id: 'RK1', type: 'invariant' }],
    dependencies: [{ id: 'DP1', type: 'boundary' }],
  },
};

describe('schema discriminated union on domain', () => {
  test('accepts software manifold with business/technical/... keys', () => {
    const result = parseManifoldStructure(softwareManifold);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('software');
      expect(result.data.constraints).toBeDefined();
    }
  });

  test('accepts non-software manifold with obligations/desires/... keys', () => {
    const result = parseManifoldStructure(nonSoftwareManifold);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('non-software');
      expect(result.data.constraints).toBeDefined();
    }
  });

  test('rejects software manifold with non-software keys (category crossover)', () => {
    const bad = { ...softwareManifold, constraints: nonSoftwareManifold.constraints };
    const result = parseManifoldStructure(bad);
    expect(result.success).toBe(false);
  });

  test('rejects non-software manifold with software keys (category crossover)', () => {
    const bad = { ...nonSoftwareManifold, constraints: softwareManifold.constraints };
    const result = parseManifoldStructure(bad);
    expect(result.success).toBe(false);
  });

  test('round-trips parse -> stringify -> parse for both shapes', () => {
    for (const fixture of [softwareManifold, nonSoftwareManifold]) {
      const first = parseManifoldStructure(fixture);
      expect(first.success).toBe(true);
      if (!first.success) continue;
      const serialized = JSON.stringify(first.data);
      const second = parseManifoldStructure(JSON.parse(serialized));
      expect(second.success).toBe(true);
      if (second.success) {
        expect(second.data).toEqual(first.data);
      }
    }
  });

  test('non-software ID prefixes match universal categories', () => {
    const result = parseManifoldStructure(nonSoftwareManifold);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const c: any = result.data.constraints;
    expect(c.obligations[0].id).toMatch(/^OB\d+$/);
    expect(c.desires[0].id).toMatch(/^D\d+$/);
    expect(c.resources[0].id).toMatch(/^R\d+$/);
    expect(c.risks[0].id).toMatch(/^RK\d+$/);
    expect(c.dependencies[0].id).toMatch(/^DP\d+$/);
  });

  test('legacy manifold without domain field is pre-normalized to software', () => {
    const { domain, ...legacyManifold } = softwareManifold;
    const result = parseManifoldStructure(legacyManifold);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('software');
    }
  });
});
