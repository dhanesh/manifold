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

Usage in hooks.json:
  "command": "manifold hook schema-guard"
  "command": "manifold hook context"
  "command": "manifold hook prompt-enforcer"
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
}
