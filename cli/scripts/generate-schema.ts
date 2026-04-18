#!/usr/bin/env bun
/**
 * Generate JSON Schema from Zod schema
 */

import { manifoldStructureJsonSchema } from '../lib/structure-schema.ts';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';

// Mirror the runtime z.preprocess that defaults a missing `domain` to "software".
// Without this, IDEs validating legacy manifolds (no `domain` field) report a false
// error that the runtime parser would silently fix.
function dropDomainFromRequired(schema: unknown): void {
  if (!schema || typeof schema !== 'object') return;
  const obj = schema as Record<string, unknown>;
  const branches = (obj.definitions as Record<string, { anyOf?: Array<Record<string, unknown>> }> | undefined)
    ?.ManifoldStructure?.anyOf;
  if (!Array.isArray(branches)) return;
  for (const branch of branches) {
    const required = branch.required;
    if (Array.isArray(required)) {
      branch.required = required.filter((k) => k !== 'domain');
    }
  }
}

const outputPath = join(dirname(import.meta.dir), '..', 'install', 'manifold-structure.schema.json');

dropDomainFromRequired(manifoldStructureJsonSchema);

writeFileSync(outputPath, JSON.stringify(manifoldStructureJsonSchema, null, 2));

console.log(`Generated JSON Schema at: ${outputPath}`);
