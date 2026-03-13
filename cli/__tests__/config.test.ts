/**
 * Tests for Manifold Configuration Module
 * Satisfies: T4 (reusable test runner config), RT-6 (extensible config)
 *
 * G1: Covers loadConfig, getTierPatterns, inferTestTier
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { loadConfig, getTierPatterns, inferTestTier, type ManifoldConfig, type TestTierPatterns } from '../lib/config.js';

// ============================================================
// Test Setup
// ============================================================

const TEST_DIR = join(import.meta.dir, '__config_test_tmp__');
const MANIFOLD_DIR = join(TEST_DIR, '.manifold');

beforeEach(() => {
  mkdirSync(MANIFOLD_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

// ============================================================
// loadConfig Tests
// ============================================================

describe('loadConfig', () => {
  test('returns empty config when .manifold/config.json does not exist', () => {
    // Remove the manifold dir to ensure no config
    rmSync(MANIFOLD_DIR, { recursive: true });
    mkdirSync(MANIFOLD_DIR, { recursive: true });

    const config = loadConfig(TEST_DIR);
    expect(config).toEqual({});
  });

  test('returns empty config when config.json is not in .manifold/', () => {
    // No config.json created
    const config = loadConfig(TEST_DIR);
    expect(config).toEqual({});
  });

  test('loads valid config from .manifold/config.json', () => {
    const configData: ManifoldConfig = {
      test_runner: 'bun test',
      test_args: ['--bail'],
      test_tier_patterns: {
        unit: ['*.test.ts'],
        integration: ['*.int.ts'],
        e2e: ['*.e2e.ts'],
      },
      drift_hooks: {
        on_drift: 'echo drift detected',
      },
    };

    writeFileSync(join(MANIFOLD_DIR, 'config.json'), JSON.stringify(configData));
    const config = loadConfig(TEST_DIR);

    expect(config.test_runner).toBe('bun test');
    expect(config.test_args).toEqual(['--bail']);
    expect(config.test_tier_patterns?.unit).toEqual(['*.test.ts']);
    expect(config.drift_hooks?.on_drift).toBe('echo drift detected');
  });

  test('returns empty config for invalid JSON', () => {
    writeFileSync(join(MANIFOLD_DIR, 'config.json'), 'not valid json {{{');
    const config = loadConfig(TEST_DIR);
    expect(config).toEqual({});
  });

  test('loads partial config correctly', () => {
    writeFileSync(
      join(MANIFOLD_DIR, 'config.json'),
      JSON.stringify({ test_runner: 'pytest' })
    );
    const config = loadConfig(TEST_DIR);
    expect(config.test_runner).toBe('pytest');
    expect(config.test_args).toBeUndefined();
    expect(config.test_tier_patterns).toBeUndefined();
  });

  test('returns empty config for non-existent base path', () => {
    const config = loadConfig('/tmp/does-not-exist-manifold-test');
    expect(config).toEqual({});
  });
});

// ============================================================
// getTierPatterns Tests
// ============================================================

describe('getTierPatterns', () => {
  test('returns default patterns when config has no tier patterns', () => {
    const patterns = getTierPatterns({});
    expect(patterns.unit).toContain('*.test.ts');
    expect(patterns.unit).toContain('*.spec.ts');
    expect(patterns.integration).toContain('*.integration.ts');
    expect(patterns.e2e).toContain('*.e2e.ts');
  });

  test('uses custom patterns when provided', () => {
    const config: ManifoldConfig = {
      test_tier_patterns: {
        unit: ['*_test.go'],
        integration: ['*_integration_test.go'],
        e2e: ['*_e2e_test.go'],
      },
    };
    const patterns = getTierPatterns(config);
    expect(patterns.unit).toEqual(['*_test.go']);
    expect(patterns.integration).toEqual(['*_integration_test.go']);
    expect(patterns.e2e).toEqual(['*_e2e_test.go']);
  });

  test('falls back to defaults for missing tier categories', () => {
    const config: ManifoldConfig = {
      test_tier_patterns: {
        unit: ['custom.test.ts'],
        // integration and e2e not specified
      },
    };
    const patterns = getTierPatterns(config);
    expect(patterns.unit).toEqual(['custom.test.ts']);
    expect(patterns.integration).toContain('*.integration.ts');
    expect(patterns.e2e).toContain('*.e2e.ts');
  });
});

// ============================================================
// inferTestTier Tests
// ============================================================

describe('inferTestTier', () => {
  const defaultPatterns: TestTierPatterns = {
    unit: ['*.test.ts', '*.spec.ts', 'test_*.py'],
    integration: ['*.integration.ts', '*_integration_test.py'],
    e2e: ['*.e2e.ts', '*_e2e_test.py'],
  };

  test('identifies unit test files', () => {
    expect(inferTestTier('auth.test.ts', defaultPatterns)).toBe('unit');
    expect(inferTestTier('auth.spec.ts', defaultPatterns)).toBe('unit');
    expect(inferTestTier('test_handler.py', defaultPatterns)).toBe('unit');
  });

  test('identifies integration test files', () => {
    expect(inferTestTier('db.integration.ts', defaultPatterns)).toBe('integration');
    expect(inferTestTier('handler_integration_test.py', defaultPatterns)).toBe('integration');
  });

  test('identifies e2e test files', () => {
    expect(inferTestTier('login.e2e.ts', defaultPatterns)).toBe('e2e');
    expect(inferTestTier('checkout_e2e_test.py', defaultPatterns)).toBe('e2e');
  });

  test('returns undefined for non-test files', () => {
    expect(inferTestTier('handler.ts', defaultPatterns)).toBeUndefined();
    expect(inferTestTier('config.json', defaultPatterns)).toBeUndefined();
    expect(inferTestTier('README.md', defaultPatterns)).toBeUndefined();
  });

  test('handles full paths by extracting filename', () => {
    expect(inferTestTier('src/lib/auth.test.ts', defaultPatterns)).toBe('unit');
    expect(inferTestTier('tests/e2e/login.e2e.ts', defaultPatterns)).toBe('e2e');
  });

  test('e2e takes precedence over unit if both match', () => {
    // e2e is checked first in the implementation
    const patterns: TestTierPatterns = {
      unit: ['*.ts'],
      e2e: ['*.e2e.ts'],
    };
    expect(inferTestTier('login.e2e.ts', patterns)).toBe('e2e');
  });

  test('returns undefined with empty patterns', () => {
    expect(inferTestTier('auth.test.ts', {})).toBeUndefined();
  });
});
