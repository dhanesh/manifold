#!/usr/bin/env bun
/**
 * Manifold CLI
 * Native CLI for deterministic Manifold operations
 *
 * Satisfies:
 * - T1: Response time < 100ms
 * - T3: Unix exit codes (0=success, 1=error, 2=validation failure)
 * - O2: Version queryable via --version
 * - S3: No network calls (fully offline)
 */

import { Command } from 'commander';
import { registerStatusCommand } from './commands/status.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerInitCommand } from './commands/init.js';
import { registerVerifyCommand } from './commands/verify.js';
import { registerDriftCommand } from './commands/drift.js';
import { registerGraphCommand } from './commands/graph.js';
import { registerSolveCommand } from './commands/solve.js';
import { registerMigrateCommand } from './commands/migrate.js';
import { registerShowCommand } from './commands/show.js';
import { registerCompletionCommand } from './commands/completion.js';
import { registerHookCommand } from './commands/hook.js';
import { registerServeCommand } from './commands/serve.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { setColorMode } from './lib/output.js';
import { configureLogger, startTimer, endTimer, emitTimingSummary, type LogMode } from './lib/logger.js';
import pkg from './package.json';

// Version from package.json
const VERSION = pkg.version;

// Create program
const program = new Command();

program
  .name('manifold')
  .description('Native CLI for Manifold constraint-first development framework')
  .version(VERSION, '-v, --version', 'Output version number')
  .option('--no-color', 'Disable colored output')
  .option('--force-color', 'Force colored output even when not a TTY')
  .option('--verbose', 'Show detailed output')
  .option('--quiet', 'Show errors only')
  .option('--json', 'Output structured JSON (machine-readable)')
  .option('--debug', 'Show timing, cache stats, and diagnostic metadata')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    // Handle color options (Satisfies: O3)
    if (opts.forceColor) {
      setColorMode('always');
    } else if (opts.color === false) {
      setColorMode('never');
    } else {
      setColorMode('auto');
    }

    // Configure logger mode (Satisfies: T1, RT-1)
    // U1: when no new flags are passed, behavior is identical (TTY mode, no debug)
    let mode: LogMode = 'tty';
    if (opts.json) mode = 'json';
    else if (opts.quiet) mode = 'quiet';
    configureLogger(mode, opts.debug ?? false);

    // Start command timing (Satisfies: RT-6, T5)
    const commandName = thisCommand.args?.[0] || thisCommand.name();
    startTimer(`cmd:${commandName}`);
  })
  .hook('postAction', (thisCommand) => {
    const commandName = thisCommand.args?.[0] || thisCommand.name();
    const duration = endTimer(`cmd:${commandName}`);
    emitTimingSummary(commandName, duration);
  });

// Register commands
registerStatusCommand(program);
registerValidateCommand(program);
registerInitCommand(program);
registerVerifyCommand(program);
registerDriftCommand(program);
registerGraphCommand(program);
registerSolveCommand(program);
registerMigrateCommand(program);
registerShowCommand(program);
registerCompletionCommand(program);
registerHookCommand(program);
registerServeCommand(program);
registerDoctorCommand(program);

// Parse arguments
program.parse();
