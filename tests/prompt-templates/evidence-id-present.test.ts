/**
 * Audit: every evidence JSON block in m3-anchor.md and m4-generate.md includes `"id":`.
 *
 * Satisfies: RT-6 (evidence.id always present in templates), B3 (schema evidence.id required is honored),
 * T1 (prompt templates are self-consistent). Addresses eval-report P0 item: "enforce evidence.id in prompt templates".
 *
 * Strategy: extract every fenced JSON block, find any object containing evidence `type`
 * (file_exists | content_match | test_passes | metric_value | manual_review), require `"id":`.
 */
import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const EVIDENCE_TYPES = /"type":\s*"(file_exists|content_match|test_passes|metric_value|manual_review)"/;

function extractJsonBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) blocks.push(m[1]);
  return blocks;
}

function evidenceObjectsInBlock(block: string): string[] {
  // Naive but effective: find every inline object containing an evidence type.
  // Split on braces and check.
  const objects: string[] = [];
  const re = /\{[^{}]*\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (EVIDENCE_TYPES.test(m[0])) objects.push(m[0]);
  }
  return objects;
}

describe('evidence.id present in prompt templates', () => {
  for (const file of ['m3-anchor.md', 'm4-generate.md']) {
    const path = join(process.cwd(), 'install', 'commands', file);
    const content = readFileSync(path, 'utf-8');
    const blocks = extractJsonBlocks(content);

    test(`${file} has at least one evidence example`, () => {
      const anyEvidence = blocks.some((b) => EVIDENCE_TYPES.test(b));
      expect(anyEvidence).toBe(true);
    });

    test(`${file} — every evidence object includes "id":`, () => {
      const offenders: string[] = [];
      for (const block of blocks) {
        for (const obj of evidenceObjectsInBlock(block)) {
          if (!/"id"\s*:/.test(obj)) offenders.push(obj.trim().slice(0, 200));
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
