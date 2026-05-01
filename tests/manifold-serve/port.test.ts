/**
 * Port-handling contract for `manifold serve`.
 *
 * @constraint T3 — default port derived from "manifold", validated absent from common-conflict set
 * @constraint O1 — port-in-use fail-fast with kernel-suggested free port
 * @constraint RT-11 — default + --port + collision behaviour
 */

import { describe, test, expect } from 'bun:test';
import {
  parseServeOptions,
  findFreePort,
  DEFAULT_PORT,
  COMMON_CONFLICT_PORTS,
} from '../../cli/commands/serve.js';

describe('parseServeOptions', () => {
  test('defaults to port 6353 (T9 "MFLD") and host 127.0.0.1 (T3, S1)', () => {
    const opts = parseServeOptions({});
    expect(opts.port).toBe(DEFAULT_PORT);
    expect(opts.port).toBe(6353);
    expect(opts.host).toBe('127.0.0.1');
    expect(opts.hostExplicit).toBe(false);
  });

  test('default port is not in the common-conflict set (T3)', () => {
    expect(COMMON_CONFLICT_PORTS.has(DEFAULT_PORT)).toBe(false);
  });

  test('accepts integer --port in [1024, 65535]', () => {
    expect(parseServeOptions({ port: '1024' }).port).toBe(1024);
    expect(parseServeOptions({ port: '65535' }).port).toBe(65535);
    expect(parseServeOptions({ port: '8123' }).port).toBe(8123);
  });

  test('rejects non-integer --port', () => {
    expect(() => parseServeOptions({ port: 'eight thousand' })).toThrow();
    expect(() => parseServeOptions({ port: '8.5' })).toThrow();
    expect(() => parseServeOptions({ port: '' })).toThrow();
  });

  test('rejects --port below 1024', () => {
    expect(() => parseServeOptions({ port: '80' })).toThrow();
    expect(() => parseServeOptions({ port: '0' })).toThrow();
    expect(() => parseServeOptions({ port: '-1' })).toThrow();
  });

  test('rejects --port above 65535', () => {
    expect(() => parseServeOptions({ port: '70000' })).toThrow();
  });

  test('records explicit host override (S1 warning trigger)', () => {
    const opts = parseServeOptions({ host: '0.0.0.0' });
    expect(opts.host).toBe('0.0.0.0');
    expect(opts.hostExplicit).toBe(true);
  });
});

describe('findFreePort', () => {
  test('returns a port the kernel reports as free (RT-11)', async () => {
    const port = await findFreePort('127.0.0.1');
    expect(port).not.toBeNull();
    expect(port).toBeGreaterThanOrEqual(1024);
    expect(port).toBeLessThanOrEqual(65535);
  });
});
