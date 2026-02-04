/**
 * Tests for manifold-linker.ts
 * Validates: JSON-Markdown linking for hybrid format
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  validateManifoldLink,
  loadAndValidateManifold,
  loadManifoldByFeature,
  detectManifoldFormat,
  formatLinkingResult,
} from '../lib/manifold-linker.js';
import { ManifoldStructureSchema } from '../lib/structure-schema.js';
import { parseManifoldMarkdown } from '../lib/markdown-parser.js';

describe('validateManifoldLink', () => {
  test('returns valid when all IDs are linked', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
      },
    });

    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: No Duplicates

Statement here.

### Technical

#### T1: Performance

Statement here.
`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.linkedConstraints).toBe(2);
    expect(result.summary.totalConstraints).toBe(2);
  });

  test('returns error when JSON constraint missing from Markdown', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [
          { id: 'B1', type: 'invariant' },
          { id: 'B2', type: 'goal' },
        ],
      },
    });

    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Only This One

Statement.
`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('B2'))).toBe(true);
    expect(result.summary.linkedConstraints).toBe(1);
    expect(result.summary.totalConstraints).toBe(2);
  });

  test('returns warning when Markdown content not in JSON', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
      },
    });

    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: In JSON

Statement.

#### B2: Extra Content

Not in JSON structure.
`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(true); // Warnings don't invalidate
    expect(result.warnings.some(w => w.message.includes('B2'))).toBe(true);
    expect(result.warnings.some(w => w.type === 'extra_content')).toBe(true);
  });

  test('validates tension linking', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'TENSIONED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
        technical: [{ id: 'T1', type: 'boundary' }],
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
      ],
    });

    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Business

Statement.

### Technical

#### T1: Tech

Statement.

## Tensions

### TN1: Trade-off

Description here.

> **Resolution:** Resolution here.
`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(true);
    expect(result.summary.linkedTensions).toBe(1);
  });

  test('returns error when tension missing from Markdown', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'TENSIONED',
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
      ],
    });

    const content = parseManifoldMarkdown(`# test

## Tensions

`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('TN1'))).toBe(true);
  });

  test('validates required truth linking', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'ANCHORED',
      anchors: {
        required_truths: [
          { id: 'RT-1', status: 'SATISFIED' },
          { id: 'RT-2', status: 'NOT_SATISFIED' },
        ],
      },
    });

    const content = parseManifoldMarkdown(`# test

## Required Truths

### RT-1: First Truth

Statement.

### RT-2: Second Truth

Statement.
`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(true);
    expect(result.summary.linkedRequiredTruths).toBe(2);
  });

  test('returns error for invalid tension.between references', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'TENSIONED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
      },
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1', 'B99'], status: 'resolved' },
      ],
    });

    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Test

Statement.

## Tensions

### TN1: Test

Description.
`);

    const result = validateManifoldLink(structure, content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.type === 'invalid_reference')).toBe(true);
    expect(result.errors.some(e => e.message.includes('B99'))).toBe(true);
  });

  test('warns about quality issues', () => {
    const structure = ManifoldStructureSchema.parse({
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
      },
    });

    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Empty

`);
    // Simulate empty statement
    const b1 = content.constraints.get('B1');
    if (b1) b1.statement = '';

    const result = validateManifoldLink(structure, content);
    expect(result.warnings.some(w => w.type === 'quality')).toBe(true);
  });
});

describe('detectManifoldFormat', () => {
  const testDir = '/tmp/manifold-test-' + Date.now();

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('detects json-md format', () => {
    writeFileSync(join(testDir, 'test.json'), '{}');
    writeFileSync(join(testDir, 'test.md'), '# test');
    expect(detectManifoldFormat(testDir, 'test')).toBe('json-md');
  });

  test('detects yaml format', () => {
    writeFileSync(join(testDir, 'test.yaml'), 'feature: test');
    expect(detectManifoldFormat(testDir, 'test')).toBe('yaml');
  });

  test('prefers json-md over yaml', () => {
    writeFileSync(join(testDir, 'test.json'), '{}');
    writeFileSync(join(testDir, 'test.md'), '# test');
    writeFileSync(join(testDir, 'test.yaml'), 'feature: test');
    expect(detectManifoldFormat(testDir, 'test')).toBe('json-md');
  });

  test('returns unknown for missing files', () => {
    expect(detectManifoldFormat(testDir, 'nonexistent')).toBe('unknown');
  });

  test('returns unknown for partial json-md (only json)', () => {
    writeFileSync(join(testDir, 'test.json'), '{}');
    // Missing .md file
    expect(detectManifoldFormat(testDir, 'test')).toBe('unknown');
  });
});

describe('loadAndValidateManifold', () => {
  const testDir = '/tmp/manifold-load-test-' + Date.now();

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('loads and validates valid manifold', () => {
    const jsonPath = join(testDir, 'test.json');
    const mdPath = join(testDir, 'test.md');

    writeFileSync(jsonPath, JSON.stringify({
      schema_version: 3,
      feature: 'test',
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'B1', type: 'invariant' }],
      },
    }));

    writeFileSync(mdPath, `# test

## Outcome

Test outcome.

## Constraints

### Business

#### B1: Test Constraint

This is the statement.
`);

    const result = loadAndValidateManifold(jsonPath, mdPath);
    expect(result.success).toBe(true);
    expect(result.structure?.feature).toBe('test');
    expect(result.content?.constraints.has('B1')).toBe(true);
    expect(result.linking?.valid).toBe(true);
  });

  test('returns error for missing JSON file', () => {
    const jsonPath = join(testDir, 'missing.json');
    const mdPath = join(testDir, 'test.md');
    writeFileSync(mdPath, '# test');

    const result = loadAndValidateManifold(jsonPath, mdPath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('returns error for missing Markdown file', () => {
    const jsonPath = join(testDir, 'test.json');
    const mdPath = join(testDir, 'missing.md');
    writeFileSync(jsonPath, JSON.stringify({ feature: 'test', phase: 'INITIALIZED' }));

    const result = loadAndValidateManifold(jsonPath, mdPath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('returns error for invalid JSON', () => {
    const jsonPath = join(testDir, 'test.json');
    const mdPath = join(testDir, 'test.md');
    writeFileSync(jsonPath, 'not valid json');
    writeFileSync(mdPath, '# test');

    const result = loadAndValidateManifold(jsonPath, mdPath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('parse JSON');
  });

  test('returns error for schema violation', () => {
    const jsonPath = join(testDir, 'test.json');
    const mdPath = join(testDir, 'test.md');
    writeFileSync(jsonPath, JSON.stringify({ phase: 'INVALID' }));
    writeFileSync(mdPath, '# test');

    const result = loadAndValidateManifold(jsonPath, mdPath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON structure');
  });
});

describe('loadManifoldByFeature', () => {
  const testDir = '/tmp/manifold-feature-test-' + Date.now();

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('loads manifold by feature name', () => {
    writeFileSync(join(testDir, 'my-feature.json'), JSON.stringify({
      feature: 'my-feature',
      phase: 'INITIALIZED',
    }));
    writeFileSync(join(testDir, 'my-feature.md'), '# my-feature\n\n## Outcome\n\nTest.');

    const result = loadManifoldByFeature(testDir, 'my-feature');
    expect(result.success).toBe(true);
    expect(result.structure?.feature).toBe('my-feature');
  });
});

describe('formatLinkingResult', () => {
  test('formats valid result', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      summary: {
        totalConstraints: 5,
        totalTensions: 2,
        totalRequiredTruths: 3,
        linkedConstraints: 5,
        linkedTensions: 2,
        linkedRequiredTruths: 3,
      },
    };

    const formatted = formatLinkingResult(result);
    expect(formatted).toContain('VALID');
    expect(formatted).toContain('5/5');
    expect(formatted).toContain('2/2');
    expect(formatted).toContain('3/3');
  });

  test('formats invalid result with errors', () => {
    const result = {
      valid: false,
      errors: [
        {
          type: 'missing_content' as const,
          field: 'constraints.business.B2',
          message: 'Constraint "B2" not found in Markdown',
          suggestion: 'Add heading "#### B2: [Title]"',
        },
      ],
      warnings: [],
      summary: {
        totalConstraints: 2,
        totalTensions: 0,
        totalRequiredTruths: 0,
        linkedConstraints: 1,
        linkedTensions: 0,
        linkedRequiredTruths: 0,
      },
    };

    const formatted = formatLinkingResult(result);
    expect(formatted).toContain('INVALID');
    expect(formatted).toContain('B2');
    expect(formatted).toContain('missing_content');
    expect(formatted).toContain('1/2');
  });

  test('formats result with warnings', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [
        {
          type: 'extra_content' as const,
          field: 'markdown.constraints.B99',
          message: 'Extra content in Markdown',
        },
      ],
      summary: {
        totalConstraints: 1,
        totalTensions: 0,
        totalRequiredTruths: 0,
        linkedConstraints: 1,
        linkedTensions: 0,
        linkedRequiredTruths: 0,
      },
    };

    const formatted = formatLinkingResult(result);
    expect(formatted).toContain('VALID');
    expect(formatted).toContain('Warnings');
    expect(formatted).toContain('extra_content');
  });
});
