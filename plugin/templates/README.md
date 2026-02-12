# Constraint Templates

Pre-built constraint patterns for common development scenarios. These templates reduce the cognitive load of constraint discovery by providing battle-tested starting points.

## Available Templates

### Technical Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `auth.json` + `auth.md` | User authentication | 15 | 30-60 min |
| `crud.json` + `crud.md` | Data CRUD operations | 12 | 20-40 min |
| `api.json` + `api.md` | REST/GraphQL APIs | 14 | 25-50 min |
| `payment.json` + `payment.md` | Payment processing | 18 | 45-90 min |

### Product Management Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `pm/feature-launch.json` + `.md` | New feature or product launch | 15-18 | 45-90 min |
| `pm/experiment.json` + `.md` | A/B test or experiment design | 12-14 | 30-60 min |
| `pm/deprecation.json` + `.md` | Feature sunset or migration | 14-16 | 40-75 min |
| `pm/opportunity-assessment.json` + `.md` | Go/no-go opportunity decision (SVPG) | 10 | 30-60 min |
| `pm/product-vision.json` + `.md` | Product vision & strategy | 12 | 45-90 min |
| `pm/lean-canvas.json` + `.md` | Lean Canvas business model | 10 | 25-45 min |
| `pm/pr-faq.json` + `.md` | Amazon Working Backwards PR/FAQ | 12 | 45-90 min |
| `pm/mvp-definition.json` + `.md` | MVP scope definition | 14 | 40-75 min |
| `pm/competitive-analysis.json` + `.md` | Competitive landscape | 12 | 35-60 min |
| `pm/user-persona.json` + `.md` | User persona with JTBD | 10 | 30-50 min |
| `pm/go-to-market.json` + `.md` | Go-to-market strategy | 14 | 45-90 min |
| `pm/product-roadmap.json` + `.md` | Now-Next-Later roadmap | 12 | 35-60 min |
| `pm/shape-up-pitch.json` + `.md` | Shape Up pitch | 10 | 25-45 min |

PM templates use the same constraint categories (business, technical, user_experience, security, operational) but with PM-focused language. See [PM Templates README](pm/README.md) for details.

> **Note:** Legacy `.yaml` templates are still available for backward compatibility but new projects should use the JSON+MD format.

## Usage

### Option 1: Initialize with Template

```
/manifold:m0-init user-login --template=auth
```

This creates a manifold pre-populated with auth constraints, ready for customization.

### Option 2: Copy and Customize

```bash
# Copy both JSON (structure) and MD (content) files
cp install/templates/auth.json .manifold/my-feature.json
cp install/templates/auth.md .manifold/my-feature.md
# Edit JSON for structural changes (add/remove constraint IDs)
# Edit MD for content changes (statements, rationale, thresholds)
```

### Option 3: Reference During /manifold:m1-constrain

When running `/manifold:m1-constrain`, mention which template applies:

```
/manifold:m1-constrain user-auth --reference=auth
```

The AI will use the template as a starting point and prompt you to customize.

## Template Structure

Each template consists of two files:

1. **`.json` file** — Structure only (IDs, types, relationships, status)
2. **`.md` file** — Content only (statements, rationale, customization notes)

The markdown file contains:

1. **Suggested Constraints** - Pre-written constraints with clear statements
2. **Common Tensions** - Typical conflicts and their resolutions
3. **Required Truths** - What must be true for success
4. **Customization Notes** - Where to adapt for your specific case

## Customization Guidelines

Templates are starting points, not rigid requirements:

| Do | Don't |
|----|-------|
| Remove irrelevant constraints | Keep all constraints unchanged |
| Adjust thresholds to your needs | Use exact values without thought |
| Add domain-specific constraints | Assume template is complete |
| Rename IDs to match your system | Mix template IDs with custom IDs |

## When NOT to Use Templates

- **Novel domains**: If no template fits, start from scratch
- **Simple changes**: Use `/manifold:m-quick` instead
- **Complex integrations**: Templates may oversimplify
- **Compliance-specific**: Regulatory constraints need expert review

## Contributing Templates

To add a new template:

1. Create `install/templates/<name>.json` (structure) and `install/templates/<name>.md` (content)
2. Follow the JSON+MD split pattern of existing templates
3. Include at least:
   - 3 invariants (must never violate)
   - 3 boundaries (hard limits)
   - 3 goals (optimize toward)
4. Document common tensions
5. Add to this README
