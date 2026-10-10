#!/usr/bin/env bun
/**
 * Guard the machine-checkable numbers in README.md.
 *
 * The sentence under the demo GIF claims a release count, a version, and the
 * size of `.manifold/`. All four numbers are derivable from the repo, and all
 * four have gone stale in the past (DHA-28, DHA-44) because nothing checked
 * them. A README that argues constraints should be machine-checked should not
 * hand-maintain its own.
 *
 * Only the digits inside the `facts` block are touched, so the prose around
 * them stays editable. If a fact phrase is reworded away the script fails
 * loudly rather than silently checking nothing.
 *
 * Usage:
 *   bun scripts/check-readme-facts.ts                 # check, exit 1 on drift
 *   bun scripts/check-readme-facts.ts --fix           # rewrite the numbers
 *   bun scripts/check-readme-facts.ts --require-tags  # fail if no tags (CI)
 *   bun scripts/check-readme-facts.ts --version 2.4.0 # release in flight
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

const BEGIN = '<!-- facts:begin';
const END = '<!-- facts:end -->';

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const requireTags = args.includes('--require-tags');

function flagValue(name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

const versionArg = flagValue('--version');
// `--readme` exists so tests can drive the fix path without touching the real file.
const readmePath = resolve(flagValue('--readme') ?? join(root, 'README.md'));

/** Each fact is located by the prose around it, so only digits get replaced. */
type Fact = {
  label: string;
  /** Must match exactly once inside the facts block. */
  pattern: RegExp;
  expected: string;
};

function git(cmd: string[]): string {
  const proc = Bun.spawnSync(['git', ...cmd], { cwd: root });
  if (proc.exitCode !== 0) {
    throw new Error(`git ${cmd.join(' ')} failed: ${proc.stderr.toString().trim()}`);
  }
  return proc.stdout.toString().trim();
}

function tagList(): string[] {
  const out = git(['tag', '--list', 'v*', '--sort=-v:refname']);
  return out === '' ? [] : out.split('\n');
}

/** Manifolds are the `<feature>.md` content files; verification is `<feature>.verify.*`. */
function manifoldCounts(): { manifolds: number; verified: number } {
  const entries = readdirSync(join(root, '.manifold'));
  return {
    manifolds: entries.filter((e) => e.endsWith('.md')).length,
    verified: entries.filter((e) => /\.verify\.(json|yaml)$/.test(e)).length,
  };
}

function fail(message: string): never {
  console.error(`README facts: ${message}`);
  process.exit(1);
}

const tags = tagList();

// A shallow clone has no tags. Checking against zero would be worse than not
// checking at all, so skip -- unless CI asked for the check to be real.
if (tags.length === 0) {
  if (requireTags) {
    fail('no tags found. Checkout needs `fetch-depth: 0` for the release count.');
  }
  console.log('README facts: no tags in this clone, skipping release-count check.');
  process.exit(0);
}

// During a release the new tag does not exist yet, so it is not in `tags`.
const version = versionArg ?? tags[0].replace(/^v/, '');
const releaseCount = versionArg && !tags.includes(`v${versionArg}`) ? tags.length + 1 : tags.length;
const { manifolds, verified } = manifoldCounts();

const facts: Fact[] = [
  {
    label: 'tagged release count',
    pattern: /\d+(?= tagged releases)/g,
    expected: String(releaseCount),
  },
  {
    label: 'current version',
    // The prerelease suffix is spelled out rather than a loose character class
    // so the pattern cannot swallow the period that ends the sentence.
    pattern: /(?<=currently v)\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?/g,
    expected: version,
  },
  {
    label: 'manifold count',
    pattern: /(?<=holds )\d+(?= manifolds)/g,
    expected: String(manifolds),
  },
  {
    label: 'verification artifact count',
    pattern: /\d+(?= carrying verification artifacts)/g,
    expected: String(verified),
  },
];

const readme = readFileSync(readmePath, 'utf8');
const beginIndex = readme.indexOf(BEGIN);
const endIndex = readme.indexOf(END);
if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
  fail(`could not find a \`${BEGIN} ... ${END}\` block in README.md.`);
}

const blockStart = readme.indexOf('\n', beginIndex) + 1;
const block = readme.slice(blockStart, endIndex);

const drift: string[] = [];
let patched = block;

for (const fact of facts) {
  const matches = block.match(fact.pattern);
  if (matches === null || matches.length !== 1) {
    fail(
      `expected exactly one ${fact.label} in the facts block, found ${matches?.length ?? 0}. ` +
        'The surrounding wording is what locates it -- see scripts/check-readme-facts.ts.'
    );
  }
  if (matches[0] !== fact.expected) {
    drift.push(`${fact.label}: README says ${matches[0]}, repo says ${fact.expected}`);
    patched = patched.replace(fact.pattern, fact.expected);
  }
}

if (drift.length === 0) {
  console.log(`README facts: up to date (v${version}, ${releaseCount} releases).`);
  process.exit(0);
}

if (fix) {
  writeFileSync(readmePath, readme.slice(0, blockStart) + patched + readme.slice(endIndex));
  console.log(`README facts: updated ${drift.length} value(s).`);
  for (const line of drift) console.log(`  ${line}`);
  process.exit(0);
}

console.error('README facts are stale:');
for (const line of drift) console.error(`  ${line}`);
console.error('\nRun `bun run check:readme -- --fix` to update them.');
process.exit(1);
