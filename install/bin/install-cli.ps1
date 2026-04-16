#
# Manifold CLI Installer (Windows PowerShell)
# Downloads the pre-compiled CLI binary from GitHub releases.
#
# Usage: powershell -ExecutionPolicy Bypass -File install-cli.ps1 [-InstallDir "C:\path"]
#
# Satisfies: T8 (cross-platform hooks), T9 (Windows binary)
#

param(
    [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

$Releases = "https://github.com/dhanesh/manifold/releases/download"
$FallbackVersion = "2.28.4"

function Write-Step { param([string]$Msg) Write-Host "> " -ForegroundColor Blue -NoNewline; Write-Host $Msg }
function Write-Ok { param([string]$Msg) Write-Host "ok " -ForegroundColor Green -NoNewline; Write-Host $Msg }
function Write-Warn { param([string]$Msg) Write-Host "! " -ForegroundColor Yellow -NoNewline; Write-Host $Msg }
function Write-Err { param([string]$Msg) Write-Host "x " -ForegroundColor Red -NoNewline; Write-Host $Msg }

function Get-LatestVersion {
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/dhanesh/manifold/releases/latest" -TimeoutSec 10
        $version = $response.tag_name -replace "^v", ""
        if ($version) { return $version }
    } catch {}
    return $FallbackVersion
}

function Get-Platform {
    $arch = if ([System.Environment]::Is64BitOperatingSystem) { "x64" } else { "unsupported" }
    return "windows-$arch"
}

function Get-DefaultInstallDir {
    # Prefer user-local directory that doesn't require elevation
    $localBin = Join-Path $env:LOCALAPPDATA "manifold" "bin"
    return $localBin
}

function Install-ManifoldCli {
    param(
        [string]$Platform,
        [string]$Dir
    )

    if ($Platform -match "unsupported") {
        Write-Err "CLI binary not available for this platform: $Platform"
        Write-Warn "Build from source: cd cli && bun run compile"
        return $false
    }

    $version = Get-LatestVersion
    $binaryName = "manifold-${Platform}.exe"
    $downloadUrl = "${Releases}/v${version}/${binaryName}"
    $destPath = Join-Path $Dir "manifold.exe"

    Write-Step "Downloading manifold CLI v${version} for ${Platform}..."

    # Ensure install directory exists
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    }

    try {
        $tmpFile = Join-Path $env:TEMP "manifold-cli-$PID.exe"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tmpFile -UseBasicParsing -TimeoutSec 60

        # Move to final location
        Move-Item -Path $tmpFile -Destination $destPath -Force
        Write-Ok "CLI installed to $destPath"

        # Add to PATH if not already present
        $currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
        if ($currentPath -notlike "*$Dir*") {
            [System.Environment]::SetEnvironmentVariable("PATH", "$Dir;$currentPath", "User")
            $env:PATH = "$Dir;$env:PATH"
            Write-Ok "Added $Dir to user PATH (restart terminal to take effect)"
        }

        return $true
    } catch {
        Write-Err "Download failed: $_"
        Write-Warn "Build from source: cd cli && bun run compile"
        if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force }
        return $false
    }
}

# Main
$dir = if ($InstallDir) { $InstallDir } else { Get-DefaultInstallDir }

# Check if already installed
$existing = Get-Command "manifold" -ErrorAction SilentlyContinue
if ($existing) {
    $current = & manifold --version 2>$null | Select-Object -First 1
    Write-Ok "Manifold CLI already installed: $current"
    Write-Step "Reinstalling to get latest version..."
}

$platform = Get-Platform
Write-Step "Detected platform: $platform"
$success = Install-ManifoldCli -Platform $platform -Dir $dir

if (-not $success) {
    exit 1
}
