# framework-gap-remediation

## Outcome

Address 17 gaps (4 P0, 5 P1, 8 P2) identified in the webhook-kafka-lambda gap analysis by implementing 13 framework recommendations (R1-R13) across three tiers: Framework Integrity, Quality Hardening, and Polish. Target: verification becomes executable (not declarative), test tiers distinguish unit/integration/e2e, and constraint discovery auto-generates sub-constraints for failure cascades, security attack matrices, and external dependency resilience.

---

## Context

### Gap Analysis Source
- **Evaluated manifolds**: webhook-kafka-lambda (29 constraints, 8 tensions, 37 artifacts), local-dev-environment (22 constraints, 5 tensions, 12 artifacts)
- **Both marked**: VERIFIED at 100% — but analysis revealed verification is self-reported, not automated

### Good Points Preserved (GP-1 through GP-8)
- Five-category constraint taxonomy (thorough coverage)
- Tension analysis surfacing real architectural decisions
- Backward reasoning (Required Truths) catching infrastructure preconditions
- Solution space with explicit trade-offs
- Artifact-to-constraint traceability
- Two-tier testing as tension resolution
- Auth strategy pattern from constraint + tension analysis
- DLQ fallback from tension analysis

### Key Metrics (Current → Target)
| Metric | Current | Target |
|--------|---------|--------|
| Constraints with test evidence | 19/29 (66%) | 25/29 (86%) |
| Integration test classes | 3 | 5 (+Kafka, +Failover) |
| Constraints verified by automation | 0/29 (0%) | 29/29 (100%) |
| Tension resolutions with testable criteria | 0/8 (0%) | 8/8 (100%) |
| Post-verification drift detection | None | File hash comparison |

---

## Constraints

### Business

#### B1: Verification Must Be Executable, Not Declarative

The m5-verify phase must produce verification results by executing real checks — running test suites, checking file existence on disk, and confirming constraint traceability annotations — not by self-reporting from the same AI agent that generated the code.

> **Rationale:** GAP-01 revealed that verify.json claims "artifacts_exist: 37" and "test_count: 126" but no automated step actually ran tests or checked files. The 100% metric is unfalsifiable. Self-reported verification defeats the purpose of a verification phase entirely.

**Addresses:** GAP-01 (P0), R1

#### B2: Satisfaction Scores Must Reflect Weakest Evidence Tier

The overall constraint satisfaction score must reflect the weakest evidence tier across all constraints, not just count satisfied/total. An invariant-type constraint with "test: false" must NOT count as SATISFIED.

> **Rationale:** GAP-05 found 10 of 29 constraints marked SATISFIED with "test: false" — including O5 with BOTH "code: false" AND "test: false." The "29/29 SATISFIED" metric creates false confidence when 34% of constraints lack test evidence.

**Addresses:** GAP-05 (P1), R1

#### B3: Constraint-to-Test Traceability Matrix

Verification must produce a machine-readable traceability matrix mapping each constraint ID to the specific test functions that validate it, parsed from docstring/comment annotations.

> **Rationale:** GAP-12 found no programmatic way to answer "which tests validate constraint S3?" — auditing requires manual code search. Traceability must be bidirectional: constraint → tests AND test → constraints.

**Addresses:** GAP-12 (P2), R1

---

### Technical

#### T1: Verify --execute Must Run Test Suite

The `m5-verify --execute` (or `--run-tests`) flag must invoke the project's test runner (pytest, bun test, etc.), capture pass/fail results per test function, and map results to constraints via annotation parsing. File existence checks must use `stat`, not self-assertion.

> **Rationale:** GAP-01 core fix. The evidence module already has a `TestPassesVerifier` that checks test name existence in files, but it doesn't actually execute tests unless `--run-tests` is passed. This must be the default behavior for `--execute` mode.

**Addresses:** GAP-01 (P0), R1

#### T2: Test Evidence Classified by Tier

The verification matrix must classify each piece of test evidence as `unit`, `integration`, or `e2e`. This tier classification must be stored in the verify.json output alongside the existing pass/fail status.

> **Rationale:** GAP-02 showed that B4 (zero message loss) was marked "test: true" based on a fully mocked test. Mocked tests prove code structure, not runtime behavior. Without tier classification, "test: true" conflates unit and integration coverage.

**Addresses:** GAP-02 (P0), R2

#### T3: External-System Constraints Require Integration-Tier Minimum

Constraints that reference external systems (databases, message queues, HTTP endpoints, cloud services) must have at least one integration-tier test to be marked SATISFIED. Unit-only coverage downgrades to PARTIAL.

> **Rationale:** GAP-03 revealed the core feature (produce to Kafka) had zero integration test coverage — only fully mocked unit tests. GAP-04 found the DLQ failover path was also untested against real infrastructure. External-system constraints with only mocked tests create false confidence.

**Addresses:** GAP-02 (P0), GAP-03 (P0), GAP-04 (P0), R2, R3

#### T4: Core Data Path Analysis During Constraint Discovery

The m1-constrain phase must identify the primary data flow (e.g., webhook → auth → Kafka → response) and require integration test constraints for each transition point AND each fallback path in that flow.

> **Rationale:** GAP-03/GAP-04 showed that without explicit data path analysis, the core function (produce to Kafka) and its safety net (DLQ failover) had no integration tests despite 29 constraints and 126 unit tests. The framework discovered individual constraints but missed the end-to-end flow.

**Addresses:** GAP-03 (P0), GAP-04 (P0), R3

#### T5: Failure Cascade Analysis During Tension Resolution

When m2-tension identifies a fallback resolution (e.g., "Kafka fails → DLQ"), the framework must recursively ask "What if the fallback fails?" until reaching an explicit terminal decision: accept-loss, human-intervention, or circuit-breaker.

> **Rationale:** GAP-06 found that B4 says "zero message loss" and O2 provides DLQ fallback, but no constraint addresses simultaneous Kafka + SQS failure. The handler catches the exception and silently logs — directly contradicting B4. Fallback chains must be recursively analyzed.

**Addresses:** GAP-06 (P1), R4

#### T6: Tension Resolutions Declare Testable Validation Criteria

Each resolved tension must include a `validation_criteria` field specifying how to programmatically verify the resolution was correctly implemented. During m5-verify, these criteria are checked.

> **Rationale:** GAP-08 found all 8 tensions marked "resolved" but the verify phase never confirmed implementation correctness. TN6 specified "Strategy pattern" — the code had it, but this was coincidence, not verification. Design decisions must be validated as implementation facts.

**Addresses:** GAP-08 (P1), R6

#### T7: Post-Verification Drift Detection

The m5-verify phase must record SHA-256 hashes of all verified artifact files. A `manifold drift` CLI command must compare current hashes against recorded hashes and report which constraints are affected by modified files.

> **Rationale:** GAP-07 found handler.py was modified 2 days after verification, but verify.json was never updated. Without drift detection, the manifold becomes a historical snapshot. The evidence module already has `checkEvidenceStaleness()` comparing mtime — this extends it to all artifacts.

**Addresses:** GAP-07 (P1), R5

---

### User Experience

#### U1: Four-Level Satisfaction Granularity

Constraint satisfaction must be reported at four levels: `DOCUMENTED` (constraint exists in manifold), `IMPLEMENTED` (code artifact exists), `TESTED` (test evidence exists), `VERIFIED` (test passes with correct tier). Invariant-type constraints must reach TESTED minimum to count toward satisfaction.

> **Rationale:** GAP-05 showed the current binary satisfied/not-satisfied obscures real coverage. 10 constraints had "test: false" yet showed SATISFIED. With granular levels, users see exactly where each constraint stands — and invariants can't skip testing.

**Addresses:** GAP-05 (P1), R1

#### U2: Artifact Substantiveness Classification

Artifact counts in verification output must separate "substantive" artifacts (containing logic, assertions, or configuration) from "structural" artifacts (boilerplate like `__init__.py`, re-exports, empty configs). Only substantive artifacts count toward satisfaction metrics.

> **Rationale:** GAP-13 found the manifold claimed 37 artifacts, counting `__init__.py` files and boilerplate. `src/auth/__init__.py` was listed as satisfying RT-4. Removing boilerplate leaves ~25 substantive artifacts. Inflated counts create false confidence.

**Addresses:** GAP-13 (P2), R10

---

### Security

#### S1: Crypto Constraints Auto-Generate Attack Test Matrices

When m1-constrain discovers constraints involving cryptographic operations (HMAC, JWT, digital signatures, encryption), the framework must auto-generate a security test matrix covering: algorithm confusion, expired tokens/signatures, forged signatures, missing claims, timing attacks, and replay attacks.

> **Rationale:** GAP-09 found no JWT algorithm confusion test despite oauth_auth.py passing algorithms to `jwt.decode()`. The defense is an assumption about library behavior, not a verified fact. Algorithm confusion is OWASP-listed. Crypto constraints need standardized adversarial test coverage.

**Addresses:** GAP-09 (P1), R7

#### S2: IP-Based Constraints Auto-Generate Standard Test Matrices

When m1-constrain discovers IP-based access control constraints, the framework must auto-generate test matrices covering: exact match, CIDR ranges, IPv6 addresses, IPv4-mapped IPv6 (`::ffff:x.x.x.x`), loopback, and unspecified addresses.

> **Rationale:** GAP-15 found no test for IPv4-mapped IPv6 behavior despite the IP whitelist handler depending on Python's `ipaddress` module. Untested security assumptions are bypass vectors.

**Addresses:** GAP-15 (P2), R7

#### S3: Resource Exhaustion Checklist in Security Discovery

The m1-constrain security category must include a standard checklist question: "Can unauthenticated or low-privilege requests cause unbounded resource consumption?" This surfaces negative-caching gaps, enumeration attacks, and cost-amplification vectors.

> **Rationale:** GAP-10 found config.py caches successful provider lookups but not negative results. Unknown provider IDs hit DynamoDB every time — enabling cost amplification at $1.25/million reads. The constraint discovery process didn't ask about resource exhaustion.

**Addresses:** GAP-10 (P2), R8

---

### Operational

#### O1: External HTTP Dependency Resilience Sub-Constraints

When m1-constrain discovers constraints involving external HTTP dependencies (JWKS endpoints, OAuth providers, third-party APIs), the framework must auto-generate sub-constraints for: configurable timeout, circuit breaker, cached fallback, and failure isolation (one dependency failure must not block others).

> **Rationale:** GAP-11 found oauth_auth.py fetches JWKS with hardcoded 10s timeout, no circuit breaker, no retry. A slow JWKS endpoint can exhaust Lambda concurrency, causing DoS for ALL providers — not just the OAuth one.

**Addresses:** GAP-11 (P2), R9

#### O2: Data Format References Auto-Generate Input Validation Constraints

When constraints reference data formats ("any valid JSON", "XML payload", "CSV upload"), the framework must auto-generate input validation sub-constraints: Content-Type checking, encoding validation, size limits, and malformed input handling.

> **Rationale:** GAP-14 found B1 says "accept any valid JSON" but the handler parses any content type as JSON without Content-Type header validation. Data format mentions in constraints should trigger explicit validation requirements.

**Addresses:** GAP-14 (P2), R11

#### O3: Cache Constraints Auto-Generate Invalidation Sub-Constraints

When constraints involve caching (TTL-based, LRU, memoization), the framework must auto-generate sub-constraints for invalidation triggers beyond TTL: on-failure refresh, forced invalidation API, and graceful degradation during cache miss storms.

> **Rationale:** GAP-16 found JWKS cache has 5-minute TTL but no forced invalidation. During key rotation, valid OAuth webhooks are rejected for up to 5 minutes — violating S6 (rotation without downtime). Cache constraints must address invalidation, not just TTL.

**Addresses:** GAP-16 (P2), R12

#### O4: Shared-State Constraints Auto-Generate Concurrency Test Requirements

When constraints involve shared mutable state (singletons, module-level caches, connection pools, thread-local storage), the framework must auto-generate concurrency test requirements covering: race conditions, concurrent access patterns, and thread-safety validation.

> **Rationale:** GAP-17 found module-level `_producer` singleton and `_cache` dict are shared state with no concurrency tests. Lambda can process concurrent requests in the same execution environment. Race conditions on shared state cause silent failures.

**Addresses:** GAP-17 (P2), R13

---

## Tensions

### TN1: Verification Thoroughness vs Execution Speed

**Between:** B1 (executable verification) ↔ T1 (run test suite)

Running full test suites + file existence checks + annotation parsing + traceability matrix generation makes `m5-verify --execute` significantly slower than the current declarative verification. A pytest suite with 126 tests + integration tests could take 30-60s. Users accustomed to instant verification may resist.

> **Resolution:** Tiered execution. Two modes: (1) `m5-verify` default does real file existence checks + annotation parsing + staleness detection (~2s, replaces self-reported approach); (2) `m5-verify --execute` adds full test suite execution with results mapped to constraints. Both produce the same verify.json schema. B1 (invariant) is satisfied by default mode doing real checks. T1 is satisfied via `--execute`. Decision: A.

### TN2: 4-Level Satisfaction vs Backward Compatibility

**Between:** U1 (4-level satisfaction) ↔ B2 (weakest-tier scoring)

U1 introduces `DOCUMENTED → IMPLEMENTED → TESTED → VERIFIED` levels. B2 says scores must reflect the weakest tier. Together, they would retroactively downgrade existing manifolds — a webhook-kafka-lambda with 29/29 SATISFIED would drop to ~19/29 TESTED. This breaks backward compatibility and invalidates prior verification work.

> **Resolution:** Parallel reporting with opt-in enforcement. Legacy view keeps existing satisfied/partial/not_addressed counts unchanged. New `satisfaction_levels` section in verify.json shows per-constraint granularity, displayed via `--levels` flag. Invariant TESTED-minimum enforcement opt-in via `--strict-levels` until next major version. Schema adds optional `satisfaction_levels` — no existing fields change. Decision: B.

### TN3: Auto-Generated Sub-Constraints vs Manifold Simplicity

**Between:** S1 (crypto matrices) ↔ S2 (IP matrices) ↔ O1 (HTTP resilience) ↔ O2 (input validation) ↔ O3 (cache invalidation) ↔ O4 (concurrency tests)

Six constraints (S1, S2, O1-O4) add auto-generation during m1-constrain. A single JWT + caching + external HTTP constraint could auto-generate 15+ sub-constraints. For simple features, this bloats the manifold and overwhelms users. The gap analysis found real issues in a 29-constraint enterprise system — but a simple CRUD API shouldn't get the same treatment.

> **Resolution:** Suggested section with explicit promotion. Auto-generated sub-constraints go into a `## Suggested Constraints` markdown section (and optional `suggested_constraints` JSON array). Not counted toward totals until user promotes them. Complex features: user reviews and promotes relevant ones. Simple features: user skips. Preserves discoverability while respecting user agency. Decision: C.

### TN4: Test Runner Detection vs Framework Language-Agnosticism

**Between:** T1 (run test suite) ↔ T2 (tier classification)

T1 requires invoking the project's test runner. T2 requires classifying tests by tier. But Manifold is language-agnostic — it works with Python (pytest), TypeScript (bun test), Go (go test), etc. The framework can't hardcode `pytest` or `bun test`. It also can't auto-detect test tier (unit vs integration) without language-specific heuristics.

> **Resolution:** Convention + config. Test runner auto-detected from project files (pyproject.toml → pytest, package.json with bun → bun test, Makefile → make test), override via `.manifold/config.json` `test_runner` field. Tier classification is convention-based: files matching `*integration*`, `*e2e*`, `test_local*` → integration/e2e, else unit. Override via `test_tier_patterns` config. Decision: A.

### TN5: Drift Detection Sensitivity vs Development Noise

**Between:** T7 (drift detection) ↔ U1 (user experience)

T7 records file hashes at verification time and flags modified files. During active development, files change constantly — drift detection would fire on every edit, creating alert fatigue. But without it, post-verification changes go unnoticed (GAP-07).

> **Resolution:** Explicit command, optional hook. Drift detection is on-demand only via `manifold drift <feature>`, not automatic. Optional git pre-commit hook template provided in `install/hooks/`. The `manifold status` command shows a brief drift indicator (e.g., "3 files modified since verification") without blocking. Decision: A.

### TN6: Implementation Dependency Chain (Hidden)

**Between:** T2 (tier classification) → T3 (integration minimum) → B2 (weakest-tier scores) → U1 (4-level satisfaction)

These four constraints form a dependency chain: T2 must exist first (tier classification infrastructure), T3 requires T2 (can't enforce integration minimum without tier data), U1 requires T2 (TESTED vs VERIFIED needs tier info), B2 requires U1 (can't reflect weakest tier without granular levels). Implementing out of order creates inconsistency.

> **Resolution:** Strict dependency-order implementation: T2 → T3 → U1 → B2. Ship T2 first (schema + evidence module), then T3 enforcement, then U1 reporting, then B2 scoring. Schema changes ship in order: (1) `test_tier` on EvidenceRefSchema, (2) `satisfaction_level` on verify output, (3) scoring algorithm change. T2 is the critical path.

---

## Required Truths

### RT-1: Evidence Module Can Execute Actual Test Suites

For B1 (executable verification) and T1 (run test suite) to be satisfied, the evidence module must invoke external test runners as subprocesses — not just check for test name strings in files.

**Current state:** PARTIAL. `TestPassesVerifier` in `cli/lib/evidence.ts` exists but only does `content.includes(testName)` — a string search, not execution. Comment in code: "Full test execution would require spawning a test runner." The `--run-tests` flag is wired through but has no subprocess implementation.

**Gap:** Need subprocess invocation (`Bun.spawn` or `child_process`) that invokes the detected test runner, captures per-test pass/fail, and maps results to constraint IDs via annotations.

### RT-2: Schema Supports Additive Optional Fields

For T2 (test_tier), T6 (validation_criteria), T7 (file_hash), and U2 (artifact_class) to be added, the Zod schemas must accept new optional fields without breaking validation of existing manifolds.

**Current state:** PARTIAL. `EvidenceRefSchema` uses strict `.object()` — unknown fields would be stripped or rejected. `IterationSchema` already uses `.passthrough()`. `ArtifactRefSchema` also strict. Need consistency.

**Gap:** Either add `.passthrough()` to EvidenceRefSchema, ArtifactRefSchema, and TensionRefSchema, or explicitly add the new optional fields. Explicit addition is safer (validates types) and preferred.

### RT-3: Project-Level Config File Exists

For TN4 resolution (test runner detection + tier patterns) to work, a `.manifold/config.json` must be loadable with project-level settings.

**Current state:** NOT_SATISFIED. No config file concept exists in the codebase. No loader, no schema, no references. Only `.parallel.yaml` exists for parallel execution config (different system).

**Gap:** Design config schema (`{ "test_runner": "bun test", "test_tier_patterns": {...}, "drift_hooks": [...] }`), implement loader in parser/CLI, integrate with evidence and verify modules.

### RT-4: Constraint Annotation Parsing Extracts Traceability

For B3 (traceability matrix) to be produced, the framework must parse `// Satisfies: B1` annotations from source files and map them to constraint IDs.

**Current state:** NOT_SATISFIED. No annotation parsing code exists anywhere. `ContentMatchVerifier` does regex matching but is generic — not constraint-ID-aware. The codebase uses `// Satisfies: B1` format in documentation but never parses it programmatically.

**Gap:** Build annotation parser (regex: `Satisfies:\s*([BTUSO]\d+(?:,\s*[BTUSO]\d+)*)`) that scans artifact files, extracts constraint references, and builds the bidirectional traceability map.

### RT-5: File Hash Infrastructure Supports Drift Detection

For T7 (drift detection) to work, the verify output must record content hashes and a CLI command must compare them against current file state.

**Current state:** PARTIAL. `checkEvidenceStaleness()` in `cli/lib/evidence.ts` compares file `mtime` against `evidence.verified_at` timestamp — proves the infrastructure pattern exists. But it's timestamp-based (unreliable across git operations) and only covers evidence files, not all artifacts.

**Gap:** Add SHA-256 content hashing to artifact verification. Store hashes in verify.json. Implement `manifold drift <feature>` CLI command that compares stored vs. current hashes.

### RT-6: Skill Files Support Auto-Generation Guidance

For constraint discovery improvements (S1-S3, O1-O4, T4, T5) to work, the m1-constrain and m2-tension skill files must contain dynamic guidance patterns — checklists, templates, and conditional prompts based on detected constraint keywords.

**Current state:** PARTIAL. `m1-constrain.md` has static interview questions per category. `m2-tension.md` has tension type definitions and auto-deps keyword detection. But no security attack matrix templates, no data path analysis guidance, no failure cascade recursive prompts, no resource exhaustion checklists.

**Gap:** Add to m1-constrain: security checklist (crypto → attack matrix, IP → test matrix, resources → exhaustion check), data path analysis section, external dependency resilience prompts, cache invalidation prompts, shared-state concurrency prompts. Add to m2-tension: failure cascade analysis section with recursive "what if fallback fails?" template.

### RT-7: Suggested Constraints Staging Area in Schema

For TN3 resolution (auto-generated sub-constraints don't bloat manifolds) to work, the schema must support a `suggested_constraints` array separate from the main constraint lists.

**Current state:** NOT_SATISFIED. No `suggested_constraints` field in `ManifoldStructure`. No concept of constraint suggestions with confidence scores. `recommended_option` exists in anchors but is for solution options, not constraints.

**Gap:** Add `suggested_constraints` array to ManifoldStructure schema (optional, v3-compatible). Each suggestion: `{ "id_hint": "S?", "category": "security", "type": "goal", "source": "auto:crypto_matrix" }`. Content goes in markdown under `## Suggested Constraints` section.

### RT-8: Verify Output Supports Multi-Level Satisfaction

For U1 (4-level satisfaction) and B2 (weakest-tier scoring) to work, the verify.json output must report per-constraint satisfaction at four levels and compute scores reflecting the weakest tier.

**Current state:** NOT_SATISFIED. Current verify.json has `coverage.satisfied/partial/not_addressed` (3-level binary). No per-constraint satisfaction level. Scoring is count-based (`satisfied/total`). The `RequiredTruthStatus` enum has 4 values but they serve a different purpose (truth assessment, not satisfaction level).

**Gap:** Add `satisfaction_levels` section to verify.json with per-constraint `{ "id": "B1", "level": "TESTED", "evidence": [...] }`. Add scoring algorithm that: (1) maps each constraint to its highest achieved level, (2) for invariants, requires TESTED minimum, (3) reports both legacy and granular scores per TN2 resolution.

---

## Solution Space

### Option A: Schema-First (Bottom-Up)

Start with schema foundation, then build features on top.

**Implementation order:**
1. RT-2 (schema extensibility) + RT-7 (suggested constraints schema)
2. RT-3 (config file system)
3. RT-1 (test execution) + RT-4 (annotation parsing) + RT-5 (hashing)
4. RT-6 (skill file updates)
5. RT-8 (multi-level satisfaction)

**Satisfies:** All constraints, all truths.
**Pros:** Clean foundation. All changes validated by schema before behavior ships. No intermediate inconsistency.
**Cons:** Slow to show value — users see schema changes before behavioral improvements. Tier 1 (P0 gaps) not addressed until step 3.
**Complexity:** Medium. **Risk:** Low.

### Option B: Verification-First (Critical Path) ← Recommended

Follow TN6 dependency chain. Address P0 gaps first, deliver highest-value changes early.

**Implementation order:**
1. **RT-2** (schema extensibility) — Add `test_tier`, `validation_criteria`, `file_hash`, `artifact_class` as optional fields
2. **RT-1** (test execution) + **RT-4** (annotation parsing) — Core verification machinery
3. **RT-3** (config) + **RT-5** (hashing) — Test runner config + drift detection
4. **RT-8** (multi-level satisfaction) — 4-level reporting + scoring
5. **RT-6** (skill files) + **RT-7** (suggested constraints) — Discovery improvements

**Satisfies:** All constraints, all truths.
**Pros:** Addresses P0/P1 gaps first (GAP-01 through GAP-07). Follows TN6 dependency order (T2→T3→U1→B2). Each step delivers independently testable value.
**Cons:** Skill file improvements (Tier 2/3 gaps) deferred to last. Suggested constraints system ships after core verification.
**Complexity:** Medium. **Risk:** Low.

### Option C: Tier-Aligned (Match Gap Analysis)

Implement exactly in the order of the original Tier 1/2/3 recommendations.

**Implementation order:**
1. R1-R5 (Tier 1) → RT-1, RT-2, RT-4, RT-5, RT-8, RT-3
2. R6-R9 (Tier 2) → RT-6 (partial), RT-7
3. R10-R13 (Tier 3) → RT-6 (remainder)

**Satisfies:** All constraints, all truths.
**Pros:** Matches original prioritization exactly. Clear milestone per tier. Easy to communicate progress.
**Cons:** Doesn't respect TN6 dependency order perfectly — RT-8 (satisfaction levels) implemented in Tier 1 before RT-2 (schema) is fully stable. Interleaves schema and behavior changes.
**Complexity:** Medium-High. **Risk:** Medium (dependency ordering).

---

## Gap-to-Recommendation Traceability

### Tier 1: Framework Integrity (P0 + P1)
| Rec | Description | Gaps | Effort | Constraints |
|-----|-------------|------|--------|-------------|
| R1 | Automated verification (run tests, check files, map to constraints) | GAP-01, GAP-05, GAP-12 | High | B1, B2, B3, T1, U1 |
| R2 | Test tier classification (unit/integration/e2e) | GAP-02, GAP-03, GAP-04 | Medium | T2, T3 |
| R3 | Core data path analysis during constraint discovery | GAP-03, GAP-04 | Medium | T3, T4 |
| R4 | Failure cascade analysis in tension resolution | GAP-06 | Low | T5 |
| R5 | Post-verification drift detection (file hashes) | GAP-07 | Medium | T7 |

### Tier 2: Quality Hardening (P1 + P2)
| Rec | Description | Gaps | Effort | Constraints |
|-----|-------------|------|--------|-------------|
| R6 | Tension resolution verification (testable criteria) | GAP-08 | Medium | T6 |
| R7 | Security attack matrix generation | GAP-09, GAP-15 | Medium | S1, S2 |
| R8 | Resource exhaustion checklist | GAP-10 | Low | S3 |
| R9 | External dependency resilience sub-constraints | GAP-11 | Low | O1 |

### Tier 3: Polish (P2)
| Rec | Description | Gaps | Effort | Constraints |
|-----|-------------|------|--------|-------------|
| R10 | Artifact substantiveness classification | GAP-13 | Low | U2 |
| R11 | Input validation constraint derivation | GAP-14 | Low | O2 |
| R12 | Cache invalidation sub-constraints | GAP-16 | Low | O3 |
| R13 | Concurrency test generation | GAP-17 | Low | O4 |

### Coverage Matrix
| Gap | Severity | Constraints |
|-----|----------|-------------|
| GAP-01 | P0 Critical | B1, T1 |
| GAP-02 | P0 Critical | T2, T3 |
| GAP-03 | P0 Critical | T3, T4 |
| GAP-04 | P0 Critical | T3, T4 |
| GAP-05 | P1 High | B2, U1 |
| GAP-06 | P1 High | T5 |
| GAP-07 | P1 High | T7 |
| GAP-08 | P1 High | T6 |
| GAP-09 | P1 High | S1 |
| GAP-10 | P2 Medium | S3 |
| GAP-11 | P2 Medium | O1 |
| GAP-12 | P2 Medium | B3 |
| GAP-13 | P2 Medium | U2 |
| GAP-14 | P2 Medium | O2 |
| GAP-15 | P2 Medium | S2 |
| GAP-16 | P2 Medium | O3 |
| GAP-17 | P2 Medium | O4 |
