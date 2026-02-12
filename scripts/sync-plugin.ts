#!/usr/bin/env bun
/**
 * Sync canonical install/ files into plugin/ as real copies.
 *
 * Claude Code's plugin system does not follow symlinks, so plugin/
 * must contain real files. The single source of truth remains install/.
 * This script copies the canonical files into plugin/, preserving any
 * plugin-only files (e.g. setup.md, hooks.json, session-start.sh).
 *
 * Usage: bun scripts/sync-plugin.ts
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, lstatSync, unlinkSync, rmSync } from "fs";
import { join, resolve } from "path";

const root = resolve(import.meta.dir, "..");
const install = join(root, "install");
const plugin = join(root, "plugin");

let copied = 0;

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function removeIfSymlink(path: string) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    unlinkSync(path);
  }
}

function syncFile(src: string, dest: string) {
  ensureDir(join(dest, ".."));
  removeIfSymlink(dest);
  copyFileSync(src, dest);
  copied++;
}

// 1. Commands: install/commands/*.md -> plugin/commands/
//    Preserve plugin-only files (setup.md) by only copying files that exist in install/
const commandsSrc = join(install, "commands");
const commandsDest = join(plugin, "commands");
ensureDir(commandsDest);

for (const file of readdirSync(commandsSrc)) {
  if (file.endsWith(".md")) {
    syncFile(join(commandsSrc, file), join(commandsDest, file));
  }
}

// 2. Hook: install/hooks/manifold-context.ts -> plugin/hooks/
syncFile(
  join(install, "hooks", "manifold-context.ts"),
  join(plugin, "hooks", "manifold-context.ts")
);

// 3. Parallel bundle: install/lib/parallel/parallel.bundle.js -> plugin/lib/parallel/
syncFile(
  join(install, "lib", "parallel", "parallel.bundle.js"),
  join(plugin, "lib", "parallel", "parallel.bundle.js")
);

// 4. Schema: install/manifold-structure.schema.json -> plugin/
syncFile(
  join(install, "manifold-structure.schema.json"),
  join(plugin, "manifold-structure.schema.json")
);

// 5. Templates: install/templates/ -> plugin/templates/ (recursive)
const templatesSrc = join(install, "templates");
const templatesDest = join(plugin, "templates");

// Remove symlink or stale directory to get a clean copy
try {
  const stat = lstatSync(templatesDest);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    rmSync(templatesDest, { recursive: true, force: true });
  }
} catch {
  // Doesn't exist yet — nothing to remove
}

cpSync(templatesSrc, templatesDest, { recursive: true });
// Count template files
const countFiles = (dir: string): number => {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
};
copied += countFiles(templatesDest);

console.log(`Synced ${copied} files from install/ -> plugin/`);
