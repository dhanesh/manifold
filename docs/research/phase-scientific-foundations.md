# Manifold Phase Scientific Foundations

Each Manifold phase maps to established research in software engineering, cognitive science, and constraint theory. This document provides the scientific foundation for why Manifold works.

## Quick Reference

| Phase | Command | Key Activity | Primary Research Domain |
|-------|---------|--------------|------------------------|
| **INITIALIZED** | `/manifold:m0-init` | Create constraint manifold | Constraint Satisfaction Problems (CSP) |
| **CONSTRAINED** | `/manifold:m1-constrain` | Discover all constraints | Requirements Quality & Explicit Constraints |
| **TENSIONED** | `/manifold:m2-tension` | Surface conflicts & trade-offs | Design Rationale & Cognitive Bias Mitigation |
| **ANCHORED** | `/manifold:m3-anchor` | Backward reasoning from outcome | Goal-Driven Planning (Psychological Science) |
| **GENERATED** | `/manifold:m4-generate` | Create artifacts with traceability | Shift-Left Economics & Traceability |
| **VERIFIED** | `/manifold:m5-verify` | Validate against constraints | Evidence-Based Verification & Theory of Constraints |

---

## Phase Details

### INITIALIZED: Constraint Satisfaction Problems

**Command**: `/manifold:m0-init`

**Activity**: Define problem space across 5 constraint categories (business, technical, UX, security, operational)

**Research Foundation**: Decades of CSP research validates treating complex problems as constraint networks rather than sequential specifications.

> "Constraint satisfaction is a powerful paradigm for solving combinatorial problems... the key insight is that complex problems can be modeled as networks of variables and constraints."
> — [Introduction to Constraint Satisfaction (CWI)](https://ir.cwi.nl/pub/2145/2145D.pdf)

**Why It Matters**:
- Problems with interdependent requirements benefit from mathematical rigor
- Constraint networks reveal hidden dependencies that sequential specs miss
- CSP solvers can detect inconsistencies before implementation begins

**Key Metric**: Completeness of constraint network coverage

---

### CONSTRAINED: Requirements Quality Research

**Command**: `/manifold:m1-constrain`

**Activity**: Interview-driven discovery making implicit constraints explicit

**Research Foundation**: Studies show quality requirements are often "ad hoc" and down-prioritized. Domain experts fail to make requirements explicit without structured prompting.

> "Quality requirements are often specified in an ad hoc manner... 105 papers revealed systematic quality requirements specification remains challenging."
> — [Quality Requirements Specification (Springer, 105-paper meta-analysis)](https://link.springer.com/article/10.1007/s00766-021-00367-z)

**Why It Matters**:
- Domain experts hold implicit knowledge they don't articulate
- Structured interviews surface constraints that "everyone knows" but no one documents
- Explicit constraints reduce ambiguity during implementation

**Key Finding**: Without structured prompting, critical requirements remain implicit until they cause failures.

---

### TENSIONED: Design Rationale & Cognitive Bias Mitigation

**Command**: `/manifold:m2-tension`

**Activity**: Document conflicts between constraints with explicit resolutions

**Research Foundation**: A 20-designer study shows explicit reasoning produces higher quality designs. Structured approaches reduce cognitive bias in decision-making.

> "Explicit documentation of design reasoning led to measurably higher quality designs... designers who articulated trade-offs made fewer errors."
> — [Design Reasoning Study (20 designers)](https://www.researchgate.net/publication/220092560)

> "Structured decision frameworks reduce susceptibility to cognitive biases in complex problem-solving."
> — [Cognitive Bias in Decision Making (NIH)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8763848/)

**Why It Matters**:
- Unacknowledged tensions resurface as bugs or technical debt
- Explicit trade-off documentation prevents "decision amnesia"
- Bias mitigation improves decision quality under uncertainty

**Key Finding**: Designers who explicitly document trade-offs produce higher-quality work with fewer errors.

---

### ANCHORED: Backward Planning (Strongest Evidence)

**Command**: `/manifold:m3-anchor`

**Activity**: Reason backward from desired outcome to derive required truths

**Research Foundation**: *Psychological Science* research demonstrates backward planning produces clearer step anticipation and better outcomes than forward planning.

> "When participants planned backward from the end goal, they showed clearer step anticipation and better performance. If one starts at the end goal, the assumption is that efforts were successful, which clarifies the path."
> — [Backward Planning Study (Psychological Science)](https://www.researchgate.net/publication/319769334)

**Why It Matters**:
- Forward planning assumes success; backward planning assumes outcome and derives requirements
- Backward reasoning surfaces implicit "must be true" conditions
- Outcome anchoring aligns all artifacts toward a single measurable goal

**Key Finding**: Starting from the end goal and working backward produces clearer plans and better execution than traditional forward planning.

---

### GENERATED: Shift-Left Economics & Traceability (Strongest Evidence)

**Command**: `/manifold:m4-generate`

**Activity**: Generate ALL artifacts (code, tests, docs, runbooks, alerts) with constraint traceability

**Research Foundation**: The Capers Jones cost curve and a 24-project traceability study demonstrate massive ROI from early defect detection and traceable artifacts.

> "The cost of fixing a defect escalates as the development process progresses... defects found in requirements cost 10-100x less to fix than those found in production."
> — [Shift-Left Testing Economics](https://www.softwaretestingmagazine.com/knowledge/unpacking-shift-left-testing-benefits-key-to-reducing-costs-and-boosting-collaboration/)

> "Developers working with traceable requirements were 24% faster and 50% more correct in their implementations."
> — [Traceability Impact Study (24 projects)](https://arxiv.org/pdf/2108.02133)

**Why It Matters**:
- Generating all artifacts simultaneously ensures consistency
- Traceability links every artifact to its originating constraint
- Early detection prevents expensive downstream failures

**Key Findings**:
- **10-100x cost reduction** when defects found in requirements vs. production
- **24% faster development** with traceable requirements
- **50% fewer errors** when traceability is maintained

---

### VERIFIED: Theory of Constraints & Evidence-Based Verification

**Command**: `/manifold:m5-verify`

**Activity**: Validate every artifact traces to constraints with evidence

**Research Foundation**: 80+ Theory of Constraints case studies and traceability-defect correlation research demonstrate that constraint-focused validation improves outcomes.

> "Components with complete traceability showed significantly fewer defects... traceability serves as a quality indicator."
> — [Traceability-Defect Correlation Study](https://www.researchgate.net/publication/309523115)

> "The Theory of Constraints provides a systematic approach to identifying and addressing the most critical bottleneck in any system."
> — [TOC Meta-Analysis (80+ cases)](https://www.sciencedirect.com/science/article/pii/S1877042816310539)

**Why It Matters**:
- Verification against constraints catches violations early
- Evidence-based validation provides audit trails
- TOC ensures focus on the most critical gaps

**Key Finding**: Components with complete constraint traceability show measurably fewer defects in production.

---

## Research Summary

### Evidence Strength by Phase

| Phase | Evidence Strength | Key Metric |
|-------|-------------------|------------|
| INITIALIZED | Strong | CSP mathematical foundation |
| CONSTRAINED | Moderate | 105-paper meta-analysis |
| TENSIONED | Moderate | 20-designer controlled study |
| **ANCHORED** | **Very Strong** | Psychological Science peer review |
| **GENERATED** | **Very Strong** | 24-project quantitative study |
| VERIFIED | Strong | 80+ TOC case studies |

### Why Manifold Works

The Manifold workflow synthesizes research from multiple domains:

1. **CSP Theory** → Treat development as constraint satisfaction
2. **Requirements Research** → Make implicit constraints explicit
3. **Design Rationale** → Document trade-offs to prevent decision amnesia
4. **Cognitive Science** → Use backward planning for clearer paths
5. **Economics** → Shift-left to reduce costs 10-100x
6. **Quality Research** → Maintain traceability for fewer defects

---

## Full Source References

| # | Source | URL |
|---|--------|-----|
| 1 | CSP Survey (CWI) | https://ir.cwi.nl/pub/2145/2145D.pdf |
| 2 | Backward Planning (Psychological Science) | https://www.researchgate.net/publication/319769334 |
| 3 | Traceability-Defect Correlation | https://www.researchgate.net/publication/309523115 |
| 4 | Traceability Speed Study | https://arxiv.org/pdf/2108.02133 |
| 5 | Design Rationale Study | https://www.researchgate.net/publication/220092560 |
| 6 | Shift-Left Economics | https://www.softwaretestingmagazine.com/knowledge/unpacking-shift-left-testing-benefits-key-to-reducing-costs-and-boosting-collaboration/ |
| 7 | Cognitive Bias Mitigation | https://pmc.ncbi.nlm.nih.gov/articles/PMC8763848/ |
| 8 | Theory of Constraints Meta-Analysis | https://www.sciencedirect.com/science/article/pii/S1877042816310539 |
| 9 | Requirements Quality (105 papers) | https://link.springer.com/article/10.1007/s00766-021-00367-z |

---

## See Also

- [CLAUDE.md](../../CLAUDE.md) — Project overview and workflow commands
- [SCHEMA_REFERENCE.md](../../install/commands/SCHEMA_REFERENCE.md) — Valid phase values
- [Glossary](../GLOSSARY.md) — Plain-language terminology
