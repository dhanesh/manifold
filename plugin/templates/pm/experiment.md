# Experiment Constraint Template

Use: `/m0-init <experiment> --template=pm/experiment`
Covers: A/B tests, feature experiments, pricing experiments, UX experiments

## Outcome

[CUSTOMIZE: e.g., 'Determine if new checkout flow increases conversion by 10%+ with 95% confidence']

---

## Constraints

### Business

#### B1: Revenue Protection
Experiment must not cause measurable revenue loss during test period.
> **Rationale:** Protect business while learning; use holdout groups and monitoring.

#### B2: Primary Hypothesis
[CUSTOMIZE: Primary hypothesis, e.g., 'New flow increases conversion by 10%'].
> **Rationale:** Clear hypothesis enables decisive action on results.

#### B3: Experiment Duration
Experiment duration: [CUSTOMIZE: 2-4 weeks] to reach statistical significance.
> **Rationale:** Balance between speed and validity; avoid peeking.

#### B4: Minimum Detectable Effect
Minimum detectable effect: [CUSTOMIZE: 5%] improvement to justify rollout.
> **Rationale:** Define what 'success' means before seeing results.

### Technical

#### T1: Consistent Assignment
Random assignment must be consistent per user across sessions.
> **Rationale:** Inconsistent assignment invalidates results and confuses users.

#### T2: Sample Size
Sample size requirement: [CUSTOMIZE: 10,000] users per variant minimum.
> **Rationale:** Statistical power requirement for detecting MDE.

#### T3: Metric Capture
Instrumentation must capture [CUSTOMIZE: primary + 2 secondary] metrics.
> **Rationale:** Avoid post-hoc metric selection; pre-register what matters.

#### T4: Early Stopping
Experiment infrastructure should support early stopping if guardrails breached.
> **Rationale:** Limit exposure to harmful variants.

### User Experience

#### U1: Experience Quality Floor
Treatment must not degrade core user experience below [CUSTOMIZE: baseline NPS - 5 points].
> **Rationale:** Experiments should improve or neutral, not harm users.

#### U2: Experiment Transparency
Users must not be aware they are in an experiment (unless required).
> **Rationale:** Observer effect invalidates behavioral data.

#### U3: Task Completion
Treatment provides at least equivalent task completion capability.
> **Rationale:** Don't block users from accomplishing their goals.

### Security

#### S1: Data Privacy
Experiment data must be handled per [CUSTOMIZE: GDPR/privacy policy].
> **Rationale:** Experimentation data is still personal data.

#### S2: Experiment Registry
Experiment must be documented in experiment registry before launch.
> **Rationale:** Auditability and prevents p-hacking.

#### S3: Data Minimization
Minimize data retention to experiment duration + [CUSTOMIZE: 90 days].
> **Rationale:** Data minimization principle.

### Operational

#### O1: Guardrail Monitoring
Monitoring must alert if treatment shows [CUSTOMIZE: >10%] degradation in guardrail metrics.
> **Rationale:** Automatic protection against harmful experiments.

#### O2: Rollback Capability
Rollback capability must exist within [CUSTOMIZE: 1 hour] of issue detection.
> **Rationale:** Limit blast radius of failed experiments.

#### O3: Analysis Timeline
Analysis report ready within [CUSTOMIZE: 3 days] of experiment end.
> **Rationale:** Timely decisions while context is fresh.

---

## Tensions

### TN1: Duration vs Sample Size
Shorter duration (B3) vs sample size requirements (T2).
> **Resolution:** [CUSTOMIZE: Consider traffic allocation or accepting larger MDE].

### TN2: Small Effect Detection vs UX Risk
Detecting small effects (B4) requires larger exposure to potentially worse UX (U1).
> **Resolution:** [CUSTOMIZE: Define acceptable risk vs learning value].

### TN3: Rich Instrumentation vs Analysis Capacity
Rich instrumentation (T3) requires analysis capacity (O3).
> **Resolution:** [CUSTOMIZE: Pre-define analysis plan and owner].

---

## Required Truths

### RT-1: Pre-Registered Hypothesis
Hypothesis and success criteria documented before launch.
**Maps to:** B2, B4

### RT-2: Unbiased Randomization
Randomization is unbiased and verifiable.
**Maps to:** T1, T2

### RT-3: Guardrail Monitoring
Guardrail metrics are monitored with alerting.
**Maps to:** O1, U1

### RT-4: Analysis Ownership
Analysis owner and timeline are assigned.
**Maps to:** O3

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Define clear hypothesis in B2
- Calculate sample size for T2 based on baseline conversion and MDE
- Set appropriate experiment duration in B3
- Identify guardrail metrics for O1

### Optional Additions
- Add segmentation constraints (mobile vs desktop, new vs returning)
- Add geo constraints if regional experiment
- Add exclusion criteria (e.g., exclude power users)
- Add novelty effect considerations for long-term experiments

### Common Removals
- Remove S3 if standard data retention policy applies
- Remove U2 if disclosure is required (medical, financial)
