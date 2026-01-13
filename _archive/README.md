# Archived Files

This directory contains deprecated command versions that are preserved for reference.

## Why These Are Archived

The Manifold framework had multiple naming schemes during development:
- `/t*` commands (Temporal Dev Kit / TDK)
- `/m*` commands (Manifold - canonical)
- `phase*/` organization (early CMS structure)

The **canonical version** is now `/m*` commands in `install/commands/`.

## Contents

| Directory | Description | Status |
|-----------|-------------|--------|
| `unified/` | TDK commands (/t0-/t5) | Deprecated - use /m commands |
| `phase1/` | CMS init/extract/validate/tensions | Deprecated |
| `phase2/` | CMS context loading | Deprecated |
| `phase3/` | CMS outcome anchoring | Deprecated |
| `phase4/` | CMS generation/verification | Deprecated |
| `skill-package/` | TDK skill definition | Deprecated - use install/manifold/SKILL.md |

## Migration

If you have `.temporal/` directories from TDK usage:
1. Rename to `.manifold/`
2. Update any `/t*` command references to `/m*`
3. Schema is compatible

## Do Not Delete

These files are preserved per constraint O1: "Archive deprecated files, don't delete"
