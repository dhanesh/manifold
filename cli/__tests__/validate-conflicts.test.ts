/**
 * Regression tests for `manifold validate --conflicts`.
 *
 * The JSON+Markdown branch of the runner used to return no `manifold`, so the
 * formatter's `if (conflicts && result.manifold)` gate silently skipped the
 * whole section — no error, no "no conflicts detected", nothing. json-md is the
 * format `manifold init` produces, so the flag was dead for every new user.
 *
 * These tests pin both halves: the runner must carry a parsed manifold with
 * markdown-sourced statements, and the formatter must actually render the
 * section for every format.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { validateFeature } from '../commands/validate/runner.js';
import { printValidationOutput } from '../commands/validate/formatter.js';

// ============================================================
// Fixtures
// ============================================================

/** Structure half of a json-md manifold. Statements live in the .md only. */
const STRUCTURE = {
  schema_version: 3,
  feature: 'checkout-auth',
  phase: 'CONSTRAINED',
  constraints: {
    business: [{ id: 'B1', type: 'invariant' }],
    technical: [
      { id: 'T1', type: 'boundary' },
      { id: 'T2', type: 'goal' },
    ],
  },
};

/** Markdown with two competing numeric latency limits — a resource_conflict. */
const MARKDOWN = `# checkout-auth

## Outcome

Secure login that stays fast under load.

---

## Constraints

### Business

#### B1: Credential Protection

User credentials must never be exposed in logs, errors, or responses.

### Technical

#### T1: Auth Latency

Authentication latency must stay under 500ms at p95.

#### T2: Strength Meter Latency

Password strength meter latency must stay under 50ms per keystroke.
`;

function makeManifoldDir(): string {
  const dir = join(
    '/tmp',
    `manifold-validate-conflicts-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    '.manifold'
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Run `fn` with console.log captured, returning everything it printed. */
function captureOutput(fn: () => void): string {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join('\n');
}

// ============================================================
// Tests
// ============================================================

describe('validate --conflicts on JSON+Markdown manifolds', () => {
  let manifoldDir: string;

  beforeEach(() => {
    manifoldDir = makeManifoldDir();
    writeFileSync(join(manifoldDir, 'checkout-auth.json'), JSON.stringify(STRUCTURE));
    writeFileSync(join(manifoldDir, 'checkout-auth.md'), MARKDOWN);
  });

  afterEach(() => {
    if (existsSync(manifoldDir)) {
      rmSync(join(manifoldDir, '..'), { recursive: true, force: true });
    }
  });

  test('runner returns a manifold so conflict detection can run', async () => {
    const result = await validateFeature(manifoldDir, 'checkout-auth', {});

    expect(result.format).toBe('json-md');
    expect(result.manifold).toBeDefined();

    // Statements must come from the markdown — the JSON structure has IDs only,
    // and the detector matches on statement text.
    const t1 = result.manifold?.constraints?.technical?.find((c) => c.id === 'T1');
    expect(t1?.statement).toContain('500ms');
  });

  test('the conflict section renders instead of being silently skipped', async () => {
    const result = await validateFeature(manifoldDir, 'checkout-auth', { conflicts: true });

    const output = captureOutput(() =>
      printValidationOutput('checkout-auth', result, { conflicts: true })
    );

    expect(output).toContain('SEMANTIC CONFLICT ANALYSIS');
  });

  test('a real conflict in the markdown is reported with its constraint IDs', async () => {
    const result = await validateFeature(manifoldDir, 'checkout-auth', { conflicts: true });

    const output = captureOutput(() =>
      printValidationOutput('checkout-auth', result, { conflicts: true })
    );

    expect(output).toContain('resource_conflict');
    expect(output).toContain('T1');
    expect(output).toContain('T2');
  });

  test('no section is printed without the flag', async () => {
    const result = await validateFeature(manifoldDir, 'checkout-auth', {});

    const output = captureOutput(() => printValidationOutput('checkout-auth', result, {}));

    expect(output).not.toContain('SEMANTIC CONFLICT ANALYSIS');
  });
});

describe('validate --conflicts on other formats', () => {
  let manifoldDir: string;

  beforeEach(() => {
    manifoldDir = makeManifoldDir();
  });

  afterEach(() => {
    if (existsSync(manifoldDir)) {
      rmSync(join(manifoldDir, '..'), { recursive: true, force: true });
    }
  });

  test('json-only still renders the section', async () => {
    const jsonOnly = {
      schema_version: 3,
      feature: 'json-only',
      phase: 'CONSTRAINED',
      outcome: 'Fast auth.',
      constraints: {
        technical: [
          { id: 'T1', type: 'boundary', statement: 'Auth latency must stay under 500ms at p95.' },
          {
            id: 'T2',
            type: 'goal',
            statement: 'Meter latency must stay under 50ms per keystroke.',
          },
        ],
      },
    };
    writeFileSync(join(manifoldDir, 'json-only.json'), JSON.stringify(jsonOnly));

    const result = await validateFeature(manifoldDir, 'json-only', { conflicts: true });
    const output = captureOutput(() =>
      printValidationOutput('json-only', result, { conflicts: true })
    );

    expect(result.format).toBe('json');
    expect(output).toContain('SEMANTIC CONFLICT ANALYSIS');
  });

  test('yaml still renders the section', async () => {
    writeFileSync(
      join(manifoldDir, 'legacy.yaml'),
      [
        'schema_version: 3',
        'feature: legacy',
        'phase: CONSTRAINED',
        'outcome: Fast auth.',
        'constraints:',
        '  technical:',
        '    - id: T1',
        '      type: boundary',
        '      statement: Auth latency must stay under 500ms at p95.',
        '    - id: T2',
        '      type: goal',
        '      statement: Meter latency must stay under 50ms per keystroke.',
        '',
      ].join('\n')
    );

    const result = await validateFeature(manifoldDir, 'legacy', { conflicts: true });
    const output = captureOutput(() =>
      printValidationOutput('legacy', result, { conflicts: true })
    );

    expect(result.format).toBe('yaml');
    expect(output).toContain('SEMANTIC CONFLICT ANALYSIS');
  });
});
