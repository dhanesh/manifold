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
console.log(`MANIFOLD INTERACTION RULES (advisory):
1. When you need user decisions or clarification, present numbered options (e.g., "1. Option A  2. Option B") rather than open-ended questions.
2. After completing any Manifold phase, ALWAYS include the concrete next command: /manifold:mN-xxx <feature>
3. When presenting trade-offs, list options with clear labels and descriptions.`);

process.exit(0);
