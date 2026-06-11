# Fixture: audit-log-integrity

> Held-out test feature for the prompt-optimization loop. Throwaway sandbox feature.

## Outcome (verbatim — trusted, re-injected unchanged every round)
An append-only audit log where no past entry can be altered or deleted undetectably, every
entry is attributable to an actor, and the log remains queryable under 200ms for the last 90 days.

## Seed brief (domain context for m1)
- Compliance requires tamper-evidence: any mutation of historical rows must be detectable.
- Writes come from many services concurrently; ordering within an actor must be preserved.
- Storage is shared with other systems; DB admins technically have UPDATE/DELETE rights.
- Retention is 7 years cold, 90 days hot; queries hit the hot tier.

## Seeded gaps (for m5/m6 recall scoring)
- m5 should flag: tamper-evidence asserted via a hash-chain column but with no test that a mutated historical row is actually detected (chain verification never exercised) ⇒ PARTIAL.
- m6 should flag: a `hash_chain` / signature computed on write but no verification step wired into any read/audit path (chain written but never checked).
