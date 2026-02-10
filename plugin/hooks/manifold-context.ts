#!/usr/bin/env bun
// Manifold PreCompact Hook (Plugin Version)
// Injects .manifold/ context before compaction to preserve state across sessions

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface ManifoldData {
  feature: string;
  outcome?: string;
  phase: string;
  constraints?: {
    business?: any[];
    technical?: any[];
    user_experience?: any[];
    ux?: any[];
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
  return join(process.cwd(), '.manifold');
}

function parseYamlBasic(content: string): any {
  // Try dynamic import of yaml package; fall back to null for YAML files
  try {
    // JSON files won't reach here
    const yaml = require('yaml');
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

  const uxCount = constraints.user_experience?.length || constraints.ux?.length;
  if (uxCount) counts.push(`UX: ${uxCount}`);
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

function getNextAction(phase: string, feature: string): string {
  switch (phase?.toUpperCase()) {
    case 'INITIALIZED': return `/m0-init:m1-constrain ${feature}`;
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

  if (!existsSync(manifoldDir)) return null;

  const files = readdirSync(manifoldDir).filter(f => f.endsWith('.yaml') || f.endsWith('.json'));
  if (files.length === 0) return null;

  const features = new Map<string, { manifold?: ManifoldData; anchor?: AnchorData; verify?: any }>();

  for (const file of files) {
    const content = readFileSync(join(manifoldDir, file), 'utf-8');
    let data: any;

    if (file.endsWith('.json')) {
      try { data = JSON.parse(content); } catch { continue; }
    } else {
      data = parseYamlBasic(content);
    }
    if (!data) continue;

    let featureName: string;
    let fileType: 'manifold' | 'anchor' | 'verify';

    if (file.endsWith('.anchor.yaml')) {
      featureName = file.replace('.anchor.yaml', '');
      fileType = 'anchor';
    } else if (file.endsWith('.verify.yaml') || file.endsWith('.verify.json')) {
      featureName = file.replace(/\.verify\.(yaml|json)$/, '');
      fileType = 'verify';
    } else if (file.endsWith('.json')) {
      featureName = file.replace('.json', '');
      fileType = 'manifold';
    } else {
      featureName = file.replace('.yaml', '');
      fileType = 'manifold';
    }

    if (!features.has(featureName)) features.set(featureName, {});
    features.get(featureName)![fileType] = data;
  }

  const summaries: string[] = [];

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
      if (anchor.recommendation) lines.push(`- Recommended: ${anchor.recommendation}`);
    }

    lines.push(`- Next: ${getNextAction(manifold.phase, featureName)}`);
    summaries.push(lines.join('\n'));
  }

  if (summaries.length === 0) return null;

  return `## Manifold State (${features.size} feature${features.size > 1 ? 's' : ''})

${summaries.join('\n\n')}`;
}

async function main() {
  try {
    const context = loadManifoldContext();
    if (!context) {
      process.exit(0);
    }

    const output = `<system-reminder>
MANIFOLD CONTEXT (PreCompact - Preserve across compaction)

${context}

Use /manifold:m-status for detailed state. Continue from the "Next" action for each feature.
</system-reminder>`;

    console.log(output);
  } catch (error) {
    console.error('[Manifold] Context loading error:', error);
  }

  process.exit(0);
}

main();
