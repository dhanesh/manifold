# Constraint Templates

Pre-built constraint patterns for common development scenarios. These templates reduce the cognitive load of constraint discovery by providing battle-tested starting points.

## Available Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `auth.yaml` | User authentication | 15 | 30-60 min |
| `crud.yaml` | Data CRUD operations | 12 | 20-40 min |
| `api.yaml` | REST/GraphQL APIs | 14 | 25-50 min |
| `payment.yaml` | Payment processing | 18 | 45-90 min |

## Usage

### Option 1: Initialize with Template

```
/m0-init user-login --template=auth
```

This creates a manifold pre-populated with auth constraints, ready for customization.

### Option 2: Copy and Customize

```bash
cp install/templates/auth.yaml .manifold/my-feature.yaml
# Edit to customize
```

### Option 3: Reference During /m1-constrain

When running `/m1-constrain`, mention which template applies:

```
/m1-constrain user-auth --reference=auth
```

The AI will use the template as a starting point and prompt you to customize.

## Template Structure

Each template includes:

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
- **Simple changes**: Use `/m-quick` instead
- **Complex integrations**: Templates may oversimplify
- **Compliance-specific**: Regulatory constraints need expert review

## Contributing Templates

To add a new template:

1. Create `install/templates/<name>.yaml`
2. Follow the structure of existing templates
3. Include at least:
   - 3 invariants (must never violate)
   - 3 boundaries (hard limits)
   - 3 goals (optimize toward)
4. Document common tensions
5. Add to this README
