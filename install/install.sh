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
VERSION="1.0.0"
REPO="https://raw.githubusercontent.com/dhanesh/manifold/main"

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
    "m-status.md"
)

# Install Manifold
install_manifold() {
    local base_dir="$1"
    local agent_name="$2"

    print_step "Installing Manifold to $agent_name..."

    local skills_dir="$base_dir/skills"
    local commands_dir="$base_dir/commands"
    local hooks_dir="$base_dir/hooks"

    # Create directories
    mkdir -p "$skills_dir/manifold"
    mkdir -p "$commands_dir"
    mkdir -p "$hooks_dir"

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

    # Install hook (for context preservation)
    if [[ -n "$LOCAL_INSTALL" ]]; then
        cp "$SCRIPT_DIR/hooks/manifold-context.ts" "$hooks_dir/manifold-context.ts"
    else
        curl -fsSL "$REPO/install/hooks/manifold-context.ts" -o "$hooks_dir/manifold-context.ts"
    fi
    print_success "Installed context hook to $hooks_dir/"
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
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Manifold installed successfully to $installed agent(s)!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}Quick Start:${NC}"
    echo ""
    echo "  /m0-init my-feature        # Initialize manifold"
    echo "  /m1-constrain my-feature   # Discover constraints"
    echo "  /m2-tension my-feature     # Surface conflicts"
    echo "  /m3-anchor my-feature      # Backward reasoning"
    echo "  /m4-generate my-feature    # Create all artifacts"
    echo "  /m5-verify my-feature      # Validate constraints"
    echo "  /m-status                  # Show current state"
    echo ""
    echo -e "${BOLD}Overview:${NC}"
    echo "  /manifold                  # Show framework overview"
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
