#!/usr/bin/env bun
/**
 * End-to-end regeneration harness for golden-file regression.
 *
 * Unlike runner.ts (which compares the current on-disk manifold to golden),
 * this harness spawns `claude -p` subprocesses to REGENERATE the manifold from
 * scratch — m0 through m5 — in a sandboxed temp dir. That lets us detect
 * regressions in the skill prompts themselves, not just hand edits to files.
 *
 * Phase transitions share state via .manifold/ files on disk, not via session
 * memory (each phase is a fresh subprocess). Web-search steps are suppressed
 * via --skip-lookup to reduce both cost and run-to-run variance.
 *
 * Cost per full run: ~$8–16 (m4-generate dominates). Wall clock: ~5–10 min.
 *
 * Usage:
 *   bun tests/golden/harness.ts <fixture> [--phases m0,m1,m2,m3,m4,m5]
 *                                          [--budget <usd>]
 *                                          [--keep-sandbox]
 *                                          [--out <path.json>]
 *
 * Examples:
 *   bun tests/golden/harness.ts reduce-context-rot
 *   bun tests/golden/harness.ts reduce-context-rot --phases m0,m1 --budget 3
 */

import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { parse as parseYaml } from "yaml";
import { extractSignature, type Signature } from "./signature";
import { compareSignatures, type Diff, type ToleranceMap } from "./compare";

const repoRoot = resolve(import.meta.dir, "../..");
const pluginDir = join(repoRoot, "plugin");
const fixturesDir = join(repoRoot, "tests/golden/fixtures");
const goldenDir = join(repoRoot, "tests/golden/goldens");

interface FixtureSpec {
  feature: string;
  outcome: string;
  must_have_keywords?: string[];
  tolerance?: ToleranceMap;
}

interface PhaseSpec {
  name: string;
  prompt: (feature: string, outcome: string) => string;
  maxUsd: number;
  timeoutMs: number;
  // Post-condition: the manifold's phase field must equal this after the
  // subprocess returns. If it doesn't, the model narrated the work without
  // writing it — a silent failure we want to surface loudly.
  expectedPhase: string;
}

const PHASES: PhaseSpec[] = [
  {
    name: "m0",
    prompt: (f, o) => `/manifold:m0-init ${f} --outcome=${shellQuote(o)}`,
    maxUsd: 1.0,
    timeoutMs: 120_000,
    expectedPhase: "INITIALIZED",
  },
  {
    name: "m1",
    prompt: (f) => `/manifold:m1-constrain ${f} --skip-lookup`,
    maxUsd: 4.0,
    timeoutMs: 600_000,
    expectedPhase: "CONSTRAINED",
  },
  {
    name: "m2",
    prompt: (f) => `/manifold:m2-tension ${f} --skip-lookup --resolve`,
    maxUsd: 3.0,
    timeoutMs: 600_000,
    expectedPhase: "TENSIONED",
  },
  {
    name: "m3",
    prompt: (f) => `/manifold:m3-anchor ${f} --skip-lookup`,
    maxUsd: 3.0,
    timeoutMs: 600_000,
    expectedPhase: "ANCHORED",
  },
  {
    name: "m4",
    prompt: (f) => `/manifold:m4-generate ${f}`,
    maxUsd: 8.0,
    timeoutMs: 900_000,
    expectedPhase: "GENERATED",
  },
  {
    name: "m5",
    prompt: (f) => `/manifold:m5-verify ${f}`,
    maxUsd: 4.0,
    timeoutMs: 600_000,
    expectedPhase: "VERIFIED",
  },
];

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

interface PhaseResult {
  phase: string;
  success: boolean;
  cost_usd: number;
  duration_ms: number;
  num_turns: number;
  result: string;
  error?: string;
  // Observed phase field in the on-disk manifold after the subprocess returned.
  // If this is absent or diverges from PhaseSpec.expectedPhase, the skill
  // subprocess-succeeded but left state unchanged.
  observed_phase?: string;
  phase_advanced?: boolean;
}

interface HarnessRun {
  feature: string;
  started_at: string;
  sandbox: string;
  phases: PhaseResult[];
  signature: Signature | null;
  diffs: Diff[] | null;
  total_cost_usd: number;
  total_duration_ms: number;
  sandbox_kept: boolean;
}

async function runPhase(
  spec: PhaseSpec,
  feature: string,
  outcome: string,
  sandbox: string
): Promise<PhaseResult> {
  const prompt = spec.prompt(feature, outcome);
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--plugin-dir", pluginDir,
    "--dangerously-skip-permissions",
    "--no-session-persistence",
    "--max-budget-usd", String(spec.maxUsd),
    "--model", "claude-opus-4-7",
  ];

  const started = Date.now();
  const proc = Bun.spawn(["claude", ...args], {
    cwd: sandbox,
    stdout: "pipe",
    stderr: "pipe",
  });

  const timeout = setTimeout(() => {
    try { proc.kill(); } catch {}
  }, spec.timeoutMs);

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  clearTimeout(timeout);
  const duration_ms = Date.now() - started;

  let parsed: any = null;
  try {
    // claude --output-format=json emits a single JSON object on stdout.
    const trimmed = stdout.trim();
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      phase: spec.name,
      success: false,
      cost_usd: 0,
      duration_ms,
      num_turns: 0,
      result: stdout.slice(-500),
      error: `failed to parse JSON output. stderr: ${stderr.slice(-500)}`,
    };
  }

  const isError = parsed.is_error === true || proc.exitCode !== 0;

  // Post-condition: re-read the manifold from disk and verify the skill
  // actually advanced the phase. A subprocess can exit cleanly while the
  // model merely narrated the work — this catches that silent failure.
  let observed_phase: string | undefined;
  let phase_advanced = false;
  const manifoldPath = join(sandbox, ".manifold", `${feature}.json`);
  if (existsSync(manifoldPath)) {
    try {
      const m = JSON.parse(readFileSync(manifoldPath, "utf-8"));
      observed_phase = m.phase;
      phase_advanced = m.phase === spec.expectedPhase;
    } catch {}
  }

  const postConditionFailed = !isError && !phase_advanced;
  return {
    phase: spec.name,
    success: !isError && phase_advanced,
    cost_usd: parsed.total_cost_usd ?? 0,
    duration_ms: parsed.duration_ms ?? duration_ms,
    num_turns: parsed.num_turns ?? 0,
    result: typeof parsed.result === "string" ? parsed.result.slice(0, 2000) : "",
    error: isError
      ? (parsed.result ?? stderr.slice(-500))
      : postConditionFailed
      ? `phase did not advance — expected ${spec.expectedPhase}, manifold still at ${observed_phase ?? "(absent)"}`
      : undefined,
    observed_phase,
    phase_advanced,
  };
}

function loadFixture(feature: string): FixtureSpec {
  const path = join(fixturesDir, `${feature}.yaml`);
  if (!existsSync(path)) throw new Error(`Fixture not found: ${path}`);
  const parsed = parseYaml(readFileSync(path, "utf-8")) as FixtureSpec;
  if (!parsed.outcome) throw new Error(`Fixture missing required 'outcome': ${path}`);
  return parsed;
}

function loadGolden(feature: string): Signature | null {
  const p = join(goldenDir, `${feature}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8")) as Signature;
}

function parseArgs(argv: string[]) {
  const feature = argv[2];
  if (!feature || feature.startsWith("--")) {
    throw new Error("usage: bun tests/golden/harness.ts <fixture> [--phases m0,m1] [--budget N] [--keep-sandbox] [--sandbox <dir>] [--out path]");
  }
  const opts = {
    feature,
    phases: null as string[] | null,
    budget: Infinity,
    keepSandbox: false,
    sandbox: null as string | null,
    out: null as string | null,
  };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phases") opts.phases = argv[++i].split(",");
    else if (a === "--budget") opts.budget = Number(argv[++i]);
    else if (a === "--keep-sandbox") opts.keepSandbox = true;
    else if (a === "--sandbox") opts.sandbox = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  const fixture = loadFixture(opts.feature);
  const phases = opts.phases
    ? PHASES.filter((p) => opts.phases!.includes(p.name))
    : PHASES;

  if (phases.length === 0) throw new Error(`No phases matched --phases=${opts.phases?.join(",")}`);

  const projectedCost = phases.reduce((s, p) => s + p.maxUsd, 0);
  if (projectedCost > opts.budget) {
    throw new Error(
      `Projected worst-case cost ${projectedCost.toFixed(2)} exceeds --budget ${opts.budget}.\n` +
      `Either raise --budget or reduce --phases.`
    );
  }

  let sandbox: string;
  if (opts.sandbox) {
    if (!existsSync(opts.sandbox)) throw new Error(`--sandbox path does not exist: ${opts.sandbox}`);
    sandbox = opts.sandbox;
  } else {
    sandbox = mkdtempSync(join(tmpdir(), "manifold-harness-"));
    // Skills rely on git being available; init a throwaway repo.
    await Bun.spawn(["git", "init", "-q"], { cwd: sandbox }).exited;
  }

  console.log(`Harness run`);
  console.log(`  feature:  ${fixture.feature}`);
  console.log(`  sandbox:  ${sandbox}`);
  console.log(`  phases:   ${phases.map((p) => p.name).join(", ")}`);
  console.log(`  budget:   $${opts.budget === Infinity ? "∞" : opts.budget.toFixed(2)} (worst-case $${projectedCost.toFixed(2)})`);
  console.log();

  const results: PhaseResult[] = [];
  const runStart = Date.now();
  for (const spec of phases) {
    process.stdout.write(`  ${spec.name} … `);
    const r = await runPhase(spec, fixture.feature, fixture.outcome, sandbox);
    results.push(r);
    const status = r.success ? "ok  " : "FAIL";
    const phaseInfo = r.observed_phase ? ` phase=${r.observed_phase}` : "";
    console.log(`${status}  cost=$${r.cost_usd.toFixed(3)}  dur=${(r.duration_ms / 1000).toFixed(1)}s  turns=${r.num_turns}${phaseInfo}`);
    if (!r.success) {
      console.log(`      error: ${r.error}`);
      break;
    }
  }

  const manifoldDir = join(sandbox, ".manifold");
  let signature: Signature | null = null;
  let diffs: Diff[] | null = null;
  if (existsSync(join(manifoldDir, `${fixture.feature}.json`))) {
    signature = extractSignature(manifoldDir, fixture.feature, fixture.must_have_keywords ?? []);
    const golden = loadGolden(fixture.feature);
    if (golden) diffs = compareSignatures(golden, signature, fixture.tolerance ?? {});
  }

  const run: HarnessRun = {
    feature: fixture.feature,
    started_at: new Date(runStart).toISOString(),
    sandbox,
    phases: results,
    signature,
    diffs,
    total_cost_usd: results.reduce((s, r) => s + r.cost_usd, 0),
    total_duration_ms: Date.now() - runStart,
    sandbox_kept: opts.keepSandbox,
  };

  console.log();
  console.log(`Total cost:     $${run.total_cost_usd.toFixed(3)}`);
  console.log(`Total duration: ${(run.total_duration_ms / 1000).toFixed(1)}s`);
  if (signature) {
    console.log(`Signature:      phase=${signature.phase}  constraints=${signature.constraints.total}  tensions=${signature.tensions.total}  RTs=${signature.anchors.required_truths_total}`);
  } else {
    console.log(`Signature:      (no .manifold/${fixture.feature}.json produced — check phase errors)`);
  }
  if (diffs) {
    if (diffs.length === 0) {
      console.log(`Regression:     clean ✓`);
    } else {
      console.log(`Regression:     ${diffs.length} diff(s) vs golden`);
      for (const d of diffs.slice(0, 20)) {
        console.log(`                × ${d.path} — ${d.reason}`);
      }
      if (diffs.length > 20) console.log(`                … ${diffs.length - 20} more`);
    }
  }

  if (opts.out) {
    mkdirSync(resolve(opts.out, ".."), { recursive: true });
    writeFileSync(opts.out, JSON.stringify(run, null, 2) + "\n");
    console.log(`\nWrote run record to ${opts.out}`);
  }

  if (!opts.keepSandbox) {
    // Leave sandbox in place for debugging but print how to clean.
    console.log(`\nSandbox retained: ${sandbox}`);
    console.log(`Remove with: rm -rf ${sandbox}`);
  }

  process.exit(diffs && diffs.length > 0 ? 1 : results.every((r) => r.success) ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});
