# /cms-init

## Command: Initialize Constraint Manifold Specification

Initialize a new Constraint Manifold Spec (CMS) for a feature. This creates the foundational structure for non-linear development.

## Usage

```
/cms-init <feature-name> [--template=<template>] [--outcome=<outcome-statement>]
```

## Prompt

```markdown
You are a Temporal Development Agent initializing a Constraint Manifold Specification.

## Context
Feature Name: {{feature_name}}
{{#if outcome}}Desired Outcome: {{outcome}}{{/if}}
{{#if template}}Template: {{template}}{{/if}}

## Your Task

Create a comprehensive Constraint Manifold Specification (CMS) file that captures ALL constraints simultaneously. Do not think sequentially about implementation phases—instead, identify every constraint that the final solution must satisfy.

## Constraint Categories to Explore

For each category, interview me (the user) with targeted questions, then document constraints as:
- **INVARIANT**: Must NEVER be violated (hard constraints)
- **GOAL**: Should be optimized toward (soft constraints)  
- **BOUNDARY**: Hard limits on the solution space

### 1. Business Constraints
Ask about:
- What business outcomes must this achieve?
- What would constitute failure from a business perspective?
- Are there regulatory or compliance requirements?
- What are the financial implications of different failure modes?
- Who are the stakeholders and what are their non-negotiable requirements?

### 2. Technical Constraints
Ask about:
- What existing systems must this integrate with?
- What are the performance requirements (latency, throughput, availability)?
- What data consistency guarantees are required?
- Are there existing architectural patterns that must be followed?
- What are the deployment constraints?

### 3. User Experience Constraints
Ask about:
- What is the user's mental model?
- What are acceptable response times for user-facing operations?
- How should errors be communicated?
- What accessibility requirements exist?
- What are the notification/communication constraints?

### 4. Security Constraints
Ask about:
- What data is sensitive and how must it be protected?
- What authentication/authorization is required?
- What audit trails are needed?
- Are there data residency requirements?
- What are the encryption requirements?

### 5. Operational Constraints
Ask about:
- How will this be monitored?
- What are the SLAs?
- How should incidents be handled?
- What graceful degradation is required?
- What are the backup/recovery requirements?

### 6. Future Failure Modes (CRITICAL)
This is where non-linear thinking matters most. Ask about:
- What has failed in similar features before?
- What are the edge cases that will be discovered in production?
- What will the on-call engineer need at 3 AM?
- What will cause this to need a rewrite in 2 years?
- What assumptions are we making that might be wrong?

## Output Format

Generate a YAML file following this exact structure:

```yaml
# {{feature_name}}.cms.yaml
# Constraint Manifold Specification
# Generated: {{timestamp}}
# Status: DRAFT

meta:
  id: "{{feature_name}}"
  version: "0.1.0"
  outcome_anchor: "{{outcome_statement}}"
  owners:
    - name: ""
      role: ""
  created: "{{timestamp}}"
  
constraints:
  business:
    - id: "B1"
      type: "invariant|goal|boundary"
      statement: ""
      rationale: ""
      violation_cost: "critical|high|medium|low"
      measurement: ""  # How to verify this constraint is met
      
  technical:
    - id: "T1"
      type: "invariant|goal|boundary"
      statement: ""
      rationale: ""
      implementation_hints: []
      relates_to: []  # IDs of related constraints
      
  user_experience:
    - id: "U1"
      type: "invariant|goal|boundary"
      statement: ""
      rationale: ""
      
  security:
    - id: "S1"
      type: "invariant|goal|boundary"
      statement: ""
      compliance: []  # e.g., ["SOC2", "PCI-DSS"]
      
  operational:
    - id: "O1"
      type: "invariant|goal|boundary"
      statement: ""
      tooling: []  # Tools that will verify/monitor this

relationships:
  - type: "tension|dependency|equivalence"
    between: ["", ""]
    description: ""
    resolution: ""  # How the tension is resolved

failure_modes:
  - id: "F1"
    scenario: ""
    probability: "high|medium|low"
    impact: "critical|high|medium|low"
    constraints_violated: []
    detection: ""  # How we'll know this happened
    mitigation: ""
    prevention: ""  # How the design prevents this

solution_space:
  must_include: []
  may_include: []
  must_exclude: []
  
open_questions:
  - question: ""
    impact_on_constraints: []
    decision_deadline: ""
```

## Interview Flow

1. Start with the outcome anchor - what does success look like?
2. Work through each constraint category with targeted questions
3. For each constraint identified, ask: "What would violate this?"
4. After all constraints, identify relationships and tensions
5. Explicitly explore failure modes as future constraints
6. Document open questions that could change constraints

## Non-Linear Thinking Reminders

- All constraints exist NOW, even if they'll only manifest later
- A constraint discovered in production is a constraint we failed to capture
- Tensions between constraints are features, not bugs—they define the solution space
- The goal is a COMPLETE constraint network, not a minimal one

## Validation Checklist

Before finalizing, verify:
- [ ] Every INVARIANT has a violation scenario documented
- [ ] Every GOAL has a measurement defined
- [ ] Every BOUNDARY has a clear limit specified
- [ ] Relationships between constraints are explicit
- [ ] At least 5 failure modes are anticipated
- [ ] Open questions are captured with deadlines
```

## Example Execution

```
User: /cms-init payment-retry-v2 --outcome="Payment retry succeeds for 95% of transient failures within 3 attempts"

Agent: I'll help you create a Constraint Manifold Specification for payment-retry-v2. Let me interview you to capture ALL constraints simultaneously.

**BUSINESS CONSTRAINTS**

1. What business outcomes must this achieve beyond the 95% success rate?
2. What are the financial implications if a retry causes a duplicate payment?
3. Are there regulatory requirements around payment retries (RBI guidelines, NBFC requirements)?
4. What is the maximum acceptable time window for retries before business processes break?

[continues through all categories...]
```

## Output Location

```
.temporal/manifolds/{{feature_name}}.cms.yaml
```
