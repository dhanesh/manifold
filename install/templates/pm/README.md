# Product Management Templates

Pre-built constraint patterns for common PM workflows. These templates reduce the cognitive load of requirements gathering by providing PM-focused starting points.

## Available Templates

### Existing Product Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `pm/feature-launch.json` + `.md` | New feature or product launch | 15-18 | 45-90 min |
| `pm/experiment.json` + `.md` | A/B test or experiment design | 12-14 | 30-60 min |
| `pm/deprecation.json` + `.md` | Feature sunset or migration | 14-16 | 40-75 min |

### Greenfield / New Product Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `pm/opportunity-assessment.json` + `.md` | Go/no-go opportunity decision (SVPG) | 10 | 30-60 min |
| `pm/product-vision.json` + `.md` | Product vision & strategy foundation | 12 | 45-90 min |
| `pm/lean-canvas.json` + `.md` | Lean Canvas business model (Ash Maurya) | 10 | 25-45 min |
| `pm/pr-faq.json` + `.md` | Amazon Working Backwards PR/FAQ | 12 | 45-90 min |
| `pm/mvp-definition.json` + `.md` | MVP scope with MoSCoW prioritization | 14 | 40-75 min |

### General PM Templates

| Template | Use Case | Constraints | Typical Time Saved |
|----------|----------|-------------|-------------------|
| `pm/competitive-analysis.json` + `.md` | Competitive landscape analysis | 12 | 35-60 min |
| `pm/user-persona.json` + `.md` | User persona with JTBD | 10 | 30-50 min |
| `pm/go-to-market.json` + `.md` | Go-to-market launch strategy | 14 | 45-90 min |
| `pm/product-roadmap.json` + `.md` | Now-Next-Later outcome roadmap | 12 | 35-60 min |
| `pm/shape-up-pitch.json` + `.md` | Shape Up pitch with fixed appetite | 10 | 25-45 min |

> **Note:** Legacy `.yaml` templates are still available for backward compatibility but new projects should use the JSON+MD format.

## Usage

### Option 1: Initialize with Template

```
/manifold:m0-init mobile-checkout --template=pm/feature-launch
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

### Option 3: Reference During /manifold:m1-constrain

```
/manifold:m1-constrain checkout-redesign --reference=pm/feature-launch
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

### opportunity-assessment.json + opportunity-assessment.md

For making go/no-go decisions on new opportunities using the SVPG framework.

**Best for:**
- New product opportunities
- Market entry decisions
- Investment justification
- Strategic initiative evaluation

**Key constraint areas:**
- Market sizing and opportunity value (business)
- Technical feasibility assessment (technical)
- User problem validation (user_experience)
- Competitive and regulatory risk (security)
- Organizational readiness (operational)

### product-vision.json + product-vision.md

For establishing product vision and strategy foundations.

**Best for:**
- New product creation
- Product strategy alignment
- Team vision documents
- Stakeholder communication

**Key constraint areas:**
- Market positioning and differentiation (business)
- Platform and architecture choices (technical)
- Target user definition (user_experience)
- Intellectual property and compliance (security)
- Team and resource planning (operational)

### lean-canvas.json + lean-canvas.md

For validating business models using the Lean Canvas framework (Ash Maurya).

**Best for:**
- Startup idea validation
- Business model iteration
- Investor pitch preparation
- Product-market fit exploration

**Key constraint areas:**
- Problem-solution fit and revenue model (business)
- Key metrics and unfair advantage (technical)
- Customer segments and channels (user_experience)
- Cost structure and risk (security)
- Early adopter identification (operational)

### pr-faq.json + pr-faq.md

For using Amazon's Working Backwards method to define products from the customer perspective.

**Best for:**
- Customer-centric product definition
- Internal alignment on product direction
- Press release-driven development
- FAQ-based requirement discovery

**Key constraint areas:**
- Customer benefit and press release clarity (business)
- Internal FAQ technical feasibility (technical)
- Customer experience narrative (user_experience)
- External FAQ risk mitigation (security)
- Launch readiness criteria (operational)

### mvp-definition.json + mvp-definition.md

For defining minimum viable product scope with MoSCoW prioritization.

**Best for:**
- Initial product launch scoping
- Feature prioritization decisions
- Scope negotiation with stakeholders
- Time-boxed delivery planning

**Key constraint areas:**
- Must-have vs nice-to-have features (business)
- Technical MVP architecture (technical)
- Core user journey definition (user_experience)
- MVP security baseline (security)
- Launch quality bar and monitoring (operational)

### competitive-analysis.json + competitive-analysis.md

For analyzing competitive landscapes and informing product strategy.

**Best for:**
- Market entry analysis
- Feature gap assessment
- Pricing strategy research
- Differentiation planning

**Key constraint areas:**
- Market share and positioning (business)
- Technical capability comparison (technical)
- User experience benchmarking (user_experience)
- Competitive intelligence ethics (security)
- Ongoing monitoring cadence (operational)

### user-persona.json + user-persona.md

For creating user personas grounded in Jobs-to-be-Done (JTBD) methodology.

**Best for:**
- User research synthesis
- Design team alignment
- Feature prioritization input
- Marketing segmentation

**Key constraint areas:**
- Persona business impact mapping (business)
- Data collection and validation (technical)
- Job-to-be-done articulation (user_experience)
- Privacy and research ethics (security)
- Persona maintenance cadence (operational)

### go-to-market.json + go-to-market.md

For planning go-to-market launch strategies.

**Best for:**
- Product launch planning
- Market expansion initiatives
- Partnership launches
- Pricing and packaging rollouts

**Key constraint areas:**
- Revenue targets and pricing (business)
- Launch infrastructure readiness (technical)
- Customer acquisition channels (user_experience)
- Compliance and legal clearance (security)
- Sales and support enablement (operational)

### product-roadmap.json + product-roadmap.md

For building outcome-based Now-Next-Later roadmaps.

**Best for:**
- Quarterly planning
- Stakeholder roadmap communication
- Team alignment on priorities
- Strategic initiative sequencing

**Key constraint areas:**
- Outcome-driven prioritization (business)
- Capacity and dependency planning (technical)
- User outcome mapping (user_experience)
- Roadmap confidentiality (security)
- Review cadence and governance (operational)

### shape-up-pitch.json + shape-up-pitch.md

For writing Shape Up pitches with fixed time appetites.

**Best for:**
- 6-week cycle planning
- Betting table preparation
- Appetite-based scoping
- Problem-solution framing

**Key constraint areas:**
- Appetite and business value (business)
- Solution sketch feasibility (technical)
- User problem framing (user_experience)
- Risk and rabbit holes (security)
- Cycle execution criteria (operational)

## Greenfield Workflow

For brand new products, use templates in this recommended progression:

```
1. opportunity-assessment  -> Should we build this?
2. product-vision          -> What are we building and why?
3. lean-canvas             -> Is the business model viable?
4. mvp-definition          -> What's the minimum we ship?
5. feature-launch          -> (then for each individual feature)
```

Alternative: Use `pm/pr-faq` instead of `pm/product-vision` when customer empathy is the priority.

See [Greenfield Workflow Guide](../../docs/pm/guide.md#greenfield-workflow) for detailed guidance.

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
/manifold:m0-init new-feature --template=pm/feature-launch
/manifold:m1-constrain new-feature
/manifold:m2-tension new-feature
/manifold:m3-anchor new-feature
/manifold:m4-generate new-feature --prd --stories
```

This workflow produces:
- `docs/new-feature/PRD.md` - Industry-standard PRD (13 sections + appendices)
- `docs/new-feature/STORIES.md` - User stories with acceptance criteria and PRD cross-references

## When NOT to Use PM Templates

- **Simple bug fixes**: No PRD needed
- **Technical-only changes**: Use standard templates (auth, crud, api)
- **Urgent hotfixes**: Skip Manifold entirely
- **Exploratory spikes**: Don't constrain exploration
- **Internal tooling**: Consider starting directly with standard templates (auth, crud, api) unless there's market uncertainty

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
