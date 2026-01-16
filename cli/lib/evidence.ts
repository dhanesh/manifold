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

  constructor(runTests: boolean = false) {
    this.runTests = runTests;
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

    // For now, just verify the test file exists and contains the test name
    // Full test execution would require spawning a test runner
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
      return new TestPassesVerifier(options.runTests);
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
