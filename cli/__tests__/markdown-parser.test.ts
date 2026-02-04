/**
 * Tests for markdown-parser.ts
 * Validates: Markdown content parsing for JSON+Markdown hybrid format
 */

import { describe, test, expect } from 'bun:test';
import {
  parseManifoldMarkdown,
  validateMarkdownCompleteness,
  validateContentQuality,
} from '../lib/markdown-parser.js';

describe('parseManifoldMarkdown', () => {
  test('parses outcome from ## Outcome section', () => {
    const markdown = `# test-feature

## Outcome

Achieve 95% retry success rate.

---
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.outcome).toBe('Achieve 95% retry success rate.');
  });

  test('parses constraint with ID and title', () => {
    const markdown = `# test

## Constraints

### Business

#### B1: No Duplicate Payments

Payment processing must never create duplicate charges.

> **Rationale:** Duplicates cause chargebacks.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.constraints.has('B1')).toBe(true);
    const b1 = result.constraints.get('B1');
    expect(b1?.title).toBe('No Duplicate Payments');
    expect(b1?.statement).toContain('Payment processing must never create duplicate charges');
    expect(b1?.rationale).toContain('Duplicates cause chargebacks');
  });

  test('parses multiple constraints', () => {
    const markdown = `# test

## Constraints

### Business

#### B1: First Constraint

First statement.

#### B2: Second Constraint

Second statement.

### Technical

#### T1: Tech Constraint

Tech statement.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.constraints.size).toBe(3);
    expect(result.constraints.has('B1')).toBe(true);
    expect(result.constraints.has('B2')).toBe(true);
    expect(result.constraints.has('T1')).toBe(true);
  });

  test('parses tension with ID and title', () => {
    const markdown = `# test

## Tensions

### TN1: Performance vs Safety

Performance optimizations conflict with safety checks.

> **Resolution:** Use async safety checks after initial response.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.tensions.has('TN1')).toBe(true);
    const tn1 = result.tensions.get('TN1');
    expect(tn1?.title).toBe('Performance vs Safety');
    expect(tn1?.description).toContain('Performance optimizations conflict');
    expect(tn1?.resolution).toContain('async safety checks');
  });

  test('parses tension without resolution', () => {
    const markdown = `# test

## Tensions

### TN2: Unresolved Tension

This tension is not yet resolved.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.tensions.has('TN2')).toBe(true);
    const tn2 = result.tensions.get('TN2');
    expect(tn2?.resolution).toBeUndefined();
  });

  test('parses required truth with ID and title', () => {
    const markdown = `# test

## Required Truths

### RT-1: Idempotency Preserved

Idempotency key must be preserved across all retry attempts.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.requiredTruths.has('RT-1')).toBe(true);
    const rt1 = result.requiredTruths.get('RT-1');
    expect(rt1?.title).toBe('Idempotency Preserved');
    expect(rt1?.statement).toContain('Idempotency key');
  });

  test('parses complete manifold markdown', () => {
    const markdown = `# payment-retry

## Outcome

Achieve 95% retry success rate with zero duplicate payments.

---

## Constraints

### Business

#### B1: No Duplicate Payments

Payment processing must never create duplicate charges.

> **Rationale:** Duplicates cause chargebacks and customer complaints.

**Implemented by:** \`lib/retry/IdempotencyService.ts\`

#### B2: 95% Success Rate

Achieve 95% retry success rate within 72 hours.

---

### Technical

#### T1: 72-Hour Retry Window

All retries must complete within 72 hours.

---

## Tensions

### TN1: Performance vs Safety

Performance vs safety trade-off.

> **Resolution:** Use async checks.

---

## Required Truths

### RT-1: Error Classification

Can distinguish transient from permanent failures.

### RT-2: Idempotency

Retries are idempotent.
`;
    const result = parseManifoldMarkdown(markdown);

    expect(result.outcome).toBe('Achieve 95% retry success rate with zero duplicate payments.');
    expect(result.constraints.size).toBe(3);
    expect(result.tensions.size).toBe(1);
    expect(result.requiredTruths.size).toBe(2);

    // Check specific entries
    expect(result.constraints.has('B1')).toBe(true);
    expect(result.constraints.has('B2')).toBe(true);
    expect(result.constraints.has('T1')).toBe(true);
    expect(result.tensions.has('TN1')).toBe(true);
    expect(result.requiredTruths.has('RT-1')).toBe(true);
    expect(result.requiredTruths.has('RT-2')).toBe(true);
  });

  test('handles empty markdown', () => {
    const result = parseManifoldMarkdown('');
    expect(result.outcome).toBeUndefined();
    expect(result.constraints.size).toBe(0);
    expect(result.tensions.size).toBe(0);
    expect(result.requiredTruths.size).toBe(0);
  });

  test('handles markdown without sections', () => {
    const markdown = `# Just a title

Some random content without proper sections.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.constraints.size).toBe(0);
    expect(result.tensions.size).toBe(0);
    expect(result.requiredTruths.size).toBe(0);
  });

  test('handles various ID formats', () => {
    const markdown = `# test

## Constraints

### Business

#### B1: Business One

Statement.

#### B10: Business Ten

Statement.

### User Experience

#### U1: UX One

Statement.

### Security

#### S1: Security One

Statement.

### Operational

#### O1: Ops One

Statement.
`;
    const result = parseManifoldMarkdown(markdown);
    expect(result.constraints.has('B1')).toBe(true);
    expect(result.constraints.has('B10')).toBe(true);
    expect(result.constraints.has('U1')).toBe(true);
    expect(result.constraints.has('S1')).toBe(true);
    expect(result.constraints.has('O1')).toBe(true);
  });
});

describe('validateMarkdownCompleteness', () => {
  test('returns valid when all IDs have content', () => {
    const requiredIds = new Set(['B1', 'T1', 'TN1', 'RT-1']);
    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Test

Statement.

### Technical

#### T1: Test

Statement.

## Tensions

### TN1: Test

Description.

## Required Truths

### RT-1: Test

Statement.
`);
    const result = validateMarkdownCompleteness(content, requiredIds);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  test('returns missing IDs', () => {
    const requiredIds = new Set(['B1', 'B2', 'T1']);
    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Only One

Statement.
`);
    const result = validateMarkdownCompleteness(content, requiredIds);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('B2');
    expect(result.missing).toContain('T1');
    expect(result.missing).not.toContain('B1');
  });
});

describe('validateContentQuality', () => {
  test('returns valid for quality content', () => {
    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Good Constraint

This is a well-written constraint statement with sufficient detail.

> **Rationale:** This is why this constraint exists.
`);
    const result = validateContentQuality(content);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('returns issues for empty statements', () => {
    const content = parseManifoldMarkdown(`# test

## Constraints

### Business

#### B1: Empty Constraint

`);
    // Modify the content to simulate empty statement
    const constraint = content.constraints.get('B1');
    if (constraint) {
      constraint.statement = '';
    }
    const result = validateContentQuality(content);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.id === 'B1')).toBe(true);
  });
});
