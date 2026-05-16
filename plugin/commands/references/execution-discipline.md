# Execution Discipline (shared reference)

Referenced by every Manifold workflow command. These patterns are adapted into
constraint-native form from the `superpowers` plugin; Manifold ships them
self-contained, with no runtime dependency on that plugin.

## The Iron Law of Verification

**NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE.**

If you have not run the verification command in this message, you cannot claim
it passes. "Should pass", "looks correct", and "I'm confident" are not
evidence.

## The Gate Function

Before claiming any phase, artifact, or task is complete:

1. **IDENTIFY** the command that proves the claim.
2. **RUN** it fresh and in full.
3. **READ** the full output and the exit code.
4. **VERIFY** the output actually confirms the claim.
5. **ONLY THEN** state the claim, with the evidence.

Skipping any step is claiming, not verifying.

## Red Flags — STOP

| Thought | Reality |
|---|---|
| "This is simple, skip the check" | Simple work fails too. Run the check. |
| "Should work now" | Run the verification command. |
| "The subagent reported success" | Verify independently — read the diff. |
| "Just this once" | No exceptions. |
| "Tests passed earlier" | Earlier is not now. Re-run. |
| "Different wording, so the rule doesn't apply" | Spirit over letter. |

## Never Start On Main

Never generate or modify feature artifacts on `main` / `master`. Confirm the
working branch first. If on `main`, create a feature branch and STOP until the
user agrees.

## Generator Status Protocol

A subagent dispatched by a coordinator reports exactly one status line:

| Status | Coordinator response |
|---|---|
| `DONE` | Proceed to review. |
| `DONE_WITH_CONCERNS` | Read the concerns. Address correctness/scope concerns before review; note observations and proceed. |
| `NEEDS_CONTEXT` | Supply the missing context, then re-dispatch. |
| `BLOCKED` | Diagnose: supply more context, re-dispatch with a more capable model, split the task, or escalate to the user. Never re-dispatch the same model unchanged. |
