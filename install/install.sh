#!/usr/bin/env bash
#
# Manifold Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/install.sh | bash
#
# Installs Manifold for Claude Code and/or AMP
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Manifold info
VERSION="2.0.0"
CLI_VERSION="2.0.0"
REPO="https://raw.githubusercontent.com/dhanesh/manifold/main"
RELEASES="https://github.com/dhanesh/manifold/releases/download"

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}Manifold${NC} v${VERSION}                                      ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  Constraint-first development framework               ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Detect OS and architecture
detect_platform() {
    local os=""
    local arch=""

    case "$(uname -s)" in
        Darwin) os="darwin" ;;
        Linux) os="linux" ;;
        *) os="unsupported" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) arch="unsupported" ;;
    esac

    echo "${os}-${arch}"
}

# Download and install CLI binary
install_cli() {
    local platform="$1"
    local install_dir="${2:-/usr/local/bin}"

    if [[ "$platform" == *"unsupported"* ]]; then
        print_warning "CLI binary not available for this platform: $platform"
        print_warning "You can build from source: cd cli && bun run compile"
        return 1
    fi

    local binary_name="manifold-${platform}"
    local download_url="${RELEASES}/v${CLI_VERSION}/${binary_name}"
    local tmp_file="/tmp/manifold-cli-$$"

    print_step "Downloading CLI binary for ${platform}..."

    if curl -fsSL "$download_url" -o "$tmp_file" 2>/dev/null; then
        chmod +x "$tmp_file"

        # Try to install to system path, fall back to local
        if [[ -w "$install_dir" ]] || sudo -n true 2>/dev/null; then
            if [[ -w "$install_dir" ]]; then
                mv "$tmp_file" "$install_dir/manifold"
            else
                sudo mv "$tmp_file" "$install_dir/manifold"
            fi
            print_success "CLI installed to $install_dir/manifold"
            return 0
        else
            # Fall back to ~/.local/bin
            local local_bin="$HOME/.local/bin"
            mkdir -p "$local_bin"
            mv "$tmp_file" "$local_bin/manifold"
            print_success "CLI installed to $local_bin/manifold"
            print_warning "Add $local_bin to your PATH if not already present"
            return 0
        fi
    else
        print_warning "CLI binary not yet available (release pending)"
        print_warning "You can build from source: cd cli && bun run compile"
        rm -f "$tmp_file"
        return 1
    fi
}

# Detect Claude Code
detect_claude_code() {
    if [[ -d "$HOME/.claude" ]]; then
        echo "$HOME/.claude"
        return 0
    fi
    return 1
}

# Detect AMP
detect_amp() {
    if command -v amp &> /dev/null; then
        echo "$HOME/.amp"
        return 0
    fi
    return 1
}

# Command files to install (individual slash commands)
COMMAND_FILES=(
    "m0-init.md"
    "m1-constrain.md"
    "m2-tension.md"
    "m3-anchor.md"
    "m4-generate.md"
    "m5-verify.md"
    "m6-integrate.md"
    "m-status.md"
    "parallel.md"
)

# Parallel library files to install
PARALLEL_LIB_FILES=(
    "task-analyzer.ts"
    "file-predictor.ts"
    "overlap-detector.ts"
    "parallel-config.ts"
    "worktree-manager.ts"
    "resource-monitor.ts"
    "merge-orchestrator.ts"
    "parallel-executor.ts"
    "progress-reporter.ts"
    "command.ts"
    "index.ts"
)

# Install Manifold
install_manifold() {
    local base_dir="$1"
    local agent_name="$2"

    print_step "Installing Manifold to $agent_name..."

    local skills_dir="$base_dir/skills"
    local commands_dir="$base_dir/commands"
    local hooks_dir="$base_dir/hooks"
    local lib_dir="$base_dir/lib"

    # Create directories
    mkdir -p "$skills_dir/manifold"
    mkdir -p "$commands_dir"
    mkdir -p "$hooks_dir"
    mkdir -p "$lib_dir/parallel"

    # Install skill (for /manifold overview command)
    if [[ -n "$LOCAL_INSTALL" ]]; then
        cp "$SCRIPT_DIR/manifold/SKILL.md" "$skills_dir/manifold/SKILL.md"
    else
        curl -fsSL "$REPO/install/manifold/SKILL.md" -o "$skills_dir/manifold/SKILL.md"
    fi
    print_success "Installed /manifold skill to $skills_dir/manifold/"

    # Install commands (for /m0-init, /m1-constrain, etc.)
    for cmd_file in "${COMMAND_FILES[@]}"; do
        if [[ -n "$LOCAL_INSTALL" ]]; then
            cp "$SCRIPT_DIR/commands/$cmd_file" "$commands_dir/$cmd_file"
        else
            curl -fsSL "$REPO/install/commands/$cmd_file" -o "$commands_dir/$cmd_file"
        fi
    done
    print_success "Installed ${#COMMAND_FILES[@]} commands to $commands_dir/"

    # Install parallel library (for /parallel command)
    for lib_file in "${PARALLEL_LIB_FILES[@]}"; do
        if [[ -n "$LOCAL_INSTALL" ]]; then
            cp "$SCRIPT_DIR/lib/parallel/$lib_file" "$lib_dir/parallel/$lib_file"
        else
            curl -fsSL "$REPO/install/lib/parallel/$lib_file" -o "$lib_dir/parallel/$lib_file"
        fi
    done
    print_success "Installed parallel library to $lib_dir/parallel/"

    # Install hooks (for context preservation and auto-suggest)
    if [[ -n "$LOCAL_INSTALL" ]]; then
        cp "$SCRIPT_DIR/hooks/manifold-context.ts" "$hooks_dir/manifold-context.ts"
        cp "$SCRIPT_DIR/hooks/auto-suggester.ts" "$hooks_dir/auto-suggester.ts"
    else
        curl -fsSL "$REPO/install/hooks/manifold-context.ts" -o "$hooks_dir/manifold-context.ts"
        curl -fsSL "$REPO/install/hooks/auto-suggester.ts" -o "$hooks_dir/auto-suggester.ts"
    fi
    print_success "Installed hooks to $hooks_dir/"
}

# Main installation
main() {
    print_banner

    local installed=0
    local claude_dir=""
    local amp_dir=""

    # Detect available agents
    print_step "Detecting AI coding agents..."
    echo ""

    # Check Claude Code
    if claude_dir=$(detect_claude_code); then
        print_success "Claude Code detected: $claude_dir"
    else
        print_warning "Claude Code not found"
    fi

    # Check AMP
    if amp_dir=$(detect_amp); then
        print_success "AMP detected: $amp_dir"
    else
        print_warning "AMP not found"
    fi

    echo ""

    # Abort if no agents found
    if [[ -z "$claude_dir" && -z "$amp_dir" ]]; then
        print_error "No supported AI agents found!"
        echo ""
        echo "Manifold requires one of:"
        echo "  - Claude Code (https://claude.ai/code)"
        echo "  - AMP (https://amp.dev)"
        echo ""
        exit 1
    fi

    # Install to Claude Code
    if [[ -n "$claude_dir" ]]; then
        install_manifold "$claude_dir" "Claude Code"
        ((installed++))
    fi

    # Install to AMP
    if [[ -n "$amp_dir" ]]; then
        install_manifold "$amp_dir" "AMP"
        ((installed++))
    fi

    echo ""

    # Install CLI binary (optional but recommended)
    print_step "Installing CLI binary..."
    local platform
    platform=$(detect_platform)
    print_success "Detected platform: $platform"

    local cli_installed=0
    if install_cli "$platform"; then
        cli_installed=1
    fi

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    if [[ $cli_installed -eq 1 ]]; then
        echo -e "${GREEN}  Manifold installed: $installed agent(s) + CLI binary${NC}"
    else
        echo -e "${GREEN}  Manifold installed successfully to $installed agent(s)!${NC}"
    fi
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}AI Agent Commands (Claude Code / AMP):${NC}"
    echo ""
    echo "  /m0-init my-feature        # Initialize manifold"
    echo "  /m1-constrain my-feature   # Discover constraints"
    echo "  /m2-tension my-feature     # Surface conflicts (--auto-deps for v2)"
    echo "  /m3-anchor my-feature      # Backward reasoning"
    echo "  /m4-generate my-feature    # Create all artifacts"
    echo "  /m6-integrate my-feature   # Wire artifacts together (v2)"
    echo "  /m5-verify my-feature      # Validate constraints (--actions for v2)"
    echo "  /m-status                  # Show current state (--history for v2)"
    echo ""
    echo -e "${BOLD}Parallel Execution:${NC}"
    echo "  /parallel \"task1\" \"task2\"  # Execute tasks in parallel worktrees"
    echo ""
    echo -e "${BOLD}Overview:${NC}"
    echo "  /manifold                  # Show framework overview"
    echo ""
    if [[ $cli_installed -eq 1 ]]; then
        echo -e "${BOLD}CLI Commands (fast, deterministic, no AI):${NC}"
        echo ""
        echo "  manifold status [feature]     # Show manifold state (<100ms)"
        echo "  manifold validate [feature]   # Validate schema"
        echo "  manifold init <feature>       # Initialize new manifold"
        echo "  manifold verify [feature]     # Verify artifacts exist"
        echo ""
        echo "  Add --json for machine-readable output (CI/CD)"
    fi
    echo ""
    echo -e "${BOLD}Optional: Enable Context Preservation${NC}"
    echo ""
    echo "Add to ~/.claude/settings.json under \"hooks\":{\"PreCompact\":[...]}:"
    echo ""
    echo "  {\"type\": \"command\", \"command\": \"bun run ~/.claude/hooks/manifold-context.ts\"}"
    echo ""
    echo "This preserves manifold state across context compaction."
    echo ""
    echo "Documentation: https://github.com/dhanesh/manifold"
    echo ""
}

# Handle local install mode
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/manifold/SKILL.md" && -d "$SCRIPT_DIR/commands" ]]; then
    LOCAL_INSTALL=1
fi

main "$@"
