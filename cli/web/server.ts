/**
 * HTTP layer for `manifold serve` — embeds Bun.serve and the two-tier
 * `/api/manifolds` surface.
 *
 * Satisfies: RT-3 (loopback HTTP listener, GET-only),
 *            RT-9 (cache namespace versioned by binary version),
 *            RT-12 (two-tier /api/manifolds surface),
 *            T2 (read-only — only GET/HEAD), S1 (loopback bind),
 *            S3 (no path traversal — pathname normalised, asset map lookup),
 *            U4 (multi-manifold index lazy-loaded by feature).
 */

import {
  listManifolds,
  loadManifoldDetail,
} from '../lib/manifold-collection.js';
import {
  getEmbeddedAssets,
  lookupAsset,
  type EmbeddedAssetMap,
} from '../lib/embedded-assets.js';

export interface ServeContext {
  manifoldDir: string;
  host: string;
  port: number;
  cliVersion: string;
}

export interface RunningServer {
  port: number;
  host: string;
  stop(): Promise<void>;
}

interface MinimalServer {
  port: number;
  hostname: string;
  stop(closeActiveConnections?: boolean): void | Promise<void>;
}

const SAFE_METHODS = new Set(['GET', 'HEAD']);
const FEATURE_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
      ...(init.headers ?? {}),
    },
  });
}

function notFound(): Response {
  return new Response('Not Found', { status: 404 });
}

function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { allow: 'GET, HEAD' },
  });
}

function injectVersion(html: string, version: string): string {
  if (html.includes('name="manifold-version"')) {
    return html.replace(
      /<meta name="manifold-version"[^>]*>/,
      `<meta name="manifold-version" content="${version}">`,
    );
  }
  return html.replace(
    /<head([^>]*)>/i,
    `<head$1>\n    <meta name="manifold-version" content="${version}">`,
  );
}

function buildAssetResponse(
  asset: { contentType: string; body: Uint8Array; immutable: boolean },
  pathname: string,
  version: string,
): Response {
  const isHtml = pathname.endsWith('.html') || pathname === '/' || pathname.endsWith('/');
  const headers: Record<string, string> = {
    'content-type': asset.contentType,
    'manifold-version': version,
  };

  if (asset.immutable && !isHtml) {
    headers['cache-control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['cache-control'] = 'no-cache';
  }

  if (isHtml) {
    const html = new TextDecoder().decode(asset.body);
    return new Response(injectVersion(html, version), { headers });
  }

  return new Response(asset.body, { headers });
}

export async function handleRequest(
  ctx: ServeContext,
  assets: EmbeddedAssetMap,
  request: Request,
): Promise<Response> {
  if (!SAFE_METHODS.has(request.method)) {
    return methodNotAllowed();
  }

  const url = new URL(request.url);
  let pathname = url.pathname;

  // S3: collapse traversal attempts — normalise to a single absolute path
  // and reject anything containing `..` segments.
  if (pathname.includes('..')) return notFound();

  if (pathname === '/api/manifolds') {
    const manifolds = listManifolds(ctx.manifoldDir);
    return jsonResponse({ manifolds, version: ctx.cliVersion });
  }

  const detailMatch = pathname.match(/^\/api\/manifolds\/([^/]+)$/);
  if (detailMatch) {
    const feature = decodeURIComponent(detailMatch[1]);
    if (!FEATURE_NAME_PATTERN.test(feature)) return notFound();
    const detail = loadManifoldDetail(ctx.manifoldDir, feature);
    if (!detail) return notFound();
    return jsonResponse({ ...detail, version: ctx.cliVersion });
  }

  const asset = lookupAsset(assets, pathname);
  if (asset) return buildAssetResponse(asset, pathname, ctx.cliVersion);

  if (pathname !== '/' && !pathname.includes('.')) {
    const fallback = lookupAsset(assets, '/index.html');
    if (fallback) return buildAssetResponse(fallback, '/index.html', ctx.cliVersion);
  }

  return notFound();
}

export async function startManifoldServer(
  ctx: ServeContext,
): Promise<RunningServer> {
  const assets = await getEmbeddedAssets();
  const bun = (globalThis as any).Bun as
    | {
        serve: (opts: {
          port: number;
          hostname: string;
          fetch: (req: Request) => Promise<Response> | Response;
        }) => MinimalServer;
      }
    | undefined;

  if (!bun) {
    throw new Error(
      '`manifold serve` requires the Bun runtime. Use the prebuilt binary from GitHub releases.',
    );
  }

  const server = bun.serve({
    port: ctx.port,
    hostname: ctx.host,
    fetch: (req) => handleRequest(ctx, assets, req),
  });

  return {
    port: server.port,
    host: server.hostname,
    async stop() {
      await server.stop(true);
    },
  };
}
