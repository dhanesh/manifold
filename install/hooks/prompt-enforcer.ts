#!/usr/bin/env bun
/**
 * Manifold Interaction Enforcer — UserPromptSubmit Hook
 * Satisfies: RT-5 (advisory reminders), RT-6 (Manifold-only), T1 (cross-platform),
 *            T2 (advisory-only), T3 (<200ms), T5 (contract compliance),
 *            S1 (no content leak), S2 (no eval/exec)
 *
 * Injects additionalContext reminding the model to:
 * 1. Use AskUserQuestion for all interactive moments
 * 2. Suggest the next /manifold:mN-xxx command after phase completion
 *
 * Install: Registered in hooks.json as UserPromptSubmit hook
 * Platforms: macOS, Linux, Windows (Bun runtime)
 */

import { existsSync } from 'fs';
import { join } from 'path';

// RT-6: Only inject in Manifold projects
const manifoldDir = join(process.cwd(), '.manifold');

if (!existsSync(manifoldDir)) {
  // Not a Manifold project — silent exit, no context injection
  process.exit(0);
}

// T2: Advisory-only — inject reminders, never block
const context = {
  additionalContext: [
    'MANIFOLD INTERACTION RULES (advisory):',
    '1. Use AskUserQuestion (or agent-equivalent structured input) when you need user decisions, preferences, or clarification. Avoid plain-text questions.',
    '2. After completing any Manifold phase, ALWAYS include the concrete next command: /manifold:mN-xxx <feature>',
    '3. When presenting options or trade-offs, use AskUserQuestion with labeled choices.',
  ].join('\n'),
};

console.log(JSON.stringify(context));
process.exit(0);
