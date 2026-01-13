# /verify-all

## Command: Verify All Artifacts Against All Constraints

Verify that generated (or existing) artifacts satisfy ALL constraints in the manifold. This is NOT testing code—it's verifying constraint satisfaction.

## Usage

```
/verify-all <manifold> [--artifacts=<dir>] [--fix] [--report=<format>]
```

## Prompt

```markdown
You are a Temporal Development Agent performing constraint verification.

## Context
Manifold: {{manifold_path}}
Artifacts Directory: {{artifacts_dir}}
Mode: {{verify|fix}}

## Core Principle

**Verification is about constraints, not code correctness.**

Traditional testing: Does the code work?
Temporal verification: Does the code satisfy all constraints?

A piece of code can "work" but still violate constraints. Verification ensures:
1. Every INVARIANT is enforced
2. Every GOAL is measured and tracked
3. Every BOUNDARY is respected
4. Every FAILURE MODE is handled

## Your Task

### Phase 1: Constraint-to-Artifact Mapping

Map each constraint to artifacts that should satisfy it:

```yaml
constraint_artifact_mapping:
  - constraint_id: "B1"
    statement: "No duplicate payments"
    type: "invariant"
    
    expected_in_artifacts:
      code:
        - file: "payment_retry_workflow.py"
          expected_pattern: "idempotency"
          verification: "Must use idempotency key in payment calls"
          
        - file: "payment_retry_workflow.py"
          expected_pattern: "check_existing_success"
          verification: "Must check for existing success before retry"
          
      tests:
        - file: "test_payment_retry.py"
          expected_test: "test_retry_does_not_duplicate"
          verification: "Must have test for duplicate prevention"
          
        - file: "test_payment_retry.py"
          expected_test: "test_concurrent_retries"
          verification: "Must test concurrent retry scenario"
          
      documentation:
        - file: "RUNBOOK.md"
          expected_section: "duplicate payment"
          verification: "Must document duplicate payment handling"
          
  - constraint_id: "T3"
    statement: "p99 latency < 100ms"
    type: "goal"
    
    expected_in_artifacts:
      code:
        - file: "payment_retry_workflow.py"
          expected_pattern: "timeout.*30"
          verification: "Timeout settings should enable <100ms goal"
          
      tests:
        - file: "test_performance.py"
          expected_test: "test_latency_p99"
          verification: "Must have performance test"
          
      observability:
        - file: "dashboard.json"
          expected_metric: "latency_p99"
          verification: "Must track latency metric"
          
        - file: "alerts.yaml"
          expected_alert: "LatencyHigh"
          verification: "Must alert on latency violation"
```

### Phase 2: Static Analysis Verification

Analyze artifacts for constraint satisfaction:

```yaml
static_verification:
  - constraint: "B1"
    artifact: "payment_retry_workflow.py"
    
    checks:
      - check: "idempotency_key_usage"
        pattern: "idempotency_key"
        result: "found"
        locations:
          - line: 65
            code: "idempotency_key=f\"{idempotency_key}_{attempt}\""
        status: "✓ SATISFIED"
        
      - check: "pre_retry_success_check"
        pattern: "check_existing_success|get_payment_status"
        result: "found"
        locations:
          - line: 52
            code: "existing = await workflow.execute_activity(check_existing_success"
        status: "✓ SATISFIED"
        
      - check: "no_blind_retry"
        anti_pattern: "except.*:.*retry"
        result: "not_found"
        status: "✓ SATISFIED (anti-pattern absent)"
        
  - constraint: "S1"
    artifact: "payment_retry_workflow.py"
    
    checks:
      - check: "no_credential_logging"
        anti_pattern: "log.*(password|credential|card_number|cvv)"
        result: "not_found"
        status: "✓ SATISFIED"
        
      - check: "no_credential_storage"
        anti_pattern: "self\\.(password|credential|card)"
        result: "not_found"
        status: "✓ SATISFIED"
        
  - constraint: "U3"
    artifact: "payment_retry_workflow.py"
    
    checks:
      - check: "notification_rate_limit"
        pattern: "_should_notify|rate_limit|timedelta.*hours.*6"
        result: "found"
        locations:
          - line: 78
            code: "def _should_notify(self)"
          - line: 82
            code: "return elapsed > timedelta(hours=6)"
        status: "✓ SATISFIED"
```

### Phase 3: Test Coverage Verification

Verify tests exist for constraints:

```yaml
test_coverage_verification:
  - constraint: "B1"
    required_test_scenarios:
      - scenario: "Retry does not duplicate successful payment"
        test_exists: true
        test_name: "test_retry_does_not_duplicate_successful_payment"
        test_file: "test_payment_retry.py"
        status: "✓ COVERED"
        
      - scenario: "Concurrent retries handled safely"
        test_exists: true
        test_name: "test_concurrent_retries_do_not_duplicate"
        status: "✓ COVERED"
        
      - scenario: "Gateway timeout after success"
        test_exists: true
        test_name: "test_gateway_timeout_after_success"
        status: "✓ COVERED"
        
  - constraint: "T3"
    required_test_scenarios:
      - scenario: "Latency under threshold"
        test_exists: false
        status: "✗ MISSING"
        recommendation: "Add performance test measuring p99 latency"
        
  - constraint: "B3"
    required_test_scenarios:
      - scenario: "Retries complete within 72 hours"
        test_exists: true
        status: "✓ COVERED"
```

### Phase 4: Documentation Verification

Verify documentation covers constraints:

```yaml
documentation_verification:
  architecture_doc:
    - constraint: "B1"
      documented: true
      section: "Why Pre-Check Before Retry?"
      completeness: "full"
      status: "✓ DOCUMENTED"
      
    - constraint: "T4"
      documented: true
      section: "Why Temporal?"
      completeness: "full"
      status: "✓ DOCUMENTED"
      
  runbook:
    - failure_mode: "F_NEW_1"
      documented: true
      section: "Alert: High Duplicate Payment Rate"
      includes_diagnosis: true
      includes_resolution: true
      includes_prevention: true
      status: "✓ DOCUMENTED"
      
    - failure_mode: "F2"
      documented: false
      status: "✗ MISSING"
      recommendation: "Add runbook section for user cancellation scenario"
```

### Phase 5: Observability Verification

Verify monitoring covers constraints:

```yaml
observability_verification:
  dashboards:
    - constraint: "B2"
      metric_tracked: true
      metric_name: "manual_intervention_rate"
      panel_exists: true
      status: "✓ MONITORED"
      
    - constraint: "T3"
      metric_tracked: true
      metric_name: "retry_decision_latency_p95"
      panel_exists: true
      threshold_set: true
      status: "✓ MONITORED"
      
  alerts:
    - constraint: "B1"
      alert_exists: true
      alert_name: "RetryDuplicatePaymentRisk"
      severity: "critical"
      runbook_linked: true
      status: "✓ ALERTING"
      
    - constraint: "O2"
      alert_exists: false
      status: "✗ MISSING"
      recommendation: "Add alert for retry service degradation"
```

### Phase 6: Verification Report

Generate comprehensive verification report:

```yaml
verification_report:
  summary:
    total_constraints: 15
    fully_satisfied: 12
    partially_satisfied: 2
    not_satisfied: 1
    
    overall_status: "NEEDS_WORK"
    
    blocking_issues:
      - constraint: "T3"
        issue: "No performance test"
        severity: "medium"
        
    warnings:
      - constraint: "O2"
        issue: "Missing degradation alert"
        severity: "low"
        
  by_constraint:
    - id: "B1"
      statement: "No duplicate payments"
      status: "✓ FULLY SATISFIED"
      evidence:
        code: "Idempotency key + pre-check verified"
        tests: "3 relevant tests found"
        docs: "Documented in architecture and runbook"
        observability: "Alert configured"
        
    - id: "T3"
      statement: "p99 latency < 100ms"
      status: "◐ PARTIALLY SATISFIED"
      evidence:
        code: "Timeout settings appropriate"
        tests: "✗ Missing performance test"
        docs: "Documented"
        observability: "Metric tracked"
      gaps:
        - "Performance test required to verify constraint"
        
    - id: "S2"
      statement: "Retry authenticated via original session"
      status: "✗ NOT VERIFIED"
      evidence:
        code: "No authentication logic found"
        tests: "No auth tests"
      gaps:
        - "Authentication implementation missing"
        - "Tests missing"
        
  by_failure_mode:
    - id: "F_NEW_1"
      scenario: "Gateway timeout after success"
      status: "✓ HANDLED"
      evidence:
        code: "Pre-check logic handles this"
        test: "Chaos test exists"
        runbook: "Documented"
        
    - id: "F2"
      scenario: "User cancels mid-retry"
      status: "◐ PARTIALLY HANDLED"
      evidence:
        code: "Signal handler exists"
        test: "No test"
        runbook: "Not documented"
        
  action_items:
    critical: []
    
    high:
      - "Add performance test for T3"
      - "Implement authentication for S2"
      
    medium:
      - "Add test for F2 (user cancellation)"
      - "Document F2 in runbook"
      
    low:
      - "Add degradation alert for O2"
```

## Fix Mode

With `--fix`, attempt automatic fixes:

```yaml
fix_actions:
  - constraint: "T3"
    issue: "Missing performance test"
    fix_type: "generate"
    action: "Generate performance test template"
    generated:
      file: "test_performance.py"
      content: |
        @pytest.mark.performance
        @pytest.mark.constraint("T3")
        async def test_retry_decision_latency_p99():
            """
            Constraint: T3 - p99 latency < 100ms
            Generated: Needs implementation
            """
            # TODO: Implement performance test
            # Measure retry decision latency across 100 samples
            # Assert p99 < 100ms
            pass
            
  - constraint: "O2"
    issue: "Missing degradation alert"
    fix_type: "generate"
    action: "Add alert definition"
    generated:
      file: "alerts.yaml"
      append: |
        - name: "RetryServiceDegraded"
          constraint: "O2"
          expr: "retry_service_health < 0.9"
          for: "5m"
          severity: "warning"
          runbook: "RUNBOOK.md#service-degradation"
```

## Output Format

### Verification Report

```
.temporal/verification/{{manifold_name}}-{{timestamp}}.yaml
```

### Console Output

```
VERIFICATION REPORT: payment-retry-v2
═══════════════════════════════════════

CONSTRAINTS
───────────
✓ B1  No duplicate payments              SATISFIED
✓ B2  80% manual intervention reduction  SATISFIED (goal: 80%, measured: 85%)
✓ B3  Retry window <= 72 hours           SATISFIED
◐ T3  p99 latency < 100ms                PARTIAL (missing test)
✓ T4  Use Temporal                       SATISFIED
✗ S2  Session authentication             NOT SATISFIED

FAILURE MODES
─────────────
✓ F_NEW_1  Gateway timeout after success    HANDLED
◐ F2       User cancels mid-retry           PARTIAL (no runbook)

SUMMARY
───────
Constraints: 12/15 fully satisfied (80%)
Failure modes: 3/4 handled (75%)
Status: NEEDS WORK

ACTION ITEMS
────────────
[HIGH] Add performance test for T3
[HIGH] Implement authentication for S2
[MED]  Add test for user cancellation (F2)
[MED]  Document F2 in runbook
[LOW]  Add degradation alert for O2

Run `/verify-all payment-retry-v2 --fix` to generate fixes.
```

## Example Execution

```
User: /verify-all payment-retry-v2

Agent: Verifying payment-retry-v2 against constraint manifold...

**STATIC ANALYSIS**
Analyzing code artifacts for constraint patterns...

B1 (No duplicate payments):
  ✓ Idempotency key found (line 65)
  ✓ Pre-check logic found (line 52)
  ✓ No blind retry anti-pattern
  
S1 (Credentials never logged):
  ✓ No credential logging patterns found
  ✓ No credential storage patterns found
  
U3 (Notification rate limit):
  ✓ Rate limiting logic found (line 78-82)

**TEST COVERAGE**
Verifying tests cover constraint scenarios...

B1: ✓ 3/3 scenarios tested
T3: ✗ 0/1 scenarios tested (MISSING: performance test)
B3: ✓ 1/1 scenarios tested
U3: ✓ 1/1 scenarios tested

**DOCUMENTATION COVERAGE**
Verifying docs cover constraints and failure modes...

Architecture: 12/15 constraints documented
Runbook: 3/4 failure modes documented (MISSING: F2)

**OBSERVABILITY COVERAGE**
Verifying monitoring covers constraints...

Dashboards: 4/5 metrics tracked
Alerts: 3/4 alerts configured (MISSING: O2 degradation)

═══════════════════════════════════════
VERIFICATION RESULT: NEEDS WORK
═══════════════════════════════════════

80% of constraints fully satisfied.
3 action items to address.

See full report: .temporal/verification/payment-retry-v2-20240115.yaml
```
