#!/usr/bin/env bun
/**
 * Manifold Context Hook for Gemini CLI
 * Satisfies: RT-5 (Gemini hook configuration), T2 (Gemini CLI support)
 *
 * Reads .manifold/ directory and outputs constraint state summary.
 * Configured as a custom command in Gemini's settings.json.
 *
 * Install: Copy to ~/.gemini/hooks/manifold-context.ts
 * Configure: Added automatically by config-merger.ts to settings.json
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface ManifoldJson {
  feature: string;
  phase: string;
  constraints?: Record<string, Array<{ id: string; type: string }>>;
  tensions?: Array<{ id: string; status: string }>;
  anchors?: { required_truths?: Array<{ id: string; status: string }> };
  convergence?: { status: string };
}

function getManifoldDir(): string {
  return join(process.cwd(), '.manifold');
}

function getPhaseProgress(phase: string): string {
  const phases = ['INITIALIZED', 'CONSTRAINED', 'TENSIONED', 'ANCHORED', 'GENERATED', 'VERIFIED'];
  const idx = phases.indexOf(phase?.toUpperCase() || 'INITIALIZED');
  const progress = idx >= 0 ? `${idx + 1}/6` : '?/6';
  return `${phase || 'UNKNOWN'} (${progress})`;
}

function getNextAction(phase: string, feature: string): string {
  switch (phase?.toUpperCase()) {
    case 'INITIALIZED': return `/manifold:m1-constrain ${feature}`;
    case 'CONSTRAINED': return `/manifold:m2-tension ${feature}`;
    case 'TENSIONED': return `/manifold:m3-anchor ${feature}`;
    case 'ANCHORED': return `/manifold:m4-generate ${feature}`;
    case 'GENERATED': return `/manifold:m5-verify ${feature}`;
    case 'VERIFIED': return 'Complete!';
    default: return `/manifold:m-status ${feature}`;
  }
}

function loadManifoldContext(): string | null {
  const manifoldDir = getManifoldDir();

  if (!existsSync(manifoldDir)) {
    return null;
  }

  const jsonFiles = readdirSync(manifoldDir).filter(f =>
    f.endsWith('.json') && !f.endsWith('.verify.json')
  );

  if (jsonFiles.length === 0) {
    return null;
  }

  const summaries: string[] = [];

  for (const file of jsonFiles) {
    try {
      const content = readFileSync(join(manifoldDir, file), 'utf-8');
      const data: ManifoldJson = JSON.parse(content);

      if (!data.feature || !data.phase) continue;

      const constraintCounts: string[] = [];
      if (data.constraints) {
        for (const [category, items] of Object.entries(data.constraints)) {
          if (Array.isArray(items) && items.length > 0) {
            constraintCounts.push(`${category}: ${items.length}`);
          }
        }
      }

      const tensionCount = data.tensions?.length || 0;
      const resolvedTensions = data.tensions?.filter(t => t.status === 'resolved').length || 0;

      const rtCount = data.anchors?.required_truths?.length || 0;
      const satisfiedRTs = data.anchors?.required_truths?.filter(
        t => t.status === 'SATISFIED'
      ).length || 0;

      // Read MD file for outcome
      const mdFile = join(manifoldDir, `${data.feature}.md`);
      let outcome = 'Not specified';
      if (existsSync(mdFile)) {
        const mdContent = readFileSync(mdFile, 'utf-8');
        const outcomeMatch = mdContent.match(/## Outcome\s*\n(.+)/);
        if (outcomeMatch) {
          outcome = outcomeMatch[1].trim();
        }
      }

      const lines: string[] = [
        `### Feature: ${data.feature}`,
        `- Phase: ${getPhaseProgress(data.phase)}`,
        `- Outcome: ${outcome}`,
        `- Constraints: ${constraintCounts.length > 0 ? constraintCounts.join(', ') : 'None yet'}`,
      ];

      if (tensionCount > 0) {
        lines.push(`- Tensions: ${tensionCount} detected, ${resolvedTensions} resolved`);
      }

      if (rtCount > 0) {
        lines.push(`- Required Truths: ${rtCount} derived, ${satisfiedRTs} satisfied`);
      }

      lines.push(`- Convergence: ${data.convergence?.status || 'NOT_STARTED'}`);
      lines.push(`- Next: ${getNextAction(data.phase, data.feature)}`);

      summaries.push(lines.join('\n'));
    } catch {
      continue;
    }
  }

  if (summaries.length === 0) {
    return null;
  }

  return `## Manifold State (${summaries.length} feature${summaries.length > 1 ? 's' : ''})

${summaries.join('\n\n')}`;
}

// Main execution
try {
  const context = loadManifoldContext();

  if (!context) {
    process.exit(0);
  }

  // Output for Gemini CLI consumption
  console.log(`MANIFOLD CONTEXT

${context}

Use /manifold:m-status for detailed state. Continue from the "Next" action for each feature.`);
} catch (error) {
  // Never crash hooks
  console.error('[Manifold] Context loading error:', error);
}

process.exit(0);
