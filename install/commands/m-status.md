---
description: "Show current Manifold state, constraint summary, workflow progress, and next action"
argument-hint: "[<feature-name>] [--history] [--diff]"
model-routing: haiku
---

# /manifold:m-status - Model-Routed Dispatch

This phase runs on **haiku** to save tokens. Status display is read-only and needs no complex reasoning.

## Instructions

1. Parse the optional feature name and flags from the user's command
2. Spawn an Agent with:
   - `subagent_type`: `"manifold:m-status-worker"`
   - `model`: `"haiku"`
   - `prompt`: Include ALL of the following context
3. Return the agent's result to the user verbatim

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
Agent(
  subagent_type: "manifold:m-status-worker",
  model: "haiku",
  prompt: "Show status for feature 'payment-retry'. Working directory: /path/to/project. Files in .manifold/: payment-retry.json, payment-retry.md"
)
```
