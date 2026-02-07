# Competitive Analysis Constraint Template

Use: `/m0-init <feature> --template=pm/competitive-analysis`
Covers: Market positioning analysis, competitive strategy, feature benchmarking

## Outcome

[CUSTOMIZE: e.g., 'Comprehensive competitive landscape map with actionable positioning strategy and identified differentiators']

### Framework Mapping

This template draws from Atlassian's competitive analysis practices and Product School's market positioning frameworks. Competitor Coverage (B1) and Feature Matrix (B2) map to standard competitive intelligence gathering. SWOT (B3) adapts the classic strategic planning tool. Positioning Strategy (U1) and Messaging (U3) draw from positioning theory (April Dunford). Refresh Cadence (O2) ensures ongoing competitive awareness.

---

## Constraints

### Business

#### B1: Competitor Coverage
Top [CUSTOMIZE: e.g., 5] direct competitors analyzed with complete profiles including product capabilities, market positioning, and business model.
> **Rationale:** Incomplete competitor coverage creates blind spots that lead to poor positioning decisions. Covering top direct competitors ensures awareness of the primary competitive threats.

#### B2: Feature Matrix
Feature comparison covers [CUSTOMIZE: e.g., 10] key capabilities across all identified competitors with objective scoring.
> **Rationale:** A structured feature matrix transforms subjective impressions into comparable data. It reveals capability gaps and opportunities that anecdotal analysis misses.

#### B3: Competitive Moat
[CUSTOMIZE: e.g., 3] sustainable differentiators identified and validated against competitor trajectories.
> **Rationale:** Differentiators that competitors can replicate quickly are not moats. Identifying defensible advantages drives long-term strategy, not just short-term positioning.

### Technical

#### T1: Technical Comparison
Stack, architecture, and integration comparison documented for each competitor using publicly available information.
> **Rationale:** Technical architecture choices constrain product capabilities. Understanding competitor technical decisions reveals structural advantages and limitations.

#### T2: Integration Advantage
Integration capabilities vs competitors mapped, including API availability, ecosystem breadth, and partnership landscape.
> **Rationale:** Integration ecosystems create switching costs and network effects. Mapping these advantages identifies where to build vs. where competitors are entrenched.

### User Experience

#### U1: User Perception
User perception of competitors validated with data from [CUSTOMIZE: e.g., review sites, surveys, or interviews].
> **Rationale:** Internal assumptions about competitor weaknesses often diverge from actual user experience. Data-backed perception prevents building on false premises.

#### U2: Switching Cost Analysis
Switching costs to and from each competitor documented including data portability, workflow migration, and retraining effort.
> **Rationale:** Switching costs determine competitive dynamics. High inbound switching costs require stronger value propositions; high outbound costs protect existing users.

#### U3: UX Benchmarking
UX quality benchmarked against top [CUSTOMIZE: e.g., 3] competitors on key workflow tasks.
> **Rationale:** UX comparison on specific tasks reveals where competitors excel or struggle, directly informing product design priorities.

### Security

#### S1: Competitive Intelligence Ethics
No proprietary, confidential, or illegally obtained data used in analysis. All sources publicly available or properly licensed.
> **Rationale:** Ethical intelligence gathering protects the organization from legal liability and reputational damage. Short-term information advantage never justifies long-term risk.

#### S2: Pricing Intelligence
Pricing models compared within publicly available data, including published pricing pages, public case studies, and analyst reports.
> **Rationale:** Pricing comparison informs market positioning but must stay within legal bounds. Using only public data prevents antitrust concerns and maintains ethical standards.

### Operational

#### O1: Refresh Cadence
Analysis refreshed every [CUSTOMIZE: e.g., 6 months] or upon significant competitor events (funding, launches, pivots).
> **Rationale:** Competitive landscapes shift continuously. Stale analysis leads to decisions based on outdated information. Regular refreshes balance effort with currency.

#### O2: SWOT Summary
SWOT analysis with actionable recommendations, prioritized by impact and feasibility.
> **Rationale:** Analysis without recommendations is academic. A prioritized SWOT converts insight into strategy and gives stakeholders clear next steps.

---

## Tensions

### TN1: Competitor Coverage Breadth vs Refresh Frequency
Analyzing more competitors (B1) increases the effort required to maintain refresh cadence (O1). Broader coverage means each refresh takes longer, potentially leading to stale data.
> **Resolution:** [CUSTOMIZE: Consider tiering competitors into primary (deep analysis, frequent refresh) and secondary (lighter analysis, less frequent refresh)].

### TN2: Differentiation Claims vs Technical Reality
Claimed sustainable differentiators (B3) must be grounded in actual technical comparison (T1). Marketing-driven differentiation claims may not survive technical scrutiny.
> **Resolution:** [CUSTOMIZE: Validate each claimed differentiator against technical evidence before including in strategy].

### TN3: User Perception Data vs Ethics
Gathering user perception data (U1) must respect competitive intelligence ethics (S1). Some data collection methods may cross ethical boundaries.
> **Resolution:** [CUSTOMIZE: Define approved data sources and collection methods before starting user perception research].

---

## Required Truths

### RT-1: Competitor Data Validated
Competitor profiles and user perception data are sourced from verifiable, current, and ethically obtained information.
**Maps to:** B1, U1

### RT-2: Differentiation Substantiated
Claimed differentiators are validated against technical evidence and competitor trajectory analysis, not just internal belief.
**Maps to:** B3, T2

### RT-3: Analysis Actionable
SWOT summary and feature matrix produce specific, prioritized recommendations that stakeholders can act on.
**Maps to:** O2, B2

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Set the number of direct competitors to analyze in B1
- Define the key capabilities for the feature matrix in B2
- Identify your claimed differentiators for validation in B3
- Specify data sources for user perception in U1
- Set appropriate refresh cadence for your market velocity in O1

### Optional Additions
- Add pricing strategy constraints if competitive pricing is a key battleground
- Add geographic constraints if competitors vary by region
- Add partnership/ecosystem constraints if platform dynamics matter
- Add talent market constraints if hiring competition is relevant
- Add regulatory comparison constraints for regulated industries

### Common Removals
- Remove U3 if formal UX benchmarking is out of scope
- Remove T2 if integration landscape is not a competitive dimension
- Remove S2 if pricing comparison is not relevant to your market
