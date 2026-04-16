#!/usr/bin/env bash

# Manifold SessionStart Hook
# Injects schema quick reference + CLI status as session context
# Auto-updates CLI binary when plugin version is ahead

# Returns 0 if $1 > $2 (first version is newer)
version_gt() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -1)" = "$2" ] && [ "$1" != "$2" ]
}

# Escape a string for safe embedding in JSON values
# Strips non-printable characters, then escapes backslashes and quotes
json_escape() {
    printf '%s' "$1" | tr -cd '[:print:]' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# Read plugin version from plugin.json (no jq dependency)
PLUGIN_VERSION=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/plugin.json" ]; then
    PLUGIN_VERSION=$(grep '"version"' "${CLAUDE_PLUGIN_ROOT}/plugin.json" | sed 's/.*"\([0-9][^"]*\)".*/\1/')
fi

# Check CLI status and auto-update if needed
CLI_STATUS=""
needs_update=0

if command -v manifold &>/dev/null; then
    CLI_VERSION=$(manifold --version 2>/dev/null | head -1 | sed 's/^v//')

    # Update if plugin version is ahead
    if [ -n "$PLUGIN_VERSION" ] && version_gt "$PLUGIN_VERSION" "$CLI_VERSION"; then
        needs_update=1
    fi

    # Also update if hooks.json references phase-commons but CLI doesn't have it
    if [ $needs_update -eq 0 ] && [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
        if grep -q "phase-commons" "${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json" 2>/dev/null; then
            if ! manifold hook phase-commons --help >/dev/null 2>&1; then
                needs_update=1
            fi
        fi
    fi

    if [ $needs_update -eq 1 ]; then
        if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/bin/install-cli.sh" ]; then
            bash "${CLAUDE_PLUGIN_ROOT}/bin/install-cli.sh" >/dev/null 2>&1
            CLI_VERSION=$(manifold --version 2>/dev/null | head -1 | sed 's/^v//')
            if [ -n "$CLI_VERSION" ]; then
                CLI_STATUS="Manifold CLI: ${CLI_VERSION} (auto-updated)"
            else
                CLI_STATUS="Manifold CLI: auto-update failed. Run /manifold:setup to update manually."
            fi
        else
            CLI_STATUS="Manifold CLI: ${CLI_VERSION} (update available: v${PLUGIN_VERSION}). Run /manifold:setup to update."
        fi
    else
        CLI_STATUS="Manifold CLI: ${CLI_VERSION} (ready)"
    fi
else
    # CLI not installed — attempt auto-install
    if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/bin/install-cli.sh" ]; then
        bash "${CLAUDE_PLUGIN_ROOT}/bin/install-cli.sh" >/dev/null 2>&1
        CLI_VERSION=$(manifold --version 2>/dev/null | head -1 | sed 's/^v//')
        if [ -n "$CLI_VERSION" ]; then
            CLI_STATUS="Manifold CLI: ${CLI_VERSION} (auto-installed)"
        else
            CLI_STATUS="Manifold CLI: NOT INSTALLED. Run /manifold:setup to install. Commands that use 'manifold validate' will skip validation until installed."
        fi
    else
        CLI_STATUS="Manifold CLI: NOT INSTALLED. Run /manifold:setup to install. Commands that use 'manifold validate' will skip validation until installed."
    fi
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
CONTEXT+="$(json_escape "$CLI_STATUS")"

cat << HOOKEOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${CONTEXT}"
  }
}
HOOKEOF

exit 0
