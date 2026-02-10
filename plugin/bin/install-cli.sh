#!/usr/bin/env bash
#
# Manifold CLI Installer (Plugin Version)
# Downloads the pre-compiled CLI binary from GitHub releases.
#
# Usage: bash install-cli.sh [--install-dir /path/to/bin]
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RELEASES="https://github.com/dhanesh/manifold/releases/download"
FALLBACK_VERSION="2.21.0"

print_step() { echo -e "${BLUE}>${NC} $1"; }
print_success() { echo -e "${GREEN}ok${NC} $1"; }
print_warning() { echo -e "${YELLOW}!${NC} $1"; }
print_error() { echo -e "${RED}x${NC} $1"; }

get_latest_version() {
    local version
    version=$(curl -fsSL "https://api.github.com/repos/dhanesh/manifold/releases/latest" 2>/dev/null \
        | grep '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/')
    if [ -z "$version" ]; then
        echo "$FALLBACK_VERSION"
    else
        echo "$version"
    fi
}

detect_platform() {
    local os="" arch=""
    case "$(uname -s)" in
        Darwin) os="darwin" ;;
        Linux)  os="linux" ;;
        *)      os="unsupported" ;;
    esac
    case "$(uname -m)" in
        x86_64|amd64)   arch="x64" ;;
        arm64|aarch64)  arch="arm64" ;;
        *)              arch="unsupported" ;;
    esac
    echo "${os}-${arch}"
}

install_cli() {
    local platform="$1"
    local install_dir="${2:-/usr/local/bin}"

    if [[ "$platform" == *"unsupported"* ]]; then
        print_error "CLI binary not available for this platform: $platform"
        print_warning "Build from source: cd cli && bun run compile"
        return 1
    fi

    local version
    version=$(get_latest_version)
    local binary_name="manifold-${platform}"
    local download_url="${RELEASES}/v${version}/${binary_name}"
    local tmp_file="/tmp/manifold-cli-$$"

    print_step "Downloading manifold CLI v${version} for ${platform}..."

    if curl -fsSL "$download_url" -o "$tmp_file" 2>/dev/null; then
        chmod +x "$tmp_file"

        if [[ -w "$install_dir" ]] || sudo -n true 2>/dev/null; then
            if [[ -w "$install_dir" ]]; then
                mv "$tmp_file" "$install_dir/manifold"
            else
                sudo mv "$tmp_file" "$install_dir/manifold"
            fi
            print_success "CLI installed to $install_dir/manifold"
            return 0
        else
            local local_bin="$HOME/.local/bin"
            mkdir -p "$local_bin"
            mv "$tmp_file" "$local_bin/manifold"
            print_success "CLI installed to $local_bin/manifold"
            if ! echo "$PATH" | grep -q "$local_bin"; then
                print_warning "Add $local_bin to your PATH"
            fi
            return 0
        fi
    else
        print_error "Download failed (release may be pending)"
        print_warning "Build from source: cd cli && bun run compile"
        rm -f "$tmp_file"
        return 1
    fi
}

# Parse args
INSTALL_DIR="/usr/local/bin"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --install-dir) INSTALL_DIR="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# Check if already installed
if command -v manifold &>/dev/null; then
    current=$(manifold --version 2>/dev/null || echo "unknown")
    print_success "Manifold CLI already installed: $current"
    print_step "Reinstalling to get latest version..."
fi

platform=$(detect_platform)
print_step "Detected platform: $platform"
install_cli "$platform" "$INSTALL_DIR"
