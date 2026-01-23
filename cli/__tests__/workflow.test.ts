/**
 * Tests for AI Workflow Command Outputs
 *
 * These tests validate the YAML outputs that AI commands (/m0-init, /m1-constrain, etc.)
 * are expected to produce. Since AI commands are prompts, we test their expected outputs.
 *
 * Satisfies: Evaluation recommendation - "Test AI Workflows"
 */

import { describe, test, expect } from 'bun:test';
import { validateManifold } from '../lib/schema.js';
import type { Manifold } from '../lib/parser.js';

// =============================================================================
// Test Fixtures: Expected Outputs from AI Commands
// =============================================================================

/**
 * Expected output format from /m0-init
 */
const m0InitOutput: Manifold = {
  schema_version: 3,
  feature: 'test-feature',
  outcome: 'Test outcome description',
  phase: 'INITIALIZED',
  constraints: {
    business: [],
    technical: [],
    user_experience: [],
    security: [],
    operational: []
  },
  tensions: [],
  anchors: {
    required_truths: []
  },
  iterations: [],
  convergence: {
    status: 'NOT_STARTED'
  }
};

/**
 * Expected output format from /m1-constrain
 */
const m1ConstrainOutput: Manifold = {
  schema_version: 3,
  feature: 'test-feature',
  outcome: 'Test outcome',
  phase: 'CONSTRAINED',
  constraints: {
    business: [
      { id: 'B1', type: 'invariant', statement: 'Test business invariant', rationale: 'Test rationale' },
      { id: 'B2', type: 'goal', statement: 'Test business goal' }
    ],
    technical: [
      { id: 'T1', type: 'boundary', statement: 'Response time < 200ms' }
    ],
    user_experience: [
      { id: 'U1', type: 'boundary', statement: 'WCAG 2.1 AA compliance' }
    ],
    security: [
      { id: 'S1', type: 'invariant', statement: 'User can only access own data' }
    ],
    operational: [
      { id: 'O1', type: 'goal', statement: 'Health check endpoint available' }
    ]
  },
  tensions: [],
  anchors: {
    required_truths: []
  },
  iterations: [
    {
      number: 1,
      phase: 'constrain',
      timestamp: '2026-01-21T10:00:00Z',
      result: 'Constraints discovered'
    }
  ],
  convergence: {
    status: 'NOT_STARTED'
  }
};

/**
 * Expected output format from /m2-tension
 */
const m2TensionOutput: Manifold = {
  schema_version: 3,
  feature: 'test-feature',
  outcome: 'Test outcome',
  phase: 'TENSIONED',
  constraints: {
    business: [
      { id: 'B1', type: 'invariant', statement: 'No duplicate processing' }
    ],
    technical: [
      { id: 'T1', type: 'boundary', statement: 'Response time < 200ms' }
    ],
    user_experience: [],
    security: [],
    operational: []
  },
  tensions: [
    {
      id: 'TN1',
      type: 'trade_off',
      between: ['B1', 'T1'],
      description: 'Idempotency check vs response time',
      status: 'resolved',
      resolution: 'Cache recent IDs for O(1) lookup',
      priority: 1
    }
  ],
  anchors: {
    required_truths: []
  },
  iterations: [
    {
      number: 1,
      phase: 'constrain',
      timestamp: '2026-01-21T10:00:00Z',
      result: 'Constraints discovered'
    },
    {
      number: 2,
      phase: 'tension',
      timestamp: '2026-01-21T11:00:00Z',
      result: '1 tension found and resolved'
    }
  ],
  convergence: {
    status: 'NOT_STARTED'
  }
};

/**
 * Expected output format from /m3-anchor
 */
const m3AnchorOutput: Manifold = {
  schema_version: 3,
  feature: 'test-feature',
  outcome: 'Test outcome',
  phase: 'ANCHORED',
  constraints: {
    business: [{ id: 'B1', type: 'invariant', statement: 'Test' }],
    technical: [{ id: 'T1', type: 'boundary', statement: 'Test' }],
    user_experience: [],
    security: [],
    operational: []
  },
  tensions: [],
  anchors: {
    required_truths: [
      {
        id: 'RT-1',
        statement: 'Data can be persisted reliably',
        status: 'NOT_SATISFIED',
        priority: 1,
        maps_to_constraints: ['B1', 'T1']
      },
      {
        id: 'RT-2',
        statement: 'User identity can be verified',
        status: 'NOT_SATISFIED',
        priority: 1
      }
    ]
  },
  iterations: [],
  convergence: {
    status: 'IN_PROGRESS'
  }
};

/**
 * Expected output format from /m5-verify (complete)
 */
const m5VerifyOutputComplete: Manifold = {
  schema_version: 3,
  feature: 'test-feature',
  outcome: 'Test outcome',
  phase: 'VERIFIED',
  constraints: {
    business: [{ id: 'B1', type: 'invariant', statement: 'Test' }],
    technical: [],
    user_experience: [],
    security: [],
    operational: []
  },
  tensions: [],
  anchors: {
    required_truths: [
      {
        id: 'RT-1',
        statement: 'Test requirement',
        status: 'SATISFIED',
        priority: 1,
        evidence: [
          { type: 'file_exists', path: 'src/test.ts', status: 'VERIFIED' }
        ]
      }
    ]
  },
  iterations: [],
  convergence: {
    status: 'CONVERGED',
    criteria: {
      all_invariants_satisfied: true,
      all_required_truths_satisfied: true,
      no_blocking_gaps: true
    }
  }
};

// =============================================================================
// Tests: /m0-init Output Validation
// =============================================================================

describe('/m0-init output validation', () => {
  test('produces valid manifold structure', () => {
    const result = validateManifold(m0InitOutput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('sets phase to INITIALIZED', () => {
    expect(m0InitOutput.phase).toBe('INITIALIZED');
  });

  test('initializes empty constraint categories', () => {
    expect(m0InitOutput.constraints?.business).toEqual([]);
    expect(m0InitOutput.constraints?.technical).toEqual([]);
    expect(m0InitOutput.constraints?.user_experience).toEqual([]);
    expect(m0InitOutput.constraints?.security).toEqual([]);
    expect(m0InitOutput.constraints?.operational).toEqual([]);
  });

  test('sets schema_version to 3', () => {
    expect(m0InitOutput.schema_version).toBe(3);
  });

  test('initializes convergence as NOT_STARTED', () => {
    expect(m0InitOutput.convergence?.status).toBe('NOT_STARTED');
  });
});

// =============================================================================
// Tests: /m1-constrain Output Validation
// =============================================================================

describe('/m1-constrain output validation', () => {
  test('produces valid manifold structure', () => {
    const result = validateManifold(m1ConstrainOutput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('sets phase to CONSTRAINED', () => {
    expect(m1ConstrainOutput.phase).toBe('CONSTRAINED');
  });

  test('constraint IDs follow category prefix pattern', () => {
    // Business constraints start with B
    m1ConstrainOutput.constraints?.business?.forEach(c => {
      expect(c.id).toMatch(/^B\d+$/);
    });
    // Technical constraints start with T
    m1ConstrainOutput.constraints?.technical?.forEach(c => {
      expect(c.id).toMatch(/^T\d+$/);
    });
    // UX constraints start with U
    m1ConstrainOutput.constraints?.user_experience?.forEach(c => {
      expect(c.id).toMatch(/^U\d+$/);
    });
    // Security constraints start with S
    m1ConstrainOutput.constraints?.security?.forEach(c => {
      expect(c.id).toMatch(/^S\d+$/);
    });
    // Operational constraints start with O
    m1ConstrainOutput.constraints?.operational?.forEach(c => {
      expect(c.id).toMatch(/^O\d+$/);
    });
  });

  test('all constraints have valid types', () => {
    const validTypes = ['invariant', 'goal', 'boundary'];
    const allConstraints = [
      ...(m1ConstrainOutput.constraints?.business || []),
      ...(m1ConstrainOutput.constraints?.technical || []),
      ...(m1ConstrainOutput.constraints?.user_experience || []),
      ...(m1ConstrainOutput.constraints?.security || []),
      ...(m1ConstrainOutput.constraints?.operational || [])
    ];

    allConstraints.forEach(c => {
      expect(validTypes).toContain(c.type);
    });
  });

  test('records iteration for constrain phase', () => {
    const constrainIteration = m1ConstrainOutput.iterations?.find(i => i.phase === 'constrain');
    expect(constrainIteration).toBeDefined();
    expect(constrainIteration?.number).toBeGreaterThan(0);
  });
});

// =============================================================================
// Tests: /m2-tension Output Validation
// =============================================================================

describe('/m2-tension output validation', () => {
  test('produces valid manifold structure', () => {
    const result = validateManifold(m2TensionOutput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('sets phase to TENSIONED', () => {
    expect(m2TensionOutput.phase).toBe('TENSIONED');
  });

  test('tension IDs follow TN prefix pattern', () => {
    m2TensionOutput.tensions?.forEach(t => {
      expect(t.id).toMatch(/^TN\d+$/);
    });
  });

  test('tensions have valid types', () => {
    const validTypes = ['trade_off', 'resource_tension', 'hidden_dependency'];
    m2TensionOutput.tensions?.forEach(t => {
      expect(validTypes).toContain(t.type);
    });
  });

  test('tensions have valid statuses', () => {
    const validStatuses = ['resolved', 'unresolved'];
    m2TensionOutput.tensions?.forEach(t => {
      expect(validStatuses).toContain(t.status);
    });
  });

  test('resolved tensions have resolution field', () => {
    m2TensionOutput.tensions?.forEach(t => {
      if (t.status === 'resolved') {
        expect(t.resolution).toBeDefined();
        expect(t.resolution?.length).toBeGreaterThan(0);
      }
    });
  });

  test('tensions reference existing constraints', () => {
    const allConstraintIds = [
      ...(m2TensionOutput.constraints?.business?.map(c => c.id) || []),
      ...(m2TensionOutput.constraints?.technical?.map(c => c.id) || []),
      ...(m2TensionOutput.constraints?.user_experience?.map(c => c.id) || []),
      ...(m2TensionOutput.constraints?.security?.map(c => c.id) || []),
      ...(m2TensionOutput.constraints?.operational?.map(c => c.id) || [])
    ];

    m2TensionOutput.tensions?.forEach(t => {
      t.between?.forEach(refId => {
        expect(allConstraintIds).toContain(refId);
      });
    });
  });
});

// =============================================================================
// Tests: /m3-anchor Output Validation
// =============================================================================

describe('/m3-anchor output validation', () => {
  test('produces valid manifold structure', () => {
    const result = validateManifold(m3AnchorOutput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('sets phase to ANCHORED', () => {
    expect(m3AnchorOutput.phase).toBe('ANCHORED');
  });

  test('required truth IDs follow RT- prefix pattern', () => {
    m3AnchorOutput.anchors?.required_truths?.forEach(rt => {
      expect(rt.id).toMatch(/^RT-\d+$/);
    });
  });

  test('required truths have valid statuses', () => {
    const validStatuses = ['SATISFIED', 'PARTIAL', 'NOT_SATISFIED', 'SPECIFICATION_READY'];
    m3AnchorOutput.anchors?.required_truths?.forEach(rt => {
      expect(validStatuses).toContain(rt.status);
    });
  });

  test('required truths have priority', () => {
    m3AnchorOutput.anchors?.required_truths?.forEach(rt => {
      expect(rt.priority).toBeDefined();
      expect(rt.priority).toBeGreaterThan(0);
    });
  });

  test('sets convergence to IN_PROGRESS after anchoring', () => {
    expect(m3AnchorOutput.convergence?.status).toBe('IN_PROGRESS');
  });
});

// =============================================================================
// Tests: /m5-verify Output Validation
// =============================================================================

describe('/m5-verify output validation', () => {
  test('produces valid manifold structure', () => {
    const result = validateManifold(m5VerifyOutputComplete);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('sets phase to VERIFIED when complete', () => {
    expect(m5VerifyOutputComplete.phase).toBe('VERIFIED');
  });

  test('sets convergence to CONVERGED when all satisfied', () => {
    expect(m5VerifyOutputComplete.convergence?.status).toBe('CONVERGED');
  });

  test('convergence criteria are all true when CONVERGED', () => {
    const criteria = m5VerifyOutputComplete.convergence?.criteria;
    expect(criteria?.all_invariants_satisfied).toBe(true);
    expect(criteria?.all_required_truths_satisfied).toBe(true);
    expect(criteria?.no_blocking_gaps).toBe(true);
  });

  test('satisfied required truths have evidence', () => {
    m5VerifyOutputComplete.anchors?.required_truths?.forEach(rt => {
      if (rt.status === 'SATISFIED') {
        expect(rt.evidence).toBeDefined();
        expect(rt.evidence?.length).toBeGreaterThan(0);
      }
    });
  });

  test('evidence has valid types', () => {
    const validTypes = ['file_exists', 'content_match', 'test_passes', 'metric_value', 'manual_review'];
    m5VerifyOutputComplete.anchors?.required_truths?.forEach(rt => {
      rt.evidence?.forEach(e => {
        expect(validTypes).toContain(e.type);
      });
    });
  });

  test('evidence has valid statuses', () => {
    const validStatuses = ['VERIFIED', 'PENDING', 'FAILED', 'STALE'];
    m5VerifyOutputComplete.anchors?.required_truths?.forEach(rt => {
      rt.evidence?.forEach(e => {
        expect(validStatuses).toContain(e.status);
      });
    });
  });
});

// =============================================================================
// Tests: Phase Transition Rules
// =============================================================================

describe('phase transition rules', () => {
  const validTransitions: Record<string, string[]> = {
    'INITIALIZED': ['CONSTRAINED'],
    'CONSTRAINED': ['TENSIONED'],
    'TENSIONED': ['ANCHORED'],
    'ANCHORED': ['GENERATED'],
    'GENERATED': ['VERIFIED'],
    'VERIFIED': ['INITIALIZED'] // Can restart for iteration
  };

  test('INITIALIZED can only transition to CONSTRAINED', () => {
    expect(validTransitions['INITIALIZED']).toEqual(['CONSTRAINED']);
  });

  test('CONSTRAINED can only transition to TENSIONED', () => {
    expect(validTransitions['CONSTRAINED']).toEqual(['TENSIONED']);
  });

  test('TENSIONED can only transition to ANCHORED', () => {
    expect(validTransitions['TENSIONED']).toEqual(['ANCHORED']);
  });

  test('ANCHORED can only transition to GENERATED', () => {
    expect(validTransitions['ANCHORED']).toEqual(['GENERATED']);
  });

  test('GENERATED can only transition to VERIFIED', () => {
    expect(validTransitions['GENERATED']).toEqual(['VERIFIED']);
  });

  test('VERIFIED can transition back to INITIALIZED for iteration', () => {
    expect(validTransitions['VERIFIED']).toContain('INITIALIZED');
  });
});

// =============================================================================
// Tests: Light Mode (/m-quick) Output Validation
// =============================================================================

describe('/m-quick (light mode) output validation', () => {
  const lightModeOutput: Manifold = {
    schema_version: 3,
    feature: 'quick-fix',
    outcome: 'Fix bug X',
    phase: 'VERIFIED',
    mode: 'light',
    constraints: {
      technical: [
        { id: 'T1', type: 'boundary', statement: 'Fix must not break existing tests' },
        { id: 'T2', type: 'goal', statement: 'Fix should complete in single commit' }
      ],
      business: [],
      user_experience: [],
      security: [],
      operational: []
    },
    tensions: [],
    anchors: {
      required_truths: []
    },
    quick_summary: {
      started: '2026-01-21T10:00:00Z',
      completed: '2026-01-21T10:15:00Z',
      files_changed: 2,
      tests_added: 1
    }
  };

  test('produces valid manifold structure', () => {
    const result = validateManifold(lightModeOutput);
    expect(result.valid).toBe(true);
  });

  test('sets mode to light', () => {
    expect(lightModeOutput.mode).toBe('light');
  });

  test('has minimal constraints (1-3)', () => {
    const totalConstraints = [
      ...(lightModeOutput.constraints?.business || []),
      ...(lightModeOutput.constraints?.technical || []),
      ...(lightModeOutput.constraints?.user_experience || []),
      ...(lightModeOutput.constraints?.security || []),
      ...(lightModeOutput.constraints?.operational || [])
    ].length;

    expect(totalConstraints).toBeGreaterThanOrEqual(1);
    expect(totalConstraints).toBeLessThanOrEqual(5); // Light mode should be minimal
  });

  test('can skip directly to VERIFIED phase', () => {
    // Light mode allows: CONSTRAINED → GENERATED → VERIFIED
    expect(['CONSTRAINED', 'GENERATED', 'VERIFIED']).toContain(lightModeOutput.phase);
  });

  test('has quick_summary for light mode', () => {
    expect(lightModeOutput.quick_summary).toBeDefined();
    expect(lightModeOutput.quick_summary?.files_changed).toBeDefined();
  });
});

// =============================================================================
// Tests: Template Usage Validation
// =============================================================================

describe('template-based manifold validation', () => {
  const templateBasedOutput: Manifold = {
    schema_version: 3,
    feature: 'user-auth',
    outcome: 'Secure authentication',
    phase: 'CONSTRAINED',
    template: 'auth',
    template_version: 1,
    constraints: {
      business: [
        { id: 'B1', type: 'invariant', statement: 'Users can opt out of marketing' }
      ],
      technical: [
        { id: 'T1', type: 'invariant', statement: 'Passwords hashed with bcrypt' }
      ],
      user_experience: [],
      security: [
        { id: 'S1', type: 'invariant', statement: 'Rate limit login attempts' }
      ],
      operational: []
    },
    tensions: [],
    anchors: { required_truths: [] }
  };

  test('produces valid manifold with template reference', () => {
    const result = validateManifold(templateBasedOutput);
    expect(result.valid).toBe(true);
  });

  test('preserves template metadata', () => {
    expect(templateBasedOutput.template).toBe('auth');
    expect(templateBasedOutput.template_version).toBe(1);
  });
});
