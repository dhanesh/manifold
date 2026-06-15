# Fixture: api-rate-limiter

> Held-out test feature for the prompt-optimization loop. Throwaway sandbox feature.

## Outcome (verbatim — trusted, re-injected unchanged every round)
A per-tenant API rate limiter that never allows a tenant to exceed its quota even across
multiple app instances, returns a correct `Retry-After`, and adds under 5ms p99 overhead.

## Seed brief (domain context for m1)
- The service runs as N horizontally-scaled stateless instances behind a load balancer.
- Quotas differ per tenant tier and can change at runtime.
- A burst must be smoothed, not just hard-capped at a window edge (no double-burst across windows).
- The limiter must fail open or closed by explicit policy, not by accident, if its store is down.

## Seeded gaps (for m5/m6 recall scoring)
- m5 should flag: a limiter tested only against a single instance (no cross-instance/shared-store concurrency test) is at most PARTIAL for the "across multiple instances" invariant.
- m6 should flag: a `RateLimiter` middleware that is implemented but never registered in the request pipeline / router chain.
