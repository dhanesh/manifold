---
description: "Generate ALL artifacts simultaneously from the constraint manifold - code, tests, docs, runbooks, alerts"
argument-hint: "<feature-name> [--option=A|B|C]"
model-routing: opus
---

# /manifold:m4-generate - Model-Routed Dispatch

This phase runs on **opus** for maximum reasoning capability. Artifact generation requires simultaneous reasoning across constraints, code, tests, docs, and ops.

## Instructions

1. Parse the feature name and flags from the user's command
2. Spawn an Agent with:
   - `subagent_type`: `"manifold:m4-generate-worker"`
   - `model`: `"opus"`
   - `prompt`: Include ALL of the following context
3. Return the agent's result to the user verbatim

## Context to Pass in Agent Prompt

- **Feature name** (required)
- **`--option=<A|B|C>`** if provided (solution option from anchoring)
- **`--artifacts=<list>`** if provided (specific artifact types)
- **`--prd`** flag if present (generate PRD)
- **`--stories`** flag if present (generate user stories)
- **Working directory**: the current working directory path
- **Existing project structure**: brief listing of relevant directories (src/, lib/, tests/, docs/, ops/)
- **Manifold state summary**: read `.manifold/<feature>.json` and include key data:
  - Number of constraints by category
  - Number of tensions and their resolution status
  - Required truths and their status
  - Binding constraint if present
  - Selected solution option if anchoring completed
  - Domain (software/non-software)

## Example Agent Call

When user runs: `/manifold:m4-generate payment-retry --option=C`

Dispatch:
```
Agent(
  subagent_type: "manifold:m4-generate-worker",
  model: "opus",
  prompt: "Generate artifacts for feature 'payment-retry' with --option=C. Working directory: /path/to/project. Manifold has 12 constraints (4 business, 2 technical, 2 UX, 2 security, 2 operational), 2 tensions (1 resolved), 5 required truths. Binding constraint: RT-1. Domain: software. Project structure: lib/, tests/, docs/, ops/ exist."
)
```

## Important: Manifold State

For m4-generate, the agent needs significant context about the manifold state to generate correctly. Read the JSON and MD files and summarize the key information in the prompt. The agent runs in an isolated context and cannot see the main conversation.
