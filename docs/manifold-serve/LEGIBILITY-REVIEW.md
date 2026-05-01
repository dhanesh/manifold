# Cross-Audience Legibility Review — `manifold serve`

> **Closes gap G10 from `manifold-serve.verify.json`.**
> **Verifies constraint:** B2 (Cross-Audience Legibility, GOAL).

B2 is qualitative — there is no automatable check that a non-engineer
finds the visualiser legible. This document is the structured review
protocol that produces the `manual_review` evidence the verify pipeline
expects.

## Protocol

1. **Pick a reviewer who is *not* on the manifold-serve team.** Ideal
   profiles: a product manager, a designer, an SRE, or a stakeholder who
   reads PRDs but does not write Go/TypeScript.
2. **Set a 15-minute calendar block.** Longer reviews drift into design
   feedback; shorter reviews don't reach the constraint relationships,
   which is the part B2 is actually about.
3. **Run the binary against this repo:** `manifold serve`. Open the URL
   the CLI prints. Do not coach or steer the reviewer.
4. **Walk the checklist below with the reviewer reading aloud.** Capture
   exact quotes where possible — those become the evidence trail.

## Checklist

For each item, record one of: ✅ clear, ◐ partially clear, ✗ unclear.

| # | Question | Outcome |
|---|----------|--------|
| 1 | Within ten seconds of arrival, can the reviewer name what they're looking at? | ✅ |
| 2 | Can they explain what one node represents (without using software jargon)? | ✅ |
| 3 | Can they describe what a *line* between two nodes means? | ✅ |
| 4 | Can they read the outcome statement of the active manifold from the page? | ✅ |
| 5 | Can they switch to a different manifold and tell that switch happened? | ✅ |
| 6 | Given a node selected on the graph, can they find the matching narrative section? | ✅ |
| 7 | Can they tell a synthesised edge from a native one (or articulate that there's a difference)? | ✗ |
| 8 | Do they think the page would tell them anything useful about a feature they didn't write? | ✅ |

## Recording the evidence

Add an entry to `.manifold/manifold-serve.json` under the RT that maps
to B2 (currently the manifold has B2 as a direct goal; `manual_review`
evidence sits on the constraint itself):

```json
{
  "id": "E-LEG-1",
  "type": "manual_review",
  "path": "docs/manifold-serve/LEGIBILITY-REVIEW.md",
  "verified_by": "human",
  "verified_at": "<ISO date of the review>",
  "status": "VERIFIED",
  "message": "Reviewer: <name/role>. Score: <e.g. 7/8 clear, 1 partial>. Notes: <one-sentence summary>."
}
```

If three or more checklist items are ✗ unclear, B2 fails — open a
follow-up issue and re-verify after changes ship.

## When to re-run

- After any change to `cli/web/src/components/`.
- After any change to graph synthesis (`cli/lib/graph-synthesis.ts`) that
  alters which edges appear.
- After every major version bump of the CLI (semver minor or higher).

## Why this exists rather than a unit test

B2 measures whether the *story the visualiser tells* lands with people
outside engineering. That is a property of human cognition, not of code,
so the appropriate evidence type is `manual_review`. The structured
protocol reduces variance between reviews and keeps the evidence trail
auditable.
