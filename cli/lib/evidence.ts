/**
 * Evidence Verification Module
 * Satisfies: Phase A - Reality Grounding
 *
 * Verifies concrete evidence for required truths and constraints.
 * Uses grep-based pattern matching (fast) rather than AST analysis.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Evidence, EvidenceStatus, EvidenceType } from './parser';
import type { ManifoldConfig } from './config';
import type { SatisfactionLevel, TestTier } from './structure-schema';

// ============================================================
// Verification Result Types
// ============================================================

export interface VerificationResult {
  evidence: Evidence;
  passed: boolean;
  message: string;
  duration_ms: number;
}

export interface VerificationReport {
  timestamp: string;
  total: number;
  verified: number;
  pending: number;
  failed: number;
  stale: number;
  results: VerificationResult[];
  summary: string;
}

// ============================================================
// Drift Detection Types (GAP-07)
// ============================================================

export interface DriftEntry {
  path: string;
  constraint_ids: string[];
  old_hash: string;
  new_hash: string;
}

export interface DriftReport {
  drifted: DriftEntry[];
  clean: number;
  timestamp: string;
}

// ============================================================
// Traceability Types (GAP-12)
// ============================================================

export interface TraceabilityEntry {
  test_file: string;
  test_function: string;
  tier?: TestTier;
}

export type TraceabilityMatrix = Record<string, TraceabilityEntry[]>;

// ============================================================
// Extended Verification Report
// ============================================================

export interface ExtendedVerificationReport extends VerificationReport {
  traceability?: TraceabilityMatrix;
  satisfaction_levels?: Record<string, SatisfactionLevel>;
  drift?: DriftReport;
}

// ============================================================
// Evidence Verifiers (Strategy Pattern)
// ============================================================

interface EvidenceVerifier {
  verify(evidence: Evidence, projectRoot: string): Promise<VerificationResult>;
}

/**
 * Verify file exists on disk
 */
class FileExistsVerifier implements EvidenceVerifier {
  async verify(e: Evidence, projectRoot: string): Promise<VerificationResult> {
    const start = Date.now();
    const fullPath = join(projectRoot, e.path);
    const exists = existsSync(fullPath);

    return {
      evidence: e,
      passed: exists,
      message: exists
        ? `File exists: ${e.path}`
        : `File not found: ${e.path}`,
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Verify content matches pattern (grep-based)
 */
class ContentMatchVerifier implements EvidenceVerifier {
  async verify(e: Evidence, projectRoot: string): Promise<VerificationResult> {
    const start = Date.now();
    const fullPath = join(projectRoot, e.path);

    if (!existsSync(fullPath)) {
      return {
        evidence: e,
        passed: false,
        message: `File not found: ${e.path}`,
        duration_ms: Date.now() - start,
      };
    }

    if (!e.pattern) {
      return {
        evidence: e,
        passed: false,
        message: 'No pattern specified for content_match',
        duration_ms: Date.now() - start,
      };
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const regex = new RegExp(e.pattern, 'gm');
      const matches = content.match(regex);

      if (matches && matches.length > 0) {
        return {
          evidence: e,
          passed: true,
          message: `Pattern matched: "${e.pattern}" (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          duration_ms: Date.now() - start,
        };
      } else {
        return {
          evidence: e,
          passed: false,
          message: `Pattern not found: "${e.pattern}" in ${e.path}`,
          duration_ms: Date.now() - start,
        };
      }
    } catch (error) {
      return {
        evidence: e,
        passed: false,
        message: `Error reading file: ${error}`,
        duration_ms: Date.now() - start,
      };
    }
  }
}

/**
 * Verify test passes (runs actual test)
 * Only runs when explicitly requested (--run-tests)
 */
class TestPassesVerifier implements EvidenceVerifier {
  private runTests: boolean;
  private executeTests: boolean;
  private config?: ManifoldConfig;

  constructor(runTests: boolean = false, executeTests: boolean = false, config?: ManifoldConfig) {
    this.runTests = runTests;
    this.executeTests = executeTests;
    this.config = config;
  }

  async verify(e: Evidence, projectRoot: string): Promise<VerificationResult> {
    const start = Date.now();

    if (!this.runTests) {
      return {
        evidence: e,
        passed: false,
        message: 'Test verification skipped (use --run-tests to enable)',
        duration_ms: Date.now() - start,
      };
    }

    // Check test file exists first
    const fullPath = join(projectRoot, e.path);
    if (!existsSync(fullPath)) {
      return {
        evidence: e,
        passed: false,
        message: `Test file not found: ${e.path}`,
        duration_ms: Date.now() - start,
      };
    }

    // If --execute and config has test_runner, spawn actual test process
    if (this.executeTests && this.config?.test_runner) {
      return this.executeTestRunner(e, projectRoot);
    }

    // Fallback: verify the test file exists and contains the test name
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const testName = e.test_name || '';
      const hasTest = content.includes(testName);

      return {
        evidence: e,
        passed: hasTest,
        message: hasTest
          ? `Test found: "${testName}" in ${e.path}`
          : `Test not found: "${testName}" in ${e.path}`,
        duration_ms: Date.now() - start,
      };
    } catch (error) {
      return {
        evidence: e,
        passed: false,
        message: `Error reading test file: ${error}`,
        duration_ms: Date.now() - start,
      };
    }
  }

  /**
   * Execute actual test runner subprocess (GAP-01: automated verification)
   * Satisfies: RT-3
   */
  private async executeTestRunner(e: Evidence, projectRoot: string): Promise<VerificationResult> {
    const start = Date.now();
    const runner = this.config!.test_runner!;
    const testName = e.test_name || '';
    const extraArgs = this.config?.test_args || [];

    try {
      const args = runner.split(/\s+/);
      const cmd = args[0];
      const cmdArgs = [...args.slice(1), ...extraArgs];

      // Add filter for specific test name if available
      if (testName) {
        cmdArgs.push('--filter', testName);
      }
      cmdArgs.push(e.path);

      const proc = Bun.spawn([cmd, ...cmdArgs], {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      return {
        evidence: e,
        passed: exitCode === 0,
        message: exitCode === 0
          ? `Test passed: "${testName}" via ${runner}`
          : `Test failed (exit ${exitCode}): "${testName}" — ${stderr.slice(0, 200)}`,
        duration_ms: Date.now() - start,
      };
    } catch (error) {
      return {
        evidence: e,
        passed: false,
        message: `Test runner error: ${error}`,
        duration_ms: Date.now() - start,
      };
    }
  }
}

/**
 * Manual review marker - always pending unless explicitly verified
 */
class ManualReviewVerifier implements EvidenceVerifier {
  async verify(e: Evidence, _projectRoot: string): Promise<VerificationResult> {
    return {
      evidence: e,
      passed: e.status === 'VERIFIED',
      message: e.status === 'VERIFIED'
        ? `Manually verified by ${e.verified_by || 'unknown'} at ${e.verified_at || 'unknown time'}`
        : 'Requires manual review',
      duration_ms: 0,
    };
  }
}

/**
 * Metric value verification - checks runtime metrics
 */
class MetricValueVerifier implements EvidenceVerifier {
  async verify(e: Evidence, _projectRoot: string): Promise<VerificationResult> {
    // For now, just mark as pending - requires runtime integration
    return {
      evidence: e,
      passed: false,
      message: `Metric verification not implemented: ${e.metric_name}`,
      duration_ms: 0,
    };
  }
}

// ============================================================
// Verifier Factory
// ============================================================

function getVerifier(type: EvidenceType, options: VerificationOptions = {}): EvidenceVerifier {
  switch (type) {
    case 'file_exists':
      return new FileExistsVerifier();
    case 'content_match':
      return new ContentMatchVerifier();
    case 'test_passes':
      return new TestPassesVerifier(options.runTests, options.executeTests, options.config);
    case 'manual_review':
      return new ManualReviewVerifier();
    case 'metric_value':
      return new MetricValueVerifier();
    default:
      // Fallback to file_exists
      return new FileExistsVerifier();
  }
}

// ============================================================
// Batch Verification
// ============================================================

export interface VerificationOptions {
  runTests?: boolean;
  executeTests?: boolean;
  config?: ManifoldConfig;
  maxConcurrency?: number;
  projectRoot?: string;
}

/**
 * Verify all evidence items with optional parallelization
 */
export async function verifyAllEvidence(
  evidenceList: Evidence[],
  options: VerificationOptions = {}
): Promise<VerificationReport> {
  const start = Date.now();
  const projectRoot = options.projectRoot || process.cwd();
  const maxConcurrency = options.maxConcurrency || 10;

  const results: VerificationResult[] = [];

  // Process in batches for controlled concurrency
  for (let i = 0; i < evidenceList.length; i += maxConcurrency) {
    const batch = evidenceList.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(
      batch.map(async (evidence) => {
        const verifier = getVerifier(evidence.type, options);
        return verifier.verify(evidence, projectRoot);
      })
    );
    results.push(...batchResults);
  }

  // Calculate summary
  const verified = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && r.evidence.status !== 'PENDING').length;
  const pending = results.filter(
    (r) => !r.passed && (r.evidence.type === 'test_passes' || r.evidence.type === 'manual_review')
  ).length;
  const stale = results.filter((r) => r.evidence.status === 'STALE').length;

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    total: evidenceList.length,
    verified,
    pending,
    failed,
    stale,
    results,
    summary: `Evidence verification: ${verified}/${evidenceList.length} verified, ${failed} failed, ${pending} pending`,
  };

  return report;
}

/**
 * Convert legacy evidence string to Evidence object
 */
export function normalizeEvidence(evidence: string | Evidence[] | undefined): Evidence[] {
  if (!evidence) return [];

  if (typeof evidence === 'string') {
    // Legacy v1/v2 format: simple string path
    return [
      {
        type: 'file_exists',
        path: evidence,
        status: 'PENDING',
      },
    ];
  }

  return evidence;
}

/**
 * Check if evidence is stale (file modified after last verification)
 */
export function checkEvidenceStaleness(evidence: Evidence, projectRoot: string): boolean {
  if (!evidence.verified_at) return true;

  const fullPath = join(projectRoot, evidence.path);
  if (!existsSync(fullPath)) return true;

  try {
    const stats = statSync(fullPath);
    const verifiedAt = new Date(evidence.verified_at);
    const modifiedAt = stats.mtime;

    return modifiedAt > verifiedAt;
  } catch {
    return true;
  }
}

// ============================================================
// File Hash & Drift Detection (GAP-07)
// Satisfies: RT-5, RT-7
// ============================================================

/**
 * Compute SHA-256 hash of a file's contents
 */
export function computeFileHash(filePath: string): string | null {
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath);
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(content);
    return hasher.digest('hex');
  } catch {
    return null;
  }
}

/**
 * Detect drift between stored file hashes and current state
 * Compares hashes from artifacts/evidence against actual files on disk
 */
export function detectDrift(
  artifacts: Array<{ path: string; file_hash?: string; satisfies?: string[] }>,
  basePath: string
): DriftReport {
  const drifted: DriftEntry[] = [];
  let clean = 0;

  for (const artifact of artifacts) {
    if (!artifact.file_hash) continue;

    const fullPath = join(basePath, artifact.path);
    const currentHash = computeFileHash(fullPath);

    if (currentHash === null) {
      // File deleted — count as drift
      drifted.push({
        path: artifact.path,
        constraint_ids: artifact.satisfies || [],
        old_hash: artifact.file_hash,
        new_hash: '<deleted>',
      });
    } else if (currentHash !== artifact.file_hash) {
      drifted.push({
        path: artifact.path,
        constraint_ids: artifact.satisfies || [],
        old_hash: artifact.file_hash,
        new_hash: currentHash,
      });
    } else {
      clean++;
    }
  }

  return {
    drifted,
    clean,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Test Annotation Parsing (GAP-12)
// Satisfies: RT-3
// ============================================================

/**
 * Parse test files for constraint annotations
 * Looks for patterns like:
 *   @constraint B1
 *   // Satisfies: B1, T2
 *   * Satisfies: RT-1 (description)
 *   @constraint B1, T2, RT-1
 */
export function parseTestAnnotations(filePath: string): Map<string, string[]> {
  const result = new Map<string, string[]>();

  if (!existsSync(filePath)) return result;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Buffer annotations and apply to next test (annotations precede tests)
    let pendingIds: string[] = [];

    for (const line of lines) {
      // Detect constraint annotations — always buffer
      const constraintMatch = line.match(/@constraint\s+([\w\s,-]+)/i)
        || line.match(/Satisfies:\s*([\w\s,()-]+)/i);

      if (constraintMatch) {
        const ids = constraintMatch[1]
          .split(/[,\s]+/)
          .map(id => id.replace(/[()]/g, '').trim())
          .filter(id => /^[BTUSO]\d+$|^RT-\d+$|^TN\d+$/.test(id));
        pendingIds.push(...ids);
      }

      // Detect test function names — apply pending annotations
      const testMatch = line.match(/(?:it|test|describe)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (testMatch && pendingIds.length > 0) {
        const testName = testMatch[1];
        const existing = result.get(testName) || [];
        result.set(testName, [...new Set([...existing, ...pendingIds])]);
        pendingIds = [];
      }
    }
  } catch {
    // Silently fail for unreadable files
  }

  return result;
}

// ============================================================
// Traceability Matrix Builder (GAP-12)
// Satisfies: RT-3
// ============================================================

/**
 * Build a traceability matrix mapping constraint IDs to test functions
 */
export function buildTraceabilityMatrix(
  testFiles: string[],
  basePath: string
): TraceabilityMatrix {
  const matrix: TraceabilityMatrix = {};

  for (const testFile of testFiles) {
    const fullPath = join(basePath, testFile);
    const annotations = parseTestAnnotations(fullPath);

    for (const [testFunction, constraintIds] of annotations) {
      for (const constraintId of constraintIds) {
        if (!matrix[constraintId]) {
          matrix[constraintId] = [];
        }
        matrix[constraintId].push({
          test_file: testFile,
          test_function: testFunction,
        });
      }
    }
  }

  return matrix;
}

// ============================================================
// Satisfaction Level Aggregation (GAP-05)
// Satisfies: RT-2
// ============================================================

/**
 * Determine the satisfaction level for a constraint based on its evidence
 *
 * Hierarchy (highest to lowest):
 *   VERIFIED  — has evidence with status VERIFIED + test_passes type
 *   TESTED    — has test_passes evidence that passed
 *   IMPLEMENTED — has file_exists evidence that passed
 *   DOCUMENTED  — has manual_review evidence or just exists in manifold
 */
export function aggregateSatisfactionLevel(
  evidenceItems: Evidence[]
): SatisfactionLevel {
  if (evidenceItems.length === 0) return 'DOCUMENTED';

  const hasVerifiedTest = evidenceItems.some(
    e => e.type === 'test_passes' && e.status === 'VERIFIED'
  );
  if (hasVerifiedTest) return 'VERIFIED';

  const hasPassingTest = evidenceItems.some(
    e => e.type === 'test_passes' && (e.status === 'VERIFIED' || e.status === 'STALE')
  );
  if (hasPassingTest) return 'TESTED';

  // PENDING test_passes = test exists but hasn't run → IMPLEMENTED, not TESTED
  const hasPendingTest = evidenceItems.some(
    e => e.type === 'test_passes' && e.status === 'PENDING'
  );
  if (hasPendingTest) return 'IMPLEMENTED';

  const hasFileEvidence = evidenceItems.some(
    e => e.type === 'file_exists' || e.type === 'content_match'
  );
  if (hasFileEvidence) return 'IMPLEMENTED';

  return 'DOCUMENTED';
}

/**
 * Format verification report for terminal output
 */
export function formatVerificationReport(report: VerificationReport): string {
  const lines: string[] = [];

  lines.push('EVIDENCE VERIFICATION');
  lines.push('=====================');
  lines.push('');
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Total: ${report.total}`);
  lines.push(`Verified: ${report.verified}`);
  lines.push(`Failed: ${report.failed}`);
  lines.push(`Pending: ${report.pending}`);
  lines.push(`Stale: ${report.stale}`);
  lines.push('');

  for (const result of report.results) {
    const icon = result.passed ? '✓' : result.evidence.status === 'PENDING' ? '⏳' : '✗';
    const type = result.evidence.type.padEnd(14);
    lines.push(`  ${icon} [${type}] ${result.message}`);
  }

  lines.push('');
  lines.push(report.summary);

  return lines.join('\n');
}
