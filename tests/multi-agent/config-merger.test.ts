/**
 * Tests for config-merger.ts
 * Satisfies: RT-6 (idempotent configuration), TN3 (TypeScript config merger)
 */

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  deepMerge,
  mergeGeminiSettings,
  parseSimpleToml,
  serializeToml,
  mergeCodexConfig,
} from '../../install/lib/config-merger';

const TEST_DIR = join(import.meta.dir, '__fixtures__', 'config-merger');

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ============================================================
// deepMerge tests
// ============================================================

describe('deepMerge', () => {
  it('merges flat objects', () => {
    const result = deepMerge({ a: 1, b: 2 }, { c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('overwrites scalar values from source', () => {
    const result = deepMerge({ a: 1 }, { a: 2 });
    expect(result).toEqual({ a: 2 });
  });

  it('deep merges nested objects', () => {
    const target = { outer: { a: 1, b: 2 } };
    const source = { outer: { c: 3 } };
    const result = deepMerge(target, source);
    expect(result).toEqual({ outer: { a: 1, b: 2, c: 3 } });
  });

  it('merges arrays by appending unique items', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [3, 4, 5] };
    const result = deepMerge(target, source);
    expect(result).toEqual({ items: [1, 2, 3, 4, 5] });
  });

  it('merges arrays of objects by JSON equality', () => {
    const target = { hooks: [{ type: 'command', command: 'existing' }] };
    const source = { hooks: [{ type: 'command', command: 'new' }, { type: 'command', command: 'existing' }] };
    const result = deepMerge(target, source);
    expect((result.hooks as any[]).length).toBe(2);
  });

  it('handles null values', () => {
    const result = deepMerge({ a: 1 }, { b: null });
    expect(result).toEqual({ a: 1, b: null });
  });

  it('does not modify the target object', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    deepMerge(target, source);
    expect(target).toEqual({ a: 1 });
  });
});

// ============================================================
// Gemini settings.json tests
// ============================================================

describe('mergeGeminiSettings', () => {
  it('creates settings.json when it does not exist', () => {
    const settingsPath = join(TEST_DIR, 'gemini', 'settings.json');
    const result = mergeGeminiSettings(settingsPath);

    expect(result.created).toBe(true);
    expect(result.updated).toBe(false);
    expect(existsSync(settingsPath)).toBe(true);

    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.customCommands).toBeDefined();
    expect(content.customCommands.manifoldContext).toBeDefined();
  });

  it('preserves existing settings when merging', () => {
    const settingsPath = join(TEST_DIR, 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({
      theme: 'dark',
      editor: { fontSize: 14 },
    }, null, 2));

    const result = mergeGeminiSettings(settingsPath);

    expect(result.updated).toBe(true);
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.theme).toBe('dark');
    expect(content.editor.fontSize).toBe(14);
    expect(content.customCommands.manifoldContext).toBeDefined();
  });

  it('is idempotent (running twice produces same result)', () => {
    const settingsPath = join(TEST_DIR, 'settings-idem.json');

    mergeGeminiSettings(settingsPath);
    const content1 = readFileSync(settingsPath, 'utf-8');

    const result = mergeGeminiSettings(settingsPath);
    const content2 = readFileSync(settingsPath, 'utf-8');

    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);
    expect(content1).toBe(content2);
  });

  it('handles invalid JSON gracefully', () => {
    const settingsPath = join(TEST_DIR, 'bad-settings.json');
    writeFileSync(settingsPath, 'not valid json {{{');

    const result = mergeGeminiSettings(settingsPath);
    expect(result.updated).toBe(true);

    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.customCommands).toBeDefined();
  });
});

// ============================================================
// TOML parser tests
// ============================================================

describe('parseSimpleToml', () => {
  it('parses root-level key-value pairs', () => {
    const content = `
key1 = "value1"
key2 = "value2"
`;
    const sections = parseSimpleToml(content);
    expect(sections.get('')!.get('key1')).toBe('"value1"');
    expect(sections.get('')!.get('key2')).toBe('"value2"');
  });

  it('parses sections', () => {
    const content = `
[section1]
key1 = "val1"

[section2]
key2 = "val2"
`;
    const sections = parseSimpleToml(content);
    expect(sections.get('section1')!.get('key1')).toBe('"val1"');
    expect(sections.get('section2')!.get('key2')).toBe('"val2"');
  });

  it('skips comments and empty lines', () => {
    const content = `
# This is a comment
key = "value"

# Another comment
[section]
key2 = "val"
`;
    const sections = parseSimpleToml(content);
    expect(sections.get('')!.get('key')).toBe('"value"');
    expect(sections.get('section')!.get('key2')).toBe('"val"');
  });
});

describe('serializeToml', () => {
  it('round-trips through parse and serialize', () => {
    const original = `key1 = "value1"

[section1]
key2 = "val2"

`;
    const parsed = parseSimpleToml(original);
    const serialized = serializeToml(parsed);

    // Re-parse to verify
    const reparsed = parseSimpleToml(serialized);
    expect(reparsed.get('')!.get('key1')).toBe('"value1"');
    expect(reparsed.get('section1')!.get('key2')).toBe('"val2"');
  });
});

// ============================================================
// Codex config.toml tests
// ============================================================

describe('mergeCodexConfig', () => {
  it('creates config.toml when it does not exist', () => {
    const configPath = join(TEST_DIR, 'codex', 'config.toml');
    const result = mergeCodexConfig(configPath);

    expect(result.created).toBe(true);
    expect(existsSync(configPath)).toBe(true);

    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('[skills]');
    expect(content).toContain('custom_skills_path');
  });

  it('preserves existing config when merging', () => {
    const configPath = join(TEST_DIR, 'existing-config.toml');
    writeFileSync(configPath, `
[general]
model = "gpt-4"

[editor]
theme = "dark"
`);

    const result = mergeCodexConfig(configPath);

    expect(result.updated).toBe(true);
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('[general]');
    expect(content).toContain('model = "gpt-4"');
    expect(content).toContain('[skills]');
    expect(content).toContain('custom_skills_path');
  });

  it('is idempotent (running twice produces same result)', () => {
    const configPath = join(TEST_DIR, 'idem-config.toml');

    mergeCodexConfig(configPath);
    const content1 = readFileSync(configPath, 'utf-8');

    const result = mergeCodexConfig(configPath);
    const content2 = readFileSync(configPath, 'utf-8');

    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);
    expect(content1).toBe(content2);
  });

  it('does not overwrite existing skills section values', () => {
    const configPath = join(TEST_DIR, 'skills-config.toml');
    writeFileSync(configPath, `
[skills]
custom_skills_path = "~/.agents/skills"
extra_setting = "keep"
`);

    mergeCodexConfig(configPath);
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('extra_setting = "keep"');
    expect(content).toContain('custom_skills_path = "~/.agents/skills"');
  });
});
