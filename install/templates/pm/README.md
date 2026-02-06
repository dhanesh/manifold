# Product Management Templates

Pre-built constraint patterns for common PM workflows. These templates reduce the cognitive load of requirements gathering by providing PM-focused starting points.

## Available Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `pm/feature-launch.json` + `.md` | New feature or product launch | 15-18 | 45-90 min |
| `pm/experiment.json` + `.md` | A/B test or experiment design | 12-14 | 30-60 min |
| `pm/deprecation.json` + `.md` | Feature sunset or migration | 14-16 | 40-75 min |

> **Note:** Legacy `.yaml` templates are still available for backward compatibility but new projects should use the JSON+MD format.

## Usage

### Option 1: Initialize with Template

```
/m0-init mobile-checkout --template=pm/feature-launch
```

Creates a manifold pre-populated with PM-focused constraints, ready for customization.

### Option 2: Copy and Customize

```bash
# Copy both JSON (structure) and MD (content) files
cp install/templates/pm/feature-launch.json .manifold/my-feature.json
cp install/templates/pm/feature-launch.md .manifold/my-feature.md
# Edit JSON for structural changes (add/remove constraint IDs)
# Edit MD for content changes (statements, rationale, thresholds)
```

### Option 3: Reference During /m1-constrain

```
/m1-constrain checkout-redesign --reference=pm/feature-launch
```

The AI will use the template as a starting point and prompt you to customize.

## Template Descriptions

### feature-launch.json + feature-launch.md

For launching new features or products to users.

**Best for:**
- New feature development
- Product launches
- Major enhancements
- Cross-functional initiatives

**Key constraint areas:**
- Success metrics and KPIs (business)
- Engineering feasibility (technical)
- User value and adoption (user_experience)
- Legal/competitive risk (security)
- Rollout and support readiness (operational)

### experiment.json + experiment.md

For designing and running A/B tests or experiments.

**Best for:**
- A/B tests
- Feature experiments
- Pricing experiments
- UX experiments

**Key constraint areas:**
- Hypothesis and success criteria (business)
- Statistical requirements (technical)
- User experience during experiment (user_experience)
- Experiment ethics and consent (security)
- Monitoring and analysis (operational)

### deprecation.json + deprecation.md

For sunsetting features or migrating users.

**Best for:**
- Feature deprecation
- Legacy system migration
- Breaking change management
- User migration campaigns

**Key constraint areas:**
- Business justification (business)
- Migration path (technical)
- User communication (user_experience)
- Data handling (security)
- Support and rollback (operational)

## Customization Guidelines

Templates are starting points, not rigid requirements:

| Do | Don't |
|----|-------|
| Replace [CUSTOMIZE: ...] values | Leave placeholders unchanged |
| Remove irrelevant constraints | Keep all constraints without thought |
| Add domain-specific constraints | Assume template is complete |
| Adjust metrics to your context | Use exact values without validation |
| Update tensions for your situation | Ignore unresolved tensions |

## Template Structure

Each PM template consists of two files:

1. **`.json` file** — Structure only (IDs, types, relationships, status)
2. **`.md` file** — Content only (statements, rationale, customization notes)

The markdown file contains:

1. **PM-Focused Constraints** - Written from product perspective, not technical
2. **Common Tensions** - Typical PM trade-offs (scope vs timeline, etc.)
3. **Required Truths** - What must be true for feature success
4. **Customization Notes** - Guidance on what to change

## Integration with PRD/Stories Generation

These templates are designed to work with the `--prd` and `--stories` flags:

```
/m0-init new-feature --template=pm/feature-launch
/m1-constrain new-feature
/m2-tension new-feature
/m3-anchor new-feature
/m4-generate new-feature --prd --stories
```

This workflow produces:
- `docs/new-feature/PRD.md` - Industry-standard PRD (13 sections + appendices)
- `docs/new-feature/STORIES.md` - User stories with acceptance criteria and PRD cross-references

## When NOT to Use PM Templates

- **Simple bug fixes**: No PRD needed
- **Technical-only changes**: Use standard templates (auth, crud, api)
- **Urgent hotfixes**: Skip Manifold entirely
- **Exploratory spikes**: Don't constrain exploration

See [When NOT to Use](../../docs/WHEN_NOT_TO_USE.md) for more guidance.

## Contributing PM Templates

To add a new PM template:

1. Create `install/templates/pm/<name>.json` (structure) and `install/templates/pm/<name>.md` (content)
2. Follow the JSON+MD split pattern of existing PM templates
3. Include PM-focused language (not technical jargon)
4. Document common tensions for the use case
5. Add customization notes in the MD file
6. Update this README

## See Also

- [PM Adaptation Guide](../../docs/pm/guide.md) - Full guide for PMs
- [Constraint Templates](../README.md) - All templates (technical + PM)
- [Feature Prioritization Example](../../docs/pm/scenario-feature-prioritization.md)
- [Product Launch Example](../../docs/pm/scenario-product-launch.md)
