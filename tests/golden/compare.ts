/**
 * Signature comparison with dimension-specific tolerance.
 *
 * Tolerance kinds (declared per-dimension in the fixture YAML):
 *   exact       — equality
 *   bool_exact  — boolean equality
 *   range       — number within [min?, max?]
 *   ratio       — number within golden * [1-r, 1+r]
 *   superset    — actual must contain all golden entries (set or string-keyed object)
 *
 * Any dimension not declared in the fixture falls through to a sensible default:
 *   boolean → bool_exact
 *   number  → ratio r=0.3
 *   string  → exact
 *   array   → length ratio 0.3
 *   object  → recurse
 *
 * The must_have_keywords_hit map is always required to be all-true regardless of
 * tolerance config — those are fixture-level invariants, not structural bands.
 */

import type { Signature } from "./signature";

export type Tolerance =
  | "exact"
  | "bool_exact"
  | { kind: "range"; min?: number; max?: number }
  | { kind: "ratio"; r: number }
  | { kind: "superset" };

export type ToleranceMap = Record<string, Tolerance | string>;

export interface Diff {
  path: string;
  golden: unknown;
  actual: unknown;
  rule: string;
  reason: string;
}

const DEFAULT_RATIO = 0.3;

function normalizeTolerance(t: Tolerance | string | undefined): Tolerance | undefined {
  if (!t) return undefined;
  if (typeof t === "string") {
    if (t === "exact" || t === "bool_exact") return t;
    return undefined;
  }
  return t;
}

function compareValue(
  goldenVal: unknown,
  actualVal: unknown,
  path: string,
  tol: Tolerance | undefined,
  diffs: Diff[]
): void {
  // Explicit tolerance rules take precedence.
  if (tol === "exact") {
    if (goldenVal !== actualVal) {
      diffs.push({
        path,
        golden: goldenVal,
        actual: actualVal,
        rule: "exact",
        reason: `expected ${JSON.stringify(goldenVal)}, got ${JSON.stringify(actualVal)}`,
      });
    }
    return;
  }

  if (tol === "bool_exact") {
    if (goldenVal !== actualVal) {
      diffs.push({
        path,
        golden: goldenVal,
        actual: actualVal,
        rule: "bool_exact",
        reason: `expected ${goldenVal}, got ${actualVal}`,
      });
    }
    return;
  }

  if (tol && typeof tol === "object") {
    if (tol.kind === "range") {
      const n = Number(actualVal);
      if (!Number.isFinite(n)) {
        diffs.push({
          path,
          golden: goldenVal,
          actual: actualVal,
          rule: "range",
          reason: `actual is not a number`,
        });
        return;
      }
      if (tol.min !== undefined && n < tol.min) {
        diffs.push({
          path,
          golden: goldenVal,
          actual: actualVal,
          rule: `range [${tol.min ?? "-∞"}, ${tol.max ?? "∞"}]`,
          reason: `${n} below minimum ${tol.min}`,
        });
      }
      if (tol.max !== undefined && n > tol.max) {
        diffs.push({
          path,
          golden: goldenVal,
          actual: actualVal,
          rule: `range [${tol.min ?? "-∞"}, ${tol.max ?? "∞"}]`,
          reason: `${n} above maximum ${tol.max}`,
        });
      }
      return;
    }

    if (tol.kind === "ratio") {
      const g = Number(goldenVal);
      const a = Number(actualVal);
      if (!Number.isFinite(g) || !Number.isFinite(a)) {
        diffs.push({
          path,
          golden: goldenVal,
          actual: actualVal,
          rule: "ratio",
          reason: "non-numeric value",
        });
        return;
      }
      const low = g * (1 - tol.r);
      const high = g * (1 + tol.r);
      // If golden is 0, fall back to range ±r as absolute tolerance.
      const [lo, hi] = g === 0 ? [-tol.r, tol.r] : [low, high];
      if (a < lo || a > hi) {
        diffs.push({
          path,
          golden: goldenVal,
          actual: actualVal,
          rule: `ratio ±${tol.r * 100}%`,
          reason: `${a} outside [${lo.toFixed(2)}, ${hi.toFixed(2)}]`,
        });
      }
      return;
    }

    if (tol.kind === "superset") {
      // Golden entries must all be present in actual. Works for arrays of strings
      // or objects with string-keyed flags.
      if (Array.isArray(goldenVal) && Array.isArray(actualVal)) {
        const missing = goldenVal.filter((g) => !actualVal.includes(g));
        if (missing.length) {
          diffs.push({
            path,
            golden: goldenVal,
            actual: actualVal,
            rule: "superset",
            reason: `missing ${JSON.stringify(missing)}`,
          });
        }
        return;
      }
      if (goldenVal && typeof goldenVal === "object" && actualVal && typeof actualVal === "object") {
        for (const k of Object.keys(goldenVal as object)) {
          if (!(k in (actualVal as object))) {
            diffs.push({
              path: `${path}.${k}`,
              golden: (goldenVal as any)[k],
              actual: undefined,
              rule: "superset",
              reason: `key missing in actual`,
            });
          }
        }
        return;
      }
      diffs.push({
        path,
        golden: goldenVal,
        actual: actualVal,
        rule: "superset",
        reason: "incompatible types",
      });
      return;
    }
  }

  // No explicit tolerance — apply type-based defaults.
  if (typeof goldenVal === "boolean") {
    compareValue(goldenVal, actualVal, path, "bool_exact", diffs);
    return;
  }

  if (typeof goldenVal === "number") {
    compareValue(goldenVal, actualVal, path, { kind: "ratio", r: DEFAULT_RATIO }, diffs);
    return;
  }

  if (typeof goldenVal === "string") {
    compareValue(goldenVal, actualVal, path, "exact", diffs);
    return;
  }

  if (Array.isArray(goldenVal)) {
    if (!Array.isArray(actualVal)) {
      diffs.push({ path, golden: goldenVal, actual: actualVal, rule: "type", reason: "expected array" });
      return;
    }
    // Default: length ratio
    compareValue(goldenVal.length, actualVal.length, `${path}.length`, { kind: "ratio", r: DEFAULT_RATIO }, diffs);
    return;
  }

  if (goldenVal && typeof goldenVal === "object") {
    if (!actualVal || typeof actualVal !== "object") {
      diffs.push({ path, golden: goldenVal, actual: actualVal, rule: "type", reason: "expected object" });
      return;
    }
    // Recurse each key.
    for (const [k, v] of Object.entries(goldenVal as Record<string, unknown>)) {
      const childPath = path ? `${path}.${k}` : k;
      const childTol = undefined; // defaults propagate
      compareValue(v, (actualVal as any)[k], childPath, childTol, diffs);
    }
    return;
  }
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 * Compare an actual signature against a golden, applying per-dimension tolerance
 * where declared and type-based defaults elsewhere.
 */
export function compareSignatures(
  golden: Signature,
  actual: Signature,
  tolerance: ToleranceMap = {}
): Diff[] {
  const diffs: Diff[] = [];

  // 1. Explicit tolerance rules — process each, then remove matched paths from the
  // default traversal so we don't double-count.
  const explicitPaths = new Set<string>();
  for (const [path, rule] of Object.entries(tolerance)) {
    const tol = normalizeTolerance(rule);
    if (!tol) continue;
    explicitPaths.add(path);
    const goldenVal = getByPath(golden, path);
    const actualVal = getByPath(actual, path);
    compareValue(goldenVal, actualVal, path, tol, diffs);
  }

  // 2. Default traversal over everything else.
  const walk = (goldenVal: unknown, actualVal: unknown, path: string) => {
    if (explicitPaths.has(path)) return;
    if (goldenVal && typeof goldenVal === "object" && !Array.isArray(goldenVal)) {
      if (!actualVal || typeof actualVal !== "object") {
        diffs.push({ path, golden: goldenVal, actual: actualVal, rule: "type", reason: "expected object" });
        return;
      }
      for (const [k, v] of Object.entries(goldenVal as Record<string, unknown>)) {
        const childPath = path ? `${path}.${k}` : k;
        walk(v, (actualVal as any)[k], childPath);
      }
      return;
    }
    compareValue(goldenVal, actualVal, path, undefined, diffs);
  };
  walk(golden as unknown, actual as unknown, "");

  // 3. Fixture-level invariant: every must_have_keyword must be hit. This is
  // always required regardless of tolerance config.
  for (const [kw, hit] of Object.entries(actual.markdown.must_have_keywords_hit)) {
    if (!hit) {
      diffs.push({
        path: `markdown.must_have_keywords_hit.${kw}`,
        golden: true,
        actual: false,
        rule: "must_have_keyword",
        reason: `required keyword "${kw}" not found in markdown output`,
      });
    }
  }

  return diffs;
}
