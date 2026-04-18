/**
 * Manifold Hook Command
 * Compiled-binary hook handlers for cross-platform Claude Code integration.
 * Replaces TypeScript hooks that required Bun runtime.
 *
 * Satisfies: T8 (cross-platform hooks), B1 (no breaking changes)
 *
 * Each subcommand reads Claude Code hook JSON from stdin and writes
 * hook response JSON to stdout. Exit code 0 always.
 */

import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { spawnSync } from 'child_process';

// ─── Shared utilities ───────────────────────────────────────────

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function parseHookInput(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function emitContext(context: string): void {
  console.log(JSON.stringify({ additionalContext: context }));
}

// ─── schema-guard (PostToolUse) ─────────────────────────────────

async function schemaGuard(): Promise<void> {
  const input = await readStdin();
  const hookData = parseHookInput(input);
  if (!hookData) return;

  const toolName = hookData?.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit' && toolName !== 'MultiEdit') {
    return;
  }

  const toolInput = hookData?.tool_input;
  let filePath: string | undefined;

  if (toolName === 'MultiEdit' && Array.isArray(toolInput?.edits)) {
    filePath = toolInput.edits.find(
      (e: any) => e.file_path && dirname(e.file_path).endsWith('.manifold') && e.file_path.endsWith('.json')
    )?.file_path;
  } else {
    filePath = toolInput?.file_path || toolInput?.path;
  }

  if (!filePath) return;

  const dir = dirname(filePath);
  const file = basename(filePath);

  if (!dir.endsWith('.manifold') || !file.endsWith('.json') || file.endsWith('.verify.json')) {
    return;
  }

  const feature = file.replace('.json', '');
  const cwd = process.cwd();

  // Find the manifold binary: compiled binary on PATH, local build, or bun run fallback
  let bin: string;
  let args: string[];

  const compiledBin = join(cwd, 'cli', 'manifold');
  if (existsSync(compiledBin)) {
    bin = compiledBin;
    args = ['validate', feature];
  } else {
    // Try 'manifold' on PATH, fall back to 'bun run cli/index.ts'
    const pathCheck = spawnSync('manifold', ['--version'], { encoding: 'utf-8', timeout: 3000 });
    if (pathCheck.status === 0) {
      bin = 'manifold';
      args = ['validate', feature];
    } else {
      bin = 'bun';
      args = ['run', join(cwd, 'cli', 'index.ts'), 'validate', feature];
    }
  }

  const result = spawnSync(bin, args, {
    cwd,
    timeout: 8000,
    encoding: 'utf-8',
  });

  if (result.error || result.status === null) {
    return;
  }

  if (result.status === 2) {
    const errors = (result.stdout || result.stderr || '').trim();
    const errorLines = errors
      .split('\n')
      .filter((line: string) => line.includes('✗') || line.includes('Invalid'))
      .join('\n');

    emitContext([
      `⚠️ MANIFOLD SCHEMA VALIDATION FAILED for "${feature}":`,
      errorLines || errors,
      '',
      `File: ${filePath}`,
      'Fix these errors IN THE FILE ABOVE before proceeding. Common issues:',
      '- Every evidence object MUST have an `id` field (e.g. "E1", "E2")',
      '- Every iteration MUST have a `result` field (string summary of what happened)',
      `- Run \`manifold validate ${feature}\` from ${cwd} for full details`,
    ].join('\n'));
  } else if (result.status === 0) {
    emitContext(`✅ Manifold schema validation passed for "${feature}".`);
  }
}

// ─── context (PreCompact) ───────────────────────────────────────

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
    case 'INITIALIZED': return `/manifold:m1-constrain ${feature}`;
    case 'CONSTRAINED': return `/manifold:m2-tension ${feature}`;
    case 'TENSIONED': return `/manifold:m3-anchor ${feature}`;
    case 'ANCHORED': return `/manifold:m4-generate ${feature}`;
    case 'GENERATED': return `/manifold:m5-verify ${feature}`;
    case 'VERIFIED': return 'Complete!';
    default: return `/manifold:m-status ${feature}`;
  }
}

async function context(): Promise<void> {
  const manifoldDir = join(process.cwd(), '.manifold');

  if (!existsSync(manifoldDir)) return;

  const files = readdirSync(manifoldDir).filter(f => f.endsWith('.yaml') || f.endsWith('.json'));
  if (files.length === 0) return;

  const features = new Map<string, { manifold?: ManifoldData; anchor?: any; verify?: any }>();

  for (const file of files) {
    const content = readFileSync(join(manifoldDir, file), 'utf-8');
    let data: any;

    if (file.endsWith('.json')) {
      try { data = JSON.parse(content); } catch { continue; }
    } else {
      // YAML files: try dynamic require, skip if unavailable
      try {
        const yaml = require('yaml');
        data = yaml.parse(content);
      } catch { continue; }
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
    if (!manifold) continue;

    const lines: string[] = [
      `### Feature: ${featureName}`,
      `- Phase: ${getPhaseProgress(manifold.phase)}`,
      `- Outcome: ${manifold.outcome || 'Not specified'}`,
      `- Constraints: ${summarizeConstraints(manifold.constraints)}`,
    ];

    if (manifold.tensions?.length) {
      const resolved = manifold.tensions.filter((t: any) => t.resolved).length;
      lines.push(`- Tensions: ${manifold.tensions.length} detected, ${resolved} resolved`);
    }

    lines.push(`- Next: ${getNextAction(manifold.phase, featureName)}`);
    summaries.push(lines.join('\n'));
  }

  if (summaries.length === 0) return;

  const output = `<system-reminder>
MANIFOLD CONTEXT (PreCompact - Preserve across compaction)

## Manifold State (${features.size} feature${features.size > 1 ? 's' : ''})

${summaries.join('\n\n')}

Use /manifold:m-status for detailed state. Continue from the "Next" action for each feature.
</system-reminder>`;

  console.log(output);
}

// ─── prompt-enforcer (UserPromptSubmit) ─────────────────────────

async function promptEnforcer(): Promise<void> {
  const manifoldDir = join(process.cwd(), '.manifold');

  if (!existsSync(manifoldDir)) return;

  emitContext([
    'MANIFOLD INTERACTION RULES (advisory):',
    '1. Use AskUserQuestion (or agent-equivalent structured input) when you need user decisions, preferences, or clarification. Avoid plain-text questions.',
    '2. After completing any Manifold phase, ALWAYS include the concrete next command: /manifold:mN-xxx <feature>',
    '3. When presenting options or trade-offs, use AskUserQuestion with labeled choices.',
  ].join('\n'));
}

// ─── phase-commons (UserPromptSubmit) ───────────────────────────
// Satisfies: RT-1 (context injection), T1 (disk reads), T4 (shared logic), T5 (smart delta)

/** Detect manifold phase commands and extract phase + feature */
function detectManifoldCommand(prompt: string): { phase: string; feature: string | null } | null {
  // Match: /manifold:m2-tension feature-name --flags
  const withFeature = prompt.match(/\/manifold:(m\d-\w+|m-\w+|parallel)\s+([a-zA-Z0-9_-]+)/);
  if (withFeature) {
    const command = withFeature[1];
    const feature = withFeature[2];
    const phase = command.match(/^(m\d|m-\w+)/)?.[1] || command;
    return { phase, feature };
  }

  // Match: /manifold:m-status (no feature = all features)
  const noFeature = prompt.match(/\/manifold:(m-status|m-solve)\b/);
  if (noFeature) {
    return { phase: noFeature[1], feature: null };
  }

  return null;
}

/** Build compact state summary — varies by phase (smart delta) */
function buildCompactSummary(data: any, phase: string): string {
  const lines: string[] = [];

  // Constraint counts (always useful)
  const cc = data.constraints || {};
  const catMap: Record<string, string> = {
    business: 'B', technical: 'T', user_experience: 'U', security: 'S', operational: 'O',
  };
  const counts = Object.entries(cc)
    .map(([cat, items]) => `${catMap[cat] || cat[0]}:${(items as any[]).length}`)
    .filter(s => !s.endsWith(':0'));
  const total = Object.values(cc).reduce((sum, items) => sum + (items as any[]).length, 0);
  if (total > 0) {
    lines.push(`Constraints: ${counts.join(' ')} (${total} total)`);
  }

  // Tensions (m2+ phases)
  if (['m2', 'm3', 'm4', 'm5', 'm6', 'm-status', 'm-solve'].includes(phase)) {
    const tensions = data.tensions || [];
    if (tensions.length) {
      const resolved = tensions.filter((t: any) => t.status === 'resolved').length;
      const ids = tensions.map((t: any) => `${t.id}(${t.status === 'resolved' ? '✓' : '○'})`).join(' ');
      lines.push(`Tensions: ${ids} — ${resolved}/${tensions.length} resolved`);
    }
  }

  // Blocking dependencies (m3+ phases)
  if (['m3', 'm4', 'm5', 'm6', 'm-status', 'm-solve'].includes(phase)) {
    const blocking = data.blocking_dependencies || [];
    if (blocking.length) {
      lines.push(`Blocking: ${blocking.map((b: any) => `${b.blocker}→${b.blocked}`).join(', ')}`);
    }
  }

  // Draft required truths (m3 seed)
  if (phase === 'm3') {
    const drafts = data.draft_required_truths || [];
    if (drafts.length) {
      lines.push(`Draft RTs: ${drafts.length} seeded from m1`);
    }
  }

  // Required truths + binding constraint (m4+ phases)
  if (['m4', 'm5', 'm6', 'm-status', 'm-solve'].includes(phase)) {
    const rts = data.anchors?.required_truths || [];
    if (rts.length) {
      const byStatus: Record<string, number> = {};
      for (const rt of rts) {
        byStatus[rt.status] = (byStatus[rt.status] || 0) + 1;
      }
      const statusStr = Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(', ');
      lines.push(`Required Truths: ${rts.length} (${statusStr})`);
    }
    const binding = data.anchors?.binding_constraint;
    if (binding) {
      lines.push(`Binding: ${binding.required_truth_id} → deps: ${(binding.dependency_chain || []).join(', ')}`);
    }
    if (data.anchors?.recommended_option) {
      lines.push(`Option: ${data.anchors.recommended_option}`);
    }
  }

  // Generation status (m5+ phases)
  if (['m5', 'm6', 'm-status'].includes(phase)) {
    const gen = data.generation;
    if (gen) {
      const artifacts = gen.artifacts || [];
      const generated = artifacts.filter((a: any) => a.status === 'generated').length;
      lines.push(`Artifacts: ${generated}/${artifacts.length} generated`);
      if (gen.coverage) lines.push(`Coverage: ${gen.coverage.percentage}%`);
    }
  }

  return lines.join('\n');
}

/** Smart delta: which MD sections each phase needs */
function getMdReadDirective(phase: string, feature: string): string {
  const mdPath = `.manifold/${feature}.md`;
  const sectionMap: Record<string, string[]> = {
    'm0': [],
    'm1': ['Outcome'],
    'm2': ['Constraints'],
    'm3': ['Constraints', 'Tensions'],
    'm4': ['Tensions', 'Required Truths', 'Solution Space'],
  };
  const sections = sectionMap[phase];
  if (!sections) return `Read \`${mdPath}\` (full content)`;
  if (sections.length === 0) return '';
  return `Read \`${mdPath}\` sections: ${sections.map(s => `## ${s}`).join(', ')}`;
}

/** Summarize all features for m-status without feature arg */
function summarizeAllFeatures(manifoldDir: string): string {
  const files = readdirSync(manifoldDir).filter(f => f.endsWith('.json') && !f.endsWith('.verify.json'));
  if (files.length === 0) return 'No manifold features found.';

  const lines: string[] = [`Active manifolds: ${files.length}`];
  for (const file of files.slice(0, 10)) {
    try {
      const data = JSON.parse(readFileSync(join(manifoldDir, file), 'utf-8'));
      const feature = file.replace('.json', '');
      const phase = data.phase || 'UNKNOWN';
      lines.push(`  ${feature}: ${phase} → ${getNextAction(phase, feature)}`);
    } catch { /* skip invalid */ }
  }
  return lines.join('\n');
}

async function phaseCommons(): Promise<void> {
  const input = await readStdin();
  const hookData = parseHookInput(input);
  if (!hookData?.prompt) return;

  const detection = detectManifoldCommand(hookData.prompt);
  if (!detection) return;

  const { phase, feature } = detection;
  const manifoldDir = join(process.cwd(), '.manifold');

  if (!existsSync(manifoldDir)) return;

  // No-feature case: summarize all
  if (!feature) {
    emitContext(summarizeAllFeatures(manifoldDir));
    return;
  }

  // m0-init creates new files — no existing state to inject
  if (phase === 'm0') return;

  const jsonPath = join(manifoldDir, `${feature}.json`);
  if (!existsSync(jsonPath)) return;

  let data: any;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch { return; }

  const mdExists = existsSync(join(manifoldDir, `${feature}.md`));

  // Build output
  const parts: string[] = [
    'MANIFOLD PHASE CONTEXT (phase-commons)',
    `Feature: ${feature} | Phase: ${data.phase} | Domain: ${data.domain || 'software'} | v${data.schema_version}`,
    '',
    buildCompactSummary(data, phase),
  ];

  if (mdExists) {
    const mdDirective = getMdReadDirective(phase, feature);
    if (mdDirective) parts.push('', mdDirective);
  }

  parts.push(
    '',
    'DIRECTIVES:',
    '• Phase transitions require EXPLICIT user commands — never auto-continue',
    '• After compaction: /manifold:m-status then WAIT',
    '• AskUserQuestion for decisions (structured options, not plain text)',
    '• After phase complete: suggest next command + one-line explanation',
    '• Run `manifold validate <feature>` after updating manifold files',
    '• Output: ≤50 lines, visual tables/trees, status→next footer in ≤3 lines',
    '• JSON=structure only, MD=all text. .json exists → use JSON+MD format',
    '• Manifold files on disk are truth — don\'t trust stale conversation context',
  );

  emitContext(parts.join('\n'));
}

// ─── Command registration ───────────────────────────────────────

export function registerHookCommand(program: Command): void {
  const hook = program
    .command('hook')
    .description('Cross-platform Claude Code hook handlers (reads stdin, writes JSON to stdout)')
    .addHelpText('after', `
Subcommands:
  schema-guard     PostToolUse: validate .manifold/*.json after edits
  context          PreCompact: inject manifold state before compaction
  prompt-enforcer  UserPromptSubmit: advisory interaction rules
  phase-commons    UserPromptSubmit: inject manifold state + directives before phase commands

Usage in hooks.json:
  "command": "manifold hook schema-guard"
  "command": "manifold hook context"
  "command": "manifold hook prompt-enforcer"
  "command": "manifold hook phase-commons"
`);

  hook
    .command('schema-guard')
    .description('PostToolUse hook: validate manifold JSON after Write/Edit/MultiEdit')
    .action(async () => {
      try { await schemaGuard(); } catch { /* never crash hooks */ }
      process.exit(0);
    });

  hook
    .command('context')
    .description('PreCompact hook: inject manifold state before context compaction')
    .action(async () => {
      try { await context(); } catch { /* never crash hooks */ }
      process.exit(0);
    });

  hook
    .command('prompt-enforcer')
    .description('UserPromptSubmit hook: advisory interaction rules for manifold projects')
    .action(async () => {
      try { await promptEnforcer(); } catch { /* never crash hooks */ }
      process.exit(0);
    });

  hook
    .command('phase-commons')
    .description('UserPromptSubmit hook: inject manifold state + shared directives before phase commands')
    .action(async () => {
      try { await phaseCommons(); } catch { /* never crash hooks */ }
      process.exit(0);
    });
}
