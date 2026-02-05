#!/usr/bin/env bun
/**
 * Generate JSON Schema from Zod schema
 */

import { manifoldStructureJsonSchema } from '../lib/structure-schema.ts';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';

const outputPath = join(dirname(import.meta.dir), '..', 'install', 'manifold-structure.schema.json');

writeFileSync(outputPath, JSON.stringify(manifoldStructureJsonSchema, null, 2));

console.log(`Generated JSON Schema at: ${outputPath}`);
