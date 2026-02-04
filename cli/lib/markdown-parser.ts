/**
 * Markdown Parser for Manifold Content Files
 * Satisfies: RT-2 (Human-readable content extraction)
 *
 * This parser extracts structured content from Markdown files that accompany
 * JSON structure files. Content is keyed by ID, matching the JSON structure.
 *
 * Parsing Rules:
 * - ## Category → Section (Business, Technical, etc.)
 * - ### TN1: Title → Tension content
 * - ### RT-1: Title → Required Truth content
 * - #### B1: Title → Constraint content
 * - > **Rationale:** → Rationale blockquote
 * - > **Resolution:** → Resolution blockquote
 * - **Implemented by:** → Implementation link
 * - **Verified by:** → Verification link
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Heading, Paragraph, Blockquote, Text, Strong, InlineCode, Content, PhrasingContent } from 'mdast';

// ============================================================
// Content Types
// ============================================================

export interface ConstraintContent {
  id: string;
  title: string;
  statement: string;
  rationale?: string;
  implementedBy?: string[];
  verifiedBy?: string[];
}

export interface TensionContent {
  id: string;
  title: string;
  description: string;
  resolution?: string;
}

export interface RequiredTruthContent {
  id: string;
  title: string;
  statement: string;
  evidence?: string;
}

export interface ManifoldContent {
  feature?: string;
  outcome?: string;
  constraints: Map<string, ConstraintContent>;
  tensions: Map<string, TensionContent>;
  requiredTruths: Map<string, RequiredTruthContent>;
  rawSections: Map<string, string>;
}

// ============================================================
// Heading Pattern Matchers
// ============================================================

/**
 * Match constraint heading pattern: #### B1: Title
 */
const CONSTRAINT_PATTERN = /^([BTUSO]\d+):\s*(.+)$/;

/**
 * Match tension heading pattern: ### TN1: Title
 */
const TENSION_PATTERN = /^(TN\d+):\s*(.+)$/;

/**
 * Match required truth heading pattern: ### RT-1: Title
 */
const REQUIRED_TRUTH_PATTERN = /^(RT-\d+):\s*(.+)$/;

/**
 * Match blockquote label pattern: > **Rationale:** ...
 */
const BLOCKQUOTE_LABEL_PATTERN = /^\*\*(Rationale|Resolution):\*\*\s*/;

/**
 * Match inline metadata: **Implemented by:** `path`
 */
const METADATA_PATTERN = /^\*\*(Implemented by|Verified by):\*\*\s*/;

// ============================================================
// AST Helpers
// ============================================================

/**
 * Extract plain text from AST node recursively
 */
function extractText(node: Content | PhrasingContent | Content[]): string {
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }

  if (!node) return '';

  switch (node.type) {
    case 'text':
      return (node as Text).value;
    case 'inlineCode':
      return (node as InlineCode).value;
    case 'strong':
    case 'emphasis':
    case 'delete':
    case 'link':
    case 'linkReference':
      return extractText((node as any).children || []);
    case 'paragraph':
      return extractText((node as Paragraph).children);
    case 'heading':
      return extractText((node as Heading).children);
    case 'blockquote':
      return extractText((node as Blockquote).children);
    default:
      if ('children' in node && Array.isArray((node as any).children)) {
        return extractText((node as any).children);
      }
      if ('value' in node) {
        return String((node as any).value);
      }
      return '';
  }
}

/**
 * Get heading text
 */
function getHeadingText(heading: Heading): string {
  return extractText(heading.children).trim();
}

/**
 * Check if a paragraph starts with a strong label
 */
function getStrongLabel(paragraph: Paragraph): { label: string; content: string } | null {
  if (paragraph.children.length === 0) return null;

  const firstChild = paragraph.children[0];
  if (firstChild.type !== 'strong') return null;

  const strong = firstChild as Strong;
  const labelText = extractText(strong.children);

  // Check for known labels
  const match = labelText.match(/^(Rationale|Resolution|Implemented by|Verified by):$/);
  if (!match) return null;

  // Extract the rest of the content
  const restContent = paragraph.children.slice(1).map(extractText).join('').trim();

  return { label: match[1], content: restContent };
}

/**
 * Check if a blockquote starts with a label
 */
function getBlockquoteLabel(blockquote: Blockquote): { label: string; content: string } | null {
  if (blockquote.children.length === 0) return null;

  const firstChild = blockquote.children[0];
  if (firstChild.type !== 'paragraph') return null;

  const paragraph = firstChild as Paragraph;
  if (paragraph.children.length === 0) return null;

  const firstPChild = paragraph.children[0];
  if (firstPChild.type !== 'strong') return null;

  const strong = firstPChild as Strong;
  const labelText = extractText(strong.children);

  const match = labelText.match(/^(Rationale|Resolution):$/);
  if (!match) return null;

  // Extract the rest of the content from the blockquote
  const restOfParagraph = paragraph.children.slice(1).map(extractText).join('').trim();
  const otherParagraphs = blockquote.children.slice(1).map(extractText).join('\n').trim();

  const content = [restOfParagraph, otherParagraphs].filter(Boolean).join('\n');

  return { label: match[1], content };
}

/**
 * Extract inline code values from paragraph (for paths)
 */
function extractInlineCodes(paragraph: Paragraph): string[] {
  const codes: string[] = [];

  function walk(node: Content | PhrasingContent) {
    if (node.type === 'inlineCode') {
      codes.push((node as InlineCode).value);
    } else if ('children' in node && Array.isArray((node as any).children)) {
      (node as any).children.forEach(walk);
    }
  }

  paragraph.children.forEach(walk);
  return codes;
}

// ============================================================
// Main Parser
// ============================================================

/**
 * Parse manifold markdown content and extract structured data
 */
export function parseManifoldMarkdown(markdown: string): ManifoldContent {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.parse(markdown) as Root;

  const result: ManifoldContent = {
    constraints: new Map(),
    tensions: new Map(),
    requiredTruths: new Map(),
    rawSections: new Map(),
  };

  // State machine for tracking current context
  let currentSection: 'outcome' | 'constraints' | 'tensions' | 'required_truths' | 'other' = 'other';
  let currentCategory: 'business' | 'technical' | 'user_experience' | 'security' | 'operational' | null = null;
  let currentConstraint: ConstraintContent | null = null;
  let currentTension: TensionContent | null = null;
  let currentRequiredTruth: RequiredTruthContent | null = null;
  let contentBuffer: string[] = [];

  /**
   * Flush accumulated content to current entity
   */
  function flushContent() {
    const content = contentBuffer.join('\n').trim();
    contentBuffer = [];

    if (currentConstraint && !currentConstraint.statement) {
      currentConstraint.statement = content;
    } else if (currentTension && !currentTension.description) {
      currentTension.description = content;
    } else if (currentRequiredTruth && !currentRequiredTruth.statement) {
      currentRequiredTruth.statement = content;
    }
  }

  /**
   * Save current entity to result
   */
  function saveCurrentEntity() {
    flushContent();

    if (currentConstraint) {
      result.constraints.set(currentConstraint.id, currentConstraint);
      currentConstraint = null;
    }
    if (currentTension) {
      result.tensions.set(currentTension.id, currentTension);
      currentTension = null;
    }
    if (currentRequiredTruth) {
      result.requiredTruths.set(currentRequiredTruth.id, currentRequiredTruth);
      currentRequiredTruth = null;
    }
  }

  // Process AST nodes
  for (const node of tree.children) {
    // Handle headings
    if (node.type === 'heading') {
      const heading = node as Heading;
      const text = getHeadingText(heading);

      // H1: Feature name
      if (heading.depth === 1) {
        saveCurrentEntity();
        result.feature = text;
        currentSection = 'other';
        continue;
      }

      // H2: Section (Outcome, Constraints, Tensions, Required Truths)
      if (heading.depth === 2) {
        saveCurrentEntity();

        const lowerText = text.toLowerCase();
        if (lowerText === 'outcome') {
          currentSection = 'outcome';
        } else if (lowerText === 'constraints') {
          currentSection = 'constraints';
        } else if (lowerText === 'tensions') {
          currentSection = 'tensions';
        } else if (lowerText === 'required truths' || lowerText === 'anchors') {
          currentSection = 'required_truths';
        } else {
          currentSection = 'other';
          result.rawSections.set(text, '');
        }
        continue;
      }

      // H3: Category (Business, Technical, etc.) or Tension/RequiredTruth
      if (heading.depth === 3) {
        saveCurrentEntity();

        // Check for tension pattern
        const tensionMatch = text.match(TENSION_PATTERN);
        if (tensionMatch) {
          currentTension = {
            id: tensionMatch[1],
            title: tensionMatch[2],
            description: '',
          };
          continue;
        }

        // Check for required truth pattern
        const rtMatch = text.match(REQUIRED_TRUTH_PATTERN);
        if (rtMatch) {
          currentRequiredTruth = {
            id: rtMatch[1],
            title: rtMatch[2],
            statement: '',
          };
          continue;
        }

        // Otherwise it's a category
        const lowerText = text.toLowerCase();
        if (lowerText === 'business') currentCategory = 'business';
        else if (lowerText === 'technical') currentCategory = 'technical';
        else if (lowerText === 'user experience' || lowerText === 'ux') currentCategory = 'user_experience';
        else if (lowerText === 'security') currentCategory = 'security';
        else if (lowerText === 'operational') currentCategory = 'operational';
        continue;
      }

      // H4: Constraint
      if (heading.depth === 4 && currentSection === 'constraints') {
        saveCurrentEntity();

        const constraintMatch = text.match(CONSTRAINT_PATTERN);
        if (constraintMatch) {
          currentConstraint = {
            id: constraintMatch[1],
            title: constraintMatch[2],
            statement: '',
          };
        }
        continue;
      }
    }

    // Handle paragraphs
    if (node.type === 'paragraph') {
      const paragraph = node as Paragraph;
      const text = extractText(paragraph.children).trim();

      // Check for labeled content
      const strongLabel = getStrongLabel(paragraph);
      if (strongLabel) {
        const { label, content } = strongLabel;

        if (label === 'Rationale' && currentConstraint) {
          currentConstraint.rationale = content;
          continue;
        }
        if (label === 'Resolution' && currentTension) {
          currentTension.resolution = content;
          continue;
        }
        if (label === 'Implemented by') {
          const codes = extractInlineCodes(paragraph);
          if (currentConstraint) {
            currentConstraint.implementedBy = codes;
          }
          continue;
        }
        if (label === 'Verified by') {
          const codes = extractInlineCodes(paragraph);
          if (currentConstraint) {
            currentConstraint.verifiedBy = codes;
          }
          continue;
        }
      }

      // Handle outcome section
      if (currentSection === 'outcome' && !result.outcome) {
        result.outcome = text;
        continue;
      }

      // Accumulate content for current entity
      if (currentConstraint || currentTension || currentRequiredTruth) {
        contentBuffer.push(text);
      }
    }

    // Handle blockquotes (for rationale/resolution)
    if (node.type === 'blockquote') {
      const blockquote = node as Blockquote;
      const labeled = getBlockquoteLabel(blockquote);

      if (labeled) {
        const { label, content } = labeled;

        if (label === 'Rationale' && currentConstraint) {
          currentConstraint.rationale = content;
          continue;
        }
        if (label === 'Resolution' && currentTension) {
          currentTension.resolution = content;
          continue;
        }
      } else {
        // Regular blockquote - add to content buffer
        const text = extractText(blockquote.children).trim();
        if (currentConstraint || currentTension || currentRequiredTruth) {
          contentBuffer.push(text);
        }
      }
    }

    // Handle thematic breaks (---) as section separators
    if (node.type === 'thematicBreak') {
      saveCurrentEntity();
    }
  }

  // Save any remaining entity
  saveCurrentEntity();

  return result;
}

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Validate that markdown content has all required IDs from JSON structure
 */
export function validateMarkdownCompleteness(
  content: ManifoldContent,
  requiredIds: Set<string>
): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const markdownIds = new Set<string>([
    ...content.constraints.keys(),
    ...content.tensions.keys(),
    ...content.requiredTruths.keys(),
  ]);

  const missing: string[] = [];
  const extra: string[] = [];

  // Find missing IDs (in JSON but not in Markdown)
  for (const id of requiredIds) {
    if (!markdownIds.has(id)) {
      missing.push(id);
    }
  }

  // Find extra IDs (in Markdown but not in JSON)
  for (const id of markdownIds) {
    if (!requiredIds.has(id)) {
      extra.push(id);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}

/**
 * Check if content has required fields filled
 */
export function validateContentQuality(content: ManifoldContent): {
  valid: boolean;
  issues: Array<{ id: string; issue: string }>;
} {
  const issues: Array<{ id: string; issue: string }> = [];

  // Check constraints have statements
  for (const [id, constraint] of content.constraints) {
    if (!constraint.statement || constraint.statement.trim() === '') {
      issues.push({ id, issue: 'Constraint missing statement' });
    }
  }

  // Check tensions have descriptions
  for (const [id, tension] of content.tensions) {
    if (!tension.description || tension.description.trim() === '') {
      issues.push({ id, issue: 'Tension missing description' });
    }
  }

  // Check required truths have statements
  for (const [id, rt] of content.requiredTruths) {
    if (!rt.statement || rt.statement.trim() === '') {
      issues.push({ id, issue: 'Required truth missing statement' });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================
// Content Generation Helpers
// ============================================================

/**
 * Generate a template Markdown file from a JSON structure
 */
export function generateMarkdownTemplate(
  feature: string,
  constraintIds: { category: string; id: string; type: string }[],
  tensionIds: { id: string; between: string[] }[],
  requiredTruthIds: string[]
): string {
  const lines: string[] = [];

  lines.push(`# ${feature}`);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push('[Describe the desired outcome here]');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Constraints');
  lines.push('');

  // Group constraints by category
  const byCategory = new Map<string, typeof constraintIds>();
  for (const c of constraintIds) {
    if (!byCategory.has(c.category)) {
      byCategory.set(c.category, []);
    }
    byCategory.get(c.category)!.push(c);
  }

  const categoryOrder = ['business', 'technical', 'user_experience', 'security', 'operational'];
  const categoryLabels: Record<string, string> = {
    business: 'Business',
    technical: 'Technical',
    user_experience: 'User Experience',
    security: 'Security',
    operational: 'Operational',
  };

  for (const category of categoryOrder) {
    const constraints = byCategory.get(category);
    if (!constraints || constraints.length === 0) continue;

    lines.push(`### ${categoryLabels[category]}`);
    lines.push('');

    for (const c of constraints) {
      lines.push(`#### ${c.id}: [Title]`);
      lines.push('');
      lines.push('[Describe this constraint]');
      lines.push('');
      lines.push('> **Rationale:** [Why this constraint exists]');
      lines.push('');
    }
  }

  if (tensionIds.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Tensions');
    lines.push('');

    for (const t of tensionIds) {
      lines.push(`### ${t.id}: [Title]`);
      lines.push('');
      lines.push(`[Describe the tension between ${t.between.join(', ')}]`);
      lines.push('');
      lines.push('> **Resolution:** [How this tension is resolved, if resolved]');
      lines.push('');
    }
  }

  if (requiredTruthIds.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Required Truths');
    lines.push('');

    for (const id of requiredTruthIds) {
      lines.push(`### ${id}: [Title]`);
      lines.push('');
      lines.push('[What must be true for the outcome to be achieved]');
      lines.push('');
    }
  }

  return lines.join('\n');
}
