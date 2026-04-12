/**
 * Tests for budget command and model routing data layer
 */

import { describe, it, expect } from 'bun:test';
import {
  PHASE_MODELS,
  WORKFLOW_PHASES,
  estimateTokenBudget,
  estimateWorkflowBudget,
  formatBudgetTable,
} from '../../install/lib/models';

describe('PHASE_MODELS', () => {
  it('defines all workflow phases', () => {
    for (const phase of WORKFLOW_PHASES) {
      expect(PHASE_MODELS[phase]).toBeDefined();
    }
  });

  it('defines utility phases', () => {
    expect(PHASE_MODELS['m-quick']).toBeDefined();
    expect(PHASE_MODELS['m-solve']).toBeDefined();
    expect(PHASE_MODELS['m-status']).toBeDefined();
    expect(PHASE_MODELS['m6-integrate']).toBeDefined();
  });

  it('assigns haiku to simple phases', () => {
    expect(PHASE_MODELS['m0-init'].model).toBe('haiku');
    expect(PHASE_MODELS['m-status'].model).toBe('haiku');
  });

  it('assigns sonnet to medium phases', () => {
    expect(PHASE_MODELS['m1-constrain'].model).toBe('sonnet');
    expect(PHASE_MODELS['m5-verify'].model).toBe('sonnet');
    expect(PHASE_MODELS['m-solve'].model).toBe('sonnet');
  });

  it('assigns opus to complex phases', () => {
    expect(PHASE_MODELS['m2-tension'].model).toBe('opus');
    expect(PHASE_MODELS['m3-anchor'].model).toBe('opus');
    expect(PHASE_MODELS['m4-generate'].model).toBe('opus');
  });

  it('marks interactive phases correctly', () => {
    expect(PHASE_MODELS['m1-constrain'].interactive).toBe(true);
    expect(PHASE_MODELS['m2-tension'].interactive).toBe(true);
    expect(PHASE_MODELS['m3-anchor'].interactive).toBe(true);
    expect(PHASE_MODELS['m-quick'].interactive).toBe(true);
  });

  it('marks non-interactive phases for agent dispatch', () => {
    expect(PHASE_MODELS['m0-init'].dispatch).toBe('agent');
    expect(PHASE_MODELS['m4-generate'].dispatch).toBe('agent');
    expect(PHASE_MODELS['m5-verify'].dispatch).toBe('agent');
    expect(PHASE_MODELS['m-status'].dispatch).toBe('agent');
  });

  it('has model recommendations for all providers', () => {
    for (const [, config] of Object.entries(PHASE_MODELS)) {
      expect(config.recommended.anthropic).toBeTruthy();
      expect(config.recommended.openai).toBeTruthy();
      expect(config.recommended.google).toBeTruthy();
    }
  });
});

describe('estimateTokenBudget', () => {
  it('returns base estimates without scaling', () => {
    const result = estimateTokenBudget('m0-init');
    expect(result.phase).toBe('m0-init');
    expect(result.model).toBe('haiku');
    expect(result.inputTokens).toBe(2_000);
    expect(result.outputTokens).toBe(1_000);
    expect(result.totalTokens).toBe(3_000);
    expect(result.fitsWindow).toBe(true);
  });

  it('scales with constraint count', () => {
    const base = estimateTokenBudget('m1-constrain');
    const scaled = estimateTokenBudget('m1-constrain', 10);
    expect(scaled.inputTokens).toBeGreaterThan(base.inputTokens);
    expect(scaled.inputTokens).toBe(base.inputTokens + 10 * 200);
  });

  it('scales with tension count', () => {
    const base = estimateTokenBudget('m2-tension');
    const scaled = estimateTokenBudget('m2-tension', 0, 5);
    expect(scaled.inputTokens).toBe(base.inputTokens + 5 * 500);
  });

  it('scales with required truth count', () => {
    const base = estimateTokenBudget('m4-generate');
    const scaled = estimateTokenBudget('m4-generate', 0, 0, 5);
    expect(scaled.inputTokens).toBe(base.inputTokens + 5 * 1_000);
  });

  it('reports fits window correctly', () => {
    const fits = estimateTokenBudget('m0-init', 0, 0, 0, 200_000);
    expect(fits.fitsWindow).toBe(true);

    const noFit = estimateTokenBudget('m4-generate', 100, 50, 50, 1_000);
    expect(noFit.fitsWindow).toBe(false);
  });

  it('handles unknown phase gracefully', () => {
    const result = estimateTokenBudget('unknown-phase');
    expect(result.totalTokens).toBe(0);
    expect(result.fitsWindow).toBe(true);
  });
});

describe('estimateWorkflowBudget', () => {
  it('covers all workflow phases', () => {
    const { phases } = estimateWorkflowBudget();
    expect(phases.length).toBe(WORKFLOW_PHASES.length);
  });

  it('totals correctly', () => {
    const { phases, total } = estimateWorkflowBudget();
    const sum = phases.reduce((s, p) => s + p.totalTokens, 0);
    expect(total).toBe(sum);
  });

  it('scales with manifold size', () => {
    const small = estimateWorkflowBudget(5, 2, 3);
    const large = estimateWorkflowBudget(20, 8, 12);
    expect(large.total).toBeGreaterThan(small.total);
  });
});

describe('formatBudgetTable', () => {
  it('generates a table string', () => {
    const { phases, total } = estimateWorkflowBudget();
    const table = formatBudgetTable(phases, total);
    expect(table).toContain('MANIFOLD MODEL ROUTING');
    expect(table).toContain('claude-haiku-4-5');
    expect(table).toContain('claude-opus-4-6');
    expect(table).toContain('agent');
  });

  it('includes feature name when provided', () => {
    const { phases, total } = estimateWorkflowBudget();
    const table = formatBudgetTable(phases, total, 'anthropic', 200_000, 'my-feature');
    expect(table).toContain('my-feature');
  });

  it('shows savings info', () => {
    const { phases, total } = estimateWorkflowBudget();
    const table = formatBudgetTable(phases, total);
    expect(table).toContain('save');
  });

  it('supports different providers', () => {
    const { phases, total } = estimateWorkflowBudget();
    const openai = formatBudgetTable(phases, total, 'openai');
    expect(openai).toContain('gpt-4o-mini');
    expect(openai).toContain('o3');
  });
});
