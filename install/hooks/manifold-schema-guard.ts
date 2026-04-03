#!/usr/bin/env bun
/**
 * Manifold Schema Guard — PostToolUse Hook
 * Validates .manifold/*.json files after Write/Edit operations.
 * Catches schema errors (missing `id` on evidence, missing `result` on iterations)
 * immediately rather than waiting for manual `manifold validate`.
 *
 * Runs only when the tool modifies a file matching `.manifold/*.json`.
 * Advisory-only: surfaces errors as additionalContext, never blocks.
 */

import { existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { spawnSync } from 'child_process';

// Read hook input from stdin
const input = await Bun.stdin.text();
let hookData: any;

try {
  hookData = JSON.parse(input);
} catch {
  process.exit(0);
}

// Only act on Write or Edit tool completions
const toolName = hookData?.tool_name;
if (toolName !== 'Write' && toolName !== 'Edit' && toolName !== 'MultiEdit') {
  process.exit(0);
}

// Extract the file path from tool input
const toolInput = hookData?.tool_input;
const filePath = toolInput?.file_path || toolInput?.path;

if (!filePath) {
  process.exit(0);
}

// Only validate .manifold/*.json files (not .verify.json or .md)
const dir = dirname(filePath);
const file = basename(filePath);

if (!dir.endsWith('.manifold') || !file.endsWith('.json') || file.endsWith('.verify.json')) {
  process.exit(0);
}

// Extract feature name from filename
const feature = file.replace('.json', '');

// Find the manifold CLI binary
const cwd = process.cwd();
const cliBin = join(cwd, 'cli', 'manifold');
const localBin = join(cwd, 'node_modules', '.bin', 'manifold');
const globalBin = 'manifold';

let bin: string;
if (existsSync(cliBin)) {
  bin = cliBin;
} else if (existsSync(localBin)) {
  bin = localBin;
} else {
  bin = globalBin;
}

// Run validation
const result = spawnSync(bin, ['validate', feature], {
  cwd,
  timeout: 5000,
  encoding: 'utf-8',
});

// Exit code 2 = validation failure
if (result.status === 2) {
  const errors = (result.stdout || result.stderr || '').trim();

  // Extract just the error lines for a concise message
  const errorLines = errors
    .split('\n')
    .filter((line: string) => line.includes('✗') || line.includes('Invalid'))
    .join('\n');

  const output = {
    additionalContext: [
      `⚠️ MANIFOLD SCHEMA VALIDATION FAILED for "${feature}":`,
      errorLines || errors,
      '',
      'Fix these errors before proceeding. Common issues:',
      '- Every evidence object MUST have an `id` field (e.g. "E1", "E2")',
      '- Every iteration MUST have a `result` field (string summary)',
      '- Run `manifold validate ' + feature + '` for full details',
    ].join('\n'),
  };

  console.log(JSON.stringify(output));
} else if (result.status === 0) {
  // Validation passed — optionally confirm
  const output = {
    additionalContext: `✅ Manifold schema validation passed for "${feature}".`,
  };
  console.log(JSON.stringify(output));
}

process.exit(0);
