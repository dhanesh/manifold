/**
 * Unit tests for the comparison engine — these catch bugs where the comparator
 * silently passes drift it shouldn't. Runs offline, no fixtures needed.
 */

import { describe, test, expect } from "bun:test";
import { compareSignatures, type ToleranceMap } from "./compare";
import type { Signature } from "./signature";

function baseSignature(): Signature {
  return {
    schema_version: 3,
    feature: "test",
    phase: "VERIFIED",
    domain: "software",
    constraints: {
      total: 10,
      by_category: { business: 2, technical: 5, user_experience: 2, security: 0, operational: 1 },
      by_type: { invariant: 4, goal: 4, boundary: 2 },
      with_source: 10,
      with_challenger: 10,
      with_threshold: 2,
    },
    tensions: { total: 3, by_type: { trade_off: 2, resource_tension: 1 }, resolved: 3, with_triz: 3, with_propagation: 3 },
    blocking_dependencies: 1,
    anchors: {
      required_truths_total: 8,
      required_truths_root: 4,
      required_truths_with_children: 3,
      required_truths_max_depth: 1,
      by_status: { SATISFIED: 6, PARTIAL: 2 },
      binding_constraint_present: true,
      recommended_option_present: true,
      tension_validations: 3,
      reversibility_log_entries: 1,
    },
    generation: {
      artifacts_total: 8,
      by_type: { code: 4, test: 2, refactor: 2 },
      by_class: { substantive: 7, structural: 1 },
      coverage_pct: 100,
    },
    evidence: { total: 5, by_type: { test_passes: 3, file_exists: 2 }, by_status: { VERIFIED: 5 } },
    iterations: { total: 5, phases: ["constrain", "tension", "anchor", "generate", "verify"] },
    convergence_status: "CONVERGED",
    gap_checklist_entries: 3,
    markdown: {
      has_outcome: true,
      has_constraints: true,
      has_tensions: true,
      has_required_truths: true,
      line_count: 250,
      must_have_keywords_hit: { foo: true, bar: true },
    },
  };
}

describe("compareSignatures", () => {
  test("identical signatures produce zero diffs", () => {
    const g = baseSignature();
    const a = baseSignature();
    expect(compareSignatures(g, a).length).toBe(0);
  });

  test("exact tolerance catches phase drift", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.phase = "GENERATED";
    const tol: ToleranceMap = { phase: "exact" };
    const diffs = compareSignatures(g, a, tol);
    expect(diffs.some((d) => d.path === "phase")).toBe(true);
  });

  test("bool_exact catches binding constraint regression", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.anchors.binding_constraint_present = false;
    const tol: ToleranceMap = { "anchors.binding_constraint_present": "bool_exact" };
    const diffs = compareSignatures(g, a, tol);
    expect(diffs.some((d) => d.path === "anchors.binding_constraint_present")).toBe(true);
  });

  test("range tolerance catches under-min", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.tensions.total = 1;
    const tol: ToleranceMap = { "tensions.total": { kind: "range", min: 3, max: 8 } };
    const diffs = compareSignatures(g, a, tol);
    expect(diffs.some((d) => d.path === "tensions.total" && d.reason.includes("below minimum"))).toBe(true);
  });

  test("range tolerance catches over-max", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.tensions.total = 20;
    const tol: ToleranceMap = { "tensions.total": { kind: "range", min: 3, max: 8 } };
    const diffs = compareSignatures(g, a, tol);
    expect(diffs.some((d) => d.path === "tensions.total" && d.reason.includes("above maximum"))).toBe(true);
  });

  test("ratio tolerance catches large numeric drift", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.constraints.total = 20; // from 10, +100%
    const tol: ToleranceMap = { "constraints.total": { kind: "ratio", r: 0.25 } };
    const diffs = compareSignatures(g, a, tol);
    expect(diffs.some((d) => d.path === "constraints.total")).toBe(true);
  });

  test("ratio tolerance allows small numeric drift", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.constraints.total = 11; // from 10, +10%, within ±25%
    const tol: ToleranceMap = { "constraints.total": { kind: "ratio", r: 0.25 } };
    const diffs = compareSignatures(g, a, tol);
    expect(diffs.some((d) => d.path === "constraints.total")).toBe(false);
  });

  test("missing must-have keyword always fails", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.markdown.must_have_keywords_hit = { foo: true, bar: false };
    const diffs = compareSignatures(g, a, {});
    expect(diffs.some((d) => d.path === "markdown.must_have_keywords_hit.bar" && d.rule === "must_have_keyword")).toBe(true);
  });

  test("default numeric tolerance ±30% catches large drift", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.generation.artifacts_total = 50; // from 8 — ~525%
    const diffs = compareSignatures(g, a, {});
    expect(diffs.some((d) => d.path === "generation.artifacts_total")).toBe(true);
  });

  test("default boolean tolerance catches flipped flags", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.markdown.has_tensions = false;
    const diffs = compareSignatures(g, a, {});
    expect(diffs.some((d) => d.path === "markdown.has_tensions")).toBe(true);
  });

  test("default string tolerance requires exact match", () => {
    const g = baseSignature();
    const a = baseSignature();
    a.convergence_status = "IN_PROGRESS";
    const diffs = compareSignatures(g, a, {});
    expect(diffs.some((d) => d.path === "convergence_status")).toBe(true);
  });
});
