# /manifold:m-solve - Model-Routed Dispatch

This phase runs on **sonnet** to save tokens. Graph solving requires moderate reasoning.

## Instructions

1. Parse the feature name and flags from the user's command
2. Spawn a Codex subagent with:
   - `agent`: `manifold_m_solve_worker`
   - `model`: `gpt-5.4-mini`
   - `reasoning_effort`: `medium`
   - `prompt`: Include ALL of the following context
3. Return the subagent's result to the user verbatim

## Context to Pass in Agent Prompt

- **Feature name** (required)
- **`--backward`** flag if present (bidirectional analysis)
- **`--visualize`** flag if present (ASCII network)
- **`--dot`** flag if present (GraphViz DOT format)
- **Working directory**: the current working directory path

## Example Agent Call

When user runs: `/manifold:m-solve payment-retry --visualize`

Dispatch:
```
spawn_agent(
  agent: "manifold_m_solve_worker",
  model: "gpt-5.4-mini",
  reasoning_effort: "medium",
  prompt: "Generate parallel execution plan for feature 'payment-retry' with --visualize flag. Working directory: /path/to/project."
)
```
