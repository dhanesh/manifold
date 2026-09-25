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

import { existsSync } from 'node:fs';
import { join } from 'node:path';

// RT-6: Only inject in Manifold projects
const manifoldDir = join(process.cwd(), '.manifold');

if (!existsSync(manifoldDir)) {
  // Not a Manifold project — silent exit, no context injection
  process.exit(0);
}

// T2: Advisory at runtime — never block. Text must stay identical to
// promptEnforcer() in cli/commands/hook.ts (the plugin's runtime path).
const context = {
  additionalContext: [
    'Manifold interaction rules:',
    '1. When a reply asks the user to choose, decide, clarify, or confirm, ask through AskUserQuestion (or the agent-equivalent structured input).',
    '   - Markdown options/tables/bulleted lists that effectively ask "which one?" are not a substitute. Wrapping a decision in prose is the anti-pattern this rule exists to prevent.',
    '   - Exceptions (plain prose is fine): rhetorical phrasing that does not solicit a response, and "I will assume X — say so if not" call-outs where waiting for a structured answer would be heavier than just proceeding.',
    '2. After completing a Manifold phase, include the concrete next command (/manifold:mN-xxx <feature>) and a one-line explanation of what that phase does.',
    '3. Labeled prose options are fine for describing alternatives or trade-offs; when the next step depends on the user choosing one, the question goes through AskUserQuestion.',
    '4. Read-only / status / report-style responses (m-status, verify summaries, drift reports) do not need AskUserQuestion. End them with "Waiting for your command" and stop.',
  ].join('\n'),
};

console.log(JSON.stringify(context));
process.exit(0);
