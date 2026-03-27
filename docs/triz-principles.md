# TRIZ Inventive Principles Reference

Reference for constraint tension resolution in Manifold's m2-tension phase.
Each principle includes a plain-language definition, software application note,
life/strategy application note, key question, and tier rating.

## Tier System

| Tier | Meaning | Usage in Manifold |
|------|---------|-------------------|
| **A** | Strong abstract analog -- applies broadly | Always surface in m2-tension |
| **B** | Moderate analog -- domain-dependent | Surface with context note |
| **C** | No strong abstract analog -- engineering-specific | Never surface in non-engineering contexts (B2) |

## Parameter Pair Lookup Table

Use this table to find principles for specific tension patterns:

| Parameters in Conflict | Tier A/B Principles |
|------------------------|---------------------|
| Performance vs. Reliability | P10, P25, P35 |
| Speed vs. Safety | P10, P24, P35 |
| Simplicity vs. Capability | P1, P15, P35 |
| Cost vs. Quality | P1, P10, P27 |
| Flexibility vs. Consistency | P1, P15, P40 |
| Privacy vs. Usability | P1, P10, P24 |
| Autonomy vs. Control | P10, P15, P35 |
| Speed vs. Correctness | P10, P11, P25 |
| Global vs. Local optimum | P3, P1, P17 |
| Standardisation vs. Flexibility | P1, P15, P3 |

---

## Principles

### P1: Segmentation

**Tier:** A

**Definition:** Divide a system into independent parts.

**Software application:** Microservices, modular design, separation of concerns -- break monoliths into independently deployable units.

**Life/strategy application:** Break a large decision into independent sub-decisions that can be evaluated and changed separately.

**Key question:** Can this be divided so parts can change independently?

### P2: Taking out / Extraction

**Tier:** A

**Definition:** Separate the disturbing part from the useful part.

**Software application:** Extract cross-cutting concerns (logging, auth, validation) away from business logic into dedicated modules.

**Life/strategy application:** Isolate the problematic element from the valuable whole so each can be addressed on its own terms.

**Key question:** What single element is causing the problem?

### P3: Local quality

**Tier:** A

**Definition:** Transition from homogeneous to heterogeneous structure.

**Software application:** Use different strategies for different contexts -- different databases for different access patterns, different caching policies per endpoint.

**Life/strategy application:** Apply different rules to different situations instead of one-size-fits-all policies.

**Key question:** Does every part need the same treatment?

### P4: Asymmetry

**Tier:** B

**Definition:** Replace symmetrical design with asymmetrical.

**Software application:** Asymmetric encryption, read/write replicas, CQRS patterns where read and write paths have different optimizations.

**Life/strategy application:** Don't treat all sides equally if their needs differ -- allocate resources proportionally to impact.

**Key question:** Does symmetry actually serve us here?

### P5: Merging

**Tier:** A

**Definition:** Combine identical or similar operations.

**Software application:** Batch processing, connection pooling, request coalescing, combining similar API calls into a single round-trip.

**Life/strategy application:** Combine similar activities for efficiency -- batch errands, consolidate meetings on the same topic.

**Key question:** Can similar operations be consolidated?

### P6: Universality

**Tier:** B

**Definition:** Make a part perform multiple functions.

**Software application:** Middleware that handles auth, logging, and rate-limiting; unified interfaces that serve multiple consumers.

**Life/strategy application:** Multi-purpose tools and roles that reduce overhead and simplify coordination.

**Key question:** Can one component serve multiple purposes?

### P7: Nested doll

**Tier:** B

**Definition:** Place one object inside another.

**Software application:** Nested data structures, recursive composition, middleware chains, decorator patterns.

**Life/strategy application:** Embed one solution inside another -- layered strategies where each layer adds protection or capability.

**Key question:** Can solutions be nested or layered?

### P8: Anti-weight / Counterbalance

**Tier:** B

**Definition:** Compensate for weight with aerodynamic lift.

**Software application:** Load balancing, compensating transactions, offset negative effects with automatic corrective actions.

**Life/strategy application:** Counterbalance a negative with a corresponding positive -- pair risk with mitigation.

**Key question:** What counterforce could balance this?

### P9: Preliminary anti-action

**Tier:** B

**Definition:** Perform a preliminary counteraction.

**Software application:** Input validation, pre-flight checks, schema validation before processing, dry-run modes.

**Life/strategy application:** Anticipate and neutralize objections or problems in advance before they manifest.

**Key question:** What pre-emptive action prevents the problem?

### P10: Prior action

**Tier:** A

**Definition:** Perform required changes in advance.

**Software application:** Pre-computation, caching, lazy initialization, database indexing, warm-up routines.

**Life/strategy application:** Prepare before the critical moment -- do the hard thinking before the deadline, not during it.

**Key question:** What can be done beforehand to simplify the critical moment?

### P11: Beforehand cushioning

**Tier:** A

**Definition:** Prepare emergency means in advance.

**Software application:** Circuit breakers, fallbacks, graceful degradation, backup systems, disaster recovery plans.

**Life/strategy application:** Have a Plan B ready before you need it -- prepare for failure while things are still working.

**Key question:** What happens if the primary path fails?

### P12: Equipotentiality

**Tier:** B

**Definition:** Minimize the need for raising or lowering.

**Software application:** Level APIs, reduce privilege escalation, design flat permission models, minimize state transitions.

**Life/strategy application:** Design so that no step requires a large jump -- smooth out transitions and reduce barriers.

**Key question:** Can we eliminate the need for big transitions?

### P13: The other way round

**Tier:** A

**Definition:** Invert the process or approach.

**Software application:** Push vs pull, event-driven vs polling, inversion of control, dependency injection.

**Life/strategy application:** Reverse the assumption -- instead of going to the problem, make the problem come to you.

**Key question:** What if we did the opposite?

### P14: Spheroidality / Curvature

**Tier:** B

**Definition:** Move from linear to curved approach.

**Software application:** Non-linear retry backoff (exponential), curved utility functions, logarithmic scaling.

**Life/strategy application:** Use graduated or curved approaches instead of linear -- diminishing returns suggest a curved model.

**Key question:** Is a linear approach actually optimal?

### P15: Dynamization

**Tier:** A

**Definition:** Allow characteristics to change to find optimal operating conditions.

**Software application:** Feature flags, A/B testing, adaptive algorithms, runtime configuration, auto-tuning.

**Life/strategy application:** Make rigid rules flexible and context-dependent -- allow policies to adapt as conditions change.

**Key question:** Can this be made adaptive rather than fixed?

### P16: Partial or excessive action

**Tier:** B

**Definition:** If 100% is hard, try slightly less or more.

**Software application:** Over-provisioning, approximate computing, eventual consistency, probabilistic data structures.

**Life/strategy application:** An 80% solution now beats a 100% solution later -- accept good enough when perfect is prohibitively expensive.

**Key question:** Is perfect the enemy of good enough?

### P17: Another dimension

**Tier:** A

**Definition:** Move to a different conceptual plane.

**Software application:** Add a caching layer, use a message queue, introduce an abstraction layer, move from synchronous to asynchronous.

**Life/strategy application:** Reframe the problem from a different perspective -- step outside the current plane of thinking.

**Key question:** Are we stuck because we're only thinking in one dimension?

### P18: Mechanical vibration

**Tier:** C

**Definition:** Use oscillation.

**Software application:** No strong analog in software or system design.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P19: Periodic action

**Tier:** B

**Definition:** Replace continuous with periodic action.

**Software application:** Batch jobs, polling intervals, scheduled maintenance, cron-based processing, periodic garbage collection.

**Life/strategy application:** Use intervals and rhythms instead of continuous effort -- sprints, review cycles, periodic reflection.

**Key question:** Would periodic bursts work better than continuous action?

### P20: Continuity of useful action

**Tier:** B

**Definition:** Carry on work without pauses.

**Software application:** Streaming, pipelines, continuous deployment, zero-downtime deployments, hot reloading.

**Life/strategy application:** Eliminate unnecessary interruptions -- design workflows that maintain momentum.

**Key question:** Can we eliminate idle time between steps?

### P21: Skipping / Rushing through

**Tier:** B

**Definition:** Conduct a process at high speed.

**Software application:** Fail-fast, short-circuit evaluation, quick rejection of invalid inputs, fast-path optimizations.

**Life/strategy application:** Move through risky or uncomfortable phases quickly -- don't linger in danger zones.

**Key question:** Can we go faster through the dangerous part?

### P22: Blessing in disguise

**Tier:** A

**Definition:** Use harmful factors to obtain positive effect.

**Software application:** Use error rates as signals for improvement, turn failures into learning (chaos engineering), use load spikes to trigger auto-scaling improvements.

**Life/strategy application:** Turn constraints into creative advantages -- limitations often force better solutions.

**Key question:** Can the problem itself become the solution?

### P23: Feedback

**Tier:** B

**Definition:** Introduce feedback loops.

**Software application:** Monitoring, observability, user analytics, health checks, A/B test results feeding back into decisions.

**Life/strategy application:** Create mechanisms to learn from results -- ensure actions produce measurable, observable outcomes.

**Key question:** How will we know if this is working?

### P24: Intermediary

**Tier:** A

**Definition:** Use an intermediary object or process.

**Software application:** Proxy, adapter, message broker, API gateway, anti-corruption layer, middleware.

**Life/strategy application:** Use a mediator or intermediary to absorb complexity and decouple parties.

**Key question:** Can an intermediary absorb the conflict?

### P25: Self-service

**Tier:** A

**Definition:** Make an object serve itself.

**Software application:** Self-healing systems, auto-scaling, self-documenting code, self-registering services, automated recovery.

**Life/strategy application:** Design things to maintain themselves -- reduce the need for external intervention.

**Key question:** Can this maintain or improve itself without intervention?

### P26: Copying

**Tier:** B

**Definition:** Use simple, inexpensive copies.

**Software application:** Read replicas, caching copies, shadow traffic, blue-green deployments, staging environments.

**Life/strategy application:** Test with copies before committing to the original -- prototype, simulate, rehearse.

**Key question:** Can we test on a copy first?

### P27: Cheap short-living objects

**Tier:** A

**Definition:** Replace expensive durable with cheap disposable.

**Software application:** Containers, ephemeral infrastructure, throwaway prototypes, serverless functions, immutable deployments.

**Life/strategy application:** Use cheap experiments instead of expensive commitments -- test hypotheses with minimal investment.

**Key question:** Can we use something disposable instead of permanent?

### P28: Mechanics substitution

**Tier:** B

**Definition:** Replace mechanical interaction with other fields.

**Software application:** Replace synchronous with asynchronous, polling with events, RPC with message queues, pull with push.

**Life/strategy application:** Change the mechanism of interaction -- find a fundamentally different channel or medium.

**Key question:** Is there a fundamentally different way to achieve this interaction?

### P29: Pneumatics and hydraulics

**Tier:** C

**Definition:** Use gas or liquid parts.

**Software application:** No strong analog in software or system design.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P30: Flexible shells and thin films

**Tier:** C

**Definition:** Use flexible shells.

**Software application:** No strong analog in software or system design.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P31: Porous materials

**Tier:** C

**Definition:** Make an object porous.

**Software application:** No strong analog in software or system design.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P32: Color changes

**Tier:** C

**Definition:** Change color or transparency.

**Software application:** Weak analog -- UI theming, dark mode, visual state indicators, transparency in logging and observability.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P33: Homogeneity

**Tier:** C

**Definition:** Make interacting objects of same material.

**Software application:** Weak analog -- type consistency, uniform data formats, shared protocols between interacting systems.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P34: Discarding and recovering

**Tier:** B

**Definition:** Make portions disappear after use.

**Software application:** Garbage collection, temp files, ephemeral tokens, TTL-based caches, auto-expiring sessions.

**Life/strategy application:** Use temporary resources that clean up automatically -- design for natural expiration.

**Key question:** Can this be designed to clean up after itself?

### P35: Parameter changes

**Tier:** A

**Definition:** Change the state or operating parameters.

**Software application:** Configuration over code, environment variables, runtime tuning, feature flags that change behavior without deployments.

**Life/strategy application:** Change the conditions rather than the thing itself -- alter the environment to shift outcomes.

**Key question:** Can we change the environment instead of the object?

### P36: Phase transitions

**Tier:** C

**Definition:** Use phenomena during phase transitions.

**Software application:** No strong analog in software or system design.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P37: Thermal expansion

**Tier:** C

**Definition:** Use thermal expansion or contraction.

**Software application:** No strong analog in software or system design.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P38: Strong oxidants

**Tier:** C

**Definition:** Replace common environment with enriched.

**Software application:** Weak analog -- enriched runtime environments, enhanced execution contexts, augmented toolchains.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P39: Inert atmosphere

**Tier:** C

**Definition:** Replace normal with inert environment.

**Software application:** Weak analog -- sandboxing, isolated execution environments, containerized security boundaries.

**Life/strategy application:** No strong analog outside engineering contexts.

**Key question:** N/A for non-engineering.

### P40: Composite materials

**Tier:** A

**Definition:** Replace homogeneous with composite.

**Software application:** Polyglot persistence, multi-model databases, hybrid architectures combining different paradigms for different strengths.

**Life/strategy application:** Combine different approaches for synergy -- blend methodologies rather than committing to one.

**Key question:** Can combining different approaches outperform a single one?
