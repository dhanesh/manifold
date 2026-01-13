# /t0-init

Initialize a Temporal constraint manifold for a feature.

## Usage
```
/t0-init <feature-name> [--outcome="<desired outcome>"]
```

## What It Does

Creates the `.temporal/` directory structure and initializes an empty constraint manifold YAML file.

```yaml
# .temporal/manifolds/<feature-name>.cms.yaml
meta:
  id: "<feature-name>"
  version: "0.1.0"
  outcome_anchor: "<outcome>"
  created: "<timestamp>"
  status: "INITIALIZED"

constraints:
  business: []
  technical: []
  user_experience: []
  security: []
  operational: []

failure_modes: []
tensions: []
open_questions: []
```

## Output
```
✅ Constraint manifold initialized: .temporal/manifolds/<feature-name>.cms.yaml
Next: Run /t1-constrain <feature-name> to discover constraints
```

## Example
```
/t0-init payment-retry-v2 --outcome="95% retry success for transient failures"
```
