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

main() {
    echo ""
    echo "Uninstalling Manifold..."
    echo ""

    local removed=0

    # Remove from Claude Code
    local claude_manifold="$HOME/.claude/skills/manifold"
    if [[ -d "$claude_manifold" ]]; then
        print_step "Removing from Claude Code..."
        rm -rf "$claude_manifold"
        print_success "Removed $claude_manifold"
        ((removed++))
    fi

    # Remove from AMP
    local amp_manifold="$HOME/.amp/skills/manifold"
    if [[ -d "$amp_manifold" ]]; then
        print_step "Removing from AMP..."
        rm -rf "$amp_manifold"
        print_success "Removed $amp_manifold"
        ((removed++))
    fi

    echo ""
    if [[ $removed -gt 0 ]]; then
        print_success "Manifold uninstalled from $removed location(s)"
    else
        print_warning "Manifold was not installed"
    fi

    echo ""
    echo "Note: Project data in .manifold/ directories was NOT removed."
    echo "Remove manually if needed: rm -rf .manifold/"
    echo ""
}

main "$@"
