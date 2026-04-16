#
# Manifold SessionStart Hook (Windows PowerShell)
# Injects schema quick reference + CLI status as session context
# Auto-installs/updates CLI binary when needed
#
# Satisfies: T8 (cross-platform hooks), T9 (Windows binary)
#

$ErrorActionPreference = "SilentlyContinue"

function Compare-Version {
    param([string]$v1, [string]$v2)
    # Returns $true if $v1 > $v2
    try {
        $ver1 = [System.Version]::new($v1)
        $ver2 = [System.Version]::new($v2)
        return $ver1 -gt $ver2
    } catch {
        return $false
    }
}

function ConvertTo-JsonSafe {
    param([string]$Text)
    # Escape for JSON string embedding
    $Text = $Text -replace '\\', '\\\\'
    $Text = $Text -replace '"', '\"'
    $Text = $Text -replace "`r`n", '\n'
    $Text = $Text -replace "`n", '\n'
    $Text = $Text -replace "`t", '\t'
    return $Text
}

# Read plugin version from plugin.json
$PluginVersion = ""
if ($env:CLAUDE_PLUGIN_ROOT -and (Test-Path "$env:CLAUDE_PLUGIN_ROOT\plugin.json")) {
    $pluginJson = Get-Content "$env:CLAUDE_PLUGIN_ROOT\plugin.json" -Raw | ConvertFrom-Json
    $PluginVersion = $pluginJson.version
}

# Check CLI status and auto-update if needed
$CliStatus = ""
$manifoldCmd = Get-Command "manifold" -ErrorAction SilentlyContinue

if ($manifoldCmd) {
    $CliVersion = (& manifold --version 2>$null | Select-Object -First 1) -replace "^v", ""
    $needsUpdate = $false

    # Update if plugin version is ahead
    if ($PluginVersion -and (Compare-Version $PluginVersion $CliVersion)) {
        $needsUpdate = $true
    }

    # Also update if hooks.json references phase-commons but CLI doesn't have it
    if (-not $needsUpdate -and $env:CLAUDE_PLUGIN_ROOT) {
        $hooksJson = Join-Path $env:CLAUDE_PLUGIN_ROOT "hooks" "hooks.json"
        if ((Test-Path $hooksJson) -and (Select-String -Path $hooksJson -Pattern "phase-commons" -Quiet)) {
            $phaseCommonsCheck = & manifold hook phase-commons --help 2>$null
            if ($LASTEXITCODE -ne 0) {
                $needsUpdate = $true
            }
        }
    }

    if ($needsUpdate) {
        $installScript = Join-Path $env:CLAUDE_PLUGIN_ROOT "bin" "install-cli.ps1"
        if ($env:CLAUDE_PLUGIN_ROOT -and (Test-Path $installScript)) {
            & powershell -ExecutionPolicy Bypass -File $installScript 2>$null | Out-Null
            $CliVersion = (& manifold --version 2>$null | Select-Object -First 1) -replace "^v", ""
            if ($CliVersion) {
                $CliStatus = "Manifold CLI: $CliVersion (auto-updated)"
            } else {
                $CliStatus = "Manifold CLI: auto-update failed. Run /manifold:setup to update manually."
            }
        } else {
            $CliStatus = "Manifold CLI: $CliVersion (update available: v$PluginVersion). Run /manifold:setup to update."
        }
    } else {
        $CliStatus = "Manifold CLI: $CliVersion (ready)"
    }
} else {
    # CLI not installed - attempt auto-install
    $installScript = Join-Path $env:CLAUDE_PLUGIN_ROOT "bin" "install-cli.ps1"
    if ($env:CLAUDE_PLUGIN_ROOT -and (Test-Path $installScript)) {
        & powershell -ExecutionPolicy Bypass -File $installScript 2>$null | Out-Null
        $CliVersion = (& manifold --version 2>$null | Select-Object -First 1) -replace "^v", ""
        if ($CliVersion) {
            $CliStatus = "Manifold CLI: $CliVersion (auto-installed)"
        } else {
            $CliStatus = "Manifold CLI: NOT INSTALLED. Run /manifold:setup to install."
        }
    } else {
        $CliStatus = "Manifold CLI: NOT INSTALLED. Run /manifold:setup to install."
    }
}

# Build context string
$Context = @"
Manifold Schema Quick Reference (v3)\n\nValid Values:\n- Phases: INITIALIZED | CONSTRAINED | TENSIONED | ANCHORED | GENERATED | VERIFIED\n- Constraint Types: invariant | goal | boundary\n- Tension Types: trade_off | resource_tension | hidden_dependency\n- Required Truth Statuses: SATISFIED | PARTIAL | NOT_SATISFIED | SPECIFICATION_READY\n- Convergence Statuses: NOT_STARTED | IN_PROGRESS | CONVERGED\n- Evidence Types: file_exists | content_match | test_passes | metric_value | manual_review\n- Evidence Statuses: VERIFIED | PENDING | FAILED | STALE\n\nConstraint ID Prefixes: Business=B, Technical=T, UX=U, Security=S, Operational=O\n\nCRITICAL: Use ONLY these exact values. Do NOT invent new phases, types, or statuses.\nRun /manifold:SCHEMA_REFERENCE for full documentation.\n\n$(ConvertTo-JsonSafe $CliStatus)
"@

# Output hook response JSON
$output = @"
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "$Context"
  }
}
"@

Write-Output $output
exit 0
