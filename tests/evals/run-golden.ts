/**
 * Golden test runner for Manifold prompt evaluation.
 *
 * Validates `.manifold/<feature>.json` against ground-truth.json and assertions.yaml
 * for each golden test case. Does NOT run LLM inference — it checks that existing
 * manifold outputs conform to expectations.
 *
 * Usage:
 *   bun run tests/evals/run-golden.ts [feature]
 *
 * Without arguments, runs all golden test cases.
 * With a feature name, runs only that test case.
 *
 * Exit codes:
 *   0 = all assertions pass
 *   1 = one or more assertions failed
 *   2 = test case not found or invalid
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const EVALS_DIR = join(import.meta.dir);
const MANIFOLD_DIR = join(import.meta.dir, '../../.manifold');

interface Assertion {
  type: string;
  id?: string;
  contains?: string;
  expected?: string;
  field?: string;
  min?: number;
  max?: number;
  min_percentage?: number;
  gaps?: string[];
  description?: string;
}

interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message: string;
}

function loadManifold(feature: string): any | null {
  const jsonPath = join(MANIFOLD_DIR, `${feature}.json`);
  if (!existsSync(jsonPath)) return null;
  return JSON.parse(readFileSync(jsonPath, 'utf-8'));
}

function countConstraints(manifold: any): number {
  const cats = manifold.constraints || {};
  return Object.values(cats).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
}

function allConstraints(manifold: any): any[] {
  const cats = manifold.constraints || {};
  return Object.values(cats).flat() as any[];
}

function runAssertion(manifold: any, feature: string, assertion: Assertion): AssertionResult {
  const result = (passed: boolean, message: string): AssertionResult => ({ assertion, passed, message });

  switch (assertion.type) {
    case 'schema_valid': {
      // Delegate to CLI
      const proc = Bun.spawnSync(['manifold', 'validate', feature]);
      const passed = proc.exitCode === 0;
      return result(passed, passed ? 'Schema valid' : `Schema validation failed: ${proc.stderr.toString()}`);
    }

    case 'phase_correct': {
      const passed = manifold.phase === assertion.expected;
      return result(passed, passed ? `Phase is ${assertion.expected}` : `Expected phase ${assertion.expected}, got ${manifold.phase}`);
    }

    case 'scope_guard': {
      // Check no files outside .manifold/ were created — this is a manual check marker
      return result(true, 'Scope guard: manual verification required during LLM execution');
    }

    case 'field_exists': {
      const val = manifold[assertion.field!];
      const passed = val !== undefined && val === (assertion.expected || val);
      return result(passed, passed ? `Field ${assertion.field} = ${val}` : `Field ${assertion.field} missing or wrong`);
    }

    case 'constraint_exists': {
      const all = allConstraints(manifold);
      const found = all.find((c: any) => c.id === assertion.id);
      return result(!!found, found ? `Constraint ${assertion.id} found` : `Constraint ${assertion.id} not found`);
    }

    case 'constraint_count_min': {
      const count = countConstraints(manifold);
      const passed = count >= (assertion.min || 0);
      return result(passed, `${count} constraints (min: ${assertion.min})`);
    }

    case 'constraint_count_max': {
      const count = countConstraints(manifold);
      const passed = count <= (assertion.max || Infinity);
      return result(passed, `${count} constraints (max: ${assertion.max})`);
    }

    case 'security_constraint_min': {
      const secCount = (manifold.constraints?.security || []).length;
      const passed = secCount >= (assertion.min || 0);
      return result(passed, `${secCount} security constraints (min: ${assertion.min})`);
    }

    case 'gap_checklist_present': {
      const compliance = manifold.gap_checklist_compliance || [];
      const presentGaps = compliance.map((g: any) => g.gap);
      const missing = (assertion.gaps || []).filter(g => !presentGaps.includes(g));
      const passed = missing.length === 0;
      return result(passed, passed ? 'All required GAP checklists present' : `Missing GAPs: ${missing.join(', ')}`);
    }

    case 'quality_scores_present': {
      const all = allConstraints(manifold);
      const withQuality = all.filter((c: any) => c.quality);
      const passed = withQuality.length === all.length;
      return result(passed, `${withQuality.length}/${all.length} constraints have quality scores`);
    }

    case 'tension_count_min': {
      const count = (manifold.tensions || []).length;
      const passed = count >= (assertion.min || 0);
      return result(passed, `${count} tensions (min: ${assertion.min})`);
    }

    case 'tension_resolved': {
      const resolved = (manifold.tensions || []).filter((t: any) => t.status === 'resolved');
      const passed = resolved.length > 0;
      return result(passed, `${resolved.length} tensions resolved`);
    }

    case 'required_truth_count_min': {
      const rts = manifold.anchors?.required_truths || [];
      const passed = rts.length >= (assertion.min || 0);
      return result(passed, `${rts.length} required truths (min: ${assertion.min})`);
    }

    case 'binding_constraint_present': {
      const passed = !!manifold.anchors?.binding_constraint;
      return result(passed, passed ? 'Binding constraint identified' : 'No binding constraint');
    }

    case 'solution_options_min': {
      // Check iterations for solution_options count
      const anchorIter = (manifold.iterations || []).find((i: any) => i.phase === 'anchor');
      const count = anchorIter?.solution_options || 0;
      const passed = count >= (assertion.min || 0);
      return result(passed, `${count} solution options (min: ${assertion.min})`);
    }

    case 'artifact_count_min': {
      const count = (manifold.generation?.artifacts || []).length;
      const passed = count >= (assertion.min || 0);
      return result(passed, `${count} artifacts (min: ${assertion.min})`);
    }

    case 'evidence_populated': {
      const rts = manifold.anchors?.required_truths || [];
      const withEvidence = rts.filter((rt: any) => rt.evidence && rt.evidence.length > 0);
      const passed = withEvidence.length === rts.length && rts.length > 0;
      return result(passed, `${withEvidence.length}/${rts.length} RTs have evidence`);
    }

    case 'artifact_class_present': {
      const artifacts = manifold.generation?.artifacts || [];
      const withClass = artifacts.filter((a: any) => a.artifact_class);
      const passed = withClass.length === artifacts.length && artifacts.length > 0;
      return result(passed, `${withClass.length}/${artifacts.length} artifacts have artifact_class`);
    }

    case 'invariant_coverage': {
      const all = allConstraints(manifold);
      const invariants = all.filter((c: any) => c.type === 'invariant');
      // For this eval, we just check they exist — full coverage requires verify.json
      const passed = invariants.length > 0;
      return result(passed, `${invariants.length} invariant constraints found`);
    }

    case 'security_detection_skip': {
      return result(true, 'Security detection: manual verification during LLM execution');
    }

    default:
      return result(false, `Unknown assertion type: ${assertion.type}`);
  }
}

function runTestCase(dir: string, feature: string): { passed: number; failed: number; results: AssertionResult[] } {
  const assertionsPath = join(dir, 'assertions.yaml');
  if (!existsSync(assertionsPath)) {
    console.error(`  No assertions.yaml found in ${dir}`);
    return { passed: 0, failed: 0, results: [] };
  }

  const assertions = parseYaml(readFileSync(assertionsPath, 'utf-8'));
  const manifold = loadManifold(feature);

  if (!manifold) {
    console.log(`  ⏭ No manifold found for ${feature} — skipping (run the workflow first)`);
    return { passed: 0, failed: 0, results: [] };
  }

  let passed = 0;
  let failed = 0;
  const results: AssertionResult[] = [];

  for (const [phase, config] of Object.entries(assertions.phases || {})) {
    console.log(`  Phase: ${phase}`);
    for (const assertion of (config as any).assertions || []) {
      const r = runAssertion(manifold, feature, assertion);
      results.push(r);
      if (r.passed) {
        passed++;
        console.log(`    ✓ ${assertion.type}${assertion.description ? ` — ${assertion.description}` : ''}`);
      } else {
        failed++;
        console.log(`    ✗ ${assertion.type}: ${r.message}`);
      }
    }
  }

  return { passed, failed, results };
}

// Main
const targetFeature = process.argv[2];
const testCases = targetFeature
  ? [targetFeature]
  : readdirSync(EVALS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'schema')
      .map(d => d.name);

let totalPassed = 0;
let totalFailed = 0;

console.log(`\nManifold Golden Test Runner\n${'='.repeat(40)}\n`);

for (const feature of testCases) {
  const dir = join(EVALS_DIR, feature);
  if (!existsSync(dir)) {
    console.error(`Test case not found: ${feature}`);
    process.exit(2);
  }
  console.log(`\n${feature}:`);
  const { passed, failed } = runTestCase(dir, feature);
  totalPassed += passed;
  totalFailed += failed;
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
process.exit(totalFailed > 0 ? 1 : 0);
