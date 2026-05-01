# Manifold Interaction Rules — Gemini CLI Override
# Satisfies: RT-4, U4 (Gemini-specific patterns)
#
# Extends shared rules with Gemini-appropriate interaction patterns.
# Gemini does not have AskUserQuestion — use numbered options instead.

## Interaction Rules (MANDATORY)

1. **Numbered options are REQUIRED for any response that asks the user to choose, decide, clarify, or confirm.** Gemini has no `AskUserQuestion` tool — numbered options are the canonical equivalent:
   ```
   Choose an approach:
   1. Option A — description
   2. Option B — description
   3. Option C — description
   ```
   - **Anti-pattern**: presenting alternatives in a paragraph and ending with "which one?" or an open-ended question. The numbered-options block is mandatory whenever the next step depends on the user picking one.
   - **Exceptions** (plain prose is acceptable):
     - Rhetorical phrasing inside an explanation that does NOT solicit a response.
     - "I will assume X — say so if not" assumption call-outs.

2. **Phase complete → Suggest next command**: After completing this phase, ALWAYS include:
   - The concrete next command: `/manifold:mN-xxx <feature>`
   - A one-line explanation of what the next phase does

3. **Present trade-offs as numbered lists**: When presenting alternatives AND a choice must follow, the response ends with the numbered-options block. Do not present options and then end with "which one?" in prose.

4. **Read-only / status / report responses are exempt**: status summaries, verify reports, and similar outputs do NOT need numbered options. End them with "Waiting for your command" and stop.
