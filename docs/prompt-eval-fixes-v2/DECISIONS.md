# prompt-eval-fixes-v2 — Decision Log

Precise pseudo-diffs for the 7 pending EDITs, plus the tension resolutions and binding-constraint
rationale that drove them.

## Binding constraint — RT-1

> "Non-software domain branch is effective end-to-end."

RT-1 is the binding constraint because every non-software gap downstream (evidence format, iteration
format, verify artifact) is ineffective until the schema and m0-init agree on the non-software shape.
Other RTs can be closed in parallel AFTER the schema lands. They cannot be closed before it without
risking rework.

Dependency chain: RT-5 → RT-10 → RT-7 → RT-1

## Tension resolutions (carried forward from m2)

| Tension | Resolution | Reversibility | Carried into |
|---------|------------|---------------|--------------|
| TN1 schema shape vs. backward compat | Discriminated union on `domain` | ONE_WAY | Step 1 |
| TN2 flat vs. recursive RT default | Flat (`depth=1`) default; recursive is a loaded reference | TWO_WAY | Step 4 |
| TN3 unconditional verify vs. blocker gating | Always emit `.verify.json`; phase stays GENERATED if blockers | TWO_WAY | Step 7 |

All three resolutions are CONFIRMED by Option A. See `anchors.tension_validation` in the manifold JSON.

## ONE_WAY acknowledgment

Step 1 (schema discriminated union) closes the option of ever accepting a flat
`ConstraintsByCategorySchema` regardless of domain. Consequence: any external tool that constructs
a manifold JSON in memory must know to set `domain` before populating `constraints` — the schema
will reject otherwise. This is the intended outcome (it prevents the hybrid broken state the eval
report documented) but it is genuinely one-way: old JSONs that omit `domain` become legacy-parsed
as `software`, which matches current behavior.

Explicit acknowledgment required before applying step 1.

---

## EDIT 1 — `cli/lib/structure-schema.ts` (ONE_WAY)

**Before** (lines ~484-515, simplified):

```ts
export const ManifoldStructureSchema = z.object({
  // ...
  domain: z.enum(['software', 'non-software']).default('software'),
  constraints: ConstraintsByCategorySchema.optional(),
  // ...
});
```

**After**:

```ts
const SoftwareManifoldShape = z.object({
  domain: z.literal('software'),
  constraints: z.object({
    business: z.array(ConstraintRefSchema).default([]),
    technical: z.array(ConstraintRefSchema).default([]),
    user_experience: z.array(ConstraintRefSchema).default([]),
    security: z.array(ConstraintRefSchema).default([]),
    operational: z.array(ConstraintRefSchema).default([]),
  }).optional(),
});

const NonSoftwareManifoldShape = z.object({
  domain: z.literal('non-software'),
  constraints: z.object({
    obligations: z.array(ConstraintRefSchema).default([]),
    desires: z.array(ConstraintRefSchema).default([]),
    resources: z.array(ConstraintRefSchema).default([]),
    risks: z.array(ConstraintRefSchema).default([]),
    dependencies: z.array(ConstraintRefSchema).default([]),
  }).optional(),
});

const ManifoldBase = z.object({ /* all other shared fields */ });

export const ManifoldStructureSchema = z.discriminatedUnion('domain', [
  ManifoldBase.merge(SoftwareManifoldShape),
  ManifoldBase.merge(NonSoftwareManifoldShape),
]);
```

Legacy note: manifolds without a `domain` field are pre-normalized to `{ domain: 'software' }` in
`parseManifoldStructure` before discriminated-union dispatch.

Regenerate JSON schema: `bun run build:schema` (or the equivalent command that invokes `zodToJsonSchema`).

Covered by test: `tests/schema/schema-union.test.ts` + `tests/schema/corpus-software-regression.test.ts`.

## EDIT 2 — `install/commands/m0-init.md` (TWO_WAY)

Replace the current non-software paragraph that keeps software keys and renames IDs. New guidance:

```markdown
### Domain: non-software

When `--domain=non-software`, the manifold's `constraints` object uses these keys and ID prefixes:

| Key | ID prefix | Meaning |
|-----|-----------|---------|
| obligations   | OB | Legal/regulatory/ethical must-holds |
| desires       | D  | Success outcomes |
| resources     | R  | Time/money/capability limits |
| risks         | RK | Irreversible downsides |
| dependencies  | DP | External factors that must hold |

Example JSON:

\`\`\`json
{
  "domain": "non-software",
  "constraints": {
    "obligations": [{"id": "OB1", "type": "invariant"}],
    "desires": [{"id": "D1", "type": "goal"}],
    "resources": [{"id": "R1", "type": "boundary"}],
    "risks": [{"id": "RK1", "type": "invariant"}],
    "dependencies": [{"id": "DP1", "type": "boundary"}]
  }
}
\`\`\`

Do NOT use `business`/`technical`/... keys under a `non-software` manifold. The schema rejects it.
```

Covered by test: `tests/prompt-templates/m0-init-non-software.test.ts` + `tests/prompt-templates/fresh-run-non-software.test.ts`.

## EDIT 3 — `install/commands/m3-anchor.md` (TWO_WAY)

Remove lines ~145-189 (the Recursive Backward Chaining section) and replace with:

```markdown
## Recursive Backward Chaining

Default: flat mode (`--depth=1`). The always-loaded body below covers flat-mode elicitation.

For multi-level decomposition (`--depth > 1`, range 1-4), load
`install/commands/references/recursive-decomposition.md`. That file covers recursion rules,
tree output format, termination conditions, and variance guardrails (target RT band `[10, 28]`).
```

Line budget after extraction: ≤ 250.

Covered by test: `tests/prompt-templates/m3-size.test.ts`.

## EDIT 4 — evidence.id audit fixes

In `install/commands/m3-anchor.md` and `install/commands/m4-generate.md`, ensure every JSON block
containing an evidence `type` also includes `"id": "E1"` (or E2, E3 as appropriate). Current
snippets mostly include it; the audit test will highlight the specific offenders.

Covered by test: `tests/prompt-templates/evidence-id-present.test.ts`.

## EDIT 5 — iterations.result audit fixes

In every skill (`install/commands/m1-constrain.md` through `m5-verify.md`), ensure every iteration
JSON snippet includes `"result": "..."`. If `install/hooks/phase-commons` is responsible for
writing iterations, add a sanity check there that `result` is present and synthesize it from the
other iteration fields if absent.

Covered by test: `tests/prompt-templates/iterations-result-present.test.ts`.

## EDIT 6 — m5-verify.md always-emit

Add explicit language at the top of the "Execution Instructions" section:

```markdown
> **Always emit `.manifold/<feature>.verify.json`, regardless of result.**
>
> - SATISFIED → phase VERIFIED, `.verify.json` records satisfaction evidence
> - PARTIAL / NOT_SATISFIED with blockers → phase stays GENERATED, `.verify.json` records blockers
>
> Artifact presence is independent of phase advancement. Never suppress the file.
```

Covered by test: `tests/prompt-templates/m5-unconditional-verify.test.ts`.

## EDIT 7 — CLI validate error format (optional polish)

If discriminated-union errors from Zod are unclear, wrap them in `cli/lib/validate.ts` to surface
the offending key path and expected pattern. Low-risk polish, not on the critical path.

Covered by test: `tests/cli/validate-error-format.test.ts`.
