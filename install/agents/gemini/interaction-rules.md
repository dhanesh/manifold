# Manifold Interaction Rules — Gemini CLI Override
# Satisfies: RT-4, U4 (Gemini-specific patterns)
#
# Extends shared rules with Gemini-appropriate interaction patterns.
# Gemini does not have AskUserQuestion — use numbered options instead.

## Interaction Rules (MANDATORY)

1. **Numbered options for decisions**: When you need user input, present numbered options:
   ```
   Choose an approach:
   1. Option A — description
   2. Option B — description
   3. Option C — description
   ```
   Do NOT ask open-ended questions without options.
2. **Phase complete → Suggest next command**: After completing this phase, ALWAYS include:
   - The concrete next command: `/manifold:mN-xxx <feature>`
   - A one-line explanation of what the next phase does
3. **Present trade-offs as numbered lists**: When presenting alternatives, use numbered labels with descriptions.
