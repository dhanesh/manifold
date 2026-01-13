# /outcome-anchor

## Command: Anchor to Desired Outcome

Define the outcome state and reason BACKWARD to derive what must be true. This is the core non-linear operation.

## Usage

```
/outcome-anchor <manifold> [--outcome=<statement>] [--criteria=<file>]
```

## Prompt

```markdown
You are a Temporal Development Agent performing outcome-anchored reasoning.

## Context
Manifold: {{manifold_path}}
{{#if outcome}}Outcome Statement: {{outcome}}{{/if}}
Loaded Context: {{context_path}}

## Core Principle

**The future is a constraint on the present.**

Traditional reasoning: Current state → Actions → Future state (forward)
Temporal reasoning: Desired future state → Required truths → Valid actions (backward)

By treating the desired outcome as FIXED, we can derive what MUST be true for that outcome to exist. This surfaces requirements that forward reasoning often misses.

## Your Task

### Phase 1: Outcome Definition

If not provided, derive outcome from manifold:

```yaml
outcome_definition:
  primary_statement: "Payment retry succeeds for 95% of transient failures within 3 attempts"
  
  decomposed_criteria:
    - id: "OC1"
      criterion: "95% success rate for transient failures"
      measurement: "retry_success / retry_attempts WHERE failure_type = 'transient'"
      timeframe: "rolling 7 days"
      
    - id: "OC2"
      criterion: "Within 3 attempts"
      measurement: "successful_retries.attempts <= 3"
      exclusions: "Permanent failures not counted"
      
    - id: "OC3"
      criterion: "Transient failure correctly identified"
      measurement: "failure_classification_accuracy"
      implicit_requirement: "Need failure classification system"
      
  observable_signals:
    - "Retry success rate dashboard shows >= 95%"
    - "Average attempts to success <= 2.5"
    - "Manual intervention rate < 5%"
    - "No increase in duplicate payment incidents"
    - "User satisfaction with retry flow > 4/5"
    
  negative_indicators:
    - "Duplicate payment incidents"
    - "User complaints about notification spam"
    - "SLA breaches due to retry delays"
    - "Data inconsistency between systems"
```

### Phase 2: Backward Reasoning

For each outcome criterion, derive what must be true:

```yaml
backward_reasoning:
  - criterion: "OC1 - 95% success rate"
    
    if_this_is_true_then:
      # Level 1: Direct requirements
      - truth: "Transient failures are correctly distinguished from permanent failures"
        domain: "technical"
        confidence: 1.0
        reasoning: "Can't retry correctly if we don't know what's retriable"
        
      - truth: "Retry mechanism actually executes"
        domain: "technical"
        confidence: 1.0
        reasoning: "Obvious but worth stating"
        
      - truth: "External dependencies recover within retry window"
        domain: "operational"
        confidence: 0.9
        reasoning: "If gateway is down for 72+ hours, retries won't help"
        
      # Level 2: Derived from Level 1
      - truth: "Failure classification logic exists and is accurate"
        domain: "technical"
        derived_from: "Transient failures correctly distinguished"
        confidence: 0.95
        
      - truth: "Classification includes all known transient error types"
        domain: "technical"
        derived_from: "Classification logic accurate"
        confidence: 0.9
        
      - truth: "Gateway error codes are documented and mapped"
        domain: "documentation"
        derived_from: "Classification includes all error types"
        confidence: 0.85
        
      # Level 3: Infrastructure/capability requirements
      - truth: "State of each payment is persistently tracked"
        domain: "data"
        derived_from: "Retry mechanism executes"
        reasoning: "Need to know what to retry"
        
      - truth: "Retry scheduling system exists and is reliable"
        domain: "infrastructure"
        derived_from: "Retry mechanism executes"
        
  - criterion: "OC2 - Within 3 attempts"
    
    if_this_is_true_then:
      - truth: "Attempt count is tracked per payment"
        domain: "data"
        confidence: 1.0
        
      - truth: "Retry scheduling respects attempt limits"
        domain: "technical"
        confidence: 1.0
        
      - truth: "Failed payment after 3 attempts has defined handling"
        domain: "business"
        confidence: 0.95
        reasoning: "What happens to the 5% that fail?"
        
  - criterion: "OC3 - Transient failure identification"
    
    if_this_is_true_then:
      - truth: "Exhaustive list of transient vs permanent failures exists"
        domain: "documentation"
        confidence: 0.9
        
      - truth: "Classification is deterministic given error response"
        domain: "technical"
        confidence: 0.85
        
      - truth: "Unknown errors default to safe behavior"
        domain: "technical"
        confidence: 0.8
        reasoning: "Will encounter new error types"
```

### Phase 3: Truth Consolidation

Consolidate derived truths, removing duplicates and identifying conflicts:

```yaml
consolidated_truths:
  by_domain:
    technical:
      - id: "RT1"
        statement: "Failure classification logic accurately distinguishes transient from permanent"
        derived_from: ["OC1", "OC3"]
        confidence: 0.95
        implementation_hints:
          - "Maintain error code mapping"
          - "Default unknown to 'needs review' not 'permanent'"
          
      - id: "RT2"
        statement: "Retry scheduling respects attempt limits and timing constraints"
        derived_from: ["OC2"]
        confidence: 1.0
        implementation_hints:
          - "Use Temporal workflow with retry policy"
          
      - id: "RT3"
        statement: "Payment state machine includes retry states"
        derived_from: ["OC1", "OC2"]
        confidence: 0.9
        states_required:
          - "pending_retry"
          - "retry_in_progress"
          - "retry_succeeded"
          - "retry_exhausted"
          
    data:
      - id: "RD1"
        statement: "Each payment tracks: attempts made, last attempt result, next scheduled"
        derived_from: ["OC1", "OC2"]
        confidence: 1.0
        schema_implications:
          - "payment.retry_attempts: int"
          - "payment.last_retry_at: timestamp"
          - "payment.last_retry_result: enum"
          - "payment.next_retry_at: timestamp nullable"
          
    operational:
      - id: "RO1"
        statement: "Retry status visible in real-time for support team"
        derived_from: ["observable_signals"]
        confidence: 0.85
        
    business:
      - id: "RB1"
        statement: "Payments that exhaust retries have defined escalation path"
        derived_from: ["OC2"]
        confidence: 0.95
        options:
          - "Manual queue for ops team"
          - "User notification with alternative payment option"
          - "Automatic escalation to relationship manager"
          
  cross_references:
    - truth: "RT3 - State machine"
      enables: "RD1 - State tracking"
      
    - truth: "RT1 - Classification"
      required_by: "RT2 - Retry scheduling"

  conflicts_detected:
    - truths: ["RT1", "existing T3"]
      conflict: "Classification requires gateway response parsing, may exceed 100ms"
      resolution_needed: true
```

### Phase 4: Gap Analysis

Compare required truths against current reality:

```yaml
gap_analysis:
  truth_vs_reality:
    - truth: "RT1 - Failure classification"
      current_state: "No classification logic exists"
      gap_type: "missing"
      effort_estimate: "medium"
      
    - truth: "RT2 - Retry scheduling"
      current_state: "Temporal exists, no retry workflow"
      gap_type: "partial"
      effort_estimate: "low"
      what_exists: "Temporal infrastructure"
      what_missing: "Retry workflow definition"
      
    - truth: "RD1 - Payment tracking fields"
      current_state: "Payment model exists, no retry fields"
      gap_type: "extension"
      effort_estimate: "low"
      migration_required: true
      
    - truth: "RB1 - Escalation path"
      current_state: "No defined process"
      gap_type: "missing"
      effort_estimate: "medium"
      requires_stakeholder_decision: true
      
  truths_already_satisfied:
    - truth: "Temporal infrastructure exists"
      evidence: "ADR-007, production deployment"
      
  truths_requiring_decisions:
    - truth: "RB1 - Escalation path"
      decision_needed: "What happens after 3 failed retries?"
      stakeholders: ["Product", "Ops", "Customer Success"]
      deadline_recommendation: "Before implementation starts"
```

## Output Format

### Outcome Anchor Document

```yaml
# {{manifold_name}}-outcome.yaml

outcome:
  statement: "{{outcome_statement}}"
  criteria:
    # ... decomposed criteria
  signals:
    positive: [...]
    negative: [...]

required_truths:
  summary:
    total: 12
    by_domain:
      technical: 4
      data: 3
      operational: 2
      business: 2
      documentation: 1
    confidence_distribution:
      high: 8
      medium: 3
      low: 1
      
  truths:
    # ... consolidated truths by domain
    
  relationships:
    # ... how truths relate to each other
    
  conflicts:
    # ... conflicts with existing constraints

gap_analysis:
  missing: 4
  partial: 3
  extension: 2
  satisfied: 3
  
  blockers:
    - "RB1 requires stakeholder decision"
    
  effort_summary:
    low: 5
    medium: 4
    high: 1
    
  recommended_sequence:
    # Not temporal ordering, but dependency ordering
    1: "RB1 - Get escalation decision (blocks implementation)"
    2: "RD1 - Add tracking fields (enables RT2, RT3)"
    3: "RT1 - Classification logic (enables RT2)"
    4: "RT2, RT3 - Retry workflow and state machine"
    5: "RO1 - Observability (can parallel with 3-4)"
```

## Example Execution

```
User: /outcome-anchor payment-retry-v2 --outcome="Payment retry succeeds for 95% of transient failures within 3 attempts"

Agent: Anchoring payment-retry-v2 to outcome...

**OUTCOME DECOMPOSITION**
Breaking down outcome into measurable criteria:

OC1: 95% success rate for transient failures
  → Implies: Accurate failure classification
  → Implies: Reliable retry execution
  → Implies: External systems recover in time

OC2: Within 3 attempts
  → Implies: Attempt tracking
  → Implies: Attempt limiting
  → Implies: Escalation path for exhausted retries

OC3: Transient failure identification
  → Implies: Error taxonomy
  → Implies: Classification logic
  → Implies: Safe defaults for unknowns

**BACKWARD REASONING**
Deriving required truths from outcome...

For OC1 to be TRUE, the following MUST be true:
  RT1: Failure classification accurately distinguishes transient from permanent
  RT2: Retry scheduling executes reliably
  RT3: Payment state machine includes retry states
  ...

[Continues for OC2, OC3]

**TRUTH CONSOLIDATION**
12 required truths identified across 5 domains:
- Technical: 4 truths
- Data: 3 truths  
- Operational: 2 truths
- Business: 2 truths
- Documentation: 1 truth

**CONFLICT DETECTED**
RT1 (classification logic) may conflict with existing T3 (100ms latency).
Classification requires parsing gateway response, adding latency.
Resolution needed before proceeding.

**GAP ANALYSIS**
Comparing required truths to current state:

✗ MISSING: Failure classification (RT1)
✗ MISSING: Escalation path (RB1) - NEEDS STAKEHOLDER DECISION
◐ PARTIAL: Retry scheduling (RT2) - Temporal exists, workflow doesn't
◐ PARTIAL: State machine (RT3) - Payment model exists, no retry states
✓ SATISFIED: Infrastructure (Temporal)

**BLOCKER IDENTIFIED**
RB1 (escalation path) requires stakeholder decision.
Question: "What happens when payment exhausts 3 retry attempts?"
Recommended: Resolve before implementation begins.

Output saved to: .temporal/outcomes/payment-retry-v2-outcome.yaml
```
