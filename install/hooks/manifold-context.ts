#!/usr/bin/env bun
// Manifold PreCompact Hook
// Injects .manifold/ context before compaction to preserve state across sessions
//
// Install: Copy to ~/.claude/hooks/manifold-context.ts
// Configure in ~/.claude/settings.json:
// {
//   "hooks": {
//     "PreCompact": [{
//       "matcher": "",
//       "hooks": [{ "type": "command", "command": "bun run ~/.claude/hooks/manifold-context.ts" }]
//     }]
//   }
// }

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import * as yaml from 'yaml';

interface ManifoldData {
  feature: string;
  outcome?: string;
  phase: string;
  constraints?: {
    business?: any[];
    technical?: any[];
    user_experience?: any[];  // Canonical schema
    ux?: any[];               // Deprecated - for backward compatibility
    security?: any[];
    operational?: any[];
  };
  tensions?: any[];
}

interface AnchorData {
  outcome: string;
  required_truths?: any[];
  solution_space?: any[];
  recommendation?: string;
}

function getManifoldDir(): string {
  // Check current working directory for .manifold/
  return join(process.cwd(), '.manifold');
}

function parseYamlSafe(content: string): any {
  try {
    return yaml.parse(content);
  } catch {
    return null;
  }
}

function summarizeConstraints(constraints: ManifoldData['constraints']): string {
  if (!constraints) return 'None discovered yet';

  const counts: string[] = [];
  if (constraints.business?.length) counts.push(`Business: ${constraints.business.length}`);
  if (constraints.technical?.length) counts.push(`Technical: ${constraints.technical.length}`);

  // Handle both old (ux) and new (user_experience) schema - Satisfies: T4
  const uxCount = constraints.user_experience?.length || constraints.ux?.length;
  if (uxCount) {
    counts.push(`UX: ${uxCount}`);
    // Log deprecation if using old schema
    if (constraints.ux?.length && !constraints.user_experience?.length) {
      console.error('[Manifold] DEPRECATION: Use "user_experience" instead of "ux" in YAML schema');
    }
  }

  if (constraints.security?.length) counts.push(`Security: ${constraints.security.length}`);
  if (constraints.operational?.length) counts.push(`Operational: ${constraints.operational.length}`);

  return counts.length > 0 ? counts.join(', ') : 'None discovered yet';
}

function getPhaseProgress(phase: string): string {
  const phases = ['INITIALIZED', 'CONSTRAINED', 'TENSIONED', 'ANCHORED', 'GENERATED', 'VERIFIED'];
  const idx = phases.indexOf(phase?.toUpperCase() || 'INITIALIZED');
  const progress = idx >= 0 ? `${idx + 1}/6` : '?/6';
  return `${phase || 'UNKNOWN'} (${progress})`;
}

function loadManifoldContext(): string | null {
  const manifoldDir = getManifoldDir();

  if (!existsSync(manifoldDir)) {
    return null; // No manifold in this project
  }

  const files = readdirSync(manifoldDir).filter(f => f.endsWith('.yaml'));
  if (files.length === 0) {
    return null;
  }

  const summaries: string[] = [];

  // Group files by feature
  const features = new Map<string, { manifold?: ManifoldData; anchor?: AnchorData; verify?: any }>();

  for (const file of files) {
    const content = readFileSync(join(manifoldDir, file), 'utf-8');
    const data = parseYamlSafe(content);
    if (!data) continue;

    // Determine feature name and file type
    let featureName: string;
    let fileType: 'manifold' | 'anchor' | 'verify';

    if (file.endsWith('.anchor.yaml')) {
      featureName = file.replace('.anchor.yaml', '');
      fileType = 'anchor';
    } else if (file.endsWith('.verify.yaml')) {
      featureName = file.replace('.verify.yaml', '');
      fileType = 'verify';
    } else {
      featureName = file.replace('.yaml', '');
      fileType = 'manifold';
    }

    if (!features.has(featureName)) {
      features.set(featureName, {});
    }
    features.get(featureName)![fileType] = data;
  }

  // Generate summary for each feature
  for (const [featureName, data] of features) {
    const manifold = data.manifold;
    const anchor = data.anchor;

    if (!manifold) continue;

    const lines: string[] = [
      `### Feature: ${featureName}`,
      `- Phase: ${getPhaseProgress(manifold.phase)}`,
      `- Outcome: ${manifold.outcome || anchor?.outcome || 'Not specified'}`,
      `- Constraints: ${summarizeConstraints(manifold.constraints)}`,
    ];

    if (manifold.tensions?.length) {
      const resolved = manifold.tensions.filter((t: any) => t.resolved).length;
      lines.push(`- Tensions: ${manifold.tensions.length} detected, ${resolved} resolved`);
    }

    if (anchor?.solution_space?.length) {
      lines.push(`- Solution Options: ${anchor.solution_space.length} generated`);
      if (anchor.recommendation) {
        lines.push(`- Recommended: ${anchor.recommendation}`);
      }
    }

    // Determine next action
    const nextAction = getNextAction(manifold.phase, featureName);
    lines.push(`- Next: ${nextAction}`);

    summaries.push(lines.join('\n'));
  }

  if (summaries.length === 0) {
    return null;
  }

  return `## Manifold State (${features.size} feature${features.size > 1 ? 's' : ''})

${summaries.join('\n\n')}`;
}

function getNextAction(phase: string, feature: string): string {
  switch (phase?.toUpperCase()) {
    case 'INITIALIZED':
      return `/m1-constrain ${feature}`;
    case 'CONSTRAINED':
      return `/m2-tension ${feature}`;
    case 'TENSIONED':
      return `/m3-anchor ${feature}`;
    case 'ANCHORED':
      return `/m4-generate ${feature}`;
    case 'GENERATED':
      return `/m5-verify ${feature}`;
    case 'VERIFIED':
      return 'Complete!';
    default:
      return `/m-status ${feature}`;
  }
}

async function main() {
  try {
    const context = loadManifoldContext();

    if (!context) {
      // No manifold in this project - silent exit
      process.exit(0);
    }

    // Output as system-reminder for context preservation
    const output = `<system-reminder>
MANIFOLD CONTEXT (PreCompact - Preserve across compaction)

${context}

Use /m-status for detailed state. Continue from the "Next" action for each feature.
</system-reminder>`;

    console.log(output);

  } catch (error) {
    // Never crash hooks
    console.error('[Manifold] Context loading error:', error);
  }

  process.exit(0);
}

main();
