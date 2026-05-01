/**
 * Embedded Assets — typed interface for the build-generated asset map.
 *
 * The actual map is produced by `scripts/build-web.ts`, which compiles
 * `cli/web/dist/` into `cli/lib/embedded-assets.generated.ts`. The
 * generated module re-exports `EMBEDDED_ASSETS` as a `ReadonlyMap` keyed
 * by URL path.
 *
 * Satisfies: RT-1 (embedded asset bundle in CLI binary),
 *            T1 (no CDN at runtime — assets served from binary),
 *            U3 (PWA shell ships pre-cached).
 */

export interface EmbeddedAsset {
  contentType: string;
  body: Uint8Array;
  immutable: boolean;
}

export type EmbeddedAssetMap = ReadonlyMap<string, EmbeddedAsset>;

let assetMap: EmbeddedAssetMap | null = null;

export async function getEmbeddedAssets(): Promise<EmbeddedAssetMap> {
  if (assetMap) return assetMap;
  try {
    const mod: any = await import('./embedded-assets.generated.js');
    assetMap = mod.EMBEDDED_ASSETS as EmbeddedAssetMap;
  } catch {
    assetMap = new Map();
  }
  return assetMap;
}

export function lookupAsset(
  assets: EmbeddedAssetMap,
  pathname: string,
): EmbeddedAsset | undefined {
  if (assets.has(pathname)) return assets.get(pathname);
  if (pathname.endsWith('/')) return assets.get(pathname + 'index.html');
  return undefined;
}
