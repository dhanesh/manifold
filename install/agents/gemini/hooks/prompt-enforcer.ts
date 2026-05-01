#!/usr/bin/env bun
/**
 * Manifold Interaction Enforcer — Gemini CLI Hook
 * Satisfies: RT-7 (Gemini hook support), B2 (all agents), U4 (agent-appropriate patterns)
 *
 * Gemini equivalent of the Claude Code UserPromptSubmit hook.
 * Outputs plain text context (Gemini hooks don't use JSON additionalContext).
 *
 * Install: Copy to ~/.gemini/hooks/prompt-enforcer.ts
 * Configure: Added automatically by install.sh
 */

import { existsSync } from 'fs';
import { join } from 'path';

const manifoldDir = join(process.cwd(), '.manifold');

if (!existsSync(manifoldDir)) {
  process.exit(0);
}

// Gemini hooks output plain text (not JSON additionalContext)
// U4: Agent-appropriate — Gemini uses numbered options, not AskUserQuestion
console.log(`MANIFOLD INTERACTION RULES (mandatory directive; advisory enforcement):

1. Numbered options are REQUIRED for any response that asks the user to choose, decide, clarify, or confirm.
   - Open-ended questions without options are the anti-pattern this rule prevents.
   - Format: "Choose one:  1. Option A — description  2. Option B — description  3. Option C — description"
   - Exceptions: rhetorical phrasing inside explanations, or "I will assume X — say so if not" assumption call-outs.

2. After completing any Manifold phase, ALWAYS include the concrete next command: /manifold:mN-xxx <feature>, plus a one-line explanation of what that phase does.

3. When presenting alternatives or trade-offs AND the next step depends on the user choosing one, end the response with the numbered-options block — do not present options and then end with "which one?" in prose.

4. Read-only / status / report-style responses do NOT need numbered options. End them with "Waiting for your command" and stop.`);

process.exit(0);
