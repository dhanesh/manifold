# /gen-all

## Command: Generate All Artifacts Simultaneously

Generate code, tests, documentation, and runbooks from the same constraint manifold. Consistency is structural, not verified after the fact.

## Usage

```
/gen-all <manifold> --option=<solution_id> [--dry-run] [--output=<dir>]
```

## Prompt

```markdown
You are a Temporal Development Agent generating implementation artifacts.

## Context
Manifold: {{manifold_path}}
Selected Option: {{solution_id}}
Required Truths: {{truths_path}}
Context: {{context_path}}

## Core Principle

**All artifacts derive from the same source of truth.**

Traditional: Code first → Tests that verify code → Docs that describe code
Temporal: Constraints → Code that satisfies → Tests that verify constraints → Docs that explain constraints

Because all artifacts derive from the constraint manifold, they are consistent BY CONSTRUCTION, not by verification.

## Your Task

### Phase 1: Artifact Planning

Determine what artifacts are needed:

```yaml
artifact_plan:
  code:
    - type: "workflow"
      name: "PaymentRetryWorkflow"
      satisfies_constraints: ["T2", "T4", "B3"]
      satisfies_truths: ["RT2", "RT3"]
      
    - type: "activity"
      name: "ExecutePaymentActivity"
      satisfies_constraints: ["B1", "T1"]
      satisfies_truths: ["RT1"]
      
    - type: "model"
      name: "PaymentRetryState"
      satisfies_constraints: ["T2"]
      satisfies_truths: ["RD1"]
      
    - type: "service"
      name: "ErrorClassificationService"
      satisfies_constraints: ["T1"]
      satisfies_truths: ["RT1"]
      
  tests:
    - type: "unit"
      for_code: "ErrorClassificationService"
      verifies_constraints: ["T1"]
      
    - type: "integration"
      for_code: "PaymentRetryWorkflow"
      verifies_constraints: ["B1", "T2", "T4"]
      
    - type: "chaos"
      scenario: "Gateway timeout during retry"
      verifies_failure_modes: ["F1", "F_NEW_1"]
      
  documentation:
    - type: "architecture"
      explains: "Overall retry system design"
      constraint_coverage: ["T2", "T4", "O1"]
      
    - type: "api"
      for_code: ["PaymentRetryWorkflow", "ErrorClassificationService"]
      
    - type: "runbook"
      scenario: "Retry system issues"
      covers_failure_modes: ["F1", "F2", "F_NEW_1"]
      
  observability:
    - type: "dashboard"
      name: "Retry Health"
      metrics_from_constraints: ["B2", "T3", "O1"]
      
    - type: "alerts"
      from_constraints: ["B1", "O2"]
```

### Phase 2: Code Generation

Generate code with constraint traceability:

```yaml
code_generation:
  - artifact: "payment_retry_workflow.py"
    type: "temporal_workflow"
    
    constraint_mapping:
      # Each code block maps to constraints it satisfies
      - block: "idempotency_check"
        satisfies: ["B1", "T2"]
        
      - block: "retry_policy"
        satisfies: ["B3", "T4"]
        
      - block: "notification_trigger"
        satisfies: ["U1", "U3"]
        
    generated_code: |
      # payment_retry_workflow.py
      # Generated from: payment-retry-v2.cms.yaml
      # Constraint coverage: B1, B3, T2, T4, U1, U3
      
      from temporalio import workflow, activity
      from datetime import timedelta
      from typing import Optional
      import structlog
      
      logger = structlog.get_logger()
      
      
      @workflow.defn
      class PaymentRetryWorkflow:
          """
          Orchestrates payment retry attempts.
          
          Constraints Satisfied:
          - B1: No duplicate payments (via idempotency check)
          - B3: Retry window <= 72 hours (via max_attempts + backoff)
          - T2: State machine with atomic transitions
          - T4: Uses Temporal for orchestration
          - U1: User notified before retry (via notification activity)
          - U3: Max 1 notification per 6 hours (via notification throttle)
          """
          
          def __init__(self):
              self._state = RetryState()
              
          @workflow.run
          async def run(self, payment_id: str, idempotency_key: str) -> RetryResult:
              """
              Execute retry workflow for a failed payment.
              
              Args:
                  payment_id: The payment to retry
                  idempotency_key: Key for deduplication (satisfies B1)
              """
              # [B1, T_INC089_1] Check for existing success before retry
              existing = await workflow.execute_activity(
                  check_existing_success,
                  payment_id,
                  start_to_close_timeout=timedelta(seconds=30),
              )
              if existing.succeeded:
                  logger.info("payment_already_succeeded", payment_id=payment_id)
                  return RetryResult(status="already_succeeded", attempts=0)
              
              # [U1] Notify user that retry is starting
              if self._should_notify():  # [U3] Respects rate limit
                  await workflow.execute_activity(
                      send_notification,
                      NotificationRequest(
                          payment_id=payment_id,
                          type="retry_starting",
                      ),
                      start_to_close_timeout=timedelta(seconds=30),
                  )
              
              # [T4, B3] Retry with Temporal policy, respecting time window
              retry_policy = RetryPolicy(
                  initial_interval=timedelta(minutes=5),
                  backoff_coefficient=2.0,
                  maximum_attempts=3,  # [OC2] Max 3 attempts
                  maximum_interval=timedelta(hours=24),
              )
              
              for attempt in range(3):  # [OC2]
                  self._state.current_attempt = attempt + 1
                  
                  try:
                      # [B1, T_INC089_1] Include idempotency key
                      result = await workflow.execute_activity(
                          execute_payment,
                          PaymentRequest(
                              payment_id=payment_id,
                              idempotency_key=f"{idempotency_key}_{attempt}",
                          ),
                          start_to_close_timeout=timedelta(seconds=60),
                          retry_policy=retry_policy,
                      )
                      
                      if result.status == "success":
                          # [U1] Notify success
                          await self._notify_result(payment_id, "succeeded")
                          return RetryResult(status="succeeded", attempts=attempt + 1)
                          
                      elif result.status == "permanent_failure":
                          # [RT1] Classification determined not retriable
                          break
                          
                      # Transient failure - will retry
                      
                  except Exception as e:
                      logger.error("retry_attempt_failed", 
                                   payment_id=payment_id,
                                   attempt=attempt,
                                   error=str(e))
                      
                  # Backoff before next attempt
                  await workflow.sleep(self._calculate_backoff(attempt))
              
              # [RB1] Exhausted retries - escalate
              await self._escalate(payment_id)
              return RetryResult(status="exhausted", attempts=3)
              
          def _should_notify(self) -> bool:
              """[U3] Check if notification allowed (1 per 6 hours)"""
              if self._state.last_notification is None:
                  return True
              elapsed = workflow.now() - self._state.last_notification
              return elapsed > timedelta(hours=6)
              
          def _calculate_backoff(self, attempt: int) -> timedelta:
              """[B3] Exponential backoff within 72-hour window"""
              base = timedelta(minutes=5)
              return base * (2 ** attempt)
              
          async def _escalate(self, payment_id: str):
              """[RB1] Handle exhausted retries"""
              await workflow.execute_activity(
                  escalate_to_manual_queue,
                  payment_id,
                  start_to_close_timeout=timedelta(seconds=30),
              )
              await self._notify_result(payment_id, "needs_attention")
    
    constraint_verification:
      - constraint: "B1"
        verification: "Idempotency key used in all payment calls"
        line_numbers: [52, 65]
        
      - constraint: "B3"
        verification: "Max 3 attempts with backoff < 72 hours"
        line_numbers: [45, 85]
```

### Phase 3: Test Generation

Generate tests from constraints, not from code:

```yaml
test_generation:
  - artifact: "test_payment_retry.py"
    type: "constraint_tests"
    
    generated_tests: |
      # test_payment_retry.py
      # Generated from: payment-retry-v2.cms.yaml
      # Tests verify CONSTRAINTS, not implementation details
      
      import pytest
      from unittest.mock import Mock, patch
      from datetime import timedelta
      
      
      class TestConstraintB1_NoDuplicatePayments:
          """
          Constraint: B1 (INVARIANT)
          Statement: No duplicate payments for same invoice
          
          These tests verify the constraint is satisfied regardless
          of implementation details.
          """
          
          @pytest.mark.constraint("B1")
          async def test_retry_does_not_duplicate_successful_payment(
              self, workflow_env, mock_gateway
          ):
              """
              Scenario: Payment succeeded but response was lost
              Expected: Retry detects existing success, does not charge again
              Derived from: INC-2024-089
              """
              # Arrange: Payment already succeeded
              mock_gateway.get_payment_status.return_value = PaymentStatus.SUCCEEDED
              
              # Act: Trigger retry
              result = await workflow_env.execute(
                  PaymentRetryWorkflow,
                  payment_id="PAY-123",
                  idempotency_key="KEY-456",
              )
              
              # Assert: No duplicate charge
              assert result.status == "already_succeeded"
              mock_gateway.charge.assert_not_called()
              
          @pytest.mark.constraint("B1")
          @pytest.mark.failure_mode("F_NEW_1")
          async def test_concurrent_retries_do_not_duplicate(
              self, workflow_env, mock_gateway
          ):
              """
              Scenario: Two retries triggered simultaneously
              Expected: Only one payment attempt succeeds
              """
              # Arrange
              mock_gateway.charge.side_effect = [
                  PaymentResult(status="success"),
                  PaymentResult(status="duplicate_detected"),
              ]
              
              # Act: Concurrent retries
              results = await asyncio.gather(
                  workflow_env.execute(PaymentRetryWorkflow, "PAY-123", "KEY-1"),
                  workflow_env.execute(PaymentRetryWorkflow, "PAY-123", "KEY-2"),
              )
              
              # Assert: Exactly one success
              successes = [r for r in results if r.status == "succeeded"]
              assert len(successes) == 1
              
              
      class TestConstraintU3_NotificationRateLimit:
          """
          Constraint: U3 (BOUNDARY)
          Statement: Maximum 1 notification per 6 hours
          """
          
          @pytest.mark.constraint("U3")
          async def test_multiple_retries_respect_notification_limit(
              self, workflow_env, mock_notifications
          ):
              """
              Scenario: 3 retry attempts within 1 hour
              Expected: Only 1 notification sent
              """
              # Act: Run workflow with 3 attempts
              await workflow_env.execute(
                  PaymentRetryWorkflow,
                  payment_id="PAY-123",
                  idempotency_key="KEY-456",
              )
              
              # Assert: Notification rate limited
              notification_calls = mock_notifications.send.call_count
              assert notification_calls <= 2  # Start + end only
              
              
      class TestConstraintB3_RetryWindow:
          """
          Constraint: B3 (BOUNDARY)
          Statement: Retry window must not exceed 72 hours
          """
          
          @pytest.mark.constraint("B3")
          async def test_retries_complete_within_72_hours(
              self, workflow_env
          ):
              """
              Scenario: Maximum backoff schedule
              Expected: All 3 attempts complete within 72 hours
              """
              # Calculate maximum possible duration
              # Attempt 1: immediate
              # Wait 1: 5 min
              # Attempt 2: immediate  
              # Wait 2: 10 min
              # Attempt 3: immediate
              # Total: 15 min << 72 hours ✓
              
              start = workflow_env.current_time()
              await workflow_env.execute(
                  PaymentRetryWorkflow,
                  payment_id="PAY-123",
                  idempotency_key="KEY-456",
              )
              end = workflow_env.current_time()
              
              assert (end - start) < timedelta(hours=72)
              
              
      class TestFailureMode_F_NEW_1:
          """
          Failure Mode: F_NEW_1
          Scenario: Gateway timeout after successful charge
          Source: INC-2024-089
          """
          
          @pytest.mark.failure_mode("F_NEW_1")
          @pytest.mark.chaos
          async def test_gateway_timeout_after_success(
              self, workflow_env, mock_gateway
          ):
              """
              Chaos test: Gateway charges successfully but times out on response
              Expected: System detects success on next check, no duplicate
              """
              # Arrange: Charge succeeds but raises timeout
              mock_gateway.charge.side_effect = TimeoutError()
              mock_gateway.get_payment_status.return_value = PaymentStatus.SUCCEEDED
              
              # Act
              result = await workflow_env.execute(
                  PaymentRetryWorkflow,
                  payment_id="PAY-123",
                  idempotency_key="KEY-456",
              )
              
              # Assert: Detected success, no duplicate
              assert result.status == "succeeded"
              assert mock_gateway.charge.call_count == 1  # Only one charge
              
    coverage_report:
      constraints_tested:
        - "B1": 2 tests
        - "U3": 1 test
        - "B3": 1 test
      failure_modes_tested:
        - "F_NEW_1": 1 test
      missing_coverage:
        - "T3 (latency) - needs performance test"
        - "S1 (credentials) - needs security test"
```

### Phase 4: Documentation Generation

Generate docs that explain constraints, not just code:

```yaml
documentation_generation:
  - artifact: "ARCHITECTURE.md"
    type: "architecture_doc"
    
    generated_content: |
      # Payment Retry System Architecture
      
      > Generated from: payment-retry-v2.cms.yaml
      > Last updated: {{timestamp}}
      
      ## Outcome
      
      This system achieves: **Payment retry succeeds for 95% of transient 
      failures within 3 attempts**
      
      ## Constraint Summary
      
      | ID | Type | Constraint | Implementation |
      |----|------|------------|----------------|
      | B1 | Invariant | No duplicate payments | Idempotency keys + pre-check |
      | B3 | Boundary | Retry window ≤ 72 hours | Max 3 attempts with backoff |
      | T2 | Invariant | Atomic state transitions | Temporal workflow |
      | U1 | Invariant | User notified | Notification activity |
      | U3 | Boundary | Max 1 notification/6hrs | Rate limiting in workflow |
      
      ## Architecture Decisions
      
      ### Why Temporal?
      
      Constraints T2 (atomic state) and T4 (workflow engine) are satisfied by
      Temporal's guarantees:
      - Workflow state is persisted
      - Activities are retried atomically
      - Signals allow cancellation (U2)
      
      See: ADR-007
      
      ### Why Pre-Check Before Retry?
      
      Constraint B1 (no duplicates) learned from INC-2024-089:
      - Gateway timeout ≠ payment failure
      - Must check existing success before charging
      
      ### Error Classification
      
      Required truth RT1 demands accurate transient vs permanent classification:
      
      | Error Type | Classification | Retry? |
      |------------|---------------|--------|
      | HTTP 503 | Transient | Yes |
      | HTTP 504 | Transient | Yes |
      | HTTP 400 | Permanent | No |
      | "insufficient_funds" | Permanent | No |
      | Timeout | Ambiguous | Check status |
      
      ## Failure Modes and Mitigations
      
      | Scenario | Detection | Mitigation |
      |----------|-----------|------------|
      | Gateway timeout after success | Status check returns success | No duplicate charge |
      | User cancels mid-retry | Signal handler | Graceful workflow termination |
      | Notification service down | Activity failure | Retry notification, proceed with payment |
      
      ## Observability
      
      Per constraint O1, all state transitions are traced:
      
      ```
      retry.started{payment_id, attempt}
      retry.attempt{payment_id, attempt, result}
      retry.completed{payment_id, final_status, total_attempts}
      ```
      
  - artifact: "RUNBOOK.md"
    type: "runbook"
    
    generated_content: |
      # Payment Retry Runbook
      
      > For on-call engineers handling retry system issues
      > Generated from failure modes in payment-retry-v2.cms.yaml
      
      ## Alert: High Duplicate Payment Rate
      
      **Constraint violated:** B1 (No duplicate payments)
      
      ### Symptoms
      - Alert: `payment.duplicate.rate > 0.01`
      - User complaints about double charges
      
      ### Diagnosis
      1. Check idempotency key generation:
         ```sql
         SELECT payment_id, idempotency_key, COUNT(*) 
         FROM payment_attempts 
         WHERE created_at > NOW() - INTERVAL '1 hour'
         GROUP BY payment_id, idempotency_key
         HAVING COUNT(*) > 1;
         ```
      2. Check gateway status for timeout patterns
      3. Review recent deployments for idempotency logic changes
      
      ### Resolution
      1. If gateway issue: Enable circuit breaker
      2. If code issue: Rollback and investigate
      3. For affected users: Initiate refund process
      
      ### Prevention
      - Constraint T_INC089_2 requires pre-retry success check
      - Chaos test F_NEW_1 should catch this scenario
      
      ---
      
      ## Alert: Retry Success Rate Below 90%
      
      **Constraint at risk:** Goal B2 (80% manual intervention reduction)
      
      ### Symptoms
      - Dashboard: retry_success_rate < 90%
      - Increasing manual queue depth
      
      ### Diagnosis
      1. Check failure classification accuracy:
         ```sql
         SELECT error_type, classification, COUNT(*),
                COUNT(*) FILTER (WHERE eventually_succeeded) as false_permanent
         FROM retry_attempts
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY error_type, classification;
         ```
      2. If many "false_permanent": Classification needs update
      3. If many "true_transient_failed": Gateway having issues
      
      ### Resolution
      1. Update error classification if new error types
      2. Adjust retry timing if gateway recovery is slower
      3. Scale retry workers if queue backing up
```

### Phase 5: Observability Generation

Generate dashboards and alerts from constraints:

```yaml
observability_generation:
  - artifact: "retry_dashboard.json"
    type: "grafana_dashboard"
    
    panels_from_constraints:
      - constraint: "B2"
        metric: "manual_intervention_rate"
        panel: "gauge"
        thresholds:
          - value: 0.2
            color: "green"
          - value: 0.3
            color: "yellow"
          - value: 0.5
            color: "red"
            
      - constraint: "T3"
        metric: "retry_decision_latency_p95"
        panel: "timeseries"
        alert_threshold: 100  # ms
        
      - constraint: "goal:success_rate"
        metric: "retry_success_rate"
        panel: "stat"
        target: 0.95
        
  - artifact: "alerts.yaml"
    type: "prometheus_alerts"
    
    alerts_from_constraints:
      - name: "RetryDuplicatePaymentRisk"
        constraint: "B1"
        expr: "rate(payment_duplicate_detected_total[5m]) > 0"
        severity: "critical"
        runbook: "RUNBOOK.md#duplicate-payments"
        
      - name: "RetrySuccessRateLow"
        constraint: "goal:success_rate"
        expr: "retry_success_rate < 0.9"
        for: "10m"
        severity: "warning"
```

## Output Format

### Generation Report

```yaml
# {{manifold_name}}-generation.yaml

meta:
  manifold: "{{manifold_name}}"
  option: "{{solution_id}}"
  generated_at: "{{timestamp}}"
  
summary:
  artifacts_generated: 12
  constraints_covered: 15/15 (100%)
  failure_modes_covered: 4/4 (100%)
  lines_of_code: 847
  lines_of_tests: 423
  
artifacts:
  code:
    - path: "src/workflows/payment_retry.py"
      constraints: ["B1", "B3", "T2", "T4", "U1", "U3"]
    - path: "src/services/error_classification.py"
      constraints: ["T1", "RT1"]
    - path: "src/models/retry_state.py"
      constraints: ["T2", "RD1"]
      
  tests:
    - path: "tests/test_payment_retry.py"
      constraints_tested: ["B1", "B3", "U3"]
      failure_modes_tested: ["F_NEW_1"]
      
  docs:
    - path: "docs/ARCHITECTURE.md"
    - path: "docs/RUNBOOK.md"
    
  observability:
    - path: "observability/dashboard.json"
    - path: "observability/alerts.yaml"

coverage:
  constraints:
    fully_covered: ["B1", "B3", "T2", "T4", "U1", "U3"]
    partially_covered: ["T3"]  # Needs perf test
    not_covered: []
    
  failure_modes:
    tested: ["F_NEW_1", "F1", "F2"]
    not_tested: ["F3"]  # Requires manual testing
```

## Example Execution

```
User: /gen-all payment-retry-v2 --option=SOL_A

Agent: Generating all artifacts for payment-retry-v2 (Solution A)...

**ARTIFACT PLANNING**
Determining required artifacts from manifold...

Code artifacts: 4
- PaymentRetryWorkflow (satisfies: B1, B3, T2, T4, U1, U3)
- ExecutePaymentActivity (satisfies: B1, T1)
- ErrorClassificationService (satisfies: T1, RT1)
- PaymentRetryState (satisfies: RD1)

Test artifacts: 3
- Constraint tests (B1, B3, U3)
- Failure mode tests (F_NEW_1)
- Integration tests (full flow)

Documentation: 2
- Architecture doc
- Runbook

Observability: 2
- Dashboard
- Alerts

**CODE GENERATION**
Generating code with constraint traceability...

✓ payment_retry_workflow.py (234 lines)
  Constraints covered: B1, B3, T2, T4, U1, U3
  
✓ error_classification.py (89 lines)
  Constraints covered: T1, RT1
  
✓ retry_state.py (45 lines)
  Constraints covered: RD1

**TEST GENERATION**
Generating tests from constraints...

✓ test_payment_retry.py (156 lines)
  - test_retry_does_not_duplicate_successful_payment [B1]
  - test_concurrent_retries_do_not_duplicate [B1, F_NEW_1]
  - test_multiple_retries_respect_notification_limit [U3]
  - test_retries_complete_within_72_hours [B3]
  - test_gateway_timeout_after_success [F_NEW_1]

**DOCUMENTATION GENERATION**
Generating docs from manifold...

✓ ARCHITECTURE.md (constraint-based architecture explanation)
✓ RUNBOOK.md (failure mode response procedures)

**OBSERVABILITY GENERATION**
Generating dashboards and alerts...

✓ dashboard.json (panels for B2, T3, success_rate)
✓ alerts.yaml (alerts for B1, success_rate)

**GENERATION COMPLETE**
12 artifacts generated
100% constraint coverage
4/4 failure modes with tests

Output: ./generated/payment-retry-v2/

Run `/verify-all payment-retry-v2` to verify all constraints.
```
