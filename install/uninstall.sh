#!/usr/bin/env bash
#
# Manifold Uninstaller
# Usage: curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Command files to remove
COMMAND_FILES=(
    "m0-init.md"
    "m1-constrain.md"
    "m2-tension.md"
    "m3-anchor.md"
    "m4-generate.md"
    "m5-verify.md"
    "m-status.md"
)

uninstall_from() {
    local base_dir="$1"
    local name="$2"
    local removed=0

    # Remove skill
    local skill_dir="$base_dir/skills/manifold"
    if [[ -d "$skill_dir" ]]; then
        print_step "Removing /manifold skill from $name..."
        rm -rf "$skill_dir"
        print_success "Removed $skill_dir"
        ((removed++))
    fi

    # Remove commands
    local commands_dir="$base_dir/commands"
    if [[ -d "$commands_dir" ]]; then
        print_step "Removing commands from $name..."
        for cmd_file in "${COMMAND_FILES[@]}"; do
            if [[ -f "$commands_dir/$cmd_file" ]]; then
                rm -f "$commands_dir/$cmd_file"
            fi
        done
        print_success "Removed ${#COMMAND_FILES[@]} command files from $commands_dir"
        ((removed++))
    fi

    echo "$removed"
}

main() {
    echo ""
    echo "Uninstalling Manifold..."
    echo ""

    local total_removed=0

    # Remove from Claude Code
    if [[ -d "$HOME/.claude" ]]; then
        local claude_removed
        claude_removed=$(uninstall_from "$HOME/.claude" "Claude Code")
        total_removed=$((total_removed + claude_removed))
    fi

    # Remove from AMP
    if [[ -d "$HOME/.amp" ]]; then
        local amp_removed
        amp_removed=$(uninstall_from "$HOME/.amp" "AMP")
        total_removed=$((total_removed + amp_removed))
    fi

    echo ""
    if [[ $total_removed -gt 0 ]]; then
        print_success "Manifold uninstalled successfully"
    else
        print_warning "Manifold was not installed"
    fi

    echo ""
    echo "Note: Project data in .manifold/ directories was NOT removed."
    echo "Remove manually if needed: rm -rf .manifold/"
    echo ""
}

main "$@"
