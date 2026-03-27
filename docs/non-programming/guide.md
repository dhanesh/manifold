# Manifold for Non-Programming Decisions

A guide to using constraint-first thinking beyond software engineering.

## Executive Summary

Manifold's constraint-first approach **translates well** to non-programming domains, with varying effectiveness:

| Domain | Applicability | Best For |
|--------|--------------|----------|
| **Research/Analysis** | HIGH | Methodology design, study planning |
| **Business** | HIGH | Strategic decisions, expansion planning |
| **Personal** | HIGH | Major life decisions, career choices |
| **Creative** | MODERATE | Project planning (not creative direction) |

## Using the `--domain=non-software` Flag

To activate non-software mode, pass `--domain=non-software` when initializing a manifold:

```bash
/manifold:m0-init career-change --domain=non-software --outcome="Make the right career move"
```

This flag does two things:
1. **Switches constraint categories** from software-specific (Business, Technical, UX, Security, Operational) to universal categories (Obligations, Desires, Resources, Risks, Dependencies)
2. **Switches artifact generation** from code artifacts to decision artifacts (decision brief, scenario stress-tests, narrative guide, recovery playbook, risk watch list)

The flag defaults to `software` when omitted, so all existing workflows are unaffected. The reasoning mechanics (constraint types, tension analysis, backward reasoning) are identical in both modes -- only the vocabulary and output artifacts change.

## Universal Categories

The five universal categories replace the software-centric categories when `--domain=non-software` is active:

| Universal Category | Core Question | Replaces (Software) |
|--------------------|---------------|----------------------|
| **Obligations** | What must/must-not be true? | Business + Security |
| **Desires** | What does success look like? | UX + Business goals |
| **Resources** | What can I bring to this? | Technical (capability limits) |
| **Risks** | What could break irreversibly? | Security (broadened) |
| **Dependencies** | What else must hold outside me? | Operational |

Constraint types (INVARIANT / GOAL / BOUNDARY) are unchanged. The categories change; the type taxonomy does not.

## Key Findings

### What Works Well

1. **Tension Analysis is Universally Valuable**
   - Every domain tested produced meaningful tensions
   - Hidden dependencies emerged naturally
   - Trade-offs became explicit rather than implicit

2. **The "Risks" Category Surprises**
   - Maps naturally to different concepts per domain:
     - Business: Financial/market risks
     - Personal: Exit strategies, safety nets
     - Research: Validity threats
   - Often surfaces considerations that emotional thinking overlooks

3. **Constraint Types Transfer Directly**
   - **Invariant** (must never violate): Works in all domains
   - **Goal** (should optimize): Works in all domains
   - **Boundary** (hard limit): Works in all domains

### What Needs Adaptation

1. **Creative Contexts**
   - Framework better for planning than direction
   - Consider softer names: "Vision" instead of "Obligations"
   - Don't force structure on inherently fluid processes

2. **Time Expectations**
   - 5-10 minutes is sufficient for most decisions
   - Complex decisions may warrant 30+ minutes
   - Don't over-engineer simple choices

## Recommended Usage

### Use Manifold When:
- Decision has multiple stakeholders or competing interests
- Stakes are high enough to warrant structured thinking
- You suspect hidden constraints or trade-offs
- Previous decisions in this area have gone poorly

### Skip Manifold When:
- Decision is simple or low-stakes
- Creative exploration is the goal (not planning)
- Time pressure makes structured analysis impractical
- Intuition is likely sufficient

## Quick Start for Non-Programmers

1. **Initialize** with the non-software flag:
   ```bash
   /manifold:m0-init my-decision --domain=non-software --outcome="Desired outcome"
   ```
2. **Brainstorm constraints** across all 5 universal categories (2 min each)
3. **Identify tensions** between conflicting constraints
4. **Resolve or accept** each tension
5. **Decide** with full constraint visibility

## Category Deep Dive

### Obligations (replaces Business + Security)
*What must/must-not be true?*

Ask yourself:
- What are the non-negotiable requirements?
- What legal, ethical, or contractual commitments apply?
- What must absolutely happen -- or absolutely not happen?

### Desires (replaces UX + Business goals)
*What does success look like?*

Ask yourself:
- What does the ideal outcome feel like?
- What would make stakeholders genuinely satisfied?
- What experience is unacceptable?

### Resources (replaces Technical)
*What can I bring to this?*

Ask yourself:
- What time, money, skills, and energy are available?
- What are the hard limits on what I can invest?
- What capabilities exist today vs. what must be built?

### Risks (replaces Security, broadened)
*What could break irreversibly?*

Ask yourself:
- What's the worst-case scenario?
- What's my exit strategy if this goes wrong?
- What would I regret that I can't undo?

### Dependencies (replaces Operational)
*What else must hold outside me?*

Ask yourself:
- What external factors must remain stable?
- Who else must act, and when?
- What assumptions about the environment am I making?

## Non-Software Artifacts

When `--domain=non-software` is active, m4-generate produces these artifacts instead of code:

| Non-Software Artifact | Software Equivalent | Function |
|---|---|---|
| Decision brief | Implementation code | Decision with full constraint traceability |
| Scenario stress-tests | Test suite | Verifies decision holds under adversarial conditions |
| Narrative guide | Documentation | Reasoning survives time and personnel changes |
| Recovery playbook | Runbooks | Pre-decided responses to watch-list risks |
| Risk watch list + review triggers | Dashboards + alerts | What to monitor; when to reopen |

See [m4-generate-nonsoftware.md](../m4-generate-nonsoftware.md) for full artifact templates.

## Tension Types

Tensions surface naturally when constraints conflict:

| Type | Meaning | Example |
|------|---------|---------|
| **Trade-off** | Can't fully satisfy both | Career growth vs family time |
| **Resource Tension** | Not enough to meet both | Speed vs quality with fixed budget |
| **Hidden Dependency** | One requires the other first | Customer experience requires local hiring |

## Command Applicability

Which Manifold commands work for non-programming decisions?

| Command | Applicable? | Notes |
|---------|-------------|-------|
| `/manifold:m0-init` | Yes | Use `--domain=non-software` to activate universal categories |
| `/manifold:m1-constrain` | Yes | Discovers constraints across 5 universal categories |
| `/manifold:m2-tension` | Yes | Surface conflicts between constraints |
| `/manifold:m3-anchor` | Yes | Backward reasoning works for any outcome |
| `/manifold:m4-generate` | Yes | Generates decision artifacts (not code) in non-software mode |
| `/manifold:m5-verify` | Yes | Verifies completeness against constraints |
| `/manifold:m6-integrate` | No | Code-specific wiring |
| `/manifold:m-status` | Yes | Track decision progress |

**Key Insight**: With the `--domain=non-software` flag, all phases through m5-verify are fully applicable. The artifact phases produce decision-appropriate outputs rather than code artifacts.

## Privacy & Local Usage

For personal decisions containing sensitive information:

- **All manifolds are local** - Files stay in `.manifold/` on your machine
- **No data leaves your system** - Framework operates entirely locally
- **You control the files** - Delete anytime, no external dependencies
- **Private by default** - No telemetry, no cloud sync, no sharing

**Recommendations for sensitive decisions**:
1. Use generic/anonymized scenario names
2. Keep manifold files outside version-controlled repositories
3. Delete manifold files after decisions are made if desired

## Templates

See [scenario-template.md](scenario-template.md) for a reusable template.

## Example Scenarios

- [Business Decision](scenario-business.md): Startup expansion
- [Personal Decision](scenario-personal.md): Job relocation
- [Creative Project](scenario-creative.md): Novel planning
- [Research Study](scenario-research.md): Methodology selection

## Conclusion

Manifold's constraint-first approach is not limited to software engineering. The core insight - that making ALL constraints visible BEFORE deciding leads to better outcomes - applies broadly to complex decisions.

The framework is most effective when:
- Constraints exist across multiple categories
- Trade-offs are not immediately obvious
- The decision warrants structured analysis

For simpler decisions, the cognitive overhead may not be justified. But for the decisions that really matter, surfacing constraints and tensions before committing leads to fewer surprises later.
