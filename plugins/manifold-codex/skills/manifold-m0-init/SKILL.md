---
name: manifold-m0-init
description: "Initialize a constraint manifold for a feature. Creates .manifold/<feature>.json + .manifold/<feature>.md"
---

# /manifold:m0-init

# /manifold:m0-init - Model-Routed Dispatch

This phase runs on **haiku** to save tokens. Dispatch using the Codex subagent system. Prefer the custom agent `manifold_m0_init_worker` configured for `gpt-5.4-mini` with `low` reasoning.

## Instructions

1. Parse the feature name and flags from the user's command
2. Spawn a Codex subagent with:
   - `agent`: `manifold_m0_init_worker`
   - `model`: `gpt-5.4-mini`
   - `reasoning_effort`: `low`
   - `prompt`: Include ALL of the following context
3. Return the subagent's result to the user verbatim

## Context to Pass in Agent Prompt

Include all of these in the agent's prompt string:

- **Feature name** (required) — extracted from user's command
- **`--outcome`** value if provided
- **`--template`** value if provided (the agent should load the template from `install/templates/`)
- **`--domain`** value if provided (`software` or `non-software`)
- **`--from-quick`** flag if present (upgrading light-mode manifold)
- **Working directory**: the current working directory path so the agent can find/create `.manifold/`
- **Whether `.manifold/` directory already exists**
- **Whether a manifold for this feature already exists** (check for `.manifold/<feature>.json`)

## Example Agent Call

When user runs: `/manifold:m0-init payment-retry --outcome="95% retry success"`

Dispatch:
```
spawn_agent(
  agent: "manifold_m0_init_worker",
  model: "gpt-5.4-mini",
  reasoning_effort: "low",
  prompt: "Initialize a constraint manifold for feature 'payment-retry' with outcome '95% retry success for transient failures'. Domain: software. Working directory: /path/to/project. The .manifold/ directory does not yet exist."
)
```
