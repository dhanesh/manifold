# Manifold Interaction Rules (Shared Base)
# Satisfies: RT-4 (agent overrides), U4 (agent-appropriate), B1 (single source)
#
# This file contains the shared interaction rules included in all agent command files.
# Agent-specific overrides extend these rules with platform-appropriate mechanisms.

## Interaction Rules (MANDATORY)

1. **`AskUserQuestion` is REQUIRED for any response that asks the user to choose, decide, clarify, or confirm.**
   - If your reply contains a question soliciting a user response → use `AskUserQuestion` (or the agent-equivalent structured input — numbered options for Gemini, labelled choices for Codex).
   - **Anti-pattern**: presenting alternatives in a markdown table / bulleted list and ending the response with "which one?" or "your call" in prose. That is *exactly* the case this rule exists to prevent. Wrap the decision in structured input.
   - **Exceptions** (plain prose is acceptable):
     - Rhetorical phrasing inside an explanation that does NOT solicit a response.
     - "I will assume X — say so if not" assumption call-outs where waiting for structured input would be heavier than proceeding.

2. **Phase complete → Suggest next command**: After completing this phase, ALWAYS include:
   - The concrete next command: `/manifold:mN-xxx <feature>`
   - A one-line explanation of what the next phase does

3. **Present trade-offs as options**: When presenting alternatives or trade-offs AND the next step depends on the user choosing one, wrap them in structured input. Labelled prose options (A/B/C with descriptions) are fine for *describing* the trade-off; if a choice must follow, the question itself goes through `AskUserQuestion`.

4. **Read-only / status / report responses are exempt**: `m-status`, verify summaries, drift reports, and other report-style outputs do NOT need `AskUserQuestion`. End them with "Waiting for your command" and stop.
