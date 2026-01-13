# /cms-extract

## Command: Extract Constraints from Existing Documentation

Parse existing PRDs, technical specs, meeting notes, and other documents to extract constraints and populate a CMS.

## Usage

```
/cms-extract --source=<file|url|text> [--manifold=<existing-cms>] [--mode=append|merge|new]
```

## Prompt

```markdown
You are a Temporal Development Agent extracting constraints from existing documentation.

## Context
Source Documents: {{sources}}
{{#if existing_manifold}}Existing Manifold: {{existing_manifold}}{{/if}}
Mode: {{mode}}

## Your Task

Analyze the provided documentation and extract ALL constraints, whether explicitly stated or implied. Transform sequential/narrative requirements into simultaneous constraints.

## Extraction Rules

### Identifying Explicit Constraints
Look for language patterns that indicate constraints:

**INVARIANT indicators:**
- "must", "shall", "will always", "never", "required"
- "critical", "mandatory", "non-negotiable"
- Legal/compliance language
- Security requirements

**GOAL indicators:**
- "should", "ideally", "target", "aim for"
- Metrics with targets (e.g., "99.9% uptime")
- User satisfaction language
- Performance aspirations

**BOUNDARY indicators:**
- "maximum", "minimum", "limit", "no more than", "at least"
- Time constraints ("within 24 hours")
- Resource constraints ("using existing infrastructure")
- Scope boundaries ("out of scope", "phase 2")

### Identifying Implicit Constraints
These are harder but critical:

1. **Assumptions stated as facts**
   - "The user will have a valid session" → INVARIANT: Session validation required
   - "This runs on our standard infra" → BOUNDARY: Must be compatible with standard infra

2. **Capabilities implied by features**
   - "Retry failed payments" → INVARIANT: Must detect payment failures
   - "Notify user of status" → BOUNDARY: User contact info must be available

3. **Negative space (what's NOT said)**
   - If security isn't mentioned → ASK: What are the security constraints?
   - If error handling isn't mentioned → FLAG: Error handling constraints missing

4. **Stakeholder concerns in meeting notes**
   - "John asked about scale" → GOAL: Performance at scale
   - "Finance worried about reconciliation" → INVARIANT: Reconciliation accuracy

### Transformation Patterns

**Sequential → Simultaneous:**
```
Original: "First we'll build the retry logic, then add notifications, 
          then handle edge cases"

Extracted Constraints:
- T1 (INVARIANT): Retry logic must handle all defined failure types
- U1 (INVARIANT): Users notified before each retry attempt  
- T2 (INVARIANT): Edge cases [list them] must be handled
- Relationship: T1 enables U1, U1 independent of T2
```

**Vague → Specific:**
```
Original: "Should be fast"

Prompt for clarification, then:
- T3 (GOAL): Response time < 200ms p95
- T4 (BOUNDARY): Response time < 1s p99
```

**Feature → Constraint:**
```
Original: "Add a dashboard for retry monitoring"

Extracted Constraints:
- O1 (GOAL): Retry status visible in real-time
- O2 (INVARIANT): All state transitions logged
- O3 (BOUNDARY): Dashboard uses existing observability stack
```

## Output Format

Generate two outputs:

### 1. Extraction Report

```yaml
# extraction-report.yaml

source_analysis:
  - source: "{{source_name}}"
    type: "prd|tech_spec|meeting_notes|slack|email"
    constraints_found: 12
    implicit_constraints: 5
    gaps_identified: 3

extracted_constraints:
  explicit:
    - id: "B1"
      source: "{{source_name}}"
      original_text: "Must not create duplicate payments"
      constraint_type: "invariant"
      domain: "business"
      statement: "No duplicate payments for same invoice"
      confidence: "high"
      
  implicit:
    - id: "T1"
      source: "{{source_name}}"
      original_text: "The retry service calls the payment gateway"
      implied_constraint: "Payment gateway API must be accessible"
      constraint_type: "boundary"
      domain: "technical"
      statement: "Must integrate with existing payment gateway API"
      confidence: "medium"
      needs_validation: true
      
  gaps:
    - domain: "security"
      observation: "No security requirements mentioned"
      suggested_questions:
        - "What data is sensitive in the retry flow?"
        - "What authentication is required?"
        - "Are there audit requirements?"
        
    - domain: "operational"
      observation: "No failure handling specified"
      suggested_questions:
        - "What happens if retry service is down?"
        - "What are the SLAs for this feature?"

relationships_inferred:
  - type: "dependency"
    from: "T1"
    to: "B1"
    inference: "Idempotency required to prevent duplicates"
    confidence: "high"
    
  - type: "tension"
    between: ["U1", "U3"]  
    inference: "Notification frequency vs user annoyance"
    confidence: "medium"
    needs_resolution: true

failure_modes_inferred:
  - id: "F1"
    inferred_from: "Retry logic discussion"
    scenario: "Retry succeeds but notification fails"
    constraints_affected: ["U1", "B2"]
    confidence: "medium"
```

### 2. CMS Update/Creation

If mode=new, create new CMS.
If mode=append, add to existing CMS with source annotations.
If mode=merge, intelligently merge with existing, flagging conflicts.

```yaml
# Merged/new CMS with extraction metadata

constraints:
  business:
    - id: "B1"
      type: "invariant"
      statement: "No duplicate payments for same invoice"
      _extraction:
        source: "prd.md"
        original_text: "Must not create duplicate payments"
        confidence: "high"
        validated: false
```

## Interactive Mode

After extraction, enter interactive mode to:

1. **Validate implicit constraints**
   ```
   I inferred this constraint from the document:
   T1 (BOUNDARY): Must integrate with existing payment gateway API
   
   Is this correct? Should I:
   a) Accept as-is
   b) Modify the statement
   c) Reject - not a real constraint
   d) Flag for stakeholder validation
   ```

2. **Fill gaps**
   ```
   I noticed no security constraints were mentioned.
   
   For a payment retry feature, I'd expect constraints around:
   - Payment credential handling
   - Audit logging
   - Authorization for retry operations
   
   Should I:
   a) Add these as draft constraints for review
   b) Generate questions for stakeholders
   c) Skip - will be handled separately
   ```

3. **Resolve ambiguities**
   ```
   The document says "should be fast" without specifics.
   
   What are the actual performance constraints?
   - p50 latency target: ___
   - p95 latency target: ___
   - p99 latency boundary: ___
   ```

## Example Execution

```
User: /cms-extract --source=prd.md --source=tech-review-notes.md --manifold=payment-retry-v2

Agent: Analyzing 2 documents for constraint extraction...

**EXTRACTION SUMMARY**

From prd.md:
- 8 explicit constraints found
- 4 implicit constraints inferred
- 2 gaps identified (security, error handling)

From tech-review-notes.md:
- 5 explicit constraints found
- 3 implicit constraints inferred  
- 1 conflict with existing manifold detected

**CONFLICTS REQUIRING RESOLUTION**

Existing T3: "Response time < 200ms p95"
New (from tech-review): "Response time < 500ms acceptable for retries"

These are in tension. Options:
a) Keep stricter constraint (200ms)
b) Accept looser constraint (500ms)
c) Split: Initial attempt 200ms, retry 500ms
d) Discuss with stakeholders

Your choice: 
```

## Validation Checklist

Before completing extraction:
- [ ] All explicit constraints captured with source attribution
- [ ] Implicit constraints flagged for validation
- [ ] Gaps documented with suggested questions
- [ ] Conflicts with existing manifold resolved
- [ ] Confidence levels assigned to all extracted items
- [ ] Failure modes inferred from feature descriptions
```

## Output Location

```
.temporal/manifolds/{{manifold_name}}.cms.yaml (updated)
.temporal/extraction/{{manifold_name}}-{{timestamp}}.extraction.yaml (report)
```
