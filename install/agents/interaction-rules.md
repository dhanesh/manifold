# Manifold Interaction Rules (Shared Base)
# Satisfies: RT-4 (agent overrides), U4 (agent-appropriate), B1 (single source)
#
# This file contains the shared interaction rules included in all agent command files.
# Agent-specific overrides extend these rules with platform-appropriate mechanisms.

## Interaction Rules (MANDATORY)

1. **Structured input for decisions**: When you need user input, decisions, or clarification during this phase, use structured input with labeled options rather than open-ended plain-text questions.
2. **Phase complete → Suggest next command**: After completing this phase, ALWAYS include:
   - The concrete next command: `/manifold:mN-xxx <feature>`
   - A one-line explanation of what the next phase does
3. **Present trade-offs as options**: When presenting alternatives or trade-offs, list them as labeled options (A, B, C) with descriptions, not as prose paragraphs.
