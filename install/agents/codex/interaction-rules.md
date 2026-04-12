# Manifold Interaction Rules — Codex CLI Override
# Satisfies: RT-4, U4 (Codex-specific patterns)
#
# Extends shared rules with Codex-appropriate interaction patterns.
# Codex supports hooks and custom agents, but interaction enforcement still relies primarily on instructions.

## Interaction Rules (MANDATORY)

1. **Inline choices for decisions**: When you need user input, present choices inline:
   ```
   Which approach should we use?
   - **A**: Description of option A
   - **B**: Description of option B
   - **C**: Description of option C
   ```
   Do NOT ask open-ended questions without choices.
2. **Phase complete → Suggest next command**: After completing this phase, ALWAYS include:
   - The concrete next command: `/manifold:mN-xxx <feature>`
   - A one-line explanation of what the next phase does
3. **Present trade-offs as labeled options**: When presenting alternatives, use bold labels (A, B, C) with descriptions.
