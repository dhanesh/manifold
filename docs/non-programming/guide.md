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

## Adapted Categories

The programming-centric categories have been renamed for non-technical users:

| Original | Adapted | Focus Question |
|----------|---------|----------------|
| Business | **Goals** | What outcomes matter? |
| Technical | **Feasibility** | What's practically achievable? |
| User Experience | **Experience** | How should this feel? |
| Security | **Risks** | What could go wrong? |
| Operational | **Logistics** | How will this work day-to-day? |

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
   - Consider softer names: "Vision" instead of "Goals"
   - Don't force structure on inherently fluid processes

2. **Terminology Flexibility**
   - "Feasibility" may feel technical for personal decisions
   - Alternative: "Practicalities" or "Reality"
   - Let users adapt category names to their context

3. **Time Expectations**
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

1. **State your decision** in one sentence
2. **Brainstorm constraints** across all 5 categories (2 min each)
3. **Identify tensions** between conflicting constraints
4. **Resolve or accept** each tension
5. **Decide** with full constraint visibility

## Category Deep Dive

### Goals (formerly Business)
*What outcomes matter?*

Ask yourself:
- What does success look like?
- What must absolutely happen?
- What would be nice to achieve?

### Feasibility (formerly Technical)
*What's practically achievable?*

Ask yourself:
- What resources are available?
- What are the hard limits?
- What skills/capabilities exist?

### Experience (formerly User Experience)
*How should this feel?*

Ask yourself:
- How should I/stakeholders feel during this?
- How should the outcome feel?
- What experience is unacceptable?

### Risks (formerly Security)
*What could go wrong?*

Ask yourself:
- What's the worst-case scenario?
- What's my exit strategy?
- What would I regret?

### Logistics (formerly Operational)
*How will this work day-to-day?*

Ask yourself:
- What's the daily/weekly reality?
- What processes need to exist?
- How will this be maintained?

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
| `/m0-init` | ✓ Yes | Initialize any decision manifold |
| `/m1-constrain` | ✓ Yes | Discover constraints across 5 categories |
| `/m2-tension` | ✓ Yes | Surface conflicts between constraints |
| `/m3-anchor` | ✓ Yes | Backward reasoning works for any outcome |
| `/m4-generate` | ◐ Partial | Generates analysis, not code |
| `/m5-verify` | ◐ Partial | Verifies completeness, not code coverage |
| `/m6-integrate` | ✗ No | Code-specific wiring |
| `/m-status` | ✓ Yes | Track decision progress |

**Key Insight**: The conceptual phases (constrain → tension → anchor) translate fully. The artifact phases (generate → verify → integrate) need adaptation since they're designed for code artifacts.

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
