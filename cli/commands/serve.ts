/**
 * `manifold serve` — local web visualiser for project manifolds.
 *
 * Satisfies: RT-2 (CLI command registered), RT-3 (loopback HTTP listener,
 *            GET-only, graceful shutdown), RT-11 (default port + --port +
 *            collision fail-fast with kernel-suggested free port),
 *            RT-12 (two-tier /api/manifolds surface),
 *            T2 (read-only server), T3 (default port derived from "manifold"),
 *            S1 (loopback-only by default), S3 (no path traversal),
 *            O1 (port-in-use fail-fast), O2 (graceful shutdown ≤ 1s),
 *            O3 (cache namespace versioned by binary version).
 */

import type { Command } from 'commander';
import { createServer as createNetServer } from 'net';
import { println, printError } from '../lib/output.js';
import { resolveManifoldDir } from '../lib/manifold-collection.js';
import { startManifoldServer, type ServeContext } from '../web/server.js';
import pkg from '../package.json';

export const DEFAULT_PORT = 6353;
export const COMMON_CONFLICT_PORTS = new Set([
  3000, 3001, 4200, 5000, 5173, 8000, 8080, 8443, 9000,
]);

interface ServeOptions {
  port?: string;
  host?: string;
}

interface ParsedOptions {
  port: number;
  host: string;
  hostExplicit: boolean;
}

class PortValidationError extends Error {}

export function parseServeOptions(opts: ServeOptions): ParsedOptions {
  const host = opts.host ?? '127.0.0.1';
  let port = DEFAULT_PORT;

  if (opts.port !== undefined) {
    const parsed = Number.parseInt(opts.port, 10);
    if (!Number.isInteger(parsed) || String(parsed) !== String(opts.port).trim()) {
      throw new PortValidationError(
        `--port must be an integer; got "${opts.port}"`,
      );
    }
    if (parsed < 1024 || parsed > 65535) {
      throw new PortValidationError(
        `--port must be in [1024, 65535]; got ${parsed}`,
      );
    }
    port = parsed;
  }

  return { port, host, hostExplicit: opts.host !== undefined };
}

/**
 * Bind an ephemeral OS-chosen port and immediately release it. Used to
 * suggest a free port in the EADDRINUSE error message (RT-11).
 */
export async function findFreePort(host: string): Promise<number | null> {
  return new Promise((resolve) => {
    const probe = createNetServer();
    probe.once('error', () => resolve(null));
    probe.listen(0, host, () => {
      const addr = probe.address();
      const port =
        addr && typeof addr === 'object' && 'port' in addr ? addr.port : null;
      probe.close(() => resolve(port));
    });
  });
}

export async function serveCommand(rawOpts: ServeOptions): Promise<number> {
  let opts: ParsedOptions;
  try {
    opts = parseServeOptions(rawOpts);
  } catch (err) {
    printError(
      err instanceof PortValidationError ? err.message : String(err),
      'Pass --port <integer> in the range 1024..65535',
    );
    return 2;
  }

  if (opts.hostExplicit && opts.host !== '127.0.0.1' && opts.host !== 'localhost') {
    process.stderr.write(
      `[33mWARNING[0m: --host=${opts.host} exposes the manifold visualiser to the network. ` +
        `Manifolds frequently contain unannounced product strategy and security thresholds. ` +
        `Press Ctrl+C now and re-run with default loopback if this was unintended.\n`,
    );
  }

  const manifoldDir = resolveManifoldDir();
  if (!manifoldDir) {
    printError(
      'No .manifold/ directory found in this project',
      'Run `manifold init <feature>` first, or change to a directory containing manifolds.',
    );
    return 1;
  }

  const ctx: ServeContext = {
    manifoldDir,
    host: opts.host,
    port: opts.port,
    cliVersion: pkg.version,
  };

  try {
    const server = await startManifoldServer(ctx);
    const url = `http://${opts.host}:${server.port}`;
    println(`Serving manifold visualiser at ${url}`);
    println(`(${manifoldDir}) — press Ctrl+C to stop`);

    const shutdown = async (signal: string) => {
      println(`\nReceived ${signal}, shutting down…`);
      await server.stop();
      process.exit(0);
    };
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));

    return await new Promise<number>(() => {
      // Keep the process alive until shutdown handlers exit.
    });
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      const free = await findFreePort(opts.host);
      const hint = free
        ? `try \`manifold serve --port ${free}\``
        : `pass \`--port <other>\` with an integer in [1024, 65535]`;
      printError(`Port ${opts.port} on ${opts.host} is already in use`, hint);
      return 1;
    }
    printError(`Failed to start server: ${err?.message ?? err}`);
    return 1;
  }
}

export function registerServeCommand(program: Command): void {
  program
    .command('serve')
    .description('Serve the manifold visualiser as a local web app')
    .option('--port <number>', 'Listen port (default 6353, T9 "MFLD")')
    .option('--host <addr>', 'Bind host (default 127.0.0.1; non-loopback hosts emit a warning)')
    .action(async (options: ServeOptions) => {
      const exitCode = await serveCommand(options);
      process.exit(exitCode);
    });
}
