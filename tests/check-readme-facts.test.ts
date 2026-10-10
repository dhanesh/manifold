import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// The release count is derived from git tags, so a tagless (shallow) clone has
// nothing to compare against and the script skips by design. CI runs the real
// guard with --require-tags on a fetch-depth: 0 checkout.
const tags = Bun.spawnSync(["git", "tag", "--list", "v*"]).stdout.toString().trim();
const hasTags = tags !== "";
if (!hasTags) {
  console.warn("check-readme-facts: no git tags in this clone, drift tests skipped");
}

function run(args: string[]) {
  return Bun.spawnSync(["bun", "scripts/check-readme-facts.ts", ...args], {
    cwd: process.cwd(),
  });
}

/** A copy of the real README with every guarded number knocked off by one. */
function staleCopy(): { path: string; original: string } {
  const original = readFileSync("README.md", "utf8");
  const stale = original
    .replace(/(\d+)( tagged releases)/, (_m, n, s) => `${Number(n) - 1}${s}`)
    .replace(/(currently v\d+\.\d+\.)(\d+)/, (_m, p, n) => `${p}${Number(n) - 1}`)
    .replace(/(holds )(\d+)( manifolds)/, (_m, p, n, s) => `${p}${Number(n) - 1}${s}`)
    .replace(/(\d+)( carrying verification artifacts)/, (_m, n, s) => `${Number(n) - 1}${s}`);
  const path = join(mkdtempSync(join(tmpdir(), "readme-facts-")), "README.md");
  writeFileSync(path, stale);
  return { path, original };
}

test("the committed README's facts match the repo", () => {
  const proc = run([]);
  expect(proc.stdout.toString() + proc.stderr.toString()).not.toContain("stale");
  expect(proc.exitCode).toBe(0);
});

test.skipIf(!hasTags)("stale numbers fail the check", () => {
  const { path } = staleCopy();
  const proc = run(["--readme", path]);
  expect(proc.exitCode).toBe(1);

  // All four facts drift independently, so all four must be reported.
  const err = proc.stderr.toString();
  expect(err).toContain("tagged release count");
  expect(err).toContain("current version");
  expect(err).toContain("manifold count");
  expect(err).toContain("verification artifact count");
});

test.skipIf(!hasTags)("--fix restores the numbers without touching the prose", () => {
  const { path, original } = staleCopy();
  expect(run(["--readme", path, "--fix"]).exitCode).toBe(0);
  // Byte-identical: the fix must replace digits only. A greedy pattern that
  // also ate the sentence's final period would fail here.
  expect(readFileSync(path, "utf8")).toBe(original);
});

test.skipIf(!hasTags)("a release in flight counts the tag that does not exist yet", () => {
  const { path } = staleCopy();
  expect(run(["--readme", path, "--fix", "--version", "9.9.9"]).exitCode).toBe(0);
  const fixed = readFileSync(path, "utf8");
  expect(fixed).toContain("currently v9.9.9.");
  expect(fixed).toContain(`${tags.split("\n").length + 1} tagged releases`);
});

test("a reworded fact phrase fails loudly instead of checking nothing", () => {
  const path = join(mkdtempSync(join(tmpdir(), "readme-facts-")), "README.md");
  writeFileSync(
    path,
    readFileSync("README.md", "utf8").replace(" carrying verification artifacts", " verified"),
  );
  const proc = run(["--readme", path]);
  expect(proc.exitCode).toBe(1);
  expect(proc.stderr.toString()).toContain("verification artifact count");
});

test("a missing facts block fails", () => {
  const path = join(mkdtempSync(join(tmpdir(), "readme-facts-")), "README.md");
  writeFileSync(path, "# Manifold\n\nNo facts block here.\n");
  const proc = run(["--readme", path]);
  expect(proc.exitCode).toBe(1);
  expect(proc.stderr.toString()).toContain("facts:begin");
});
