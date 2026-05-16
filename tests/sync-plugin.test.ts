import { test, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";

test("sync-plugin copies the commands/references subtree to plugin/", () => {
  const proc = Bun.spawnSync(["bun", "scripts/sync-plugin.ts"], {
    cwd: process.cwd(),
  });
  expect(proc.exitCode).toBe(0);
  expect(
    existsSync(join("plugin", "commands", "references", "recursive-decomposition.md")),
  ).toBe(true);
});
