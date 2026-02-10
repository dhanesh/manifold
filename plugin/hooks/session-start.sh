#!/usr/bin/env bash

# Manifold SessionStart Hook
# Injects schema quick reference + CLI status as session context

# Check if CLI is on PATH
CLI_STATUS=""
if command -v manifold &>/dev/null; then
    CLI_VERSION=$(manifold --version 2>/dev/null || echo "installed")
    CLI_STATUS="Manifold CLI: ${CLI_VERSION} (ready)"
else
    CLI_STATUS="Manifold CLI: NOT INSTALLED. Run /manifold:setup to install. Commands that use 'manifold validate' will skip validation until installed."
fi

# Build the context string with escaped newlines for JSON
CONTEXT="Manifold Schema Quick Reference (v3)\n\n"
CONTEXT+="Valid Values:\n"
CONTEXT+="- Phases: INITIALIZED | CONSTRAINED | TENSIONED | ANCHORED | GENERATED | VERIFIED\n"
CONTEXT+="- Constraint Types: invariant | goal | boundary\n"
CONTEXT+="- Tension Types: trade_off | resource_tension | hidden_dependency\n"
CONTEXT+="- Required Truth Statuses: SATISFIED | PARTIAL | NOT_SATISFIED | SPECIFICATION_READY\n"
CONTEXT+="- Convergence Statuses: NOT_STARTED | IN_PROGRESS | CONVERGED\n"
CONTEXT+="- Evidence Types: file_exists | content_match | test_passes | metric_value | manual_review\n"
CONTEXT+="- Evidence Statuses: VERIFIED | PENDING | FAILED | STALE\n\n"
CONTEXT+="Constraint ID Prefixes: Business=B, Technical=T, UX=U, Security=S, Operational=O\n\n"
CONTEXT+="CRITICAL: Use ONLY these exact values. Do NOT invent new phases, types, or statuses.\n"
CONTEXT+="Run /manifold:SCHEMA_REFERENCE for full documentation.\n\n"
CONTEXT+="${CLI_STATUS}"

cat << HOOKEOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${CONTEXT}"
  }
}
HOOKEOF

exit 0
