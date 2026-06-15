# Fixture: distributed-lock

> Held-out test feature for the prompt-optimization loop. Throwaway sandbox feature.

## Outcome (verbatim — trusted, re-injected unchanged every round)
A distributed lock that guarantees at most one holder at a time across a cluster, never
deadlocks if a holder crashes, and releases automatically within a bounded lease window.

## Seed brief (domain context for m1)
- Holders can crash or partition away while holding the lock.
- Clock skew exists between nodes; a lease must not be extended by a slow/paused holder.
- The lock backs a critical section that must never run concurrently (e.g. a billing run).
- Acquisition contention can be high; starvation of any waiter must be bounded.

## Seeded gaps (for m5/m6 recall scoring)
- m5 should flag: a lock tested for acquire/release but with no test for the holder-crash / lease-expiry path is PARTIAL for "never deadlocks if a holder crashes."
- m6 should flag: a fencing-token check generated but the protected critical-section code never validates the token before proceeding (token issued but never enforced).
