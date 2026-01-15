# Non-Programming Scenario Template

A lightweight template for testing Manifold's constraint-first approach on non-programming problems.

## Scenario Structure

```yaml
scenario:
  name: "[Descriptive name]"
  domain: "[business | personal | creative | research]"
  decision: "[The decision or problem to solve]"
  time_budget: "5-10 minutes"

constraints:
  goals:           # What outcomes are desired? (maps to Business)
    - id: G1
      statement: "[Desired outcome]"
      type: goal | invariant | boundary

  feasibility:     # What's practically possible? (maps to Technical)
    - id: F1
      statement: "[Practical constraint]"
      type: goal | invariant | boundary

  experience:      # How should it feel? (maps to UX)
    - id: E1
      statement: "[Experience constraint]"
      type: goal | invariant | boundary

  risks:           # What could go wrong? (maps to Security)
    - id: R1
      statement: "[Risk or downside]"
      type: goal | invariant | boundary

  logistics:       # How will it work day-to-day? (maps to Operational)
    - id: L1
      statement: "[Practical logistics]"
      type: goal | invariant | boundary

tensions:
  - between: "[constraint IDs]"
    description: "[The conflict]"
    resolution: "[How to resolve]"

outcome:
  decision: "[What was decided]"
  constraints_surfaced: "[Number]"
  tensions_found: "[Number]"
  value_added: "[Did the framework help?]"
```

## Category Mapping Reference

| Programming | Non-Programming | Focus |
|-------------|-----------------|-------|
| Business | **Goals** | What outcomes matter? |
| Technical | **Feasibility** | What's practically achievable? |
| User Experience | **Experience** | How should this feel? |
| Security | **Risks** | What could go wrong? |
| Operational | **Logistics** | How will this work day-to-day? |

## Constraint Types (Unchanged)

| Type | Meaning | Example |
|------|---------|---------|
| **invariant** | Must NEVER be violated | "Budget cannot exceed $50K" |
| **goal** | Should be optimized | "Minimize commute time" |
| **boundary** | Hard limit | "Decision by end of month" |

## Quick Evaluation Checklist

After running a scenario, answer:

1. **Constraint Discovery**: Did the categories help surface constraints you might have missed?
2. **Tension Analysis**: Did conflicts between constraints emerge naturally?
3. **Decision Quality**: Did the structured approach improve the decision?
4. **Time Efficiency**: Was 5-10 minutes sufficient?
5. **Terminology**: Did the renamed categories (Goals/Feasibility/etc.) feel natural?

## Usage

1. Copy the template above
2. Fill in your specific scenario
3. Spend 5-10 minutes discovering constraints
4. Note any tensions between constraints
5. Evaluate using the checklist
