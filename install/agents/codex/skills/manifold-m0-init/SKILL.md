---
name: manifold-m0-init
description: "Initialize a constraint manifold for a feature. Creates .manifold/<feature>.json + .manifold/<feature>.md"
---

# /manifold:m0-init

# /manifold:m0-init - Initialize Constraint Manifold

Initialize a new constraint manifold for a feature.

## Schema Compliance

| Field | Valid Values |
|-------|--------------|
| **Sets Phase** | `INITIALIZED` |
| **Next Phase** | `CONSTRAINED` (via /manifold:m1-constrain) |

> See SCHEMA_REFERENCE.md for all valid values. Do NOT invent new phases.

## Usage

```
/manifold:m0-init <feature-name> [--outcome="<desired outcome>"] [--domain=software|non-software]
```

## Process

1. **Create manifold directory** if it doesn't exist: `.manifold/`
2. **Create feature manifold files**: `.manifold/<feature-name>.json` + `.manifold/<feature-name>.md`
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
  "$schema": "https://raw.githubusercontent.com/dhanesh/manifold/main/install/manifold-structure.schema.json",
  "schema_version": 3,
  "feature": "<feature-name>",
  "phase": "INITIALIZED",
  "domain": "software",
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

> **Note**: Legacy YAML is only for existing manifolds. New manifolds MUST use JSON+Markdown. Use `manifold migrate <feature>` to convert.

Single-file YAML format is still supported but deprecated. See `SCHEMA_REFERENCE.md` for legacy YAML migration details.

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
User: /manifold:m0-init payment-retry --outcome="95% retry success for transient failures"

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

Next: /manifold:m1-constrain payment-retry
```

## Domain Auto-Detection

If the user does NOT specify `--domain` explicitly, analyze the feature name and outcome for domain signals:

**Non-software signals** (suggest `--domain=non-software`):
- Feature names like: career-decision, hiring-plan, budget-allocation, product-strategy, relocation
- Outcome describes: a decision, a plan, a strategy, a policy, a negotiation, a life choice
- No technical terms: no APIs, databases, services, endpoints, deployments

**Software signals** (keep default `--domain=software`):
- Feature names like: payment-retry, auth-module, api-gateway, cache-layer
- Outcome describes: a system, a service, a feature, a component, performance targets
- Technical terms present: latency, throughput, API, database, deployment

When non-software is detected, use AskUserQuestion to confirm:
> "This looks like a non-software decision. Would you like to use non-software mode (universal categories: Obligations, Desires, Resources, Risks, Dependencies)?"

**Next-step suggestion must reflect domain:**
- Software: `Next: /manifold:m1-constrain <feature>`
- Non-software: `Next: /manifold:m1-constrain <feature>` with note: "(non-software mode: uses universal constraint categories — Obligations, Desires, Resources, Risks, Dependencies)"

## Scope Guard (MANDATORY)

**This phase ONLY creates manifold files.** After creating `.manifold/<feature>.json` and `.manifold/<feature>.md`, display the confirmation table and **STOP**.

**DO NOT** do any of the following during m0-init:
- Create project folders, directory structures, or source files
- Spawn background agents or sub-agents for content creation
- Write README.md, CLAUDE.md, or any files outside `.manifold/`
- Generate code, sample data, templates, or any implementation artifacts
- Begin work that belongs to later phases (m1-m6)

**The user's prompt — no matter how detailed — is the OUTCOME, not a work order.** Capture the full intent in the `## Outcome` section of the `.md` file. Do not interpret descriptive prompts as instructions to build the described system during initialization.

**After creating the two manifold files: display confirmation, suggest next step, STOP.**

## Execution Instructions

When this command is invoked:

1. Parse the feature name from arguments
2. Extract optional `--outcome` flag
3. Extract optional `--domain` flag (default: `software`). When `non-software`, the manifold uses universal constraint categories and generates non-software artifacts in m4.
4. Extract optional `--from-quick` flag. When present:
   - Read existing light-mode manifold from `.manifold/<feature>.json` and `.manifold/<feature>.md`
   - Preserve existing constraints (do NOT discard them)
   - Expand the structure to full manifold format (add empty categories for any missing categories, ensure all v3 schema fields are present)
   - Set phase to `INITIALIZED` (ready for full m1-constrain to expand)
   - Display: "Upgraded from light mode. Existing constraints preserved. Run `/manifold:m1-constrain <feature>` to expand constraint coverage."
5. **If no `--domain` flag:** Run domain auto-detection (see above). If non-software signals detected, suggest the flag via AskUserQuestion before proceeding.
6. Check if `.manifold/` directory exists, create if not
7. Check if manifold already exists for this feature (warn if so, unless `--from-quick`)
8. **Create TWO files (JSON+Markdown hybrid format)**:
   - `.manifold/<feature>.json` — Structure with IDs, types, phases, `"domain": "software"` or `"non-software"` (NO text content)
   - `.manifold/<feature>.md` — Content with outcome, section headings. For non-software: use universal category headings (Obligations, Desires, Resources, Risks, Dependencies)
9. Display confirmation with file paths, domain, and domain-aware next step

### Generation Guidelines

**For the JSON file:**
- Include `"$schema": "https://raw.githubusercontent.com/dhanesh/manifold/main/install/manifold-structure.schema.json"` for IDE validation
- Include only IDs, types, phases, and references
- NO text content (no `statement`, no `description`, no `rationale`)
- Use the structure validated by `manifold validate` (see `SCHEMA_REFERENCE.md` for valid fields)

**For the Markdown file:**
- Start with `# <feature-name>` heading
- Include `## Outcome` section with the outcome text
- Include empty category sections with comment placeholders
- Use heading conventions: `####` for constraints, `###` for tensions/truths

### ⚠️ Mandatory Post-Phase Validation

After creating both files, run validation before showing results:

```bash
manifold validate <feature>
```

If validation fails, fix the JSON structure before proceeding. Common issues: missing required fields (`$schema`, `schema_version`), invalid domain value.

## Interaction Rules (MANDATORY)
<!-- Satisfies: RT-1 (next-step templates), RT-3 (structured input), U1 (suggest next), U2 (AskUserQuestion) -->

1. **Questions → AskUserQuestion**: When you need user input during this phase, use the `AskUserQuestion` tool with structured options. NEVER ask questions as plain text without options.
2. **Phase complete → Suggest next**: After completing this phase, ALWAYS include the concrete next command (`/manifold:mN-xxx <feature>`) and a one-line explanation of what the next phase does.
3. **Trade-offs → Labeled options**: When presenting alternatives, use `AskUserQuestion` with labeled choices (A, B, C) and descriptions.
