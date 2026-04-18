/**
 * Audit: every iterations[] JSON snippet in m1-m5 skills has a `result` string field.
 *
 * Satisfies: RT-7 (iterations[].result non-optional in prompt output), B3 (schema iterations.result required),
 * O2 (phase-commons hook guidance correct).
 *
 * Eval report P0 item: "enforce iterations.*.result: string" -- all 5 ai-workshop-showcase iterations
 * omitted the required string, which means the prompt snippets allow it.
 *
 * Strategy: for each skill, extract every JSON block that contains an `iterations` key. Every object
 * inside that array must include `"result":`.
 */
import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const SKILLS = ['m1-constrain.md', 'm2-tension.md', 'm3-anchor.md', 'm4-generate.md', 'm5-verify.md'];

function extractJsonBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) blocks.push(m[1]);
  return blocks;
}

function iterationObjects(block: string): string[] {
  // Find objects that look like iteration entries — contain "phase": and "number":
  // Limit to blocks that reference "iterations"
  if (!/"iterations"\s*:/.test(block)) return [];
  const objects: string[] = [];
  const re = /\{[^{}]*\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (/"phase"\s*:/.test(m[0]) && /"number"\s*:/.test(m[0])) {
      objects.push(m[0]);
    }
  }
  return objects;
}

describe('iterations[].result present in prompt templates', () => {
  for (const file of SKILLS) {
    const path = join(process.cwd(), 'install', 'commands', file);
    const content = readFileSync(path, 'utf-8');
    const blocks = extractJsonBlocks(content);

    test(`${file} — every iteration object includes "result":`, () => {
      const offenders: string[] = [];
      for (const block of blocks) {
        for (const obj of iterationObjects(block)) {
          if (!/"result"\s*:/.test(obj)) offenders.push(obj.trim().slice(0, 200));
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
