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

// T2: Advisory at runtime — never block. But the directive language is
// strengthened to MUST so the model can self-enforce reliably.
const context = {
  additionalContext: [
    'MANIFOLD INTERACTION RULES (mandatory directive; advisory enforcement):',
    '',
    '1. AskUserQuestion is REQUIRED for any response that asks the user to choose, decide, clarify, or confirm.',
    '   - If your reply contains a question soliciting a user response → use AskUserQuestion (or the agent-equivalent structured input).',
    '   - Markdown options/tables/bulleted lists that effectively ask "which one?" are NOT a substitute. Wrapping a decision in prose is the anti-pattern this rule exists to prevent.',
    '   - Exceptions (plain prose is fine):',
    '     a) Rhetorical phrasing inside an explanation that does NOT solicit a response.',
    '     b) Quick "I will assume X — say so if not" assumption-call-outs where waiting for a structured answer would be heavier than just proceeding.',
    '',
    '2. After completing any Manifold phase, ALWAYS include the concrete next command: /manifold:mN-xxx <feature>, plus a one-line explanation of what that phase does.',
    '',
    '3. When presenting alternatives or trade-offs AND the next step depends on the user choosing one, wrap them in AskUserQuestion. Do not present options and then end with "which one?" in prose.',
    '',
    '4. Read-only / status / report-style responses (m-status, verify summaries, drift reports) do NOT need AskUserQuestion. End them with "Waiting for your command" and stop.',
  ].join('\n'),
};

console.log(JSON.stringify(context));
process.exit(0);
