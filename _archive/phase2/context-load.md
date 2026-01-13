# /context-load

## Command: Anticipatory Context Loading

Load ALL relevant context BEFORE development begins. This is the non-linear approach: don't discover context as you need it, have it all present simultaneously.

## Usage

```
/context-load <manifold> [--sources=all|codebase|docs|incidents|decisions|similar] [--depth=shallow|deep|exhaustive]
```

## Prompt

```markdown
You are a Temporal Development Agent performing anticipatory context loading.

## Context
Manifold: {{manifold_path}}
Sources: {{sources}}
Depth: {{depth}}

## Core Principle

**Context discovered during implementation is context we failed to load upfront.**

Traditional development: Load context as needed (reactive)
Temporal development: Load all context before starting (proactive)

The goal is to have EVERY piece of information that could possibly be relevant accessible from the start, eliminating "I wish I had known that earlier" moments.

## Your Task

### Phase 1: Entity Extraction

From the constraint manifold, extract all entities that need context:

```yaml
extracted_entities:
  systems:
    - name: "payment_gateway"
      mentioned_in: ["T1", "T4", "F2"]
      context_needed:
        - "API documentation"
        - "Error codes"
        - "Rate limits"
        - "Historical incident patterns"
        
    - name: "notification_service"
      mentioned_in: ["U1", "U2"]
      context_needed:
        - "API documentation"
        - "Channel capabilities"
        - "Delivery guarantees"
        
  data_entities:
    - name: "payment"
      mentioned_in: ["B1", "T2", "S1"]
      context_needed:
        - "Schema/model definition"
        - "State machine"
        - "Validation rules"
        
  processes:
    - name: "retry_flow"
      context_needed:
        - "Similar existing flows"
        - "Workflow engine patterns"
        - "Error handling conventions"
        
  stakeholders:
    - name: "NBFC_partners"
      mentioned_in: ["B3"]
      context_needed:
        - "Integration requirements"
        - "Reconciliation processes"
        - "SLA agreements"
```

### Phase 2: Context Source Loading

For each entity, load context from all relevant sources:

**A. Codebase Context**
```yaml
codebase_context:
  - entity: "payment_gateway"
    files_found:
      - path: "src/integrations/payment_gateway/client.py"
        relevance: "high"
        summary: "Current gateway integration, handles auth and basic calls"
        key_findings:
          - "Retry logic exists but limited to network errors"
          - "No idempotency key handling"
          - "Timeout set to 30s"
          
      - path: "src/integrations/payment_gateway/errors.py"
        relevance: "high"
        summary: "Error type definitions"
        key_findings:
          - "5 error types defined, but no 'ambiguous response' type"
          
      - path: "tests/integration/test_payment_gateway.py"
        relevance: "medium"
        summary: "Integration tests"
        key_findings:
          - "Only happy path tested"
          - "No chaos/failure injection"
          
    predicted_touch_points:
      - path: "src/integrations/payment_gateway/client.py"
        prediction: "Will need modification for retry logic"
        confidence: "high"
        
      - path: "src/models/payment.py"  
        prediction: "May need retry status fields"
        confidence: "medium"
```

**B. Documentation Context**
```yaml
documentation_context:
  - entity: "payment_gateway"
    sources:
      - type: "external_api_docs"
        url: "https://gateway.example.com/docs"
        key_findings:
          - "Idempotency key supported in header"
          - "Retry-After header on rate limit"
          - "Webhook for async status updates"
          
      - type: "internal_wiki"
        path: "docs/integrations/payment-gateway.md"
        key_findings:
          - "Last updated 8 months ago"
          - "Missing new API features"
          - "Known issue: intermittent 503s on high load"
          
      - type: "adr"
        path: "docs/adr/003-payment-gateway-selection.md"
        key_findings:
          - "Chosen over alternative X for reliability"
          - "Known limitation: no partial refund support"
```

**C. Incident Context (Critical for Failure Mode Anticipation)**
```yaml
incident_context:
  - entity: "payment_gateway"
    incidents:
      - id: "INC-2024-089"
        date: "2024-03-15"
        title: "Duplicate payments during gateway timeout"
        root_cause: "Retry without idempotency check"
        resolution: "Manual refunds + added basic dedup"
        relevant_to_constraints: ["B1", "T2"]
        lesson: "MUST have idempotency before retry logic"
        
      - id: "INC-2024-112"
        date: "2024-05-22"
        title: "Payment notifications delayed by 4 hours"
        root_cause: "Notification service queue backup"
        resolution: "Increased queue workers"
        relevant_to_constraints: ["U1"]
        lesson: "Notification delivery is not guaranteed timely"
        
    patterns_identified:
      - pattern: "Gateway timeout handling"
        incident_count: 3
        common_factor: "Unclear response status"
        recommendation: "Explicit timeout handling in retry design"
```

**D. Architectural Decision Context**
```yaml
decision_context:
  - entity: "retry_flow"
    decisions:
      - id: "ADR-007"
        title: "Use Temporal for workflow orchestration"
        status: "accepted"
        implications:
          - "Retry logic should be Temporal workflows"
          - "State persistence handled by Temporal"
          - "Signals available for cancellation"
        constraints_affected: ["T4", "U2"]
        
      - id: "ADR-012"
        title: "Event-driven architecture for async operations"
        status: "accepted"
        implications:
          - "Retry events should publish to event bus"
          - "Consumers may need retry event handlers"
        constraints_affected: ["O1"]
```

**E. Similar Feature Context**
```yaml
similar_features_context:
  - feature: "loan_disbursement_retry"
    similarity_score: 0.85
    implemented: "2023-Q4"
    what_worked:
      - "Exponential backoff with jitter"
      - "Dead letter queue for failed items"
      - "Admin dashboard for manual intervention"
    what_failed:
      - "Initial lack of observability"
      - "No user communication during retry"
    lessons_applicable:
      - constraint: "O1"
        lesson: "Add observability from day 1"
      - constraint: "U1"
        lesson: "Users expect status updates"
        
  - feature: "notification_retry"
    similarity_score: 0.60
    what_worked:
      - "Channel fallback (SMS if email fails)"
    what_failed:
      - "No cap on retry attempts"
      - "User received 47 identical SMS"
    lessons_applicable:
      - constraint: "U3"
        lesson: "Hard limit on notifications essential"
```

**F. Team Knowledge Context**
```yaml
team_knowledge_context:
  - entity: "payment_gateway"
    experts:
      - name: "Rajesh K"
        expertise: "Gateway integration, error handling"
        relevant_experience: "Built original integration"
        
    tribal_knowledge:
      - "Gateway returns 200 even for some failures - check response body"
      - "Rate limit is per merchant, not global"
      - "Sandbox behaves differently from production"
      
  - entity: "retry_patterns"
    experts:
      - name: "Priya M"
        expertise: "Temporal workflows"
        relevant_experience: "Built loan disbursement retry"
```

### Phase 3: Context Synthesis

Merge all context into a unified, queryable structure:

```yaml
unified_context:
  by_constraint:
    B1:  # "No duplicate payments"
      relevant_code:
        - "src/integrations/payment_gateway/client.py"
      relevant_incidents:
        - "INC-2024-089"
      relevant_decisions:
        - "ADR-007"
      relevant_lessons:
        - "MUST have idempotency before retry logic"
      experts:
        - "Rajesh K"
      risk_level: "high"  # Based on incident history
      
    T4:  # "Must work with Temporal"
      relevant_code:
        - "src/workflows/*.py"
      relevant_decisions:
        - "ADR-007"
      relevant_features:
        - "loan_disbursement_retry"
      experts:
        - "Priya M"
      risk_level: "low"  # Well-understood pattern
      
  by_risk:
    high:
      - constraint: "B1"
        reason: "3 related incidents in past year"
      - constraint: "S1"
        reason: "No security context found - gap?"
        
    medium:
      - constraint: "U1"
        reason: "Notification reliability issues documented"
        
  knowledge_gaps:
    - area: "Security patterns for payment retry"
      impact: "Constraint S1 lacks implementation context"
      action: "Consult security team before design"
      
    - area: "NBFC reconciliation requirements"
      impact: "Constraint B3 may have undocumented rules"
      action: "Schedule call with NBFC integration team"
```

## Output Format

### Context Report

```yaml
# {{manifold_name}}.context.yaml

meta:
  manifold: "{{manifold_name}}"
  loaded_at: "{{timestamp}}"
  depth: "{{depth}}"
  sources_queried:
    - codebase: 47 files analyzed
    - documentation: 12 docs found
    - incidents: 8 relevant incidents
    - decisions: 4 ADRs relevant
    - similar_features: 3 features analyzed
    
summary:
  context_completeness: "82%"  # Estimated coverage
  high_risk_constraints: 2
  knowledge_gaps: 3
  recommended_consultations: 2
  
extracted_entities:
  # ... as above

context_by_source:
  codebase: # ...
  documentation: # ...
  incidents: # ...
  decisions: # ...
  similar_features: # ...
  team_knowledge: # ...

unified_context:
  by_constraint: # ...
  by_risk: # ...
  knowledge_gaps: # ...

action_items:
  before_development:
    - "Review INC-2024-089 with team"
    - "Confirm gateway idempotency key support"
    - "Schedule security review"
    
  during_development:
    - "Consult Rajesh K for gateway edge cases"
    - "Reference loan_disbursement_retry for patterns"
```

### Context Cache

Store for quick access during development:

```
.temporal/context/{{manifold_name}}/
├── context.yaml           # Full context report
├── by_constraint/         # Per-constraint context files
│   ├── B1.md
│   ├── T1.md
│   └── ...
├── code_snippets/         # Relevant code extracts
├── incident_summaries/    # Relevant incident digests
└── expert_contacts.yaml   # Who to ask about what
```

## Depth Levels

**shallow**: Entity extraction + direct file matches only
**deep**: Includes similar features, incident analysis, decision context
**exhaustive**: Adds team knowledge interviews, cross-team impact analysis

## Example Execution

```
User: /context-load payment-retry-v2 --depth=deep

Agent: Loading anticipatory context for payment-retry-v2...

**ENTITY EXTRACTION**
Found 12 entities across 15 constraints:
- 4 systems (payment_gateway, notification_service, temporal, database)
- 3 data entities (payment, retry_attempt, user_preference)
- 2 processes (retry_flow, reconciliation)
- 3 stakeholders (user, NBFC_partner, ops_team)

**CODEBASE ANALYSIS**
Analyzing repository for relevant code...
- 47 files potentially relevant
- 12 files highly relevant
- 8 files predicted to need modification

**INCIDENT ANALYSIS**
Found 8 relevant incidents in past 12 months:
🚨 INC-2024-089: Duplicate payments (HIGH RELEVANCE to B1)
⚠️ INC-2024-112: Notification delays (MEDIUM RELEVANCE to U1)
... [6 more]

**SIMILAR FEATURE ANALYSIS**
3 similar features found:
✓ loan_disbursement_retry (85% similar) - SUCCESS with lessons
✓ notification_retry (60% similar) - PARTIAL SUCCESS with warnings
✓ refund_automation (45% similar) - REFERENCE only

**KNOWLEDGE GAPS IDENTIFIED**
1. No security patterns documented for payment retry
   → Recommend: Security team consultation
2. NBFC reconciliation rules unclear
   → Recommend: Partner integration team consultation

**CONTEXT LOADED**
All context saved to .temporal/context/payment-retry-v2/

Key stats:
- 82% estimated context coverage
- 2 high-risk constraints identified
- 3 knowledge gaps requiring action
- 2 consultations recommended before development

Run `/context-query payment-retry-v2 "idempotency"` to search loaded context.
```
