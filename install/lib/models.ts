/**
 * Model Routing Configuration for Manifold Phases
 * Satisfies: RT-budget (token-aware model selection per phase)
 *
 * Defines which AI models are recommended for each Manifold phase,
 * token budget estimates, and scaling functions based on manifold size.
 */

// ============================================================
// Types
// ============================================================

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export type DispatchMode = 'agent' | 'in-context';

export interface PhaseModelConfig {
  /** Model tier for this phase */
  model: ModelTier;
  /** Whether the phase dispatches to an agent or runs in-context */
  dispatch: DispatchMode;
  /** Whether the phase requires user interaction */
  interactive: boolean;
  /** Estimated input tokens (base, before scaling) */
  estimatedInput: number;
  /** Estimated output tokens (base, before scaling) */
  estimatedOutput: number;
  /** Tokens added per constraint */
  perConstraint: number;
  /** Tokens added per tension */
  perTension: number;
  /** Tokens added per required truth */
  perRequiredTruth: number;
  /** Minimum context window needed */
  minContextWindow: number;
  /** Human-readable reason for model choice */
  rationale: string;
  /** Specific model names by provider */
  recommended: {
    anthropic: string;
    openai: string;
    google: string;
  };
}

export interface TokenEstimate {
  phase: string;
  model: ModelTier;
  dispatch: DispatchMode;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  fitsWindow: boolean;
  recommended: {
    anthropic: string;
    openai: string;
    google: string;
  };
}

// ============================================================
// Phase Model Configuration
// ============================================================

export const PHASE_MODELS: Record<string, PhaseModelConfig> = {
  'm0-init': {
    model: 'haiku',
    dispatch: 'agent',
    interactive: false,
    estimatedInput: 2_000,
    estimatedOutput: 1_000,
    perConstraint: 0,
    perTension: 0,
    perRequiredTruth: 0,
    minContextWindow: 8_000,
    rationale: 'Template filling with no complex reasoning',
    recommended: {
      anthropic: 'claude-haiku-4-5',
      openai: 'gpt-4o-mini',
      google: 'gemini-2.0-flash',
    },
  },
  'm1-constrain': {
    model: 'sonnet',
    dispatch: 'in-context',
    interactive: true,
    estimatedInput: 4_000,
    estimatedOutput: 3_000,
    perConstraint: 200,
    perTension: 0,
    perRequiredTruth: 0,
    minContextWindow: 32_000,
    rationale: '5-category interview + GAP checklists + pre-mortem (interactive)',
    recommended: {
      anthropic: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      google: 'gemini-2.5-pro',
    },
  },
  'm2-tension': {
    model: 'opus',
    dispatch: 'in-context',
    interactive: true,
    estimatedInput: 6_000,
    estimatedOutput: 4_000,
    perConstraint: 100,
    perTension: 500,
    perRequiredTruth: 0,
    minContextWindow: 64_000,
    rationale: 'TRIZ classification + cascade analysis + propagation (interactive)',
    recommended: {
      anthropic: 'claude-opus-4-6',
      openai: 'o3',
      google: 'gemini-2.5-ultra',
    },
  },
  'm3-anchor': {
    model: 'opus',
    dispatch: 'in-context',
    interactive: true,
    estimatedInput: 5_000,
    estimatedOutput: 5_000,
    perConstraint: 50,
    perTension: 100,
    perRequiredTruth: 300,
    minContextWindow: 64_000,
    rationale: 'Recursive backward chaining depth 1-4 + Theory of Constraints (interactive)',
    recommended: {
      anthropic: 'claude-opus-4-6',
      openai: 'o3',
      google: 'gemini-2.5-ultra',
    },
  },
  'm4-generate': {
    model: 'opus',
    dispatch: 'agent',
    interactive: false,
    estimatedInput: 8_000,
    estimatedOutput: 15_000,
    perConstraint: 200,
    perTension: 100,
    perRequiredTruth: 1_000,
    minContextWindow: 128_000,
    rationale: 'Simultaneous multi-artifact generation across 6 types',
    recommended: {
      anthropic: 'claude-opus-4-6',
      openai: 'o3',
      google: 'gemini-2.5-pro',
    },
  },
  'm5-verify': {
    model: 'sonnet',
    dispatch: 'agent',
    interactive: false,
    estimatedInput: 4_000,
    estimatedOutput: 3_000,
    perConstraint: 100,
    perTension: 50,
    perRequiredTruth: 200,
    minContextWindow: 32_000,
    rationale: 'Read-only verification and classification matrix',
    recommended: {
      anthropic: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      google: 'gemini-2.5-pro',
    },
  },
  'm6-integrate': {
    model: 'sonnet',
    dispatch: 'agent',
    interactive: false,
    estimatedInput: 4_000,
    estimatedOutput: 3_000,
    perConstraint: 50,
    perTension: 0,
    perRequiredTruth: 100,
    minContextWindow: 32_000,
    rationale: 'Pattern matching for integration points',
    recommended: {
      anthropic: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      google: 'gemini-2.5-pro',
    },
  },
  'm-quick': {
    model: 'sonnet',
    dispatch: 'in-context',
    interactive: true,
    estimatedInput: 3_000,
    estimatedOutput: 5_000,
    perConstraint: 200,
    perTension: 0,
    perRequiredTruth: 0,
    minContextWindow: 32_000,
    rationale: 'Lightweight 3-phase combined workflow (interactive)',
    recommended: {
      anthropic: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      google: 'gemini-2.5-pro',
    },
  },
  'm-solve': {
    model: 'sonnet',
    dispatch: 'agent',
    interactive: false,
    estimatedInput: 4_000,
    estimatedOutput: 3_000,
    perConstraint: 100,
    perTension: 200,
    perRequiredTruth: 100,
    minContextWindow: 32_000,
    rationale: 'Graph solver and parallel plan generation',
    recommended: {
      anthropic: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      google: 'gemini-2.5-pro',
    },
  },
  'm-status': {
    model: 'haiku',
    dispatch: 'agent',
    interactive: false,
    estimatedInput: 2_000,
    estimatedOutput: 1_500,
    perConstraint: 20,
    perTension: 20,
    perRequiredTruth: 20,
    minContextWindow: 8_000,
    rationale: 'Read-only status display',
    recommended: {
      anthropic: 'claude-haiku-4-5',
      openai: 'gpt-4o-mini',
      google: 'gemini-2.0-flash',
    },
  },
};

// ============================================================
// Full workflow phase order
// ============================================================

export const WORKFLOW_PHASES = [
  'm0-init',
  'm1-constrain',
  'm2-tension',
  'm3-anchor',
  'm4-generate',
  'm5-verify',
] as const;

// ============================================================
// Estimation Functions
// ============================================================

/**
 * Estimate token budget for a specific phase, optionally scaled by manifold size.
 */
export function estimateTokenBudget(
  phase: string,
  constraintCount = 0,
  tensionCount = 0,
  requiredTruthCount = 0,
  contextWindow = 200_000,
): TokenEstimate {
  const config = PHASE_MODELS[phase];
  if (!config) {
    return {
      phase,
      model: 'sonnet',
      dispatch: 'in-context',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      fitsWindow: true,
      recommended: { anthropic: 'unknown', openai: 'unknown', google: 'unknown' },
    };
  }

  const inputTokens = config.estimatedInput
    + (constraintCount * config.perConstraint)
    + (tensionCount * config.perTension)
    + (requiredTruthCount * config.perRequiredTruth);

  const outputTokens = config.estimatedOutput
    + (constraintCount * Math.floor(config.perConstraint * 0.5))
    + (tensionCount * Math.floor(config.perTension * 0.5))
    + (requiredTruthCount * Math.floor(config.perRequiredTruth * 0.5));

  const totalTokens = inputTokens + outputTokens;

  return {
    phase,
    model: config.model,
    dispatch: config.dispatch,
    inputTokens,
    outputTokens,
    totalTokens,
    fitsWindow: totalTokens <= contextWindow,
    recommended: config.recommended,
  };
}

/**
 * Estimate token budgets for a full workflow.
 */
export function estimateWorkflowBudget(
  constraintCount = 0,
  tensionCount = 0,
  requiredTruthCount = 0,
  contextWindow = 200_000,
): { phases: TokenEstimate[]; total: number } {
  const phases = WORKFLOW_PHASES.map(phase =>
    estimateTokenBudget(phase, constraintCount, tensionCount, requiredTruthCount, contextWindow),
  );

  const total = phases.reduce((sum, p) => sum + p.totalTokens, 0);

  return { phases, total };
}

/**
 * Format a budget table for CLI display.
 */
export function formatBudgetTable(
  phases: TokenEstimate[],
  total: number,
  provider: 'anthropic' | 'openai' | 'google' = 'anthropic',
  contextWindow = 200_000,
  featureName?: string,
): string {
  const header = featureName
    ? `MANIFOLD MODEL ROUTING: ${featureName}`
    : 'MANIFOLD MODEL ROUTING';

  const lines: string[] = [header, ''];

  // Table header
  const colPhase = 'Phase'.padEnd(16);
  const colModel = 'Model'.padEnd(24);
  const colDispatch = 'Dispatch'.padEnd(10);
  const colInput = 'Est. Input'.padStart(12);
  const colOutput = 'Est. Output'.padStart(13);
  const colTotal = 'Total'.padStart(8);
  const colFits = `Fits ${Math.floor(contextWindow / 1000)}K?`.padStart(10);

  lines.push(`${colPhase}${colModel}${colDispatch}${colInput}${colOutput}${colTotal}${colFits}`);
  lines.push('─'.repeat(93));

  for (const phase of phases) {
    const phaseName = phase.phase.padEnd(16);
    const modelName = phase.recommended[provider].padEnd(24);
    const dispatch = phase.dispatch.padEnd(10);
    const input = phase.inputTokens.toLocaleString().padStart(12);
    const output = phase.outputTokens.toLocaleString().padStart(13);
    const totalCol = phase.totalTokens.toLocaleString().padStart(8);
    const fits = (phase.fitsWindow ? 'YES' : 'NO').padStart(10);

    lines.push(`${phaseName}${modelName}${dispatch}${input}${output}${totalCol}${fits}`);
  }

  lines.push('─'.repeat(93));
  lines.push(`${''.padEnd(16)}${''.padEnd(24)}${''.padEnd(10)}${''.padStart(12)}${''.padStart(13)}${total.toLocaleString().padStart(8)}`);
  lines.push('');

  // Calculate savings
  const agentPhases = phases.filter(p => p.dispatch === 'agent');
  const savedTokens = agentPhases.reduce((sum, p) => sum + p.inputTokens, 0);
  if (savedTokens > 0) {
    lines.push(`Agent-dispatched phases save ~${savedTokens.toLocaleString()} tokens on main context.`);
  }

  return lines.join('\n');
}
