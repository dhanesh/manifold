/**
 * Manifold Collection — enumerate every <feature>.json + <feature>.md pair
 * in `.manifold/` and return a normalised in-memory list.
 *
 * Satisfies: RT-4 (multi-schema reader), RT-12 (two-tier API surface),
 *            T5 (multi-schema tolerance), U4 (multi-manifold index),
 *            S3 (no path traversal — file reads bounded to .manifold/).
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { findManifoldDir, listFeatures, getFeatureFiles } from './parser.js';
import { synthesiseGraph, type GraphData } from './graph-synthesis.js';

export interface ManifoldSummary {
  feature: string;
  phase: string;
  outcome: string;
  domain: 'software' | 'non-software';
  schema_version: number;
  format: 'json-md' | 'json' | 'yaml' | 'unknown';
  /** ISO timestamp from json.created, or file mtime if absent. */
  created: string;
  counts: {
    constraints: number;
    tensions: number;
    required_truths: number;
  };
}

export interface VerifyMatrixEntry {
  constraint: string;
  type?: string;
  title?: string;
  status?: string;
  level?: string;
  evidence?: string;
}

export interface VerifyData {
  result?: string;
  convergence_status?: string;
  matrix?: VerifyMatrixEntry[];
  coverage?: unknown;
  gaps?: unknown[];
  closed_gaps?: unknown[];
}

export interface ManifoldDetail extends ManifoldSummary {
  json: unknown;
  markdown: string;
  graph: GraphData;
  verify: VerifyData | null;
}

const FEATURE_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function readJsonSafe(path: string): any {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function readTextSafe(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
}

function firstParagraph(markdown: string): string {
  const match = markdown.match(/##\s+Outcome\s*\n+([^\n]+(?:\n[^\n#][^\n]*)*)/i);
  if (!match) return '';
  return match[1].trim().replace(/\s+/g, ' ').slice(0, 280);
}

function coerceCounts(json: any) {
  const constraints = json?.constraints ?? {};
  const constraintCount = Object.values(constraints).reduce(
    (acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
  const tensions = Array.isArray(json?.tensions) ? json.tensions.length : 0;
  const required_truths = Array.isArray(json?.anchors?.required_truths)
    ? json.anchors.required_truths.length
    : 0;
  return { constraints: constraintCount, tensions, required_truths };
}

export function listManifolds(manifoldDir: string): ManifoldSummary[] {
  const features = listFeatures(manifoldDir);
  const summaries: ManifoldSummary[] = [];

  for (const feature of features) {
    const summary = loadManifoldSummary(manifoldDir, feature);
    if (summary) summaries.push(summary);
  }

  // Newest first: by `created` timestamp when the JSON declares one,
  // falling back to file mtime, then to feature name for total order.
  summaries.sort((a, b) => {
    const cmp = b.created.localeCompare(a.created);
    if (cmp !== 0) return cmp;
    return a.feature.localeCompare(b.feature);
  });
  return summaries;
}

export function loadManifoldSummary(
  manifoldDir: string,
  feature: string,
): ManifoldSummary | null {
  if (!FEATURE_NAME_PATTERN.test(feature)) return null;

  const files = getFeatureFiles(manifoldDir, feature);
  if (!files.manifold) return null;

  const json = readJsonSafe(files.manifold) ?? {};
  const markdown = files.markdown ? readTextSafe(files.markdown) : '';

  let created: string = json?.created ?? '';
  if (!created) {
    try {
      const mtime = statSync(files.manifold).mtime;
      created = mtime.toISOString();
    } catch {
      created = '1970-01-01T00:00:00.000Z';
    }
  }

  return {
    feature,
    phase: json?.phase ?? 'INITIALIZED',
    outcome: firstParagraph(markdown),
    domain: json?.domain ?? 'software',
    schema_version: json?.schema_version ?? 1,
    format: files.format,
    created,
    counts: coerceCounts(json),
  };
}

function readVerifyData(manifoldDir: string, feature: string): VerifyData | null {
  const path = join(manifoldDir, `${feature}.verify.json`);
  if (!existsSync(path)) return null;
  const raw = readJsonSafe(path);
  if (!raw) return null;
  const v = raw.verification ?? raw;
  return {
    result: v?.result,
    convergence_status: v?.convergence_status,
    matrix: Array.isArray(v?.matrix) ? v.matrix : undefined,
    coverage: v?.coverage,
    gaps: Array.isArray(v?.gaps) ? v.gaps : undefined,
    closed_gaps: Array.isArray(v?.closed_gaps) ? v.closed_gaps : undefined,
  };
}

export function loadManifoldDetail(
  manifoldDir: string,
  feature: string,
): ManifoldDetail | null {
  if (!FEATURE_NAME_PATTERN.test(feature)) return null;

  const summary = loadManifoldSummary(manifoldDir, feature);
  if (!summary) return null;

  const files = getFeatureFiles(manifoldDir, feature);
  if (!files.manifold) return null;

  const json = readJsonSafe(files.manifold) ?? {};
  const markdown = files.markdown ? readTextSafe(files.markdown) : '';

  return {
    ...summary,
    json,
    markdown,
    graph: synthesiseGraph(json),
    verify: readVerifyData(manifoldDir, feature),
  };
}

export function resolveManifoldDir(cwd: string = process.cwd()): string | null {
  return findManifoldDir(cwd);
}
