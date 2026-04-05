/**
 * Evidence Validation and Verification for Manifold CLI (v3)
 * Satisfies: T1, T3 (< 500 lines), T6, T7, RT-2, RT-8, S2
 */

import { existsSync, readFileSync } from 'fs';
import { join, isAbsolute } from 'path';
import { execSync } from 'child_process';
import {
  VALID_EVIDENCE_TYPES,
  VALID_EVIDENCE_STATUSES,
} from '../structure-schema.js';
import type {
  ValidationError,
  ValidationWarning,
  EvidenceVerificationResult,
  EvidenceVerificationSummary,
} from './types.js';

// ============================================================
// Path Sanitization
// Satisfies: S2 (path traversal protection), RT-8
// ============================================================

/**
 * Sanitize file path to prevent path traversal attacks
 * Satisfies: S2 (path traversal protection), RT-8
 */
export function sanitizePath(path: string, projectRoot?: string): { valid: boolean; error?: string } {
  // Reject paths with ../ traversal
  if (path.includes('../') || path.includes('..\\')) {
    return { valid: false, error: 'Path contains directory traversal (../)' };
  }

  // Reject absolute paths that don't start with project root
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    if (projectRoot && !path.startsWith(projectRoot)) {
      return { valid: false, error: 'Absolute path outside project root' };
    }
    // If no project root provided, reject all absolute paths for safety
    if (!projectRoot) {
      return { valid: false, error: 'Absolute paths not allowed without project root context' };
    }
  }

  // Reject paths with null bytes (common injection technique)
  if (path.includes('\0')) {
    return { valid: false, error: 'Path contains null byte' };
  }

  return { valid: true };
}

// ============================================================
// v3: Evidence Validation
// Satisfies: T1, RT-2, RT-8
// ============================================================

/**
 * Validate evidence array (v3)
 * Satisfies: T1, RT-2
 */
export function validateEvidence(
  evidence: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!Array.isArray(evidence)) {
    errors.push({ field: 'evidence', message: 'Evidence must be an array' });
    return;
  }

  for (let i = 0; i < evidence.length; i++) {
    const item = evidence[i] as Record<string, unknown>;
    const fieldPrefix = `evidence[${i}]`;

    // Type required
    if (!item.type) {
      errors.push({ field: `${fieldPrefix}.type`, message: 'Evidence must have a "type"' });
    } else if (!VALID_EVIDENCE_TYPES.includes(item.type as any)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Invalid evidence type "${item.type}". Must be: ${VALID_EVIDENCE_TYPES.join(', ')}`,
        value: item.type
      });
    }

    // Status validation
    if (item.status && !VALID_EVIDENCE_STATUSES.includes(item.status as any)) {
      errors.push({
        field: `${fieldPrefix}.status`,
        message: `Invalid evidence status "${item.status}". Must be: ${VALID_EVIDENCE_STATUSES.join(', ')}`,
        value: item.status
      });
    }

    // Type-specific validation
    const evidenceType = item.type as string;
    if (evidenceType === 'file_exists' || evidenceType === 'content_match' || evidenceType === 'test_passes') {
      if (!item.path || typeof item.path !== 'string') {
        errors.push({ field: `${fieldPrefix}.path`, message: `Evidence type "${evidenceType}" requires a "path"` });
      } else {
        // Path traversal check - Satisfies: S2, RT-8
        const pathCheck = sanitizePath(item.path as string);
        if (!pathCheck.valid) {
          errors.push({
            field: `${fieldPrefix}.path`,
            message: pathCheck.error || 'Invalid path',
            value: item.path
          });
        }
      }
    }

    if (evidenceType === 'content_match' && !item.pattern) {
      errors.push({ field: `${fieldPrefix}.pattern`, message: 'Evidence type "content_match" requires a "pattern"' });
    }

    if (evidenceType === 'test_passes' && !item.test_name) {
      warnings.push({
        field: `${fieldPrefix}.test_name`,
        message: 'Evidence type "test_passes" should have a "test_name"',
        suggestion: 'Add test_name for clearer test identification'
      });
    }

    if (evidenceType === 'metric_value') {
      if (!item.metric_name) {
        errors.push({ field: `${fieldPrefix}.metric_name`, message: 'Evidence type "metric_value" requires a "metric_name"' });
      }
      if (item.threshold === undefined) {
        errors.push({ field: `${fieldPrefix}.threshold`, message: 'Evidence type "metric_value" requires a "threshold"' });
      }
    }

    if (evidenceType === 'manual_review' && !item.verified_by) {
      warnings.push({
        field: `${fieldPrefix}.verified_by`,
        message: 'Evidence type "manual_review" should have a "verified_by"',
        suggestion: 'Add verified_by for audit trail'
      });
    }
  }
}

// ============================================================
// v3: Parallel Evidence Verification
// Satisfies: T7 (parallel evidence verification)
// ============================================================

/**
 * Verify evidence items in parallel
 * Satisfies: T7 (parallel evidence verification)
 *
 * @param evidence - Array of evidence items from manifold
 * @param baseDir - Base directory for resolving relative paths
 * @param options - Verification options
 * @returns Promise<EvidenceVerificationSummary>
 */
export async function verifyEvidenceParallel(
  evidence: unknown[],
  baseDir: string,
  options: { runTests?: boolean; timeout?: number } = {}
): Promise<EvidenceVerificationSummary> {
  const { runTests = false, timeout = 5000 } = options;

  // Create verification promises for all evidence items
  const verificationPromises = evidence.map(async (item, index): Promise<EvidenceVerificationResult> => {
    const ev = item as Record<string, unknown>;
    const id = `E-${index + 1}`;
    const type = ev.type as string;

    try {
      switch (type) {
        case 'file_exists': {
          const path = ev.path as string;
          const fullPath = isAbsolute(path) ? path : join(baseDir, path);
          const exists = existsSync(fullPath);
          return {
            id,
            type,
            path,
            verified: exists,
            error: exists ? undefined : `File not found: ${path}`
          };
        }

        case 'content_match': {
          const path = ev.path as string;
          const pattern = ev.pattern as string;
          const fullPath = isAbsolute(path) ? path : join(baseDir, path);

          if (!existsSync(fullPath)) {
            return {
              id,
              type,
              path,
              pattern,
              verified: false,
              error: `File not found: ${path}`
            };
          }

          const content = readFileSync(fullPath, 'utf-8');
          const regex = new RegExp(pattern, 'g');
          const matches = (content.match(regex) || []).length;

          return {
            id,
            type,
            path,
            pattern,
            verified: matches > 0,
            matches,
            error: matches > 0 ? undefined : `Pattern "${pattern}" not found in ${path}`
          };
        }

        case 'test_passes': {
          if (!runTests) {
            return {
              id,
              type,
              path: ev.path as string,
              verified: false,
              error: 'Test execution skipped (use --run-tests flag)'
            };
          }

          const testPath = ev.path as string;
          const testName = ev.test_name as string | undefined;
          const fullPath = isAbsolute(testPath) ? testPath : join(baseDir, testPath);

          try {
            // Detect test runner based on file extension and project
            let cmd: string;
            if (testPath.endsWith('.test.ts') || testPath.endsWith('.test.js')) {
              cmd = testName
                ? `bun test "${fullPath}" --test-name-pattern "${testName}"`
                : `bun test "${fullPath}"`;
            } else if (testPath.endsWith('_test.go')) {
              cmd = testName
                ? `go test -run "${testName}" "${fullPath}"`
                : `go test "${fullPath}"`;
            } else {
              cmd = `bun test "${fullPath}"`;
            }

            const output = execSync(cmd, { timeout, encoding: 'utf-8', stdio: 'pipe' });
            return {
              id,
              type,
              path: testPath,
              verified: true,
              testOutput: output.substring(0, 500)
            };
          } catch (err) {
            return {
              id,
              type,
              path: testPath,
              verified: false,
              error: `Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
            };
          }
        }

        case 'metric_value': {
          // Metric verification requires runtime system - skip during static verification
          return {
            id,
            type,
            verified: false,
            error: 'Metric verification requires runtime system (skipped)'
          };
        }

        case 'manual_review': {
          // Manual review cannot be automated
          const verifiedBy = ev.verified_by as string | undefined;
          return {
            id,
            type,
            verified: !!verifiedBy,
            error: verifiedBy ? undefined : 'Manual review pending (no verified_by)'
          };
        }

        default:
          return {
            id,
            type,
            verified: false,
            error: `Unknown evidence type: ${type}`
          };
      }
    } catch (err) {
      return {
        id,
        type,
        verified: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  });

  // Execute all verifications in parallel
  const results = await Promise.all(verificationPromises);

  // Build summary
  const verified = results.filter(r => r.verified).length;
  const failed = results.filter(r => !r.verified && r.error && !r.error.includes('skipped')).length;
  const skipped = results.filter(r => r.error?.includes('skipped') || r.error?.includes('pending')).length;

  return {
    total: results.length,
    verified,
    failed,
    skipped,
    results
  };
}

/**
 * Format evidence verification summary for display
 */
export function formatEvidenceVerification(summary: EvidenceVerificationSummary): string {
  const lines: string[] = [];

  lines.push('EVIDENCE VERIFICATION');
  lines.push('═════════════════════');
  lines.push('');
  lines.push(`Total: ${summary.total} | Verified: ${summary.verified} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`);
  lines.push('');

  for (const result of summary.results) {
    const icon = result.verified ? '✓' : result.error?.includes('skipped') ? '⏭' : '✗';
    const status = result.verified ? 'verified' : result.error?.includes('skipped') ? 'skipped' : 'failed';

    lines.push(`  ${icon} [${result.id}] ${result.type}`);
    if (result.path) {
      lines.push(`    Path: ${result.path}`);
    }
    if (result.pattern) {
      lines.push(`    Pattern: ${result.pattern}`);
    }
    if (result.matches !== undefined) {
      lines.push(`    Matches: ${result.matches}`);
    }
    if (result.error && !result.verified) {
      lines.push(`    Error: ${result.error}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
