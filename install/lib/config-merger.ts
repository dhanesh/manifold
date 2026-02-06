#!/usr/bin/env bun
/**
 * Config Merger Helper
 * Satisfies: RT-6 (idempotent configuration), TN3 (TypeScript config merger)
 *
 * Handles idempotent merging of Manifold configuration into:
 * - Gemini CLI: settings.json (JSON deep merge)
 * - Codex CLI: config.toml (TOML section merge)
 *
 * Usage:
 *   bun run install/lib/config-merger.ts gemini <settings.json-path>
 *   bun run install/lib/config-merger.ts codex <config.toml-path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// ============================================================
// Types
// ============================================================

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

// ============================================================
// JSON Deep Merge (Gemini settings.json)
// ============================================================

/**
 * Deep merge two JSON objects. Arrays are merged by appending unique items.
 * Satisfies: TN3 (idempotent JSON merging)
 */
export function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
  const result: JsonObject = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(targetVal as JsonObject, sourceVal as JsonObject);
    } else if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
      // Merge arrays: append items not already present (by JSON equality)
      const existing = new Set(targetVal.map(v => JSON.stringify(v)));
      const merged = [...targetVal];
      for (const item of sourceVal) {
        if (!existing.has(JSON.stringify(item))) {
          merged.push(item);
        }
      }
      result[key] = merged;
    } else {
      // Scalar or new key: source wins
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Manifold configuration fragment for Gemini CLI settings.json.
 * Adds custom command extensions for Manifold hooks.
 */
function getGeminiManifoldConfig(): JsonObject {
  return {
    customCommands: {
      manifoldContext: {
        description: "Preserve Manifold constraint state across context compaction",
        command: "bun run ~/.gemini/hooks/manifold-context.ts"
      }
    }
  };
}

/**
 * Merge Manifold config into Gemini settings.json idempotently.
 * Creates the file if it doesn't exist.
 * Satisfies: RT-6
 */
export function mergeGeminiSettings(settingsPath: string): { created: boolean; updated: boolean } {
  const manifoldConfig = getGeminiManifoldConfig();
  let existing: JsonObject = {};
  let created = false;

  if (existsSync(settingsPath)) {
    try {
      existing = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      // If file exists but is invalid JSON, start fresh
      existing = {};
    }
  } else {
    created = true;
    // Ensure directory exists
    const dir = dirname(settingsPath);
    mkdirSync(dir, { recursive: true });
  }

  const merged = deepMerge(existing, manifoldConfig);
  const mergedStr = JSON.stringify(merged, null, 2) + '\n';
  const existingStr = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf-8') : '';

  if (mergedStr === existingStr) {
    return { created: false, updated: false };
  }

  writeFileSync(settingsPath, mergedStr, 'utf-8');
  return { created, updated: !created };
}

// ============================================================
// TOML Section Merge (Codex config.toml)
// ============================================================

/**
 * Parse a simple TOML file into sections.
 * Handles [section] headers and key = "value" pairs.
 * Not a full TOML parser — covers the subset used by Codex config.
 */
export function parseSimpleToml(content: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>();
  let currentSection = '';
  sections.set(currentSection, new Map());

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section header
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections.has(currentSection)) {
        sections.set(currentSection, new Map());
      }
      continue;
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^([^=]+?)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      sections.get(currentSection)!.set(key, value);
    }
  }

  return sections;
}

/**
 * Serialize TOML sections back to a string.
 */
export function serializeToml(sections: Map<string, Map<string, string>>): string {
  const lines: string[] = [];

  // Root section (no header)
  const root = sections.get('');
  if (root && root.size > 0) {
    for (const [key, value] of root) {
      lines.push(`${key} = ${value}`);
    }
    lines.push('');
  }

  // Named sections
  for (const [section, entries] of sections) {
    if (section === '') continue;
    lines.push(`[${section}]`);
    for (const [key, value] of entries) {
      lines.push(`${key} = ${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Manifold configuration fragment for Codex CLI config.toml.
 * Configures notification hooks for manifold state changes.
 */
function getCodexManifoldConfig(): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>();

  // Add skills path configuration
  const skills = new Map<string, string>();
  skills.set('custom_skills_path', '"~/.agents/skills"');
  sections.set('skills', skills);

  return sections;
}

/**
 * Merge Manifold config into Codex config.toml idempotently.
 * Creates the file if it doesn't exist.
 * Satisfies: RT-6
 */
export function mergeCodexConfig(configPath: string): { created: boolean; updated: boolean } {
  const manifoldConfig = getCodexManifoldConfig();
  let existing = new Map<string, Map<string, string>>();
  let created = false;

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      existing = parseSimpleToml(content);
    } catch {
      existing = new Map();
      existing.set('', new Map());
    }
  } else {
    created = true;
    const dir = dirname(configPath);
    mkdirSync(dir, { recursive: true });
    existing.set('', new Map());
  }

  // Merge each section from manifold config into existing
  let changed = false;
  for (const [section, entries] of manifoldConfig) {
    if (!existing.has(section)) {
      existing.set(section, new Map());
      changed = true;
    }
    const existingSection = existing.get(section)!;
    for (const [key, value] of entries) {
      if (existingSection.get(key) !== value) {
        existingSection.set(key, value);
        changed = true;
      }
    }
  }

  if (!changed && !created) {
    return { created: false, updated: false };
  }

  const serialized = serializeToml(existing);
  writeFileSync(configPath, serialized, 'utf-8');
  return { created, updated: !created };
}

// ============================================================
// CLI Entry Point
// ============================================================

if (import.meta.main) {
  const [agent, configPath] = process.argv.slice(2);

  if (!agent || !configPath) {
    console.error('Usage: config-merger.ts <gemini|codex> <config-path>');
    process.exit(1);
  }

  switch (agent) {
    case 'gemini': {
      const result = mergeGeminiSettings(configPath);
      if (result.created) {
        console.log(`Created ${configPath} with Manifold config`);
      } else if (result.updated) {
        console.log(`Updated ${configPath} with Manifold config`);
      } else {
        console.log(`${configPath} already up to date`);
      }
      break;
    }
    case 'codex': {
      const result = mergeCodexConfig(configPath);
      if (result.created) {
        console.log(`Created ${configPath} with Manifold config`);
      } else if (result.updated) {
        console.log(`Updated ${configPath} with Manifold config`);
      } else {
        console.log(`${configPath} already up to date`);
      }
      break;
    }
    default:
      console.error(`Unknown agent: ${agent}. Use 'gemini' or 'codex'.`);
      process.exit(1);
  }
}
