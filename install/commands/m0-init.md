---
description: "Initialize a constraint manifold for a feature. Creates .manifold/<feature>.yaml"
---

# /m0-init - Initialize Constraint Manifold

Initialize a new constraint manifold for a feature.

## Usage

```
/m0-init <feature-name> [--outcome="<desired outcome>"]
```

## Process

1. **Create manifold directory** if it doesn't exist: `.manifold/`
2. **Create feature manifold file**: `.manifold/<feature-name>.yaml`
3. **Initialize structure** with:
   - Feature name and outcome
   - Empty constraint categories (business, technical, UX, security, operational)
   - Metadata (created timestamp, phase)

## Manifold File Structure

```yaml
feature: <feature-name>
outcome: <desired outcome or "TBD">
phase: INITIALIZED
created: <timestamp>

constraints:
  business: []
  technical: []
  user_experience: []
  security: []
  operational: []

tensions: []
anchors: []
```

## Example

```
User: /m0-init payment-retry --outcome="95% retry success for transient failures"

Response:
MANIFOLD INITIALIZED: payment-retry

Outcome: 95% retry success for transient failures

Created: .manifold/payment-retry.yaml

Constraint Categories Ready:
- [ ] Business
- [ ] Technical
- [ ] UX
- [ ] Security
- [ ] Operational

Next: /m1-constrain payment-retry
```

## Execution Instructions

When this command is invoked:

1. Parse the feature name from arguments
2. Extract optional `--outcome` flag
3. Check if `.manifold/` directory exists, create if not
4. Check if manifold already exists for this feature (warn if so)
5. Create the YAML file with initialized structure
6. Display confirmation with next step
