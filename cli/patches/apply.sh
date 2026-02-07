#!/bin/bash
# Apply beautiful-mermaid z-order fix patch
# This moves node rendering after edge rendering in drawGraph() so that
# node labels are never overwritten by edge routing characters.

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$PATCH_DIR/../node_modules/beautiful-mermaid/dist/index.js"

if [ ! -f "$TARGET" ]; then
  echo "beautiful-mermaid not installed, skipping patch"
  exit 0
fi

# Check if already patched (look for the comment we add)
if grep -q "Z-order fix" "$TARGET" 2>/dev/null; then
  echo "beautiful-mermaid already patched"
  exit 0
fi

# Apply via sed: remove node rendering block from before edges, add it after edges
# This is idempotent — checks for the original pattern before applying
if grep -q "for (const node of graph.nodes)" "$TARGET"; then
  cd "$PATCH_DIR/.." && patch -p1 --no-backup-if-mismatch -s < "$PATCH_DIR/beautiful-mermaid+0.1.3.patch" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "beautiful-mermaid z-order fix applied"
  else
    echo "Warning: could not apply beautiful-mermaid patch (version may have changed)"
  fi
fi
