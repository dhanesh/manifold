# Fixture: payment-idempotency

> Held-out test feature for the prompt-optimization loop. Throwaway — the loop runs
> m1–m6 against this in a sandbox dir; nothing here is real product code.

## Outcome (verbatim — trusted, re-injected unchanged every round)
A payment-capture endpoint that NEVER double-charges a card under client retries, network
partitions, or duplicate webhook deliveries, while keeping p99 capture latency under 400ms.

## Seed brief (domain context for m1)
- Clients retry on 5xx and on timeout; the same logical payment may arrive 2–5 times.
- Upstream PSP is at-least-once on webhooks; the same capture webhook can fire twice.
- Idempotency keys are client-supplied but not always present on legacy clients.
- Regulatory: every capture attempt must leave an immutable audit row.

## Seeded gaps (for m5/m6 recall scoring — judges check these are caught)
- m5 should flag: an idempotency invariant tested only on the happy path (no concurrent-duplicate test) is at most PARTIAL.
- m6 should flag: a new `idempotency` module that is never imported/wired into the capture handler.
