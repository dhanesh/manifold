#!/usr/bin/env bash
# Lists the feature manifolds in a .manifold directory, one name per line.
#
# This is the single source of truth for "which features does CI verify".
# The manifold-verify workflow used to inline this glob in three separate
# loops; all three drifted to `*.yaml` only and silently selected nothing
# once the repo moved to JSON+Markdown manifests.
#
# Usage: scripts/select-manifolds.sh [manifold-dir]

set -euo pipefail

dir="${1:-.manifold}"

if [ ! -d "$dir" ]; then
  echo "select-manifolds: directory not found: $dir" >&2
  exit 1
fi

# A feature manifest is <feature>.json (JSON+Markdown) or <feature>.yaml (YAML).
# Everything else in .manifold is a sidecar with a different schema.
for f in "$dir"/*.json "$dir"/*.yaml "$dir"/*.yml; do
  [ -f "$f" ] || continue

  name="${f##*/}"
  name="${name%.json}"
  name="${name%.yaml}"
  name="${name%.yml}"

  case "$name" in
    *.anchor | *.verify | *.integrate) continue ;;
  esac

  echo "$name"
done | sort -u
