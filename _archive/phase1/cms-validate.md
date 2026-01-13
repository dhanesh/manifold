# /cms-validate

## Command: Validate Constraint Manifold Completeness and Consistency

Analyze a CMS for completeness, internal consistency, and potential issues that would surface later in development.

## Usage

```
/cms-validate <manifold> [--strict] [--domain=<domain>] [--output=report|fix]
```

## Prompt

```markdown
You are a Temporal Development Agent validating a Constraint Manifold Specification.

## Context
Manifold: {{manifold_path}}
Mode: {{strict|normal}}
{{#if domain}}Focus Domain: {{domain}}{{/if}}

## Your Task

Perform comprehensive validation of the constraint manifold. Your goal is to find issues NOW that would otherwise be discovered during implementation or (worse) production.

## Validation Dimensions

### 1. Completeness Validation

**Domain Coverage Check:**
Every feature should have constraints in ALL domains. Flag missing domains:

```yaml
completeness:
  business: 
    count: 5
    has_invariant: true
    has_goal: true
    has_boundary: true
    status: "complete"
    
  technical:
    count: 3
    has_invariant: true
    has_goal: false  # ⚠️ No optimization targets
    has_boundary: true
    status: "incomplete"
    suggestion: "Add performance goals (latency, throughput)"
    
  security:
    count: 0  # 🚨 Critical gap
    status: "missing"
    required_minimums:
      - "Data protection constraints"
      - "Authentication/authorization constraints"
      - "Audit requirements"
```

**Constraint Depth Check:**
Each constraint should have sufficient detail:

```yaml
constraint_depth:
  - id: "B1"
    statement: "No duplicate payments" # ✓ Clear
    measurement: "defined"  # ✓ Can verify
    violation_cost: "defined"  # ✓ Priority clear
    status: "sufficient"
    
  - id: "T2"
    statement: "System should be reliable" # ⚠️ Vague
    measurement: "missing"  # 🚨 Can't verify
    violation_cost: "missing"
    status: "insufficient"
    suggestions:
      - "Define specific reliability metric (e.g., 99.9% uptime)"
      - "Add measurement method"
      - "Clarify violation impact"
```

### 2. Consistency Validation

**Internal Consistency:**
Check for contradictions within the manifold:

```yaml
consistency_issues:
  contradictions:
    - type: "direct_conflict"
      constraints: ["T1", "T5"]
      t1: "All operations must complete in < 100ms"
      t5: "Synchronous validation against external API required"
      issue: "External API has p99 latency of 300ms"
      severity: "critical"
      resolution_options:
        - "Make external validation async"
        - "Relax latency requirement for this flow"
        - "Cache external validation results"
        
    - type: "implicit_conflict"
      constraints: ["U1", "U3"]
      u1: "Notify user of every retry attempt"
      u3: "Maximum 1 notification per 6 hours"
      issue: "If 3 retries in 1 hour, can't meet both"
      severity: "high"
      resolution_options:
        - "Batch notifications"
        - "Prioritize important notifications"
        - "Revise notification constraint"
```

**Relationship Validation:**
Check that declared relationships are coherent:

```yaml
relationship_issues:
  - relationship: "T2 depends on B1"
    issue: "Dependency direction may be inverted"
    analysis: "B1 (no duplicates) is achieved BY T2 (idempotency)"
    suggestion: "Reframe as 'T2 implements B1'"
    
  - relationship: "None declared between S1 and T3"
    issue: "Missing relationship"
    s1: "Payment credentials never logged"
    t3: "Full request/response logging for debugging"
    implicit_tension: "Logging might capture credentials"
    suggestion: "Add tension relationship with resolution"
```

### 3. Feasibility Validation

**Technical Feasibility:**
Check if constraints are achievable given context:

```yaml
feasibility_concerns:
  - constraint: "T4"
    statement: "p99 latency < 50ms"
    concern: "Given dependency on external payment gateway with 200ms p99"
    feasibility: "impossible without caching/async"
    suggestions:
      - "Revise to realistic target"
      - "Add caching as solution space requirement"
      - "Split sync/async paths"
      
  - constraint: "O3"
    statement: "Zero-downtime deployments"
    concern: "Current architecture requires DB migrations with locks"
    feasibility: "requires significant infrastructure work"
    suggestions:
      - "Add infrastructure constraint for blue-green support"
      - "Accept brief maintenance windows"
      - "Implement migration-safe patterns"
```

**Resource Feasibility:**
Check if constraints are achievable with available resources:

```yaml
resource_concerns:
  - constraints: ["T1", "T2", "T3"]
    combined_effort: "estimated 3 months"
    available_time: "2 weeks mentioned in meta"
    gap: "significant"
    suggestions:
      - "Reduce scope"
      - "Phase constraints"
      - "Increase resources"
```

### 4. Failure Mode Validation

**Coverage Check:**
Are failure modes comprehensive?

```yaml
failure_mode_gaps:
  - scenario: "Payment gateway returns ambiguous response"
    covered: false
    relevant_constraints: ["B1", "T2"]
    suggested_failure_mode:
      id: "F_NEW_1"
      scenario: "Gateway returns HTTP 200 but transaction status unclear"
      impact: "Could cause duplicate payment or lost transaction"
      
  - scenario: "Downstream service timeout during retry"
    covered: false
    relevant_constraints: ["T1", "O2"]
    
  - category: "Data consistency failures"
    coverage: "0/5 common patterns covered"
    missing:
      - "Partial write during retry"
      - "Read-your-writes violation"
      - "Concurrent modification"
```

**Mitigation Completeness:**
Are mitigations actionable?

```yaml
mitigation_issues:
  - failure_mode: "F1"
    mitigation: "Handle gracefully"  # 🚨 Too vague
    issue: "Not actionable"
    suggested_revision: "Return to retry queue with exponential backoff; alert after 3 consecutive failures"
    
  - failure_mode: "F2"
    mitigation: "Defined well"
    prevention: "missing"  # ⚠️ Only reactive
    suggested_prevention: "Circuit breaker with health checks"
```

### 5. Testability Validation

**Can each constraint be verified?**

```yaml
testability:
  - constraint: "B1"
    statement: "No duplicate payments"
    testable: true
    test_approach: "Concurrent retry simulation"
    automation: "Integration test with chaos injection"
    
  - constraint: "U2"
    statement: "User experience should feel seamless"
    testable: false  # 🚨 Subjective
    issue: "No objective measurement"
    suggestions:
      - "Define specific UX metrics"
      - "Add task completion time constraint"
      - "Add error rate constraint"
```

## Output Format

### Validation Report

```yaml
# {{manifold_name}}-validation.yaml

summary:
  status: "needs_work|acceptable|ready"
  critical_issues: 2
  high_issues: 5
  medium_issues: 8
  low_issues: 3
  
  blocking:
    - "Security constraints completely missing"
    - "T1 and T5 are in direct conflict"
    
  recommendations:
    - priority: "critical"
      action: "Add security constraints before proceeding"
    - priority: "high"  
      action: "Resolve T1/T5 conflict"
    - priority: "medium"
      action: "Add measurements to 5 vague constraints"

completeness:
  # ... detailed completeness analysis

consistency:
  # ... detailed consistency analysis

feasibility:
  # ... detailed feasibility analysis

failure_modes:
  # ... detailed failure mode analysis

testability:
  # ... detailed testability analysis

suggested_additions:
  constraints:
    - id: "S1_suggested"
      domain: "security"
      type: "invariant"
      statement: "Payment credentials must not be logged or stored outside vault"
      rationale: "Standard security requirement for payment systems"
      
  failure_modes:
    - id: "F_suggested_1"
      scenario: "..."
      
  relationships:
    - type: "tension"
      between: ["...", "..."]
```

### Fix Mode Output

If `--output=fix`, generate updated CMS with:
- Issues annotated with `_validation` metadata
- Suggested additions included with `_suggested: true`
- Conflicts marked with `_conflict` metadata

```yaml
constraints:
  technical:
    - id: "T1"
      statement: "..."
      _validation:
        status: "conflict"
        conflicts_with: "T5"
        suggested_resolutions:
          - "..."
          
  security:
    - id: "S1"
      statement: "Payment credentials must not be logged"
      _suggested: true
      _validation:
        reason: "Standard security constraint missing from manifold"
        confidence: "high"
        needs_review: true
```

## Strict Mode

With `--strict`, fail validation if:
- ANY domain has zero constraints
- ANY invariant lacks measurement
- ANY failure mode lacks prevention strategy
- ANY constraint is untestable

## Example Execution

```
User: /cms-validate payment-retry-v2 --strict

Agent: Validating payment-retry-v2.cms.yaml in STRICT mode...

🚨 VALIDATION FAILED - 2 Critical Issues

**CRITICAL: Security Domain Empty**
A payment feature MUST have security constraints.
Minimum required:
- Credential handling policy
- Authorization requirements
- Audit logging requirements

**CRITICAL: Direct Constraint Conflict**
T1: "All retry decisions < 100ms"
T5: "Synchronous fraud check required"

Fraud check API has documented p99 of 350ms.
These constraints cannot be simultaneously satisfied.

Resolution options:
1. Make fraud check async (affects T5)
2. Relax latency to < 500ms (affects T1)
3. Add caching for fraud decisions (new T6)

Please resolve these issues before proceeding.
Run `/cms-validate --output=fix` to see suggested fixes.
```
