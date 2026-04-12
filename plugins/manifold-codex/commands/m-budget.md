# /manifold:m-budget - Model Routing & Token Budget

Show which models Manifold uses for each phase and estimate token costs.

## Model Routing

This skill dispatches to **haiku** -- it's a read-only display command.

## Instructions

1. Run the CLI command to get budget data:
   ```bash
   manifold budget [<feature>] [--phase=<phase>] [--provider=<provider>] [--json]
   ```
2. Display the results
3. Add natural-language commentary explaining:
   - Which phases will be dispatched to agents (saving main context tokens)
   - Which phases run in-context (interactive, can't be dispatched)
   - Total estimated token cost for the full workflow
   - Whether the user's context window is sufficient

## Phase Model Routing Summary

| Phase | Model | Dispatch | Why |
|-------|-------|----------|-----|
| m0-init | haiku | agent | Template filling, no reasoning needed |
| m1-constrain | sonnet | in-context | Interactive 5-category interview |
| m2-tension | opus | in-context | Interactive TRIZ + cascade analysis |
| m3-anchor | opus | in-context | Interactive backward chaining |
| m4-generate | opus | agent | Heavy multi-artifact generation |
| m5-verify | sonnet | agent | Read-only classification matrix |
| m6-integrate | sonnet | agent | Pattern matching for wiring |
| m-quick | sonnet | in-context | Interactive lightweight workflow |
| m-solve | sonnet | agent | Graph solver |
| m-status | haiku | agent | Read-only status display |

## Example Output

```
MANIFOLD MODEL ROUTING: payment-retry (12 constraints, 3 tensions)

Phase          Model                   Dispatch  Est. Input  Est. Output   Total  Fits 200K?
─────────────────────────────────────────────────────────────────────────────────────────────
m0-init        claude-haiku-4-5        agent         2,000        1,000    3,000       YES
m1-constrain   claude-sonnet-4-6       in-ctx        6,400        4,200   10,600       YES
m2-tension     claude-opus-4-6         in-ctx        7,500        5,000   12,500       YES
m3-anchor      claude-opus-4-6         in-ctx        6,200        5,500   11,700       YES
m4-generate    claude-opus-4-6         agent        14,400       16,500   30,900       YES
m5-verify      claude-sonnet-4-6       agent         5,800        3,800    9,600       YES
─────────────────────────────────────────────────────────────────────────────────────────────
                                                                          78,300

Agent-dispatched phases save ~22,200 tokens on main context.
```

## Configuration

Users can override model routing in `.manifold/config.json`:

```json
{
  "models": {
    "context_window": 200000,
    "overrides": {
      "m0-init": "sonnet",
      "m5-verify": "opus"
    }
  }
}
```
