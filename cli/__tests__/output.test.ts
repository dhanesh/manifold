/**
 * Tests for output.ts
 * Validates: U4 (TTY detection), U5 (Colors)
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  setColorMode,
  colorsEnabled,
  formatPhase,
  formatConvergence,
  formatConstraintSummary,
  formatTensionSummary,
  formatNextAction
} from '../lib/output.js';

describe('setColorMode', () => {
  beforeEach(() => {
    // Reset to auto mode
    setColorMode('auto');
  });

  test('never mode disables colors', () => {
    setColorMode('never');
    expect(colorsEnabled()).toBe(false);
  });

  test('always mode enables colors', () => {
    setColorMode('always');
    expect(colorsEnabled()).toBe(true);
  });
});

describe('formatPhase', () => {
  test('formats INITIALIZED with progress', () => {
    const result = formatPhase('INITIALIZED');
    expect(result).toContain('1/6');
  });

  test('formats VERIFIED with progress', () => {
    const result = formatPhase('VERIFIED');
    expect(result).toContain('6/6');
  });
});

describe('formatConvergence', () => {
  test('formats CONVERGED status', () => {
    const result = formatConvergence('CONVERGED');
    expect(result).toContain('CONVERGED');
  });

  test('formats IN_PROGRESS status', () => {
    const result = formatConvergence('IN_PROGRESS');
    expect(result).toContain('IN PROGRESS');
  });
});

describe('formatConstraintSummary', () => {
  test('formats constraint counts', () => {
    const counts = {
      business: 3,
      technical: 5,
      user_experience: 2,
      security: 1,
      operational: 2
    };
    const result = formatConstraintSummary(counts);
    expect(result).toContain('Business: 3');
    expect(result).toContain('Technical: 5');
    expect(result).toContain('UX: 2');
  });

  test('returns "None discovered" for empty counts', () => {
    const counts = {
      business: 0,
      technical: 0,
      user_experience: 0,
      security: 0,
      operational: 0
    };
    const result = formatConstraintSummary(counts);
    expect(result).toBe('None discovered');
  });
});

describe('formatTensionSummary', () => {
  test('formats all resolved', () => {
    const result = formatTensionSummary(5, 5);
    expect(result).toContain('5 detected');
    expect(result).toContain('all resolved');
  });

  test('formats some unresolved', () => {
    const result = formatTensionSummary(3, 5);
    expect(result).toContain('5 detected');
    expect(result).toContain('2 unresolved');
  });

  test('formats none detected', () => {
    const result = formatTensionSummary(0, 0);
    expect(result).toBe('None detected');
  });
});

describe('formatNextAction', () => {
  test('returns constrain for INITIALIZED', () => {
    expect(formatNextAction('INITIALIZED', 'test')).toBe('/manifold:m1-constrain test');
  });

  test('returns tension for CONSTRAINED', () => {
    expect(formatNextAction('CONSTRAINED', 'test')).toBe('/manifold:m2-tension test');
  });

  test('returns anchor for TENSIONED', () => {
    expect(formatNextAction('TENSIONED', 'test')).toBe('/manifold:m3-anchor test');
  });

  test('returns generate for ANCHORED', () => {
    expect(formatNextAction('ANCHORED', 'test')).toBe('/manifold:m4-generate test');
  });

  test('returns verify for GENERATED', () => {
    expect(formatNextAction('GENERATED', 'test')).toBe('/manifold:m5-verify test');
  });

  test('returns Complete for VERIFIED', () => {
    expect(formatNextAction('VERIFIED', 'test')).toBe('Complete!');
  });
});
