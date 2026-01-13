# /cms-tensions

## Command: Identify and Resolve Constraint Tensions

Systematically find tensions between constraints and guide resolution. Tensions are not bugs—they define the solution space.

## Usage

```
/cms-tensions <manifold> [--resolve] [--interactive]
```

## Prompt

```markdown
You are a Temporal Development Agent analyzing constraint tensions.

## Context
Manifold: {{manifold_path}}
Mode: {{resolve|analyze}}

## Core Concept

**Tensions are valuable, not problems.**

Every real system has competing concerns:
- Security vs. Usability
- Performance vs. Correctness
- Flexibility vs. Simplicity
- Cost vs. Capability

Tensions define where trade-offs live. A manifold without tensions is incomplete or describing a trivial system.

## Your Task

### Phase 1: Tension Discovery

Systematically compare constraints across dimensions:

**Cross-Domain Tensions:**
```
Business ↔ Technical
  - "Instant confirmation" vs "Async processing for reliability"
  
Business ↔ Security
  - "Frictionless experience" vs "Strong authentication"
  
Business ↔ Operational  
  - "Always available" vs "Maintenance windows for updates"
  
UX ↔ Security
  - "Remember user preferences" vs "Minimize stored data"
  
Technical ↔ Operational
  - "Microservices" vs "Operational simplicity"
```

**Within-Domain Tensions:**
```
Technical ↔ Technical
  - "Low latency" vs "Strong consistency"
  - "High throughput" vs "Detailed logging"
  
Business ↔ Business
  - "Maximize conversion" vs "Minimize fraud"
  - "Fast time-to-market" vs "Comprehensive feature set"
```

**Temporal Tensions (Future vs Present):**
```
Current constraints vs Anticipated failure modes
  - "Ship by Friday" vs "Production readiness"
  - "MVP scope" vs "Technical debt avoidance"
```

### Phase 2: Tension Classification

For each tension, classify:

```yaml
tension_analysis:
  - id: "TENSION_1"
    between:
      - constraint: "B3"
        statement: "Retry window must not exceed 72 hours"
        domain: "business"
      - constraint: "U1"
        statement: "User notified before each retry"
        domain: "user_experience"
    
    tension_type: "resource_competition"
    # Types: resource_competition, logical_contradiction, 
    #        priority_conflict, temporal_conflict, scope_conflict
    
    description: "Multiple retries over 72 hours could overwhelm user with notifications"
    
    severity: "medium"
    # Severity based on: how many other constraints affected,
    #                    how central to the feature
    
    resolution_required: true
    # false if tension is acceptable (e.g., "we'll optimize for B3")
    
    resolution_type: "compromise"
    # Types: compromise, prioritize, split, transform, eliminate
```

### Phase 3: Resolution Patterns

For tensions requiring resolution, apply these patterns:

**Pattern 1: COMPROMISE**
Both constraints partially satisfied:
```yaml
resolution:
  pattern: "compromise"
  before:
    - "U1: Notify before EVERY retry"
    - "U3: Max 1 notification per 6 hours"
  after:
    - "U1_revised: Notify before first retry and before final retry"
    - "U3: Max 1 notification per 6 hours"
  trade_off: "User not notified of middle retries"
  acceptable_because: "First and last notifications most important"
```

**Pattern 2: PRIORITIZE**
One constraint takes precedence:
```yaml
resolution:
  pattern: "prioritize"
  winner: "B1 - No duplicate payments"
  loser: "T3 - Response time < 100ms"
  before:
    - "B1: No duplicate payments"
    - "T3: Response time < 100ms"
  after:
    - "B1: No duplicate payments"
    - "T3_revised: Response time < 500ms for idempotent operations"
  trade_off: "Slower responses when ensuring no duplicates"
  acceptable_because: "Duplicate payments have higher cost than latency"
```

**Pattern 3: SPLIT**
Different constraints apply in different contexts:
```yaml
resolution:
  pattern: "split"
  before:
    - "T1: All operations synchronous for simplicity"
    - "T4: External calls must not block main flow"
  after:
    - "T1_revised: User-facing operations synchronous"
    - "T4_revised: Background operations async"
    - "T_NEW: Clear boundary between sync and async paths"
  trade_off: "Increased complexity"
  acceptable_because: "Allows both UX responsiveness and resilience"
```

**Pattern 4: TRANSFORM**
Reframe constraints to eliminate tension:
```yaml
resolution:
  pattern: "transform"
  before:
    - "S1: User credentials never stored"
    - "U2: Remember payment method for convenience"
  after:
    - "S1: User credentials never stored (unchanged)"
    - "U2_transformed: Use tokenized payment references"
    - "T_NEW: Integrate with payment gateway tokenization"
  trade_off: "Gateway dependency"
  acceptable_because: "Industry standard approach, no credential storage needed"
```

**Pattern 5: ELIMINATE**
Remove one constraint (rare, requires justification):
```yaml
resolution:
  pattern: "eliminate"
  eliminated: "B5 - Support legacy browser X"
  reason: "Usage data shows < 0.1% of users"
  impact: "Those users cannot use retry feature"
  mitigation: "Fallback to manual retry via support"
  approved_by: "Product owner (documented in ADR-xxx)"
```

### Phase 4: Resolution Documentation

For each resolved tension:

```yaml
resolutions:
  - tension_id: "TENSION_1"
    pattern_used: "compromise"
    
    original_constraints:
      - id: "U1"
        statement: "User notified before each retry"
      - id: "U3"
        statement: "Maximum 1 notification per 6 hours"
        
    revised_constraints:
      - id: "U1"
        statement: "User notified before first retry and final retry or failure"
        _revision:
          original: "User notified before each retry"
          reason: "Resolved tension with U3"
          tension_id: "TENSION_1"
          
    new_constraints:
      - id: "U4"
        statement: "Retry status always visible in user portal"
        type: "goal"
        rationale: "Compensates for reduced notifications"
        _created_by: "TENSION_1 resolution"
        
    trade_off_documentation:
      what_we_gave_up: "Notification on every retry"
      why_acceptable: "Portal visibility + key notifications sufficient"
      risk: "User may miss retry in progress if not checking portal"
      mitigation: "Push notification option for users who opt in"
```

## Output Format

### Tension Analysis Report

```yaml
# {{manifold_name}}-tensions.yaml

summary:
  total_tensions_found: 8
  severity_breakdown:
    critical: 1
    high: 2
    medium: 3
    low: 2
  resolution_required: 4
  acceptable_as_is: 4

tensions:
  - id: "TENSION_1"
    between: ["U1", "U3"]
    # ... full analysis
    
  - id: "TENSION_2"
    between: ["B1", "T3"]
    # ... full analysis

resolution_recommendations:
  - tension_id: "TENSION_1"
    recommended_pattern: "compromise"
    recommended_resolution:
      # ... specific resolution
    alternatives:
      - pattern: "prioritize"
        description: "..."
        trade_off: "..."

unresolvable_tensions:
  - tension_id: "TENSION_7"
    between: ["B8", "B9"]
    reason: "Fundamentally conflicting business requirements"
    escalation: "Requires product/business decision"
    options:
      - "Descope B8"
      - "Descope B9"  
      - "Two separate features"
```

## Interactive Mode

With `--interactive`, guide resolution process:

```
Agent: I found 8 tensions in the manifold. Let's resolve the critical one first.

**TENSION: CRITICAL**
B1 (Business): "No duplicate payments for same invoice"
T3 (Technical): "Response time < 100ms p95"

These tension because idempotency checks (required for B1) add latency.

Current idempotency approaches and their latency impact:
1. Database unique constraint: +20-50ms
2. Redis check: +5-15ms  
3. Request deduplication with cache: +2-5ms

Which resolution pattern would you like to apply?
a) COMPROMISE: Accept higher latency (e.g., 200ms) for guaranteed idempotency
b) SPLIT: Fast path for new payments, slow path for potential retries
c) TRANSFORM: Use request signing to detect duplicates without lookup

Your choice: b

Good choice. Here's the resolution:

T3_revised: "Response time < 100ms p95 for new payments"
T3b_new: "Response time < 300ms p95 for retry path"  
T_routing: "Request signature determines fast vs slow path"

This adds complexity but preserves both constraints in their domains.

Proceeding to next tension...
```

## Example Execution

```
User: /cms-tensions payment-retry-v2 --resolve --interactive

Agent: Analyzing payment-retry-v2.cms.yaml for constraint tensions...

Found 6 tensions across 15 constraints.

TENSION MAP:
```
         Business          Technical           UX            Security
Business    -              T1↔B3(M)           B2↔U1(H)      B4↔S1(L)
Technical   -                 -               T3↔U2(M)      T2↔S2(H)  
UX          -                 -                  -          U3↔S3(L)
Security    -                 -                  -             -
```
Legend: (H)igh, (M)edium, (L)ow severity

Starting with highest severity tension...

[continues interactively]
```
