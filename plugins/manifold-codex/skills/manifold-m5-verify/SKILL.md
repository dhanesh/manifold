---
name: manifold-m5-verify
description: "Verify ALL artifacts against ALL constraints. Produces a verification matrix showing coverage and gaps"
---

# /manifold:m5-verify

# /manifold:m5-verify - Model-Routed Dispatch

This phase runs on **sonnet** to save tokens. Verification is classification and matrix-building -- no deep reasoning needed.

## Instructions

1. Parse the feature name and flags from the user's command
2. Spawn a Codex subagent with:
   - `agent`: `manifold_m5_verify_worker`
   - `model`: `gpt-5.4-mini`
   - `reasoning_effort`: `medium`
   - `prompt`: Include ALL of the following context
3. Return the subagent's result to the user verbatim

## Context to Pass in Agent Prompt

- **Feature name** (required)
- **`--strict`** flag if present (fail on any gaps)
- **`--actions`** flag if present (generate executable actions)
- **`--verify-evidence`** flag if present (verify concrete evidence)
- **`--run-tests`** flag if present (execute test evidence)
- **`--execute`** flag if present (run test_runner subprocess)
- **`--levels`** flag if present (show satisfaction level breakdown)
- **Working directory**: the current working directory path
- **Manifold state summary**: read `.manifold/<feature>.json` and include:
  - Phase (should be GENERATED)
  - All constraint IDs and types
  - All artifact paths from generation section
  - All required truths with evidence items
  - Binding constraint if present

## Example Agent Call

When user runs: `/manifold:m5-verify payment-retry --actions`

Dispatch:
```
spawn_agent(
  agent: "manifold_m5_verify_worker",
  model: "gpt-5.4-mini",
  reasoning_effort: "medium",
  prompt: "Verify feature 'payment-retry' with --actions flag. Working directory: /path/to/project. Manifold phase: GENERATED. Constraints: B1(invariant), B2(goal), T1(boundary), T2(goal), U1(boundary), S1(invariant), O1(goal). Artifacts: src/retry/PaymentRetryClient.ts, tests/retry/PaymentRetryClient.test.ts, docs/payment-retry/README.md, ops/runbooks/payment-retry-failure.md. Required truths: RT-1(NOT_SATISFIED), RT-2(NOT_SATISFIED)."
)
```
