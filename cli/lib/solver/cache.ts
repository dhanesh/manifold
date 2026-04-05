/**
 * Graph Cache Module
 * Satisfies: T3, T6, RT-4
 *
 * In-memory caching for constraint graphs with hash-based invalidation.
 */

import type {
  Manifold,
  ConstraintGraph,
  ExecutionPlan,
} from '../parser';

// ============================================================
// Graph Cache
// ============================================================

export interface CachedGraph {
  graph: ConstraintGraph;
  plan?: ExecutionPlan;
  createdAt: number;
  manifestHash: string;
}

// In-memory cache for constraint graphs (session-scoped)
export const graphCache = new Map<string, CachedGraph>();

/**
 * Generate a hash for cache invalidation
 * Uses feature name + constraint count + phase as a simple change detector
 */
export function generateManifestHash(manifold: Manifold): string {
  const constraintCount =
    (manifold.constraints?.business?.length ?? 0) +
    (manifold.constraints?.technical?.length ?? 0) +
    (manifold.constraints?.user_experience?.length ?? 0) +
    (manifold.constraints?.security?.length ?? 0) +
    (manifold.constraints?.operational?.length ?? 0);

  const tensionCount = manifold.tensions?.length ?? 0;
  const rtCount = manifold.anchors?.required_truths?.length ?? 0;
  const artifactCount = manifold.generation?.artifacts?.length ?? 0;

  return `${manifold.feature}:${manifold.phase}:${constraintCount}:${tensionCount}:${rtCount}:${artifactCount}`;
}

/**
 * Get cached graph if valid, or null if cache miss/stale
 */
export function getCachedGraph(feature: string, manifold: Manifold): CachedGraph | null {
  const cached = graphCache.get(feature);
  if (!cached) return null;

  const currentHash = generateManifestHash(manifold);
  if (cached.manifestHash !== currentHash) {
    // Cache is stale, remove it
    graphCache.delete(feature);
    return null;
  }

  return cached;
}

/**
 * Store graph in cache
 */
export function cacheGraph(feature: string, manifold: Manifold, graph: ConstraintGraph, plan?: ExecutionPlan): void {
  graphCache.set(feature, {
    graph,
    plan,
    createdAt: Date.now(),
    manifestHash: generateManifestHash(manifold)
  });
}

/**
 * Clear all cached graphs
 */
export function clearGraphCache(): void {
  graphCache.clear();
}

/**
 * Get cache statistics
 */
export function getGraphCacheStats(): { size: number; features: string[] } {
  return {
    size: graphCache.size,
    features: [...graphCache.keys()]
  };
}
