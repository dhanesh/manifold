# Go-to-Market Strategy Constraint Template

Use: `/m0-init <feature> --template=pm/go-to-market`
Covers: GTM planning, product launches, market entry strategy, sales enablement

## Outcome

[CUSTOMIZE: e.g., 'Coordinated go-to-market launch achieving target revenue and user adoption with all teams prepared and infrastructure ready']

### Framework Mapping

This template integrates GTM strategy patterns from Smartsheet, Miro, and Asana's launch planning frameworks. Revenue Target (B1) and Pricing (B2) map to standard GTM financial planning. Channel Strategy (U3) and Sales Enablement (T1) draw from B2B/B2C launch playbooks. Launch Milestones (O1) and Success KPIs (O2) implement Asana's structured launch management approach. Cross-Functional Readiness (O3) ensures organizational alignment.

---

## Constraints

### Business

#### B1: Revenue Target
Launch achieves [CUSTOMIZE: e.g., revenue or user acquisition target] within [CUSTOMIZE: e.g., 90 days] of general availability.
> **Rationale:** A launch without measurable business targets cannot be evaluated. Pre-defined targets create accountability and enable rapid course correction.

#### B2: Pricing Strategy
Pricing validated with [CUSTOMIZE: e.g., 20] target customers through interviews, surveys, or willingness-to-pay analysis before launch.
> **Rationale:** Pricing set without customer input is guesswork. Pre-launch validation prevents costly post-launch price adjustments that damage credibility.

#### B3: Market Positioning
Clear positioning statement tested with target audience, differentiating from [CUSTOMIZE: e.g., 3] primary alternatives.
> **Rationale:** Undifferentiated positioning produces undifferentiated results. Testing positioning before launch prevents expensive market confusion.

#### B4: Partnership Strategy
[CUSTOMIZE: e.g., 2] strategic partnerships identified with clear value exchange and timeline for activation.
> **Rationale:** Partnerships extend reach and credibility but require lead time. Early identification ensures partners are ready at launch, not months after.

### Technical

#### T1: Launch Infrastructure
Landing page, analytics instrumentation, CRM integration, and payment processing (if applicable) fully functional before launch date.
> **Rationale:** Infrastructure gaps at launch waste marketing spend and damage first impressions. Every visitor who encounters broken infrastructure is a lost conversion.

#### T2: Scalability Check
Infrastructure validated to handle [CUSTOMIZE: e.g., 10x] expected launch traffic with degradation plan for higher loads.
> **Rationale:** Successful launches can generate traffic spikes that overwhelm unprepared infrastructure. Planning for success prevents it from becoming failure.

### User Experience

#### U1: Target Audience Defined
Ideal Customer Profile documented with firmographics, behavioral attributes, and validated through existing customer data or research.
> **Rationale:** Marketing to everyone is marketing to no one. A precise ICP focuses spend, messaging, and sales effort where conversion probability is highest.

#### U2: Customer Journey Mapped
Awareness-to-purchase journey documented with touchpoints, conversion expectations, and drop-off mitigation strategies for each stage.
> **Rationale:** Understanding the full journey reveals where prospects are lost. Stage-by-stage planning ensures no critical touchpoint is neglected.

#### U3: Activation Metric
[CUSTOMIZE: e.g., 30%] of signups reach activation milestone within [CUSTOMIZE: e.g., 7 days] of first use.
> **Rationale:** Signups without activation waste acquisition spend. Defining and measuring the activation milestone ensures the product delivers value quickly enough to retain users.

### Security

#### S1: Compliance Review
All marketing materials, pricing claims, and product descriptions reviewed for regulatory compliance in target markets.
> **Rationale:** Non-compliant marketing creates legal liability that far exceeds the cost of pre-launch review. This is especially critical for regulated industries.

#### S2: Competitive Response Plan
Anticipated competitive responses documented with counter-strategies for likely pricing, feature, or messaging reactions.
> **Rationale:** Competitors will respond to a successful launch. Having counter-strategies prepared prevents reactive, poorly considered responses.

### Operational

#### O1: Launch Checklist
All-hands launch checklist with named owners, deadlines, and dependency mapping. No item without an owner.
> **Rationale:** Launches fail on coordination, not capability. A checklist with ownership ensures nothing falls between teams and every dependency is tracked.

#### O2: Sales Enablement
Sales team trained with pitch deck, FAQ, objection handling guide, and competitive battle cards before launch.
> **Rationale:** Sales readiness at launch multiplies marketing investment. Unprepared sales teams waste qualified leads and damage brand perception.

#### O3: Post-Launch Review
Retrospective scheduled within [CUSTOMIZE: e.g., 2 weeks] of launch with pre-defined review criteria and stakeholder attendance.
> **Rationale:** Timely retrospectives capture learnings while context is fresh. Delaying review causes institutional amnesia and repeated mistakes.

---

## Tensions

### TN1: Revenue Urgency vs Pricing Validation
Pressure to hit revenue targets quickly (B1) conflicts with the time needed for thorough pricing validation (B2). Rushing to launch may mean launching with unvalidated pricing.
> **Resolution:** [CUSTOMIZE: Consider launching with provisional pricing to a limited audience while continuing validation, or define minimum viable pricing validation criteria].

### TN2: Activation Optimization vs Launch Infrastructure
Optimizing the activation experience (U3) competes for engineering resources with launch infrastructure readiness (T1). Both need to be ready at launch.
> **Resolution:** [CUSTOMIZE: Prioritize infrastructure that directly impacts activation, defer non-critical infrastructure, and define the minimum activation path for launch].

### TN3: Sales Enablement vs Finalized Positioning
Sales training (O2) requires finalized positioning (B3), but positioning may still be evolving close to launch. Training too early means retraining; training too late means unprepared sales.
> **Resolution:** [CUSTOMIZE: Define a positioning freeze date that allows sufficient sales training time, and plan for a brief refresher if positioning changes after freeze].

---

## Required Truths

### RT-1: Market-Product Fit Validated
Target audience, positioning, and revenue targets are aligned and validated through customer evidence, not internal assumptions.
**Maps to:** B1, U1, B3

### RT-2: Launch Readiness Confirmed
Infrastructure, sales enablement, and launch coordination are complete with all checklist items owned and verified.
**Maps to:** O1, O2, T1

### RT-3: Revenue Model Tested
Pricing strategy and activation metrics are validated with real customer data or credible proxies.
**Maps to:** B2, U3

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Define revenue or user acquisition targets in B1
- Set the number of pricing validation conversations in B2
- Identify primary competitive alternatives for positioning in B3
- Define the activation milestone and target in U3
- Set the post-launch review timeline in O3

### Optional Additions
- Add channel strategy constraints for multi-channel launches
- Add geographic rollout constraints for international launches
- Add influencer/analyst relations constraints for market awareness
- Add content marketing constraints for demand generation
- Add customer success constraints for post-launch retention

### Common Removals
- Remove B4 if partnerships are not part of the GTM strategy
- Remove S2 if launching in a non-competitive or new market
- Remove T2 if traffic expectations are modest and infrastructure is proven
