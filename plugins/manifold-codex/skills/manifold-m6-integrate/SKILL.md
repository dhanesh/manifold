---
name: manifold-m6-integrate
description: "Wire generated artifacts together. Identifies integration points and produces actionable wiring checklist"
---

# /manifold:m6-integrate

# /manifold:m6-integrate - Model-Routed Dispatch

This phase runs on **sonnet** to save tokens. Integration analysis requires pattern matching but no deep reasoning.

## Instructions

1. Parse the feature name and flags from the user's command
2. Spawn a Codex subagent with:
   - `agent`: `manifold_m6_integrate_worker`
   - `model`: `gpt-5.4-mini`
   - `reasoning_effort`: `medium`
   - `prompt`: Include ALL of the following context
3. Return the subagent's result to the user verbatim

## Context to Pass in Agent Prompt

- **Feature name** (required)
- **`--check-only`** flag if present (show checklist without making changes)
- **`--auto-wire`** flag if present (attempt automatic integration)
- **Working directory**: the current working directory path
- **Manifold state summary**: read `.manifold/<feature>.json` and include:
  - All artifact paths from generation section
  - Constraint satisfaction status
  - Required truths mapped to artifacts

## Example Agent Call

When user runs: `/manifold:m6-integrate payment-retry --auto-wire`

Dispatch:
```
spawn_agent(
  agent: "manifold_m6_integrate_worker",
  model: "gpt-5.4-mini",
  reasoning_effort: "medium",
  prompt: "Wire artifacts for feature 'payment-retry' with --auto-wire flag. Working directory: /path/to/project. Generated artifacts: src/retry/PaymentRetryClient.ts, src/retry/IdempotencyService.ts, tests/retry/PaymentRetryClient.test.ts. Constraints: B1, B2, T1, T2."
)
```
