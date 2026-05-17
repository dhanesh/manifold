/**
 * Doctor Command for Manifold CLI
 * Satisfies: RT-1 (registered command, Commander pattern)
 * Satisfies: RT-6 (exit codes 0/1/2, human + --json rendering)
 * Satisfies: RT-7, S1 (strictly read-only — no filesystem writes)
 */

import type { Command } from 'commander';
import { dirname } from 'path';
import { findManifoldDir } from '../lib/parser.js';
import { runDoctor, type DoctorReport } from '../lib/doctor.js';
import {
  println,
  printError,
  formatHeader,
  formatKeyValue,
  style,
  toJSON,
} from '../lib/output.js';

interface DoctorOptions {
  json?: boolean;
}

/**
 * Register the doctor command
 * Satisfies: RT-1 (T1) — exported registerDoctorCommand(program) wired into CLI via Commander
 */
export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check repo health: detect invalid manifolds, plugin-sync drift, stale fingerprints, and file-drift')
    .option('--json', 'Output as JSON')
    .action(async function(options: DoctorOptions) {
      // Use optsWithGlobals() to capture --json even when defined at parent level
      // Satisfies: RT-6 (U3) — --json must work whether passed as local or global flag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mergedOpts: DoctorOptions = (this as any).optsWithGlobals();
      const exitCode = await doctorCommand(mergedOpts);
      process.exit(exitCode);
    });
}

/**
 * Execute doctor command.
 * Returns exit code: 0 = healthy, 1 = command error, 2 = problems found
 *
 * Satisfies: RT-6 (O1, U2, U3, O2) — deterministic exit codes, human + JSON rendering
 * Satisfies: RT-7, S1 — calls runDoctor which is strictly read-only
 */
async function doctorCommand(options: DoctorOptions): Promise<number> {
  // Satisfies: RT-1 — locate repo root via findManifoldDir (house style from drift.ts)
  const manifoldDir = findManifoldDir();

  if (!manifoldDir) {
    if (options.json) {
      println(toJSON({ error: 'No .manifold/ directory found' }));
    } else {
      printError('No .manifold/ directory found', 'Run manifold init <feature> to create one');
    }
    return 1;
  }

  const repoRoot = dirname(manifoldDir);

  // Run all health checks in a single read-only pass
  // Satisfies: RT-7, S1 (runDoctor performs NO filesystem writes)
  const report = runDoctor(repoRoot);

  // Render the report
  if (options.json) {
    // Satisfies: RT-6 (U3, O2) — machine-readable JSON output
    println(toJSON(report));
  } else {
    // Satisfies: RT-6 (U2) — human-readable output
    printDoctorReport(report);
  }

  // Satisfies: RT-6 (O1) — deterministic exit codes: 0 = healthy, 2 = problems found
  return report.healthy ? 0 : 2;
}

/**
 * Render the doctor report in human-readable format.
 * Satisfies: RT-6 (U2, U3) — clear problem grouping with copy-pasteable fix commands
 */
function printDoctorReport(report: DoctorReport): void {
  const status = report.healthy
    ? style.success('HEALTHY')
    : style.warning(`${report.problems.length} problem(s) found`);

  println(formatHeader(`Doctor: ${status}`));
  println();

  if (report.healthy) {
    println(`  ${style.check()} Repo is healthy — all checks passed.`);
    return;
  }

  // Group problems by check id for cleaner output
  const grouped = new Map<string, typeof report.problems>();
  for (const problem of report.problems) {
    const list = grouped.get(problem.check) ?? [];
    list.push(problem);
    grouped.set(problem.check, list);
  }

  for (const [checkId, problems] of grouped) {
    println(formatKeyValue('Check', style.warning(checkId)));
    for (const problem of problems) {
      println(`  ${style.cross()} ${problem.message}`);
      println(`    ${style.dim('Fix:')} ${style.info(problem.fix)}`);
    }
    println();
  }

  println(`  ${style.dim('Run the fix commands above to resolve each problem.')}`);
}
