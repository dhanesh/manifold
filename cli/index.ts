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
import { registerGraphCommand } from './commands/graph.js';
import { registerSolveCommand } from './commands/solve.js';
import { registerMigrateCommand } from './commands/migrate.js';
import { registerShowCommand } from './commands/show.js';
import { registerCompletionCommand } from './commands/completion.js';
import { setColorMode } from './lib/output.js';
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
  .hook('preAction', (thisCommand) => {
    // Handle color options
    const opts = thisCommand.opts();
    if (opts.forceColor) {
      setColorMode('always');
    } else if (opts.color === false) {
      setColorMode('never');
    } else {
      setColorMode('auto');
    }
  });

// Register commands
registerStatusCommand(program);
registerValidateCommand(program);
registerInitCommand(program);
registerVerifyCommand(program);
registerGraphCommand(program);
registerSolveCommand(program);
registerMigrateCommand(program);
registerShowCommand(program);
registerCompletionCommand(program);

// Parse arguments
program.parse();
