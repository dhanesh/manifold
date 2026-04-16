/**
 * Structural signature extraction for manifold artifacts.
 *
 * A signature is a compact, model-independent fingerprint of the decisions a
 * manifold run produced — counts, categories, presence flags, keyword hits — NOT
 * the raw text. Two runs of the same fixture against Opus 4.7 should produce
 * signatures within defined tolerance bands; drift signals skill/prompt regression.
 *
 * The shape is deliberately stable: new dimensions get added (never removed or
 * renamed) so historical goldens stay comparable.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface Signature {
  schema_version: number;
  feature: string;
  phase: string;
  domain: string;

  constraints: {
    total: number;
    by_category: Record<string, number>;
    by_type: Record<string, number>;
    with_source: number;
    with_challenger: number;
    with_threshold: number;
  };

  tensions: {
    total: number;
    by_type: Record<string, number>;
    resolved: number;
    with_triz: number;
    with_propagation: number;
  };

  blocking_dependencies: number;

  anchors: {
    required_truths_total: number;
    required_truths_root: number;
    required_truths_with_children: number;
    required_truths_max_depth: number;
    by_status: Record<string, number>;
    binding_constraint_present: boolean;
    recommended_option_present: boolean;
    tension_validations: number;
    reversibility_log_entries: number;
  };

  generation: {
    artifacts_total: number;
    by_type: Record<string, number>;
    by_class: Record<string, number>;
    coverage_pct: number;
  };

  evidence: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  };

  iterations: {
    total: number;
    phases: string[];
  };

  convergence_status: string;
  gap_checklist_entries: number;

  markdown: {
    has_outcome: boolean;
    has_constraints: boolean;
    has_tensions: boolean;
    has_required_truths: boolean;
    line_count: number;
    must_have_keywords_hit: Record<string, boolean>;
  };
}

function bump<T extends string>(map: Record<T, number>, key: T | undefined | null) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function countEvidence(json: any): Signature["evidence"] {
  const total = { total: 0, by_type: {}, by_status: {} } as Signature["evidence"];
  const rts = json.anchors?.required_truths ?? [];
  const walkRt = (rt: any) => {
    for (const e of rt.evidence ?? []) {
      total.total++;
      bump(total.by_type, e.type);
      bump(total.by_status, e.status);
    }
    for (const child of rt.children ?? []) walkRt(child);
  };
  for (const rt of rts) walkRt(rt);
  // Constraint-level verified_by evidence
  const catKeys = ["business", "technical", "user_experience", "security", "operational"] as const;
  for (const cat of catKeys) {
    for (const c of json.constraints?.[cat] ?? []) {
      for (const e of c.verified_by ?? []) {
        total.total++;
        bump(total.by_type, e.type);
        bump(total.by_status, e.status);
      }
    }
  }
  return total;
}

function extractAnchors(json: any): Signature["anchors"] {
  const rts = json.anchors?.required_truths ?? [];
  const result: Signature["anchors"] = {
    required_truths_total: 0,
    required_truths_root: rts.length,
    required_truths_with_children: 0,
    required_truths_max_depth: 0,
    by_status: {},
    binding_constraint_present: !!json.anchors?.binding_constraint,
    recommended_option_present: !!json.anchors?.recommended_option,
    tension_validations: (json.anchors?.tension_validation ?? []).length,
    reversibility_log_entries: (json.anchors?.reversibility_log ?? json.reversibility_log ?? []).length,
  };
  const walk = (rt: any, depth: number) => {
    result.required_truths_total++;
    bump(result.by_status, rt.status);
    result.required_truths_max_depth = Math.max(result.required_truths_max_depth, depth);
    if (rt.children?.length) {
      result.required_truths_with_children++;
      for (const child of rt.children) walk(child, depth + 1);
    }
  };
  for (const rt of rts) walk(rt, rt.depth ?? 0);
  return result;
}

function extractConstraints(json: any): Signature["constraints"] {
  const result: Signature["constraints"] = {
    total: 0,
    by_category: {},
    by_type: {},
    with_source: 0,
    with_challenger: 0,
    with_threshold: 0,
  };
  const catKeys = ["business", "technical", "user_experience", "security", "operational"] as const;
  for (const cat of catKeys) {
    const list = json.constraints?.[cat] ?? [];
    result.by_category[cat] = list.length;
    result.total += list.length;
    for (const c of list) {
      bump(result.by_type, c.type);
      if (c.source) result.with_source++;
      if (c.challenger) result.with_challenger++;
      if (c.threshold) result.with_threshold++;
    }
  }
  return result;
}

function extractTensions(json: any): Signature["tensions"] {
  const tensions = json.tensions ?? [];
  const result: Signature["tensions"] = {
    total: tensions.length,
    by_type: {},
    resolved: 0,
    with_triz: 0,
    with_propagation: 0,
  };
  for (const t of tensions) {
    bump(result.by_type, t.type);
    if (t.status === "resolved") result.resolved++;
    if (t.triz_principles?.length) result.with_triz++;
    if (t.propagation_effects?.length) result.with_propagation++;
  }
  return result;
}

function extractGeneration(json: any): Signature["generation"] {
  const gen = json.generation ?? {};
  const artifacts = gen.artifacts ?? [];
  const result: Signature["generation"] = {
    artifacts_total: artifacts.length,
    by_type: {},
    by_class: {},
    coverage_pct: gen.coverage?.percentage ?? 0,
  };
  for (const a of artifacts) {
    bump(result.by_type, a.type);
    bump(result.by_class, a.artifact_class);
  }
  return result;
}

function extractIterations(json: any): Signature["iterations"] {
  const iters = json.iterations ?? [];
  return {
    total: iters.length,
    phases: iters.map((i: any) => i.phase).filter(Boolean),
  };
}

function extractMarkdown(md: string, mustHaveKeywords: string[]): Signature["markdown"] {
  const lower = md.toLowerCase();
  const keywordHits: Record<string, boolean> = {};
  for (const kw of mustHaveKeywords) {
    keywordHits[kw] = lower.includes(kw.toLowerCase());
  }
  return {
    has_outcome: /^##\s+outcome\b/im.test(md),
    has_constraints: /^##\s+constraints\b/im.test(md),
    has_tensions: /^##\s+tensions\b/im.test(md),
    has_required_truths: /^##\s+required\s+truths\b/im.test(md),
    line_count: md.split("\n").length,
    must_have_keywords_hit: keywordHits,
  };
}

export function extractSignature(
  manifoldDir: string,
  feature: string,
  mustHaveKeywords: string[] = []
): Signature {
  const jsonPath = join(manifoldDir, `${feature}.json`);
  const mdPath = join(manifoldDir, `${feature}.md`);

  if (!existsSync(jsonPath)) {
    throw new Error(`Manifold JSON not found: ${jsonPath}`);
  }
  if (!existsSync(mdPath)) {
    throw new Error(`Manifold MD not found: ${mdPath}`);
  }

  const json = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const md = readFileSync(mdPath, "utf-8");

  return {
    schema_version: json.schema_version,
    feature: json.feature,
    phase: json.phase,
    domain: json.domain ?? "software",
    constraints: extractConstraints(json),
    tensions: extractTensions(json),
    blocking_dependencies: (json.blocking_dependencies ?? []).length,
    anchors: extractAnchors(json),
    generation: extractGeneration(json),
    evidence: countEvidence(json),
    iterations: extractIterations(json),
    convergence_status: json.convergence?.status ?? "UNKNOWN",
    gap_checklist_entries: (json.gap_checklist_compliance ?? []).length,
    markdown: extractMarkdown(md, mustHaveKeywords),
  };
}
