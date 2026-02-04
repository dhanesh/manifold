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

## Output Format

### JSON+Markdown Hybrid (Default)

Creates TWO files that work together:

**`.manifold/<feature>.json`** — Structure only (IDs, types, references)
```json
{
  "schema_version": 3,
  "feature": "<feature-name>",
  "phase": "INITIALIZED",
  "created": "<timestamp>",
  "constraints": {
    "business": [],
    "technical": [],
    "user_experience": [],
    "security": [],
    "operational": []
  },
  "tensions": [],
  "anchors": {
    "required_truths": []
  },
  "iterations": [],
  "convergence": {
    "status": "NOT_STARTED"
  },
  "constraint_graph": {
    "version": 1,
    "nodes": {},
    "edges": {
      "dependencies": [],
      "conflicts": [],
      "satisfies": []
    }
  }
}
```

**`.manifold/<feature>.md`** — Content only (text, rationale)
```markdown
# <feature-name>

## Outcome

<desired outcome or "TBD">

---

## Constraints

### Business

<!-- Add constraints here: #### B1: Title -->

### Technical

<!-- Add constraints here: #### T1: Title -->

### User Experience

<!-- Add constraints here: #### U1: Title -->

### Security

<!-- Add constraints here: #### S1: Title -->

### Operational

<!-- Add constraints here: #### O1: Title -->

---

## Tensions

<!-- Add tensions here: ### TN1: Title -->

---

## Required Truths

<!-- Add required truths here: ### RT-1: Title -->
```

### Why Two Files?

| Aspect | JSON | Markdown |
|--------|------|----------|
| **Contains** | IDs, types, phases, refs | Statements, descriptions, rationale |
| **Purpose** | Machine-readable structure | Human-readable content |
| **Validation** | Zod schema (guaranteed valid) | Flexible prose |
| **Benefit** | No field confusion | Natural writing |

**Key insight**: JSON has NO text fields. This eliminates `statement` vs `description` confusion.

### Legacy YAML Format

Single file with both structure and content (still supported):

```yaml
# Manifold Schema v3
schema_version: 3
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

anchors:
  required_truths: []

# v2+: Iteration Tracking
iterations: []

# v2+: Convergence Tracking
convergence:
  status: NOT_STARTED

# v3: Evidence System (reality grounding)
evidence: []

# v3: Constraint Graph (temporal non-linearity)
constraint_graph:
  version: 1
  nodes: {}
  edges:
    dependencies: []
    conflicts: []
    satisfies: []
```

## Schema Version Compatibility

| Version | Features | Status |
|---------|----------|--------|
| 1 (implicit) | Original schema, no version field | Supported |
| 2 | Adds `schema_version`, `iterations[]`, `convergence` | Supported |
| 3 | Adds `evidence[]`, `constraint_graph`, temporal non-linearity | Current |

**Backward Compatibility**: Manifolds without `schema_version` are treated as v1 and remain fully functional.

> **See**: `install/commands/SCHEMA_REFERENCE.md` for complete schema reference including Evidence types, Constraint Graph node types, and all valid field values.

## Example

```
User: /m0-init payment-retry --outcome="95% retry success for transient failures"

Response:
MANIFOLD INITIALIZED: payment-retry

Format: JSON+Markdown Hybrid
Schema Version: 3
Outcome: 95% retry success for transient failures

Files Created:
├── .manifold/payment-retry.json  (structure)
└── .manifold/payment-retry.md    (content)

Constraint Categories Ready:
- [ ] Business
- [ ] Technical
- [ ] UX
- [ ] Security
- [ ] Operational

v3 Features Enabled:
- Iteration Tracking
- Convergence Tracking
- Evidence System (reality grounding)
- Constraint Graph (temporal non-linearity)

Next: /m1-constrain payment-retry
```

## Execution Instructions

When this command is invoked:

1. Parse the feature name from arguments
2. Extract optional `--outcome` flag
3. Check if `.manifold/` directory exists, create if not
4. Check if manifold already exists for this feature (warn if so)
5. **Create TWO files (JSON+Markdown hybrid format)**:
   - `.manifold/<feature>.json` — Structure with IDs, types, phases (NO text content)
   - `.manifold/<feature>.md` — Content with outcome, section headings
6. Display confirmation with file paths and next step

### Generation Guidelines

**For the JSON file:**
- Include only IDs, types, phases, and references
- NO text content (no `statement`, no `description`, no `rationale`)
- Use Zod-compatible structure (see `cli/lib/structure-schema.ts`)

**For the Markdown file:**
- Start with `# <feature-name>` heading
- Include `## Outcome` section with the outcome text
- Include empty category sections with comment placeholders
- Use heading conventions: `####` for constraints, `###` for tensions/truths
