# Manifold Interaction Rules — Codex CLI Override
# Satisfies: RT-4, U4 (Codex-specific patterns)
#
# Extends shared rules with Codex-appropriate interaction patterns.
# Codex does not have hooks or AskUserQuestion — instruction-only enforcement.

## Interaction Rules (MANDATORY)

1. **Labelled inline choices are REQUIRED for any response that asks the user to choose, decide, clarify, or confirm.** Codex has no hooks or `AskUserQuestion` — instruction-level enforcement is the only mechanism, so the model must self-enforce strictly:
   ```
   Which approach should we use?
   - **A**: Description of option A
   - **B**: Description of option B
   - **C**: Description of option C
   ```
   - **Anti-pattern**: presenting alternatives and ending with "which one?" or an open-ended question. The labelled-choices block is mandatory whenever the next step depends on the user picking one.
   - **Exceptions** (plain prose is acceptable):
     - Rhetorical phrasing inside an explanation that does NOT solicit a response.
     - "I will assume X — say so if not" assumption call-outs.

2. **Phase complete → Suggest next command**: After completing this phase, ALWAYS include:
   - The concrete next command: `/manifold:mN-xxx <feature>`
   - A one-line explanation of what the next phase does

3. **Present trade-offs as labelled options**: When presenting alternatives AND a choice must follow, end the response with the labelled-choices block. Do not present options and then end with "which one?" in prose.

4. **Read-only / status / report responses are exempt**: status summaries, verify reports, and similar outputs do NOT need labelled choices. End them with "Waiting for your command" and stop.
