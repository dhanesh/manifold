/**
 * Graph Visualization & Formatting Module
 * Satisfies: T3, T6, RT-4
 *
 * DOT format export for constraint network visualization with GraphViz,
 * plus display formatting for cross-feature conflict results.
 */

import type { ConstraintGraph } from '../parser';
import type { CrossFeatureConflictResult } from './cross-feature';

/**
 * Export graph as DOT format (for GraphViz)
 */
export function exportGraphDot(graph: ConstraintGraph): string {
  const lines: string[] = ['digraph ConstraintNetwork {'];
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, fontsize=10];');
  lines.push('');

  // Define node styles by type
  const typeStyles: Record<string, string> = {
    constraint: 'shape=box, fillcolor=lightblue, style=filled',
    tension: 'shape=diamond, fillcolor=lightyellow, style=filled',
    required_truth: 'shape=ellipse, fillcolor=lightgreen, style=filled',
    artifact: 'shape=note, fillcolor=lightgray, style=filled',
  };

  // Add nodes
  for (const [id, node] of Object.entries(graph.nodes)) {
    const style = typeStyles[node.type] || '';
    const label = truncate(node.label, 30).replace(/"/g, '\\"');
    const critical = node.critical_path ? ', penwidth=3' : '';
    lines.push(`  "${id}" [label="${id}\\n${label}", ${style}${critical}];`);
  }

  lines.push('');

  // Add dependency edges
  for (const [from, to] of graph.edges.dependencies) {
    lines.push(`  "${from}" -> "${to}" [style=solid];`);
  }

  // Add conflict edges
  for (const [a, b] of graph.edges.conflicts) {
    lines.push(`  "${a}" -> "${b}" [style=dashed, color=red, dir=both, constraint=false];`);
  }

  // Add satisfies edges
  for (const [artifact, constraint] of graph.edges.satisfies) {
    lines.push(`  "${artifact}" -> "${constraint}" [style=dotted, color=green];`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Format cross-feature semantic conflict detection results for display
 */
export function formatCrossFeatureResults(result: CrossFeatureConflictResult): string {
  const lines: string[] = [];

  lines.push('SEMANTIC CONFLICT ANALYSIS');
  lines.push('═══════════════��══════════');
  lines.push('');
  lines.push(`Analyzed: ${result.summary.featuresAnalyzed} features, ${result.summary.constraintsAnalyzed} constraints`);
  lines.push('');

  if (!result.hasConflicts) {
    lines.push('✓ No semantic conflicts detected between features');
    return lines.join('\n');
  }

  // Group by severity and display

  // 1. BLOCKING conflicts (logical contradictions)
  const blockingConflicts = result.conflicts.filter(c => c.severity === 'blocking');
  if (blockingConflicts.length > 0) {
    lines.push(`🚫 BLOCKING CONFLICTS (${blockingConflicts.length}) - Cannot proceed without resolution`);
    lines.push('─'.repeat(60));
    lines.push('');

    for (const conflict of blockingConflicts) {
      lines.push(`[${conflict.id}] ${conflict.type.replace('_', ' ')}`);
      lines.push(`  Feature: ${conflict.constraintA.feature} (${conflict.constraintA.id}) vs Feature: ${conflict.constraintB.feature} (${conflict.constraintB.id})`);
      lines.push('');
      lines.push(`  ${conflict.constraintA.feature}/${conflict.constraintA.id} (${conflict.constraintA.type}):`);
      lines.push(`    "${conflict.constraintA.statement}"`);
      lines.push('');
      lines.push(`  ${conflict.constraintB.feature}/${conflict.constraintB.id} (${conflict.constraintB.type}):`);
      lines.push(`    "${conflict.constraintB.statement}"`);
      lines.push('');
      lines.push(`  Shared Domain: [${conflict.sharedDomain.join(', ')}]`);
      lines.push(`  Conflict: ${conflict.conflictReason}`);
      lines.push('');
      lines.push('  Resolution Options:');
      for (let i = 0; i < conflict.resolution.options.length; i++) {
        lines.push(`    ${i + 1}. ${conflict.resolution.options[i]}`);
      }
      lines.push('');
      lines.push('  ⚠️  REQUIRES USER DECISION before features can coexist');
      lines.push('');
    }
  }

  // 2. REQUIRES ACCEPTANCE (resource tensions)
  const tensionConflicts = result.conflicts.filter(c => c.severity === 'requires_acceptance');
  if (tensionConflicts.length > 0) {
    lines.push(`⚡ RESOURCE TENSIONS (${tensionConflicts.length}) - Require explicit acceptance`);
    lines.push('─'.repeat(60));
    lines.push('');

    for (const conflict of tensionConflicts) {
      lines.push(`[${conflict.id}] ${conflict.type.replace('_', ' ')}`);
      lines.push(`  Feature: ${conflict.constraintA.feature} (${conflict.constraintA.id}) vs Feature: ${conflict.constraintB.feature} (${conflict.constraintB.id})`);
      lines.push('');
      lines.push(`  ${conflict.constraintA.feature}/${conflict.constraintA.id} (${conflict.constraintA.type}):`);
      lines.push(`    "${conflict.constraintA.statement}"`);
      lines.push('');
      lines.push(`  ${conflict.constraintB.feature}/${conflict.constraintB.id} (${conflict.constraintB.type}):`);
      lines.push(`    "${conflict.constraintB.statement}"`);
      lines.push('');
      lines.push(`  Shared Domain: [${conflict.sharedDomain.join(', ')}]`);
      lines.push(`  Tension: ${conflict.conflictReason}`);
      lines.push('');
      lines.push('  Accept this tension? If yes, document in tensions section of both features.');
      lines.push('');
    }
  }

  // 3. REVIEW NEEDED (scope conflicts)
  const reviewConflicts = result.conflicts.filter(c => c.severity === 'review_needed');
  if (reviewConflicts.length > 0) {
    lines.push(`📋 REVIEW NEEDED (${reviewConflicts.length}) - Potential conflicts requiring human judgment`);
    lines.push('─'.repeat(60));
    lines.push('');

    for (const conflict of reviewConflicts) {
      lines.push(`[${conflict.id}] ${conflict.type.replace('_', ' ')}`);
      lines.push(`  ${conflict.constraintA.feature}/${conflict.constraintA.id} vs ${conflict.constraintB.feature}/${conflict.constraintB.id}`);
      lines.push(`  Shared Domain: [${conflict.sharedDomain.join(', ')}]`);
      lines.push(`  Issue: ${conflict.conflictReason}`);
      lines.push('');
    }
  }

  // Summary
  lines.push('SUMMARY');
  lines.push('───────');
  lines.push(`- Blocking: ${result.summary.bySeverity.blocking} (must resolve before proceeding)`);
  lines.push(`- Requires Acceptance: ${result.summary.bySeverity.requires_acceptance} (document as accepted trade-offs)`);
  lines.push(`- Review Needed: ${result.summary.bySeverity.review_needed} (may or may not be actual conflicts)`);
  lines.push('');
  lines.push('To accept tensions, add to each feature\'s manifold:');
  lines.push('  accepted_tensions:');
  lines.push('    - cross_feature: "feature-name"');
  lines.push('      constraint: "T2"');
  lines.push(`      accepted_by: "username"`);
  lines.push(`      date: "${new Date().toISOString().split('T')[0]}"`);
  lines.push('      rationale: "Why this tension is acceptable"');

  return lines.join('\n');
}

// Helper function
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
