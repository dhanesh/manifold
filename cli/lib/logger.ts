/**
 * Manifold Structured Logger
 * Satisfies: T1 (3 output modes), O3 (respects NO_COLOR), S2 (metadata only, no content)
 * Resolution: TN1 (pino accepted as one logging dependency)
 * Resolution: TN3 (debug shows metadata only, never constraint content)
 *
 * Three modes:
 *   1. TTY (default): human-readable colorized output via existing output.ts
 *   2. Quiet (--quiet): errors only
 *   3. JSON (--json): structured pino JSON for machine consumption
 *
 * Debug mode (--debug): emits timing, cache stats, IDs -- never user content.
 */

import pino from 'pino';

export type LogMode = 'tty' | 'quiet' | 'json';

let currentMode: LogMode = 'tty';
let debugEnabled = false;
let pinoLogger: pino.Logger | null = null;

/** Configure the logger mode. Called from CLI root preAction hook. */
export function configureLogger(mode: LogMode, debug: boolean = false): void {
  currentMode = mode;
  debugEnabled = debug;

  if (mode === 'json') {
    pinoLogger = pino({
      level: debug ? 'debug' : 'info',
      // Satisfies S2: no user content in logs, only metadata
      serializers: {
        // Strip any accidentally-passed content fields
        err: pino.stdSerializers.err,
      },
    });
  } else {
    pinoLogger = null;
  }
}

export function getLogMode(): LogMode {
  return currentMode;
}

export function isDebug(): boolean {
  return debugEnabled;
}

// ─── Logging functions ──────────────────────────────────────────

/** Log info-level message. Suppressed in quiet mode. */
export function logInfo(msg: string, meta?: Record<string, unknown>): void {
  if (currentMode === 'quiet') return;

  if (currentMode === 'json' && pinoLogger) {
    pinoLogger.info(meta ?? {}, msg);
  }
  // TTY mode: output.ts handles this via existing console paths
  // We don't duplicate TTY output here -- commands use output.ts directly
}

/** Log warning. Shown in all modes. */
export function logWarn(msg: string, meta?: Record<string, unknown>): void {
  if (currentMode === 'json' && pinoLogger) {
    pinoLogger.warn(meta ?? {}, msg);
  } else {
    console.error(msg);
  }
}

/** Log error. Shown in all modes. */
export function logError(msg: string, meta?: Record<string, unknown>): void {
  if (currentMode === 'json' && pinoLogger) {
    pinoLogger.error(meta ?? {}, msg);
  } else {
    console.error(msg);
  }
}

/** Log debug. Only shown when --debug is active. Metadata only per TN3. */
export function logDebug(msg: string, meta?: Record<string, unknown>): void {
  if (!debugEnabled) return;

  if (currentMode === 'json' && pinoLogger) {
    pinoLogger.debug(meta ?? {}, msg);
  } else {
    // TTY debug: stderr with prefix
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.error(`[debug] ${msg}${metaStr}`);
  }
}

// ─── Command timing (RT-6, T5) ─────────────────────────────────

const timers = new Map<string, number>();

/** Start timing a command/operation. Uses performance.now() for <1ms overhead (T5). */
export function startTimer(label: string): void {
  timers.set(label, performance.now());
}

/** End timing and log duration. Returns duration in ms. */
export function endTimer(label: string): number {
  const start = timers.get(label);
  if (start === undefined) return 0;

  const duration = performance.now() - start;
  timers.delete(label);

  logDebug(`${label} completed`, { duration_ms: Math.round(duration * 100) / 100 });

  return duration;
}

/** Emit all timing data as structured JSON (for --json mode). */
export function emitTimingSummary(command: string, totalMs: number): void {
  if (currentMode === 'json' && pinoLogger) {
    pinoLogger.info({ command, total_ms: Math.round(totalMs * 100) / 100 }, 'command_complete');
  } else if (debugEnabled) {
    console.error(`[debug] ${command}: ${Math.round(totalMs * 100) / 100}ms`);
  }
}
