# /manifold:m-status - Model-Routed Dispatch

This phase runs on **haiku** to save tokens. Status display is read-only and needs no complex reasoning.

## Instructions

1. Parse the optional feature name and flags from the user's command
2. Spawn a Codex subagent with:
   - `agent`: `manifold_m_status_worker`
   - `model`: `gpt-5.4-mini`
   - `reasoning_effort`: `low`
   - `prompt`: Include ALL of the following context
3. Return the subagent's result to the user verbatim

## Context to Pass in Agent Prompt

- **Feature name** if provided (omit for all-features summary)
- **`--history`** flag if present (show iteration history)
- **`--diff`** flag if present (show changes since last iteration)
- **Working directory**: the current working directory path
- **List of `.manifold/` files**: run `ls .manifold/` so the agent knows what features exist

## Example Agent Call

When user runs: `/manifold:m-status payment-retry`

Dispatch:
```
spawn_agent(
  agent: "manifold_m_status_worker",
  model: "gpt-5.4-mini",
  reasoning_effort: "low",
  prompt: "Show status for feature 'payment-retry'. Working directory: /path/to/project. Files in .manifold/: payment-retry.json, payment-retry.md"
)
```
