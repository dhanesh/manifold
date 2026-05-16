#!/usr/bin/env bun
/**
 * Sync canonical install/ files into plugin/ as real copies.
 *
 * Claude Code's plugin system does not follow symlinks, so plugin/
 * must contain real files. The single source of truth remains install/.
 * This script copies the canonical files into plugin/, preserving any
 * plugin-only files (e.g. setup.md).
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

// Recursively copy every .md file under srcDir into destDir, preserving structure.
function copyTree(srcDir: string, destDir: string): number {
  let count = 0;
  ensureDir(destDir);
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(srcPath, destPath);
    } else if (entry.name.endsWith(".md")) {
      syncFile(srcPath, destPath);
      count++;
    }
  }
  return count;
}

// 1. Commands: install/commands/*.md -> plugin/commands/
//    Preserve plugin-only files (setup.md) by only copying files that exist in install/
const commandsSrc = join(install, "commands");
const commandsDest = join(plugin, "commands");
ensureDir(commandsDest);

for (const entry of readdirSync(commandsSrc, { withFileTypes: true })) {
  const srcPath = join(commandsSrc, entry.name);
  if (entry.isDirectory()) {
    copyTree(srcPath, join(commandsDest, entry.name));
  } else if (entry.name.endsWith(".md")) {
    syncFile(srcPath, join(commandsDest, entry.name));
  }
}

// 2. Hooks: install/hooks/* -> plugin/hooks/
const hooksSrc = join(install, "hooks");
const hooksDest = join(plugin, "hooks");
ensureDir(hooksDest);

for (const file of readdirSync(hooksSrc)) {
  syncFile(join(hooksSrc, file), join(hooksDest, file));
}

// 3. Bin scripts: install/bin/* -> plugin/bin/
const binSrc = join(install, "bin");
const binDest = join(plugin, "bin");
ensureDir(binDest);

for (const file of readdirSync(binSrc)) {
  syncFile(join(binSrc, file), join(binDest, file));
}

// 4. Parallel bundle: install/lib/parallel/parallel.bundle.js -> plugin/lib/parallel/
syncFile(
  join(install, "lib", "parallel", "parallel.bundle.js"),
  join(plugin, "lib", "parallel", "parallel.bundle.js")
);

// 4. Schema: install/manifold-structure.schema.json -> plugin/
syncFile(
  join(install, "manifold-structure.schema.json"),
  join(plugin, "manifold-structure.schema.json")
);

// 4b. Manifest: install/plugin.json -> plugin/plugin.json AND plugin/.claude-plugin/plugin.json
// Dual-write during the expand-migrate-contract migration. Both copies must be identical
// bytes — session-start reads them to decide whether to trigger a CLI update, and drift
// would cause spurious or missed upgrades.
syncFile(join(install, "plugin.json"), join(plugin, "plugin.json"));
syncFile(join(install, "plugin.json"), join(plugin, ".claude-plugin", "plugin.json"));

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
