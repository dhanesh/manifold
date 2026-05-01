/**
 * EADDRINUSE collision behaviour — when the requested port is bound, the
 * CLI must exit non-zero and surface a kernel-suggested free port.
 *
 * @constraint O1 — port-in-use fail-fast
 * @constraint T3 — default port handling
 * @constraint RT-11 — collision behaviour
 */

import { describe, test, expect } from 'bun:test';
import { createServer, type Server } from 'net';
import { spawn } from 'child_process';
import { join } from 'path';

const CLI = ['cli/index.ts'];
const PROJECT_ROOT = join(import.meta.dir, '..', '..');

function bindPort(host: string): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const s: Server = createServer();
    s.once('error', reject);
    s.listen(0, host, () => {
      const addr = s.address();
      if (!addr || typeof addr !== 'object') {
        reject(new Error('no address'));
        return;
      }
      resolve({
        port: addr.port,
        close: () =>
          new Promise<void>((r) => {
            s.close(() => r());
          }),
      });
    });
  });
}

function runCli(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', [...CLI, ...args], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (b) => (stdout += b.toString()));
    proc.stderr.on('data', (b) => (stderr += b.toString()));
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('manifold serve EADDRINUSE handling (O1, RT-11)', () => {
  test('exits non-zero and suggests an alternate port when target is bound', async () => {
    const blocker = await bindPort('127.0.0.1');
    try {
      const { code, stdout, stderr } = await runCli(['serve', '--port', String(blocker.port)]);
      expect(code).not.toBe(0);
      const merged = (stderr + stdout).toLowerCase();
      expect(merged).toContain('already in use');
      // The fail-fast message should mention --port as the recovery action.
      expect(merged).toContain('--port');
    } finally {
      await blocker.close();
    }
  }, 10_000);

  test('rejects out-of-range --port with a validation error', async () => {
    const { code, stdout, stderr } = await runCli(['serve', '--port', '80']);
    expect(code).toBe(2);
    const merged = (stderr + stdout).toLowerCase();
    expect(merged).toContain('1024');
  }, 10_000);
});
