# /outcome-space

## Command: Generate Solution Space

Generate the SPACE of valid implementations, not a single plan. All options satisfy constraints; they differ only in trade-offs.

## Usage

```
/outcome-space <manifold> [--optimize=latency|reliability|simplicity|cost] [--limit=<n>]
```

## Prompt

```markdown
You are a Temporal Development Agent generating a solution space.

## Context
Manifold: {{manifold_path}}
Required Truths: {{truths_path}}
Context: {{context_path}}
Optimization Preference: {{optimize}}

## Core Principle

**Generate options, not decisions.**

Traditional planning: Here's what we'll build
Temporal planning: Here's the space of what we COULD build, all valid

The solution space contains ALL valid implementations. "Valid" means:
- Satisfies ALL invariant constraints
- Makes progress toward ALL goal constraints
- Stays within ALL boundary constraints
- Achieves ALL required truths

Options differ only in WHERE they sit on trade-off curves.

## Your Task

### Phase 1: Solution Space Boundaries

Define what's IN and OUT of valid solution space:

```yaml
solution_space_boundaries:
  absolute_requirements:
    # From INVARIANT constraints - non-negotiable
    - "Idempotency for all payment operations"
    - "No duplicate payments"
    - "User notification before retry"
    - "Credentials never logged"
    
  optimization_targets:
    # From GOAL constraints - should maximize
    - target: "Retry success rate"
      direction: "maximize"
      minimum_acceptable: "90%"  # Below this, solution invalid
      
    - target: "Response latency"
      direction: "minimize"
      maximum_acceptable: "500ms p99"
      
    - target: "Manual intervention rate"
      direction: "minimize"
      maximum_acceptable: "10%"
      
  hard_limits:
    # From BOUNDARY constraints - cannot exceed
    - "Retry window <= 72 hours"
    - "Notifications <= 1 per 6 hours"
    - "Must use existing Temporal infrastructure"
    - "No new external service dependencies"
    
  excluded_approaches:
    # From anti-patterns and explicit exclusions
    - "Synchronous retry in payment flow"
    - "Client-side retry logic"
    - "Retry without idempotency"
    - "Notification per retry attempt"
```

### Phase 2: Trade-off Dimensions

Identify the dimensions along which valid solutions vary:

```yaml
trade_off_dimensions:
  - dimension: "Latency vs Reliability"
    pole_a:
      name: "Optimized for latency"
      characteristics:
        - "Async everything"
        - "Fire-and-forget notifications"
        - "Eventual consistency"
      constraints_optimized: ["T3 - latency"]
      constraints_stressed: ["B1 - no duplicates", "U1 - notification"]
      
    pole_b:
      name: "Optimized for reliability"
      characteristics:
        - "Sync confirmation at each step"
        - "Guaranteed notification delivery"
        - "Strong consistency"
      constraints_optimized: ["B1", "U1"]
      constraints_stressed: ["T3"]
      
    valid_range: "Any point on spectrum satisfies all constraints"
    
  - dimension: "Simplicity vs Flexibility"
    pole_a:
      name: "Simple and rigid"
      characteristics:
        - "Fixed retry schedule"
        - "Single notification channel"
        - "Hardcoded error classification"
      pros: "Easy to understand, test, debug"
      cons: "Hard to adapt to new requirements"
      
    pole_b:
      name: "Flexible and complex"
      characteristics:
        - "Configurable retry policies"
        - "Multi-channel notification with fallback"
        - "ML-based error classification"
      pros: "Adaptable, optimizable"
      cons: "More failure modes, harder to debug"
      
  - dimension: "Build vs Integrate"
    pole_a:
      name: "Build in-house"
      characteristics:
        - "Custom retry engine"
        - "Full control"
        - "More development time"
        
    pole_b:
      name: "Integrate existing"
      characteristics:
        - "Use Temporal retry policies"
        - "Leverage existing patterns"
        - "Less custom code"
```

### Phase 3: Solution Option Generation

Generate discrete options that span the solution space:

```yaml
solution_options:
  - id: "SOL_A"
    name: "Temporal-Native Simple"
    position_on_dimensions:
      latency_vs_reliability: 0.6  # Slightly toward reliability
      simplicity_vs_flexibility: 0.2  # Simple
      build_vs_integrate: 0.8  # Integrate
      
    description: |
      Use Temporal's native retry policies with minimal custom logic.
      Fixed exponential backoff. Single notification on start and end.
      Error classification via static mapping.
      
    architecture:
      components:
        - name: "RetryWorkflow"
          type: "Temporal workflow"
          responsibility: "Orchestrate retry attempts"
          
        - name: "PaymentActivity"
          type: "Temporal activity"
          responsibility: "Execute single payment attempt"
          
        - name: "NotificationActivity"
          type: "Temporal activity"
          responsibility: "Send user notifications"
          
      data_flow:
        1: "Failed payment triggers RetryWorkflow"
        2: "Workflow executes PaymentActivity with retry policy"
        3: "On success/exhaustion, NotificationActivity fires"
        
    satisfies_constraints:
      invariants: ["B1", "T2", "U1", "S1"] # All
      goals:
        - constraint: "B2 - 80% reduction in manual intervention"
          expected: "70%"  # Slightly below target
        - constraint: "T3 - <100ms latency"
          expected: "150ms"  # Above target but within boundary
      boundaries: ["B3", "U3", "T4", "O2"]  # All
      
    trade_offs:
      pros:
        - "Simple to implement and maintain"
        - "Leverages battle-tested Temporal patterns"
        - "Easy to debug"
      cons:
        - "Less optimal retry timing"
        - "No learning/adaptation"
        - "Slightly higher latency"
        
    estimated_effort: "2 weeks"
    risk_level: "low"
    
  - id: "SOL_B"
    name: "Adaptive Retry Engine"
    position_on_dimensions:
      latency_vs_reliability: 0.5  # Balanced
      simplicity_vs_flexibility: 0.7  # More flexible
      build_vs_integrate: 0.4  # More custom
      
    description: |
      Custom retry engine with adaptive timing based on historical success rates.
      Multi-channel notification with user preference learning.
      Dynamic error classification with feedback loop.
      
    architecture:
      components:
        - name: "RetryEngine"
          type: "Custom service"
          responsibility: "Smart retry scheduling"
          
        - name: "SuccessPredictor"
          type: "ML model"
          responsibility: "Predict optimal retry timing"
          
        - name: "NotificationRouter"
          type: "Service"
          responsibility: "Channel selection and delivery"
          
        - name: "ErrorClassifier"
          type: "Rule engine + ML"
          responsibility: "Classify errors with learning"
          
    satisfies_constraints:
      invariants: ["B1", "T2", "U1", "S1"]
      goals:
        - constraint: "B2"
          expected: "85%"  # Above target
        - constraint: "T3"
          expected: "80ms"  # Below target (better)
      boundaries: ["B3", "U3", "T4", "O2"]
      
    trade_offs:
      pros:
        - "Optimal retry timing improves success rate"
        - "Better UX via preference learning"
        - "Self-improving system"
      cons:
        - "More complex to implement"
        - "More failure modes"
        - "Requires ML ops infrastructure"
        
    estimated_effort: "6 weeks"
    risk_level: "medium"
    dependencies:
      - "ML pipeline infrastructure"
      - "Feature store for predictions"
      
  - id: "SOL_C"
    name: "Queue-Based Batch Retry"
    position_on_dimensions:
      latency_vs_reliability: 0.8  # Reliability focused
      simplicity_vs_flexibility: 0.3  # Simple
      build_vs_integrate: 0.6  # Mixed
      
    description: |
      Batch-oriented retry processing. Failed payments queued and processed
      in scheduled batches. Maximum reliability, not optimized for speed.
      Single daily digest notification.
      
    architecture:
      components:
        - name: "RetryQueue"
          type: "SQS/RabbitMQ"
          responsibility: "Hold pending retries"
          
        - name: "BatchProcessor"
          type: "Scheduled job"
          responsibility: "Process retry batches"
          
        - name: "ReconciliationService"
          type: "Service"
          responsibility: "Ensure consistency"
          
    satisfies_constraints:
      invariants: ["B1", "T2", "S1"]
      goals:
        - constraint: "B2"
          expected: "90%"  # Strong on automation
        - constraint: "T3"
          expected: "N/A"  # Not real-time, different model
      boundaries: ["B3", "T4", "O2"]
      
    trade_offs:
      pros:
        - "Maximum reliability"
        - "Easy reconciliation"
        - "Low infrastructure cost"
      cons:
        - "Not real-time"
        - "User waits longer for resolution"
        - "May not meet latency expectations"
        
    estimated_effort: "3 weeks"
    risk_level: "low"
    
    constraint_notes:
      - constraint: "U1"
        status: "partially_satisfied"
        note: "Daily digest instead of per-retry notification"
        acceptable: "Requires product decision"
```

### Phase 4: Option Comparison Matrix

Create comparison for decision-making:

```yaml
comparison_matrix:
  dimensions:
    - name: "Constraint Satisfaction"
      sol_a: "All invariants, 90% goals"
      sol_b: "All invariants, 100% goals"
      sol_c: "All invariants, 85% goals"
      winner: "SOL_B"
      
    - name: "Implementation Effort"
      sol_a: "2 weeks"
      sol_b: "6 weeks"
      sol_c: "3 weeks"
      winner: "SOL_A"
      
    - name: "Operational Complexity"
      sol_a: "Low"
      sol_b: "High"
      sol_c: "Low"
      winner: "SOL_A, SOL_C"
      
    - name: "Future Adaptability"
      sol_a: "Limited"
      sol_b: "High"
      sol_c: "Limited"
      winner: "SOL_B"
      
    - name: "Risk Level"
      sol_a: "Low"
      sol_b: "Medium"
      sol_c: "Low"
      winner: "SOL_A, SOL_C"
      
  recommendation_by_priority:
    if_priority_is_speed_to_market:
      recommended: "SOL_A"
      rationale: "Fastest to implement, acceptable trade-offs"
      
    if_priority_is_optimal_outcome:
      recommended: "SOL_B"
      rationale: "Best constraint satisfaction, worth the investment"
      
    if_priority_is_low_risk:
      recommended: "SOL_A"
      rationale: "Proven patterns, minimal complexity"
      
    if_priority_is_cost:
      recommended: "SOL_C"
      rationale: "Lowest infrastructure requirements"
```

## Output Format

### Solution Space Document

```yaml
# {{manifold_name}}-solution-space.yaml

meta:
  manifold: "{{manifold_name}}"
  generated_at: "{{timestamp}}"
  options_generated: 3
  all_options_valid: true

boundaries:
  absolute_requirements: [...]
  optimization_targets: [...]
  hard_limits: [...]
  excluded_approaches: [...]

trade_off_dimensions:
  # ... dimension definitions

options:
  - id: "SOL_A"
    # ... full option detail
  - id: "SOL_B"
    # ...
  - id: "SOL_C"
    # ...

comparison:
  matrix: [...]
  recommendations: [...]

decision_required:
  question: "Which option aligns with current priorities?"
  factors_to_consider:
    - "Timeline pressure"
    - "Team capacity for complexity"
    - "Long-term evolution needs"
    - "Risk tolerance"
```

## Example Execution

```
User: /outcome-space payment-retry-v2 --optimize=reliability

Agent: Generating solution space for payment-retry-v2...

**SOLUTION SPACE BOUNDARIES**
Analyzing constraints to define valid solution space...

MUST HAVE (from invariants):
✓ Idempotency for all payment operations
✓ No duplicate payments
✓ User notification before retry
✓ Credentials never logged

MUST OPTIMIZE (from goals):
→ Retry success rate (target: 95%)
→ Manual intervention reduction (target: 80%)

MUST NOT EXCEED (from boundaries):
✗ 72 hour retry window
✗ 1 notification per 6 hours
✗ New external dependencies

**TRADE-OFF DIMENSIONS IDENTIFIED**
3 key dimensions where valid solutions can vary:
1. Latency ↔ Reliability
2. Simplicity ↔ Flexibility
3. Build ↔ Integrate

**SOLUTION OPTIONS GENERATED**

Option A: Temporal-Native Simple
├─ Effort: 2 weeks
├─ Risk: Low
├─ Reliability optimization: ★★★☆☆
└─ Best for: Speed to market

Option B: Adaptive Retry Engine
├─ Effort: 6 weeks
├─ Risk: Medium
├─ Reliability optimization: ★★★★★
└─ Best for: Optimal outcomes

Option C: Queue-Based Batch Retry
├─ Effort: 3 weeks
├─ Risk: Low
├─ Reliability optimization: ★★★★☆
└─ Best for: Maximum reliability, async acceptable

**RECOMMENDATION (given --optimize=reliability)**
SOL_B (Adaptive Retry Engine) best satisfies reliability optimization.

However, if timeline is constrained:
SOL_C provides 80% of reliability benefit at 50% of effort.

Run `/outcome-select SOL_B --rationale="Reliability is primary goal"` to proceed.
```
