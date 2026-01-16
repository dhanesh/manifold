---
description: "Initialize a constraint manifold for a feature. Creates .manifold/<feature>.yaml"
---

# /m0-init - Initialize Constraint Manifold

Initialize a new constraint manifold for a feature.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `INITIALIZED` |
| **Next Phase** | `CONSTRAINED` (via /m1-constrain) |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new phases.

## Usage

```
/m0-init <feature-name> [--outcome="<desired outcome>"]
```

## Process

1. **Create manifold directory** if it doesn't exist: `.manifold/`
2. **Create feature manifold file**: `.manifold/<feature-name>.yaml`
3. **Initialize structure** with:
   - Schema version for forward compatibility
   - Feature name and outcome
   - Empty constraint categories (business, technical, UX, security, operational)
   - Iteration tracking section (v2)
   - Metadata (created timestamp, phase)

## Manifold File Structure

```yaml
# Manifold Schema v2
schema_version: 2
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

# v2: Iteration Tracking
iterations: []
```

## Schema Version Compatibility

| Version | Features | Status |
|---------|----------|--------|
| 1 (implicit) | Original schema, no version field | Supported |
| 2 | Adds `schema_version`, `iterations[]` | Current |

**Backward Compatibility**: Manifolds without `schema_version` are treated as v1 and remain fully functional.

## Example

```
User: /m0-init payment-retry --outcome="95% retry success for transient failures"

Response:
MANIFOLD INITIALIZED: payment-retry

Schema Version: 2
Outcome: 95% retry success for transient failures

Created: .manifold/payment-retry.yaml

Constraint Categories Ready:
- [ ] Business
- [ ] Technical
- [ ] UX
- [ ] Security
- [ ] Operational

Iteration Tracking: Enabled (v2)

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
