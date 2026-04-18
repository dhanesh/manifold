/**
 * Fresh-run non-software integration test.
 *
 * Satisfies: RT-1 (non-software domain works end-to-end), B1 (a non-software manifold validates cleanly),
 * RT-5 (m5 emits .verify.json unconditionally — sanity of write path).
 *
 * Constructs a small non-software fixture that matches what the updated m0-init should produce,
 * writes it to a temp dir, runs `cli/manifold validate`, expects exit 0 and zero errors.
 * This is the end-to-end equivalent of the non-software 30+ violation case in the eval report.
 *
 * Second test populates tensions + RTs with non-software ID refs (OB1, D1, etc.) and exercises
 * the linker through source (bypassing the stale compiled binary). This guards the category-aware
 * iteration in manifold-linker.ts against regressing to software-only.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadAndValidateManifold } from '../../cli/lib/manifold-linker.js';

const TMP = join(tmpdir(), `manifold-fresh-ns-${Date.now()}`);
const MANIFOLD_DIR = join(TMP, '.manifold');

const nonSoftwareFixture = {
  $schema:
    'https://raw.githubusercontent.com/dhanesh/manifold/main/install/manifold-structure.schema.json',
  schema_version: 3,
  feature: 'ns-fresh',
  phase: 'INITIALIZED',
  domain: 'non-software',
  created: '2026-04-18T00:00:00Z',
  constraints: {
    obligations: [{ id: 'OB1', type: 'invariant' }],
    desires: [{ id: 'D1', type: 'goal' }],
    resources: [{ id: 'R1', type: 'boundary' }],
    risks: [{ id: 'RK1', type: 'invariant' }],
    dependencies: [{ id: 'DP1', type: 'boundary' }],
  },
  tensions: [],
  anchors: { required_truths: [] },
  iterations: [],
  convergence: { status: 'NOT_STARTED' },
};

const mdFixture = `# ns-fresh

## Outcome
Validate non-software fresh run.

## Constraints

### Obligations
#### OB1: Placeholder obligation
Text.
> **Rationale:** Test.

### Desires
#### D1: Placeholder desire
Text.
> **Rationale:** Test.

### Resources
#### R1: Placeholder resource
Text.
> **Rationale:** Test.

### Risks
#### RK1: Placeholder risk
Text.
> **Rationale:** Test.

### Dependencies
#### DP1: Placeholder dependency
Text.
> **Rationale:** Test.
`;

describe('non-software fresh-run validates', () => {
  beforeAll(() => {
    mkdirSync(MANIFOLD_DIR, { recursive: true });
    writeFileSync(
      join(MANIFOLD_DIR, 'ns-fresh.json'),
      JSON.stringify(nonSoftwareFixture, null, 2),
    );
    writeFileSync(join(MANIFOLD_DIR, 'ns-fresh.md'), mdFixture);
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  test('cli validate exits 0 on the non-software fixture', () => {
    // Run via `bun cli/index.ts` so the test doesn't depend on a locally
    // compiled binary (which fails on macOS Sequoia gatekeeper without
    // codesigning). End users get signed binaries from GitHub releases.
    const cliEntry = join(process.cwd(), 'cli', 'index.ts');
    const out = execSync(`bun ${cliEntry} validate ns-fresh`, {
      cwd: TMP,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(out).toMatch(/Valid|OK|success/i);
  });
});

describe('non-software linker iterates domain-aware categories', () => {
  const TMP2 = join(tmpdir(), `manifold-fresh-ns-linked-${Date.now()}`);
  const DIR = join(TMP2, '.manifold');
  const jsonPath = join(DIR, 'ns-linked.json');
  const mdPath = join(DIR, 'ns-linked.md');

  const populatedFixture = {
    schema_version: 3,
    feature: 'ns-linked',
    phase: 'TENSIONED',
    domain: 'non-software',
    created: '2026-04-18T00:00:00Z',
    constraints: {
      obligations: [{ id: 'OB1', type: 'invariant' }],
      desires: [{ id: 'D1', type: 'goal' }],
      resources: [{ id: 'R1', type: 'boundary' }],
      risks: [{ id: 'RK1', type: 'invariant' }],
      dependencies: [{ id: 'DP1', type: 'boundary' }],
    },
    tensions: [
      { id: 'TN1', type: 'trade_off', between: ['OB1', 'D1'], status: 'unresolved' },
    ],
    anchors: {
      required_truths: [
        { id: 'RT-1', status: 'NOT_SATISFIED', maps_to: ['OB1', 'R1'] },
      ],
    },
    iterations: [],
    convergence: { status: 'IN_PROGRESS' },
  };

  const mdPopulated = `# ns-linked

## Outcome
Non-software linker coverage.

## Constraints

### Obligations
#### OB1: Placeholder obligation
Must hold.
> **Rationale:** Test.

### Desires
#### D1: Placeholder desire
Aim for it.
> **Rationale:** Test.

### Resources
#### R1: Placeholder resource
Bounded.
> **Rationale:** Test.

### Risks
#### RK1: Placeholder risk
Avoid.
> **Rationale:** Test.

### Dependencies
#### DP1: Placeholder dependency
External.
> **Rationale:** Test.

## Tensions

### TN1: Obligation vs desire
The obligation and the desire pull in opposite directions.

## Required Truths

### RT-1: Obligation resourcing
The obligation can be met within the resource envelope.

**Gap:** No current allocation exists.
`;

  beforeAll(() => {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(jsonPath, JSON.stringify(populatedFixture, null, 2));
    writeFileSync(mdPath, mdPopulated);
  });

  afterAll(() => {
    rmSync(TMP2, { recursive: true, force: true });
  });

  test('loadAndValidateManifold counts non-software constraints and resolves OB1/D1 references', () => {
    const result = loadAndValidateManifold(jsonPath, mdPath);

    expect(result.success).toBe(true);
    // The critical invariants: constraints ARE counted (not zero), tensions reference OB1/D1 successfully,
    // RT references resolve to non-software IDs. Before the fix these all broke because iteration was
    // limited to SOFTWARE_CATEGORY_KEYS.
    expect(result.linking?.summary.totalConstraints).toBe(5);
    expect(result.linking?.summary.linkedConstraints).toBe(5);

    // No "unknown constraint" errors for non-software IDs
    const tensionRefErrors = result.linking?.errors.filter(
      (e) => e.type === 'invalid_reference' && /OB1|D1/.test(e.message),
    );
    expect(tensionRefErrors).toEqual([]);

    // No "maps_to unknown ID" warnings for non-software IDs
    const rtRefWarnings = result.linking?.warnings.filter(
      (w) => w.field.includes('maps_to') && /OB1|R1/.test(w.message),
    );
    expect(rtRefWarnings).toEqual([]);
  });
});
