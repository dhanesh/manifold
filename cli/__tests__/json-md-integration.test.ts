/**
 * Integration tests for JSON+Markdown manifold format
 * Tests all CLI functions with realistic JSON+MD fixtures
 *
 * Validates end-to-end: format detection, parsing, linking, schema validation,
 * feature listing, and round-trip workflows.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Parser functions (status, graph, verify, solve)
import {
  loadFeature,
  getFeatureFiles,
  findManifoldDir,
  listFeatures,
  type FeatureData,
  type FeatureFiles,
} from '../lib/parser.js';

// Linker functions (validate, show)
import {
  loadManifoldByFeature,
  loadAndValidateManifold,
  detectManifoldFormat,
} from '../lib/manifold-linker.js';

// Schema validation
import { ManifoldStructureSchema } from '../lib/structure-schema.js';

// Markdown parser
import { parseManifoldMarkdown } from '../lib/markdown-parser.js';

// ============================================================
// Fixture Data
// ============================================================

/** Full JSON structure for payment-retry feature */
const PAYMENT_RETRY_JSON = {
  schema_version: 3,
  feature: 'payment-retry',
  phase: 'ANCHORED',
  created: '2026-01-15T10:00:00Z',
  constraints: {
    business: [
      { id: 'B1', type: 'invariant' },
    ],
    technical: [
      { id: 'T1', type: 'boundary' },
      { id: 'T2', type: 'goal' },
    ],
    user_experience: [
      { id: 'U1', type: 'goal' },
    ],
    security: [
      { id: 'S1', type: 'invariant' },
    ],
    operational: [],
  },
  tensions: [
    { id: 'TN1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
    { id: 'TN2', type: 'resource_tension', between: ['T2', 'U1'], status: 'unresolved' },
  ],
  anchors: {
    required_truths: [
      { id: 'RT-1', status: 'SATISFIED', maps_to: ['B1'] },
      { id: 'RT-2', status: 'PARTIAL', maps_to: ['T1', 'T2'] },
      { id: 'RT-3', status: 'NOT_SATISFIED', maps_to: ['S1'] },
    ],
    recommended_option: 'Option A: Exponential Backoff with Jitter',
  },
  convergence: {
    status: 'IN_PROGRESS',
    criteria: {
      all_invariants_satisfied: false,
      all_required_truths_satisfied: false,
      no_blocking_gaps: true,
    },
  },
};

/** Full Markdown content for payment-retry feature */
const PAYMENT_RETRY_MD = `# payment-retry

## Outcome

95% retry success rate within 72-hour window while preventing duplicate charges.

---

## Constraints

### Business

#### B1: No Duplicate Payments

Payment processing must never create duplicate charges for the same transaction.

> **Rationale:** Duplicates cause chargebacks and erode customer trust.

### Technical

#### T1: Retry Window Limit

All retry attempts must complete within a 72-hour window from the initial failure.

> **Rationale:** Payment processor SLAs require settlement within 72 hours.

#### T2: Throughput Target

System must handle 10,000 retry operations per minute at peak load.

> **Rationale:** Black Friday peak traffic requires this throughput.

### User Experience

#### U1: User Notification

Users must receive real-time status updates for all retry operations.

> **Rationale:** Reduces support tickets and improves user confidence.

### Security

#### S1: Idempotency Keys

Every payment retry must use cryptographically secure idempotency keys.

> **Rationale:** Prevents replay attacks and ensures exactly-once processing.

---

## Tensions

### TN1: Reliability vs Speed

B1 (no duplicates) requires synchronous idempotency checks that add latency, conflicting with T1 (72-hour window) which needs fast processing.

> **Resolution:** Use async pre-validation with synchronous final check, adding ~50ms per operation.

### TN2: Throughput vs Notification

T2 (10K ops/min throughput) creates backpressure on U1 (real-time notifications) during peak load.

---

## Required Truths

### RT-1: Idempotent Retry Mechanism

A working idempotency service exists that prevents duplicate payment processing.

### RT-2: Retry Scheduler

A distributed scheduler handles retry timing with exponential backoff and jitter.

### RT-3: Audit Trail

Complete audit trail exists for all retry operations with tamper-evident logging.
`;

/** Minimal JSON structure */
const MINIMAL_JSON = {
  schema_version: 3,
  feature: 'minimal',
  phase: 'INITIALIZED',
};

/** Minimal Markdown content */
const MINIMAL_MD = `# minimal

## Outcome

Minimal feature for testing.
`;

/** JSON with mismatched IDs (B1 in JSON but B2 missing from MD) */
const MISMATCHED_JSON = {
  schema_version: 3,
  feature: 'mismatched',
  phase: 'CONSTRAINED',
  constraints: {
    business: [
      { id: 'B1', type: 'invariant' },
      { id: 'B2', type: 'goal' },
    ],
  },
  tensions: [
    { id: 'TN1', type: 'trade_off', between: ['B1', 'B99'], status: 'unresolved' },
  ],
};

/** Markdown with only B1 (missing B2 and TN1) */
const MISMATCHED_MD = `# mismatched

## Outcome

Mismatched feature for error testing.

## Constraints

### Business

#### B1: Present Constraint

This constraint exists in both JSON and Markdown.
`;

// ============================================================
// Helper: Create temp directory
// ============================================================

function createTestDir(): string {
  const dir = join(
    '/tmp',
    'manifold-jsonmd-test-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createManifoldSubdir(testDir: string): string {
  const manifoldDir = join(testDir, '.manifold');
  mkdirSync(manifoldDir, { recursive: true });
  return manifoldDir;
}

// ============================================================
// 1. Format Detection Tests
// ============================================================

describe('Format Detection', () => {
  let testDir: string;
  let manifoldDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    manifoldDir = createManifoldSubdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('detectManifoldFormat', () => {
    test('detects json-md when both .json and .md files exist', () => {
      writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
      writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

      expect(detectManifoldFormat(manifoldDir, 'payment-retry')).toBe('json-md');
    });

    test('detects yaml when only .yaml file exists', () => {
      writeFileSync(join(manifoldDir, 'legacy.yaml'), 'feature: legacy\nphase: INITIALIZED\n');

      expect(detectManifoldFormat(manifoldDir, 'legacy')).toBe('yaml');
    });

    test('returns json when only .json file exists (no companion .md)', () => {
      writeFileSync(join(manifoldDir, 'json-only.json'), JSON.stringify(MINIMAL_JSON));

      expect(detectManifoldFormat(manifoldDir, 'json-only')).toBe('json');
    });

    test('returns unknown when no matching files exist', () => {
      expect(detectManifoldFormat(manifoldDir, 'nonexistent')).toBe('unknown');
    });

    test('prioritizes json-md over yaml when both exist', () => {
      writeFileSync(join(manifoldDir, 'dual.json'), JSON.stringify(MINIMAL_JSON));
      writeFileSync(join(manifoldDir, 'dual.md'), MINIMAL_MD);
      writeFileSync(join(manifoldDir, 'dual.yaml'), 'feature: dual\nphase: INITIALIZED\n');

      expect(detectManifoldFormat(manifoldDir, 'dual')).toBe('json-md');
    });
  });

  describe('getFeatureFiles', () => {
    test('detects json-md format and returns both paths', () => {
      writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
      writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

      const files = getFeatureFiles(manifoldDir, 'payment-retry');
      expect(files.format).toBe('json-md');
      expect(files.manifold).toBe(join(manifoldDir, 'payment-retry.json'));
      expect(files.markdown).toBe(join(manifoldDir, 'payment-retry.md'));
    });

    test('detects yaml format', () => {
      writeFileSync(join(manifoldDir, 'legacy.yaml'), 'feature: legacy\nphase: INITIALIZED\n');

      const files = getFeatureFiles(manifoldDir, 'legacy');
      expect(files.format).toBe('yaml');
      expect(files.manifold).toBe(join(manifoldDir, 'legacy.yaml'));
      expect(files.markdown).toBeUndefined();
    });

    test('returns json format when only json exists', () => {
      writeFileSync(join(manifoldDir, 'solo.json'), JSON.stringify(MINIMAL_JSON));

      const files = getFeatureFiles(manifoldDir, 'solo');
      expect(files.format).toBe('json');
      expect(files.manifold).toBe(join(manifoldDir, 'solo.json'));
      expect(files.markdown).toBeUndefined();
    });

    test('returns unknown format when no files exist', () => {
      const files = getFeatureFiles(manifoldDir, 'ghost');
      expect(files.format).toBe('unknown');
      expect(files.manifold).toBeUndefined();
    });

    test('includes anchor and verify paths when present', () => {
      writeFileSync(join(manifoldDir, 'full.json'), JSON.stringify(PAYMENT_RETRY_JSON));
      writeFileSync(join(manifoldDir, 'full.md'), PAYMENT_RETRY_MD);
      writeFileSync(join(manifoldDir, 'full.anchor.yaml'), 'feature: full\n');
      writeFileSync(join(manifoldDir, 'full.verify.json'), '{}');

      const files = getFeatureFiles(manifoldDir, 'full');
      expect(files.format).toBe('json-md');
      expect(files.anchor).toBe(join(manifoldDir, 'full.anchor.yaml'));
      expect(files.verify).toBe(join(manifoldDir, 'full.verify.json'));
    });

    test('prefers verify.json over verify.yaml', () => {
      writeFileSync(join(manifoldDir, 'pref.json'), JSON.stringify(MINIMAL_JSON));
      writeFileSync(join(manifoldDir, 'pref.md'), MINIMAL_MD);
      writeFileSync(join(manifoldDir, 'pref.verify.json'), '{"verification":{}}');
      writeFileSync(join(manifoldDir, 'pref.verify.yaml'), 'verification: {}');

      const files = getFeatureFiles(manifoldDir, 'pref');
      expect(files.verify).toBe(join(manifoldDir, 'pref.verify.json'));
    });
  });
});

// ============================================================
// 2. Feature Loading via Parser
// ============================================================

describe('Feature Loading via Parser (loadFeature)', () => {
  let testDir: string;
  let manifoldDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    manifoldDir = createManifoldSubdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('loads full JSON+MD manifold and returns complete Manifold object', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data).not.toBeNull();
    expect(data!.feature).toBe('payment-retry');
    expect(data!.manifold).toBeDefined();
    expect(data!.manifold!.phase).toBe('ANCHORED');
    expect(data!.manifold!.schema_version).toBe(3);
  });

  test('returns format as json-md for hybrid files', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data!.format).toBe('json-md');
  });

  test('returns constraints with statement text from Markdown', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    const business = data!.manifold!.constraints!.business!;
    expect(business).toHaveLength(1);
    expect(business[0].id).toBe('B1');
    expect(business[0].type).toBe('invariant');
    expect(business[0].statement).toContain('duplicate charges');
  });

  test('returns constraints with rationale from Markdown', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    const business = data!.manifold!.constraints!.business!;
    expect(business[0].rationale).toContain('chargebacks');
  });

  test('returns all constraint categories populated from Markdown', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    const c = data!.manifold!.constraints!;
    expect(c.business).toHaveLength(1);
    expect(c.technical).toHaveLength(2);
    expect(c.user_experience).toHaveLength(1);
    expect(c.security).toHaveLength(1);
    expect(c.operational).toHaveLength(0);
  });

  test('returns tensions with description text from Markdown', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    const tensions = data!.manifold!.tensions!;
    expect(tensions).toHaveLength(2);
    expect(tensions[0].id).toBe('TN1');
    expect(tensions[0].description).toContain('idempotency checks');
    expect(tensions[0].status).toBe('resolved');
    expect(tensions[0].resolution).toContain('async pre-validation');
  });

  test('returns tension without resolution when unresolved', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    const tn2 = data!.manifold!.tensions!.find(t => t.id === 'TN2');
    expect(tn2).toBeDefined();
    expect(tn2!.status).toBe('unresolved');
    // TN2 has no resolution blockquote in MD
    expect(tn2!.resolution).toBeUndefined();
  });

  test('returns required truths with statement text from Markdown', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    const rts = data!.manifold!.anchors!.required_truths!;
    expect(rts).toHaveLength(3);

    const rt1 = rts.find(r => r.id === 'RT-1');
    expect(rt1!.status).toBe('SATISFIED');
    expect(rt1!.statement).toContain('idempotency service');

    const rt3 = rts.find(r => r.id === 'RT-3');
    expect(rt3!.status).toBe('NOT_SATISFIED');
    expect(rt3!.statement).toContain('audit trail');
  });

  test('returns outcome from Markdown', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data!.manifold!.outcome).toContain('95% retry success rate');
  });

  test('returns recommended_option from JSON anchors', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data!.manifold!.anchors!.recommended_option).toContain('Exponential Backoff');
  });

  test('returns convergence from JSON', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data!.manifold!.convergence!.status).toBe('IN_PROGRESS');
    expect(data!.manifold!.convergence!.criteria!.no_blocking_gaps).toBe(true);
  });

  test('loads minimal JSON+MD manifold', () => {
    writeFileSync(join(manifoldDir, 'minimal.json'), JSON.stringify(MINIMAL_JSON));
    writeFileSync(join(manifoldDir, 'minimal.md'), MINIMAL_MD);

    const data = loadFeature(manifoldDir, 'minimal');
    expect(data).not.toBeNull();
    expect(data!.feature).toBe('minimal');
    expect(data!.manifold!.phase).toBe('INITIALIZED');
    expect(data!.manifold!.outcome).toContain('Minimal feature');
    expect(data!.format).toBe('json-md');
  });

  test('returns null when files do not exist', () => {
    const data = loadFeature(manifoldDir, 'nonexistent');
    expect(data).toBeNull();
  });

  test('returns schema version 3 for payment-retry fixture', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data!.schemaVersion).toBe(3);
  });

  test('falls back gracefully when MD file is empty', () => {
    writeFileSync(join(manifoldDir, 'empty-md.json'), JSON.stringify(MINIMAL_JSON));
    writeFileSync(join(manifoldDir, 'empty-md.md'), '');

    const data = loadFeature(manifoldDir, 'empty-md');
    expect(data).not.toBeNull();
    expect(data!.manifold!.feature).toBe('minimal');
    // Constraints without MD content get placeholder text
  });
});

// ============================================================
// 3. Linker Validation
// ============================================================

describe('Linker Validation', () => {
  let testDir: string;
  let manifoldDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    manifoldDir = createManifoldSubdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('loadManifoldByFeature', () => {
    test('valid manifold: success=true, all IDs linked, linking.valid=true', () => {
      writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
      writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

      const result = loadManifoldByFeature(manifoldDir, 'payment-retry');
      expect(result.success).toBe(true);
      expect(result.linking).toBeDefined();
      expect(result.linking!.valid).toBe(true);
      expect(result.linking!.errors).toHaveLength(0);
      expect(result.linking!.summary.linkedConstraints).toBe(5);
      expect(result.linking!.summary.totalConstraints).toBe(5);
      expect(result.linking!.summary.linkedTensions).toBe(2);
      expect(result.linking!.summary.totalTensions).toBe(2);
      expect(result.linking!.summary.linkedRequiredTruths).toBe(3);
      expect(result.linking!.summary.totalRequiredTruths).toBe(3);
    });

    test('linking failure with missing MD content: success=false', () => {
      writeFileSync(join(manifoldDir, 'mismatched.json'), JSON.stringify(MISMATCHED_JSON));
      writeFileSync(join(manifoldDir, 'mismatched.md'), MISMATCHED_MD);

      const result = loadManifoldByFeature(manifoldDir, 'mismatched');
      expect(result.success).toBe(false);
      expect(result.linking).toBeDefined();
      expect(result.linking!.valid).toBe(false);
      // B2 is in JSON but not in MD
      expect(result.linking!.errors.some(e => e.message.includes('B2'))).toBe(true);
      // TN1 is in JSON but not in MD
      expect(result.linking!.errors.some(e => e.message.includes('TN1'))).toBe(true);
    });

    test('invalid tension references produce linking errors', () => {
      writeFileSync(join(manifoldDir, 'mismatched.json'), JSON.stringify(MISMATCHED_JSON));
      writeFileSync(join(manifoldDir, 'mismatched.md'), MISMATCHED_MD);

      const result = loadManifoldByFeature(manifoldDir, 'mismatched');
      // TN1 references B99 which does not exist
      expect(result.linking!.errors.some(e =>
        e.type === 'invalid_reference' && e.message.includes('B99')
      )).toBe(true);
    });
  });

  describe('loadAndValidateManifold', () => {
    test('invalid JSON structure: success=false, error string set', () => {
      const jsonPath = join(manifoldDir, 'bad-schema.json');
      const mdPath = join(manifoldDir, 'bad-schema.md');

      writeFileSync(jsonPath, JSON.stringify({
        feature: 'bad',
        phase: 'INVALID_PHASE',
      }));
      writeFileSync(mdPath, '# bad\n');

      const result = loadAndValidateManifold(jsonPath, mdPath);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid JSON structure');
    });

    test('malformed JSON: success=false, error mentions parse', () => {
      const jsonPath = join(manifoldDir, 'malformed.json');
      const mdPath = join(manifoldDir, 'malformed.md');

      writeFileSync(jsonPath, '{not valid json!!!');
      writeFileSync(mdPath, '# malformed\n');

      const result = loadAndValidateManifold(jsonPath, mdPath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('parse JSON');
    });

    test('missing JSON file: success=false, error mentions not found', () => {
      const jsonPath = join(manifoldDir, 'ghost.json');
      const mdPath = join(manifoldDir, 'ghost.md');
      writeFileSync(mdPath, '# ghost\n');

      const result = loadAndValidateManifold(jsonPath, mdPath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('missing MD file: success=false, error mentions not found', () => {
      const jsonPath = join(manifoldDir, 'no-md.json');
      const mdPath = join(manifoldDir, 'no-md.md');
      writeFileSync(jsonPath, JSON.stringify(MINIMAL_JSON));

      const result = loadAndValidateManifold(jsonPath, mdPath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('returns structure and content on valid input', () => {
      const jsonPath = join(manifoldDir, 'payment-retry.json');
      const mdPath = join(manifoldDir, 'payment-retry.md');
      writeFileSync(jsonPath, JSON.stringify(PAYMENT_RETRY_JSON));
      writeFileSync(mdPath, PAYMENT_RETRY_MD);

      const result = loadAndValidateManifold(jsonPath, mdPath);
      expect(result.success).toBe(true);
      expect(result.structure).toBeDefined();
      expect(result.structure!.feature).toBe('payment-retry');
      expect(result.content).toBeDefined();
      expect(result.content!.constraints.has('B1')).toBe(true);
      expect(result.content!.tensions.has('TN1')).toBe(true);
      expect(result.content!.requiredTruths.has('RT-1')).toBe(true);
    });
  });
});

// ============================================================
// 4. Schema Validation for Real-World Data
// ============================================================

describe('Schema Validation for Real-World Data', () => {
  test('parses the payment-retry fixture JSON correctly', () => {
    const result = ManifoldStructureSchema.safeParse(PAYMENT_RETRY_JSON);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feature).toBe('payment-retry');
      expect(result.data.phase).toBe('ANCHORED');
      expect(result.data.constraints!.business).toHaveLength(1);
      expect(result.data.tensions).toHaveLength(2);
      expect(result.data.anchors!.required_truths).toHaveLength(3);
      expect(result.data.convergence!.status).toBe('IN_PROGRESS');
    }
  });

  test('parses JSON with implementation_phases as objects (legacy format)', () => {
    const withPhaseObjects = {
      ...PAYMENT_RETRY_JSON,
      anchors: {
        ...PAYMENT_RETRY_JSON.anchors,
        implementation_phases: [
          { name: 'Phase 1', tasks: ['Implement idempotency'] },
          'Phase 2: Testing',
        ],
      },
    };
    const result = ManifoldStructureSchema.safeParse(withPhaseObjects);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anchors!.implementation_phases).toHaveLength(2);
    }
  });

  test('parses JSON with convergence extra fields (verification_passed, progress, converged_at)', () => {
    const withExtraConvergence = {
      ...MINIMAL_JSON,
      convergence: {
        status: 'CONVERGED',
        criteria: {
          verification_passed: true,
          all_invariants_satisfied: true,
        },
        progress: '100%',
        converged_at: '2026-02-01T12:00:00Z',
      },
    };
    const result = ManifoldStructureSchema.safeParse(withExtraConvergence);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.convergence!.status).toBe('CONVERGED');
      expect(result.data.convergence!.progress).toBe('100%');
      expect(result.data.convergence!.converged_at).toBe('2026-02-01T12:00:00Z');
    }
  });

  test('parses JSON with artifact descriptions in generation', () => {
    const withGeneration = {
      ...MINIMAL_JSON,
      phase: 'GENERATED',
      generation: {
        option: 'A',
        timestamp: '2026-02-01T00:00:00Z',
        artifacts: [
          {
            path: 'lib/retry/PaymentRetryClient.ts',
            type: 'implementation',
            satisfies: ['B1', 'T1'],
            status: 'complete',
            description: 'Main retry client with exponential backoff',
          },
          {
            path: 'tests/retry/PaymentRetryClient.test.ts',
            type: 'test',
            satisfies: ['B1'],
            status: 'complete',
          },
        ],
        coverage: {
          constraints_addressed: 5,
          constraints_total: 5,
          required_truths_addressed: 2,
          required_truths_total: 3,
          percentage: 80,
        },
      },
    };
    const result = ManifoldStructureSchema.safeParse(withGeneration);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.generation!.artifacts).toHaveLength(2);
      expect(result.data.generation!.artifacts![0].description).toContain('exponential backoff');
      expect(result.data.generation!.coverage!.percentage).toBe(80);
    }
  });

  test('rejects JSON with invalid phase', () => {
    const invalid = {
      ...MINIMAL_JSON,
      phase: 'PLANNING',
    };
    const result = ManifoldStructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('rejects JSON with invalid constraint ID format', () => {
    const invalid = {
      ...MINIMAL_JSON,
      phase: 'CONSTRAINED',
      constraints: {
        business: [{ id: 'INVALID_ID', type: 'invariant' }],
      },
    };
    const result = ManifoldStructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('rejects JSON with invalid tension ID format', () => {
    const invalid = {
      ...MINIMAL_JSON,
      tensions: [
        { id: 'TENSION1', type: 'trade_off', between: ['B1', 'T1'], status: 'resolved' },
      ],
    };
    const result = ManifoldStructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('rejects JSON with empty feature name', () => {
    const invalid = {
      feature: '',
      phase: 'INITIALIZED',
    };
    const result = ManifoldStructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('rejects tension with fewer than 2 between references', () => {
    const invalid = {
      ...MINIMAL_JSON,
      tensions: [
        { id: 'TN1', type: 'trade_off', between: ['B1'], status: 'resolved' },
      ],
    };
    const result = ManifoldStructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// 5. Feature Listing
// ============================================================

describe('Feature Listing', () => {
  let testDir: string;
  let manifoldDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    manifoldDir = createManifoldSubdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('lists json-md features (JSON files are the primary indicators)', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);
    writeFileSync(join(manifoldDir, 'minimal.json'), JSON.stringify(MINIMAL_JSON));
    writeFileSync(join(manifoldDir, 'minimal.md'), MINIMAL_MD);

    const features = listFeatures(manifoldDir);
    expect(features).toContain('payment-retry');
    expect(features).toContain('minimal');
    expect(features).toHaveLength(2);
  });

  test('lists both yaml and json-md features', () => {
    writeFileSync(join(manifoldDir, 'modern.json'), JSON.stringify(MINIMAL_JSON));
    writeFileSync(join(manifoldDir, 'modern.md'), MINIMAL_MD);
    writeFileSync(join(manifoldDir, 'legacy.yaml'), 'feature: legacy\nphase: INITIALIZED\n');

    const features = listFeatures(manifoldDir);
    expect(features).toContain('modern');
    expect(features).toContain('legacy');
    expect(features).toHaveLength(2);
  });

  test('returns empty array for empty directory', () => {
    const features = listFeatures(manifoldDir);
    expect(features).toEqual([]);
  });

  test('returns empty array for nonexistent directory', () => {
    const features = listFeatures('/tmp/manifold-does-not-exist-' + Date.now());
    expect(features).toEqual([]);
  });

  test('does not list anchor or verify files as features', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);
    writeFileSync(join(manifoldDir, 'payment-retry.anchor.yaml'), 'feature: payment-retry');
    writeFileSync(join(manifoldDir, 'payment-retry.verify.json'), '{}');

    const features = listFeatures(manifoldDir);
    expect(features).toEqual(['payment-retry']);
  });

  test('returns features sorted alphabetically', () => {
    writeFileSync(join(manifoldDir, 'zebra.json'), JSON.stringify({ ...MINIMAL_JSON, feature: 'zebra' }));
    writeFileSync(join(manifoldDir, 'alpha.json'), JSON.stringify({ ...MINIMAL_JSON, feature: 'alpha' }));
    writeFileSync(join(manifoldDir, 'middle.yaml'), 'feature: middle\nphase: INITIALIZED\n');

    const features = listFeatures(manifoldDir);
    expect(features).toEqual(['alpha', 'middle', 'zebra']);
  });
});

// ============================================================
// 6. findManifoldDir
// ============================================================

describe('findManifoldDir', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('finds .manifold directory when it exists', () => {
    const manifoldDir = join(testDir, '.manifold');
    mkdirSync(manifoldDir, { recursive: true });

    const found = findManifoldDir(testDir);
    expect(found).toBe(manifoldDir);
  });

  test('returns null when .manifold directory does not exist', () => {
    const found = findManifoldDir(testDir);
    expect(found).toBeNull();
  });

  test('returns null when .manifold is a file, not a directory', () => {
    writeFileSync(join(testDir, '.manifold'), 'not a directory');

    const found = findManifoldDir(testDir);
    expect(found).toBeNull();
  });
});

// ============================================================
// 7. Markdown Parser Integration
// ============================================================

describe('Markdown Parser with Payment-Retry Fixture', () => {
  test('parses all constraint IDs from Markdown', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.constraints.has('B1')).toBe(true);
    expect(content.constraints.has('T1')).toBe(true);
    expect(content.constraints.has('T2')).toBe(true);
    expect(content.constraints.has('U1')).toBe(true);
    expect(content.constraints.has('S1')).toBe(true);
    expect(content.constraints.size).toBe(5);
  });

  test('parses constraint titles correctly', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.constraints.get('B1')!.title).toBe('No Duplicate Payments');
    expect(content.constraints.get('T1')!.title).toBe('Retry Window Limit');
    expect(content.constraints.get('S1')!.title).toBe('Idempotency Keys');
  });

  test('parses constraint rationale from blockquotes', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.constraints.get('B1')!.rationale).toContain('chargebacks');
    expect(content.constraints.get('T1')!.rationale).toContain('72 hours');
    expect(content.constraints.get('S1')!.rationale).toContain('replay attacks');
  });

  test('parses all tension IDs and descriptions', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.tensions.has('TN1')).toBe(true);
    expect(content.tensions.has('TN2')).toBe(true);
    expect(content.tensions.size).toBe(2);
    expect(content.tensions.get('TN1')!.description).toContain('idempotency checks');
  });

  test('parses tension resolution from blockquote', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.tensions.get('TN1')!.resolution).toContain('async pre-validation');
  });

  test('parses required truths', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.requiredTruths.has('RT-1')).toBe(true);
    expect(content.requiredTruths.has('RT-2')).toBe(true);
    expect(content.requiredTruths.has('RT-3')).toBe(true);
    expect(content.requiredTruths.size).toBe(3);
    expect(content.requiredTruths.get('RT-1')!.statement).toContain('idempotency service');
  });

  test('parses outcome text', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.outcome).toContain('95% retry success rate');
  });

  test('parses feature name from H1', () => {
    const content = parseManifoldMarkdown(PAYMENT_RETRY_MD);
    expect(content.feature).toBe('payment-retry');
  });
});

// ============================================================
// 8. Combined Workflow Tests
// ============================================================

describe('Combined Workflow Tests', () => {
  let testDir: string;
  let manifoldDir: string;

  beforeEach(() => {
    testDir = createTestDir();
    manifoldDir = createManifoldSubdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('loadFeature returns data usable by graph/solve/verify (has constraints, tensions, anchors)', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data).not.toBeNull();

    // Graph needs constraints and tensions
    const manifold = data!.manifold!;
    expect(manifold.constraints).toBeDefined();
    expect(manifold.tensions).toBeDefined();
    expect(manifold.tensions!.length).toBeGreaterThan(0);

    // Verify needs required truths
    expect(manifold.anchors).toBeDefined();
    expect(manifold.anchors!.required_truths).toBeDefined();
    expect(manifold.anchors!.required_truths!.length).toBeGreaterThan(0);

    // Solve needs convergence
    expect(manifold.convergence).toBeDefined();
    expect(manifold.convergence!.status).toBe('IN_PROGRESS');

    // All tension between references are valid constraint IDs
    const allConstraintIds = new Set<string>();
    for (const category of ['business', 'technical', 'user_experience', 'security', 'operational'] as const) {
      for (const c of manifold.constraints![category] || []) {
        allConstraintIds.add(c.id);
      }
    }
    for (const tension of manifold.tensions!) {
      for (const ref of tension.between) {
        expect(allConstraintIds.has(ref)).toBe(true);
      }
    }
  });

  test('loadManifoldByFeature returns data usable by validate/show (has structure, content, linking)', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const result = loadManifoldByFeature(manifoldDir, 'payment-retry');
    expect(result.success).toBe(true);
    expect(result.structure).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.linking).toBeDefined();

    // Validate command needs structure fields
    expect(result.structure!.constraints).toBeDefined();
    expect(result.structure!.tensions).toBeDefined();
    expect(result.structure!.anchors).toBeDefined();

    // Show command needs content
    expect(result.content!.outcome).toBeDefined();
    expect(result.content!.constraints.size).toBe(5);
    expect(result.content!.tensions.size).toBe(2);
    expect(result.content!.requiredTruths.size).toBe(3);

    // Linking status for validation display
    expect(result.linking!.summary.linkedConstraints).toBe(result.linking!.summary.totalConstraints);
    expect(result.linking!.summary.linkedTensions).toBe(result.linking!.summary.totalTensions);
  });

  test('round-trip: create JSON+MD, load via parser, verify all fields populated', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const data = loadFeature(manifoldDir, 'payment-retry');
    expect(data).not.toBeNull();
    const m = data!.manifold!;

    // Verify structural fields from JSON preserved
    expect(m.schema_version).toBe(3);
    expect(m.feature).toBe('payment-retry');
    expect(m.phase).toBe('ANCHORED');

    // Verify content from Markdown merged in
    expect(m.outcome).toBeTruthy();
    for (const c of m.constraints!.business || []) {
      expect(c.statement).toBeTruthy();
      expect(c.statement).not.toBe(`[${c.id}]`); // Not a placeholder
    }
    for (const c of m.constraints!.technical || []) {
      expect(c.statement).toBeTruthy();
      expect(c.statement).not.toBe(`[${c.id}]`);
    }
    for (const t of m.tensions || []) {
      expect(t.description).toBeTruthy();
      expect(t.description).not.toBe(`[${t.id}]`);
    }
    for (const rt of m.anchors!.required_truths || []) {
      expect(rt.statement).toBeTruthy();
      expect(rt.statement).not.toBe(`[${rt.id}]`);
    }
  });

  test('round-trip: create JSON+MD, load via linker, verify linking is valid', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    const result = loadManifoldByFeature(manifoldDir, 'payment-retry');
    expect(result.success).toBe(true);
    expect(result.linking!.valid).toBe(true);
    expect(result.linking!.errors).toHaveLength(0);

    // All counts match
    const s = result.linking!.summary;
    expect(s.linkedConstraints).toBe(s.totalConstraints);
    expect(s.linkedTensions).toBe(s.totalTensions);
    expect(s.linkedRequiredTruths).toBe(s.totalRequiredTruths);
  });

  test('both parser and linker agree on feature structure', () => {
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);

    // Load via parser (used by status, graph, verify, solve)
    const parserData = loadFeature(manifoldDir, 'payment-retry');

    // Load via linker (used by validate, show)
    const linkerResult = loadManifoldByFeature(manifoldDir, 'payment-retry');

    // Both should see the same constraint IDs
    const parserConstraintIds = new Set<string>();
    for (const category of ['business', 'technical', 'user_experience', 'security', 'operational'] as const) {
      for (const c of parserData!.manifold!.constraints![category] || []) {
        parserConstraintIds.add(c.id);
      }
    }

    const linkerConstraintIds = new Set<string>();
    for (const category of ['business', 'technical', 'user_experience', 'security', 'operational'] as const) {
      for (const c of linkerResult.structure!.constraints![category] || []) {
        linkerConstraintIds.add(c.id);
      }
    }

    expect(parserConstraintIds).toEqual(linkerConstraintIds);

    // Both should see the same tension IDs
    const parserTensionIds = new Set(parserData!.manifold!.tensions!.map(t => t.id));
    const linkerTensionIds = new Set((linkerResult.structure!.tensions || []).map(t => t.id));
    expect(parserTensionIds).toEqual(linkerTensionIds);
  });

  test('mismatched fixture: parser succeeds with placeholders, linker reports errors', () => {
    writeFileSync(join(manifoldDir, 'mismatched.json'), JSON.stringify(MISMATCHED_JSON));
    writeFileSync(join(manifoldDir, 'mismatched.md'), MISMATCHED_MD);

    // Parser still loads (uses placeholders for missing MD content)
    const parserData = loadFeature(manifoldDir, 'mismatched');
    expect(parserData).not.toBeNull();
    const b2 = parserData!.manifold!.constraints!.business!.find(c => c.id === 'B2');
    expect(b2).toBeDefined();
    // B2 has no MD content, so it gets a placeholder
    expect(b2!.statement).toBe('[B2]');

    // Linker reports linking failures
    const linkerResult = loadManifoldByFeature(manifoldDir, 'mismatched');
    expect(linkerResult.success).toBe(false);
    expect(linkerResult.linking!.valid).toBe(false);
    expect(linkerResult.linking!.errors.length).toBeGreaterThan(0);
  });

  test('end-to-end: detect format, list features, load, and validate', () => {
    // Setup multiple features
    writeFileSync(join(manifoldDir, 'payment-retry.json'), JSON.stringify(PAYMENT_RETRY_JSON));
    writeFileSync(join(manifoldDir, 'payment-retry.md'), PAYMENT_RETRY_MD);
    writeFileSync(join(manifoldDir, 'minimal.json'), JSON.stringify(MINIMAL_JSON));
    writeFileSync(join(manifoldDir, 'minimal.md'), MINIMAL_MD);

    // 1. Find .manifold dir
    const found = findManifoldDir(testDir);
    expect(found).toBe(manifoldDir);

    // 2. List features
    const features = listFeatures(found!);
    expect(features).toContain('payment-retry');
    expect(features).toContain('minimal');

    // 3. Detect format for each
    for (const feature of features) {
      expect(detectManifoldFormat(found!, feature)).toBe('json-md');
    }

    // 4. Load via parser
    for (const feature of features) {
      const data = loadFeature(found!, feature);
      expect(data).not.toBeNull();
      expect(data!.format).toBe('json-md');
    }

    // 5. Validate via linker
    for (const feature of features) {
      const result = loadManifoldByFeature(found!, feature);
      expect(result.success).toBe(true);
    }
  });
});
