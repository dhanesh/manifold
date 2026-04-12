/**
 * Budget Command for Manifold CLI
 * Shows token estimates and model routing recommendations per phase.
 * Satisfies: RT-budget (token-aware model selection)
 */

import type { Command } from 'commander';
import {
  findManifoldDir,
  loadFeature,
} from '../lib/parser.js';
import { countConstraints } from '../lib/schema.js';
import {
  println,
  printError,
  toJSON,
} from '../lib/output.js';
import { loadConfig } from '../lib/config.js';
import {
  PHASE_MODELS,
  WORKFLOW_PHASES,
  estimateTokenBudget,
  estimateWorkflowBudget,
  formatBudgetTable,
  type TokenEstimate,
} from '../../install/lib/models.js';

interface BudgetOptions {
  json?: boolean;
  phase?: string;
  provider?: 'anthropic' | 'openai' | 'google';
}

export function registerBudgetCommand(program: Command): void {
  program
    .command('budget [feature]')
    .description('Show token budget estimates and model routing per phase')
    .option('--json', 'Output as JSON')
    .option('--phase <phase>', 'Show detailed breakdown for a specific phase')
    .option('--provider <provider>', 'Show model names for a specific provider', 'anthropic')
    .action(async (feature: string | undefined, options: BudgetOptions) => {
      try {
        await runBudget(feature, options);
      } catch (err) {
        printError(`Budget failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}

async function runBudget(feature: string | undefined, options: BudgetOptions): Promise<void> {
  const basePath = process.cwd();
  const config = loadConfig(basePath);
  const contextWindow = config.models?.context_window ?? 200_000;
  const provider = (options.provider ?? 'anthropic') as 'anthropic' | 'openai' | 'google';

  // Load manifold data if feature specified
  let constraintCount = 0;
  let tensionCount = 0;
  let requiredTruthCount = 0;

  if (feature) {
    const manifoldDir = findManifoldDir(basePath);
    if (manifoldDir) {
      const featureData = loadFeature(manifoldDir, feature);
      if (featureData?.manifold) {
        const manifold = featureData.manifold;
        const counts = countConstraints(manifold);
        constraintCount = counts.total ?? 0;
        tensionCount = manifold.tensions?.length ?? 0;
        requiredTruthCount = manifold.anchors?.required_truths?.length ?? 0;
      }
    }
  }

  // Single phase detail
  if (options.phase) {
    const phaseConfig = PHASE_MODELS[options.phase];
    if (!phaseConfig) {
      printError(`Unknown phase: ${options.phase}. Valid phases: ${Object.keys(PHASE_MODELS).join(', ')}`);
      process.exit(2);
    }

    const estimate = estimateTokenBudget(
      options.phase, constraintCount, tensionCount, requiredTruthCount, contextWindow,
    );

    if (options.json) {
      println(toJSON({ phase: options.phase, config: phaseConfig, estimate }));
      return;
    }

    printPhaseDetail(options.phase, phaseConfig, estimate, provider, feature);
    return;
  }

  // Full workflow budget
  const { phases, total } = estimateWorkflowBudget(
    constraintCount, tensionCount, requiredTruthCount, contextWindow,
  );

  if (options.json) {
    println(toJSON({
      feature: feature ?? null,
      constraints: constraintCount,
      tensions: tensionCount,
      required_truths: requiredTruthCount,
      context_window: contextWindow,
      provider,
      phases: phases.map(p => ({
        phase: p.phase,
        model: p.model,
        dispatch: p.dispatch,
        recommended: p.recommended[provider],
        input_tokens: p.inputTokens,
        output_tokens: p.outputTokens,
        total_tokens: p.totalTokens,
        fits_window: p.fitsWindow,
      })),
      total_tokens: total,
    }));
    return;
  }

  // Format and print table
  const table = formatBudgetTable(phases, total, provider, contextWindow, feature);
  println(table);

  // Apply model overrides from config
  if (config.models?.overrides) {
    println('');
    println('Config overrides (from .manifold/config.json):');
    for (const [phase, model] of Object.entries(config.models.overrides)) {
      println(`  ${phase}: ${model}`);
    }
  }
}

function printPhaseDetail(
  phase: string,
  config: typeof PHASE_MODELS[string],
  estimate: TokenEstimate,
  provider: 'anthropic' | 'openai' | 'google',
  feature?: string,
): void {
  println(`PHASE: ${phase}`);
  println(`Recommended: ${config.recommended.anthropic} | ${config.recommended.openai} | ${config.recommended.google}`);
  println(`Dispatch: ${config.dispatch} (${config.interactive ? 'interactive' : 'non-interactive'})`);
  println(`Rationale: ${config.rationale}`);
  println('');
  println('Token estimates' + (feature ? ` (${feature})` : '') + ':');
  println(`  Input:  ~${estimate.inputTokens.toLocaleString()}`);
  println(`  Output: ~${estimate.outputTokens.toLocaleString()}`);
  println(`  Total:  ~${estimate.totalTokens.toLocaleString()}`);
  println('');
  println(`Min context window: ${config.minContextWindow.toLocaleString()} tokens`);
  println(`Fits current window: ${estimate.fitsWindow ? 'YES' : 'NO'}`);

  if (config.perConstraint > 0 || config.perTension > 0 || config.perRequiredTruth > 0) {
    println('');
    println('Scaling factors:');
    if (config.perConstraint > 0) println(`  +${config.perConstraint} tokens per constraint`);
    if (config.perTension > 0) println(`  +${config.perTension} tokens per tension`);
    if (config.perRequiredTruth > 0) println(`  +${config.perRequiredTruth} tokens per required truth`);
  }
}
