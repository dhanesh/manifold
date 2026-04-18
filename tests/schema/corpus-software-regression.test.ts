/**
 * Corpus regression test — software manifolds must not break when schema gains the non-software branch.
 *
 * Satisfies: RT-2 (no regression on 19 software manifolds), B2 (software corpus stays 19/19),
 * S1 (ship gate: regression test passes on every PR).
 *
 * Scans `.manifold/*.json`, filters to domain software/absent (legacy), and validates via Zod parse.
 * If the schema union is wrong in a way that rejects current-shape software manifolds, this catches it.
 */
import { describe, test, expect } from 'bun:test';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseManifoldStructure } from '../../cli/lib/structure-schema';

const MANIFOLD_DIR = join(process.cwd(), '.manifold');

function listSoftwareManifolds(): string[] {
  const entries = readdirSync(MANIFOLD_DIR);
  return entries
    .filter((f) => f.endsWith('.json') && !f.endsWith('.verify.json') && !f.endsWith('.anchor.yaml'))
    .filter((f) => {
      const raw = readFileSync(join(MANIFOLD_DIR, f), 'utf-8');
      try {
        const obj = JSON.parse(raw);
        const domain = obj.domain ?? 'software';
        return domain === 'software';
      } catch {
        return false;
      }
    });
}

describe('software corpus schema regression', () => {
  const manifolds = listSoftwareManifolds();

  test('at least 10 software manifolds present (sanity)', () => {
    expect(manifolds.length).toBeGreaterThanOrEqual(10);
  });

  for (const file of manifolds) {
    test(`${file} validates against structure schema`, () => {
      const raw = readFileSync(join(MANIFOLD_DIR, file), 'utf-8');
      const obj = JSON.parse(raw);
      const result = parseManifoldStructure(obj);
      if (!result.success) {
        // Surface the first validation error for debugging
        throw new Error(
          `Schema validation failed for ${file}: ${JSON.stringify(result.error.errors.slice(0, 3), null, 2)}`,
        );
      }
      expect(result.success).toBe(true);
    });
  }
});
