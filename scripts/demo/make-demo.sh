#!/usr/bin/env bash
# Regenerate docs/assets/demo.gif (the README demo).
#
# Requires: asciinema, agg, and a `manifold` binary on PATH matching this checkout.
#   brew install asciinema agg
#
# Run from the repo root:
#   ./scripts/demo/make-demo.sh
#
# The recording is deterministic: no typing animation, fixed sleeps, fixed
# window size. Re-running it produces the same frames.
set -euo pipefail

cd "$(dirname "$0")/../.."

for bin in asciinema agg manifold; do
  command -v "$bin" >/dev/null || { echo "missing: $bin" >&2; exit 1; }
done

if ! git diff --quiet -- .manifold/manifold-doctor.json; then
  echo ".manifold/manifold-doctor.json has uncommitted changes; refusing to record" >&2
  exit 1
fi

OUT="docs/assets/demo.gif"
CAST="$(mktemp -t manifold-demo).cast"
trap 'rm -f "$CAST"' EXIT
mkdir -p "$(dirname "$OUT")"

# 100x33 fits the whole sequence with no scrollback, so the final frame holds
# the entire story: VERIFIED at the top, the bad edit, and exit 2 at the bottom.
asciinema rec \
  --headless \
  --overwrite \
  --window-size 100x33 \
  --command "bash scripts/demo/record-demo.sh" \
  "$CAST"

agg \
  --theme github-dark \
  --font-size 16 \
  --line-height 1.35 \
  --fps-cap 20 \
  --idle-time-limit 3 \
  --last-frame-duration 2 \
  "$CAST" "$OUT"

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
