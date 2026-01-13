# /context-failures

## Command: Load Historical Failures and Anti-Patterns

Load failure history as PRESENT constraints. What failed before will fail again unless explicitly prevented.

## Usage

```
/context-failures <manifold> [--sources=incidents|postmortems|tickets|all] [--timeframe=<months>]
```

## Prompt

```markdown
You are a Temporal Development Agent loading failure context.

## Context  
Manifold: {{manifold_path}}
Sources: {{sources}}
Timeframe: {{timeframe}} months

## Core Principle

**Past failures are future constraints.**

The non-linear insight: A failure that happened in production already exists as a constraint on your new feature—you just haven't captured it yet. This command makes those implicit constraints explicit.

## Your Task

### Phase 1: Failure Source Analysis

**A. Incident Database Mining**

Search for incidents related to manifold entities:

```yaml
incident_search:
  queries:
    - entities: ["payment", "retry", "gateway"]
    - systems: ["payment-service", "notification-service"]
    - error_types: ["duplicate", "timeout", "data_loss"]
    
  results:
    - incident_id: "INC-2024-089"
      date: "2024-03-15"
      severity: "P1"
      title: "Duplicate payments during gateway timeout"
      
      timeline:
        - "14:32 - Gateway starts returning 504s"
        - "14:35 - Retry logic kicks in"
        - "14:38 - 47 duplicate payments created"
        - "14:45 - Alerts fire on duplicate detection"
        - "15:30 - Root cause identified"
        - "17:00 - Manual refunds initiated"
        
      root_cause: |
        Retry logic did not check for idempotency.
        Gateway timeout doesn't mean payment failed.
        Some payments succeeded but response was lost.
        
      contributing_factors:
        - "No idempotency key in payment requests"
        - "Retry triggered on any non-200 response"
        - "No check for existing successful payment"
        
      resolution:
        immediate: "Paused retry system, manual processing"
        permanent: "Added basic dedup check (insufficient)"
        
      detection_time: "13 minutes"
      resolution_time: "2.5 hours"
      customer_impact: "47 customers overcharged"
      financial_impact: "$12,400 in refunds + goodwill credits"
      
      relevance_to_manifold:
        constraints_affected: ["B1", "T2"]
        relevance_score: 0.95
        lesson: "CRITICAL: Idempotency is non-negotiable"
```

**B. Post-Mortem Analysis**

Extract learnings from formal post-mortems:

```yaml
postmortem_analysis:
  - id: "PM-2024-089"
    incident: "INC-2024-089"
    
    five_whys:
      - why: "Duplicate payments occurred"
        because: "Retry logic retried successful payments"
      - why: "Retry logic retried successful payments"
        because: "No idempotency check"
      - why: "No idempotency check"
        because: "Original design assumed gateway always responds"
      - why: "Original design assumed gateway always responds"
        because: "Happy path focus during development"
      - why: "Happy path focus during development"
        because: "No failure mode analysis in spec"
        
    action_items:
      completed:
        - "Add basic duplicate detection"
        - "Add alerting for duplicate attempts"
      incomplete:
        - "Implement proper idempotency keys"  # Still open!
        - "Add chaos testing for gateway failures"
        
    systemic_issues:
      - "Specs don't require failure mode analysis"
      - "No chaos/failure testing in CI"
      - "Retry patterns not standardized"
```

**C. Support Ticket Pattern Mining**

Find recurring issues that indicate design problems:

```yaml
ticket_patterns:
  - pattern: "Payment status confusion"
    ticket_count: 127
    timeframe: "6 months"
    sample_tickets:
      - "TKT-5678: User charged but shows failed"
      - "TKT-6234: Multiple charges for same fee"
      - "TKT-7890: Payment stuck in processing"
    
    root_pattern: "State inconsistency between systems"
    constraints_affected: ["B1", "T2", "U1"]
    
  - pattern: "Notification spam"
    ticket_count: 43
    sample_tickets:
      - "TKT-4321: Received 12 SMS for same payment"
    root_pattern: "Retry logic triggers notifications each time"
    constraints_affected: ["U3"]
```

### Phase 2: Anti-Pattern Identification

From failures, extract anti-patterns to explicitly forbid:

```yaml
anti_patterns:
  - id: "AP-001"
    name: "Retry Without Idempotency"
    description: "Retrying an operation without ensuring it won't duplicate effects"
    
    pattern_signature:
      - "Retry on any failure"
      - "No idempotency key"
      - "No pre-check for success"
      
    occurrences_in_codebase:
      - file: "src/jobs/payment_reminder.py"
        line: 45
        code: "gateway.charge(payment)  # No idempotency key"
        risk: "HIGH - will duplicate on retry"
        
    prevention:
      must_include:
        - "Idempotency key in all mutating operations"
        - "Check for existing success before retry"
      must_exclude:
        - "Blind retry on timeout"
        
  - id: "AP-002"
    name: "Notification Per Retry"
    description: "Sending user notification on each retry attempt"
    
    pattern_signature:
      - "Notification in retry loop"
      - "No notification deduplication"
      
    prevention:
      must_include:
        - "Notification deduplication"
        - "Rate limiting per user"
        
  - id: "AP-003"  
    name: "Swallowed Ambiguous Response"
    description: "Treating unclear API response as success or failure definitively"
    
    pattern_signature:
      - "Binary success/failure logic"
      - "No handling for timeout/ambiguous"
      
    example_bad_code: |
      try:
          response = gateway.charge(payment)
          if response.status == 200:
              mark_success()
          else:
              mark_failure()  # WRONG: timeout != failure
      except Timeout:
          mark_failure()  # WRONG: might have succeeded
          
    example_good_code: |
      try:
          response = gateway.charge(payment, idempotency_key=key)
          if response.status == 200 and response.body.status == "success":
              mark_success()
          elif response.status == 200 and response.body.status == "failed":
              mark_failure()
          else:
              mark_ambiguous()  # Requires reconciliation
      except Timeout:
          mark_ambiguous()  # Don't assume failure
```

### Phase 3: Constraint Generation from Failures

Transform failures into explicit constraints:

```yaml
failure_derived_constraints:
  from_incidents:
    - incident: "INC-2024-089"
      generated_constraints:
        - id: "T_INC089_1"
          type: "invariant"
          statement: "All payment operations must include idempotency key"
          rationale: "INC-2024-089 root cause"
          violation_scenario: "Duplicate payment on retry"
          
        - id: "T_INC089_2"
          type: "invariant"  
          statement: "Retry must verify no successful prior attempt exists"
          rationale: "INC-2024-089 root cause"
          
  from_anti_patterns:
    - anti_pattern: "AP-002"
      generated_constraints:
        - id: "U_AP002_1"
          type: "invariant"
          statement: "Maximum 1 notification per retry batch, not per attempt"
          rationale: "Anti-pattern AP-002 prevention"
          
  from_ticket_patterns:
    - pattern: "Payment status confusion"
      generated_constraints:
        - id: "U_TKT_1"
          type: "goal"
          statement: "Payment status always accurately reflects gateway state"
          rationale: "127 support tickets in 6 months"
          measurement: "< 5 status confusion tickets per month"
```

### Phase 4: Failure Mode Enrichment

Add discovered failure scenarios to manifold:

```yaml
enriched_failure_modes:
  existing_in_manifold:
    - id: "F1"
      status: "already_documented"
      
  newly_discovered:
    - id: "F_NEW_1"
      source: "INC-2024-089"
      scenario: "Gateway timeout after successful charge"
      probability: "medium"  # Happened 3 times in 12 months
      impact: "critical"  # Financial loss + trust damage
      constraints_violated: ["B1"]
      detection: "Duplicate payment alert"
      mitigation: "Idempotency key + pre-retry check"
      prevention: "Design pattern: always use idempotency"
      
    - id: "F_NEW_2"
      source: "ticket_pattern_analysis"
      scenario: "User retries while system retry in progress"
      probability: "high"  # Inferred from confusion tickets
      impact: "medium"
      constraints_violated: ["B1", "U1"]
      detection: "Multiple in-flight payments for same invoice"
      mitigation: "Lock UI during retry, show status"
      prevention: "Optimistic locking on payment attempts"
```

## Output Format

### Failure Context Report

```yaml
# {{manifold_name}}-failures.yaml

meta:
  manifold: "{{manifold_name}}"
  analyzed_at: "{{timestamp}}"
  timeframe: "{{timeframe}} months"
  sources:
    incidents: 8 analyzed
    postmortems: 3 analyzed
    tickets: 1,247 scanned, 170 relevant

summary:
  high_relevance_incidents: 3
  anti_patterns_identified: 5
  new_constraints_derived: 8
  new_failure_modes_discovered: 4
  
  risk_assessment:
    repeat_probability: "high"  # Similar failures likely without intervention
    preparedness: "low"  # Current manifold doesn't address these
    
  critical_lessons:
    - "Idempotency is non-negotiable for payment retry"
    - "Notification rate limiting essential"
    - "Ambiguous responses need explicit handling"

incidents:
  # ... detailed incident analysis

anti_patterns:
  # ... identified anti-patterns with prevention

derived_constraints:
  # ... constraints generated from failures

enriched_failure_modes:
  # ... new failure modes to add to manifold

action_items:
  immediate:
    - "Add derived constraints to manifold"
    - "Review AP-001 occurrences in codebase"
  before_development:
    - "Complete outstanding action items from PM-2024-089"
  during_development:
    - "Validate each anti-pattern is prevented"
```

## Integration with Manifold

Run after `/context-failures`:

```
/cms-merge payment-retry-v2 --from=failures
```

This adds:
- Derived constraints with `_source: "failure_analysis"` metadata
- New failure modes with incident references
- Anti-pattern prevention as solution space exclusions

## Example Execution

```
User: /context-failures payment-retry-v2 --timeframe=12

Agent: Analyzing failure history for payment-retry-v2 context...

**INCIDENT ANALYSIS**
Scanning incidents from past 12 months...
Found 8 incidents matching manifold entities.

🚨 HIGH RELEVANCE (3):
- INC-2024-089: Duplicate payments (P1) - ROOT CAUSE: No idempotency
- INC-2024-112: Notification delays (P2) - ROOT CAUSE: Queue backup
- INC-2024-156: Payment stuck in processing (P2) - ROOT CAUSE: Ambiguous response

**ANTI-PATTERN EXTRACTION**
Identified 5 anti-patterns from failure analysis:

AP-001: Retry Without Idempotency
  → Found in codebase: 3 locations (HIGH RISK)
  
AP-002: Notification Per Retry
  → Found in codebase: 1 location (MEDIUM RISK)
  
AP-003: Swallowed Ambiguous Response  
  → Found in codebase: 2 locations (HIGH RISK)

**CONSTRAINT DERIVATION**
Generated 8 new constraints from failure analysis:

INVARIANT: T_INC089_1 - Idempotency key required
INVARIANT: T_INC089_2 - Pre-retry success check
INVARIANT: U_AP002_1 - Notification rate limiting
... [5 more]

**FAILURE MODE ENRICHMENT**
Discovered 4 failure modes not in manifold:

F_NEW_1: Gateway timeout after success (from INC-2024-089)
F_NEW_2: User retry during system retry (from ticket analysis)
... [2 more]

**CRITICAL WARNING**
Your current manifold does NOT address the root cause of INC-2024-089.
This incident resulted in $12,400 financial impact.
Without constraint T_INC089_1, this WILL recur.

Run `/cms-merge payment-retry-v2 --from=failures` to add derived constraints.
```
