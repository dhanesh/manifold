#!/usr/bin/env bash
#
# Manifold Uninstaller
# Usage: curl -fsSL https://raw.githubusercontent.com/dhanesh/manifold/main/install/uninstall.sh | bash
#
# Uninstalls Manifold from all detected agents: Claude Code, AMP, Gemini CLI, Codex CLI
# Satisfies: RT-9 (clean uninstall), TN5 (two-directory cleanup for Codex)
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_step() {
    echo -e "${BLUE}▶${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}✓${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1" >&2
}

# Command files to remove (canonical .md for Claude Code / AMP)
COMMAND_FILES=(
    "m0-init.md"
    "m1-constrain.md"
    "m2-tension.md"
    "m3-anchor.md"
    "m4-generate.md"
    "m5-verify.md"
    "m6-integrate.md"
    "m-status.md"
    "m-solve.md"
    "m-quick.md"
    "parallel.md"
    "SCHEMA_REFERENCE.md"
)

# Uninstall from Claude Code or AMP (native .md commands)
uninstall_native() {
    local base_dir="$1"
    local name="$2"
    local removed=0

    print_step "Removing Manifold from $name..."

    # Remove skill
    local skill_dir="$base_dir/skills/manifold"
    if [[ -d "$skill_dir" ]]; then
        rm -rf "$skill_dir"
        print_success "Removed /manifold skill"
        ((removed++))
    fi

    # Remove commands
    local commands_dir="$base_dir/commands"
    if [[ -d "$commands_dir" ]]; then
        for cmd_file in "${COMMAND_FILES[@]}"; do
            rm -f "$commands_dir/$cmd_file"
        done
        print_success "Removed ${#COMMAND_FILES[@]} command files"
        ((removed++))
    fi

    # Remove hooks
    local hooks_dir="$base_dir/hooks"
    for hook_file in "manifold-context.ts" "auto-suggester.ts"; do
        if [[ -f "$hooks_dir/$hook_file" ]]; then
            rm -f "$hooks_dir/$hook_file"
        fi
    done
    print_success "Removed hook files"

    # Remove parallel library
    local lib_dir="$base_dir/lib/parallel"
    if [[ -d "$lib_dir" ]]; then
        rm -rf "$lib_dir"
        print_success "Removed parallel library"
        ((removed++))
    fi

    # Remove schema reference from instruction file
    for instruction_file in "CLAUDE.md"; do
        local instr_path="$base_dir/$instruction_file"
        if [[ -f "$instr_path" ]] && grep -q "# Manifold Schema Quick Reference" "$instr_path" 2>/dev/null; then
            local tmp_file="/tmp/manifold_uninstall_$$"
            awk '
                BEGIN { skip = 0 }
                /^# Manifold Schema Quick Reference/ { skip = 1; next }
                skip && /^# [^M]/ { skip = 0 }
                skip && /^# Manifold/ { next }
                !skip { print }
            ' "$instr_path" > "$tmp_file"
            mv "$tmp_file" "$instr_path"
            print_success "Removed schema reference from $instruction_file"
        fi
    done

    echo "$removed"
}

# Uninstall from Gemini CLI
uninstall_gemini() {
    local base_dir="$1"
    local removed=0

    print_step "Removing Manifold from Gemini CLI..."

    # Remove .toml command files
    local commands_dir="$base_dir/commands"
    if [[ -d "$commands_dir" ]]; then
        local toml_removed=0
        for toml_file in "$commands_dir"/m*.toml "$commands_dir"/parallel.toml; do
            if [[ -f "$toml_file" ]]; then
                rm -f "$toml_file"
                ((toml_removed++))
            fi
        done
        if [[ $toml_removed -gt 0 ]]; then
            print_success "Removed $toml_removed .toml command files"
            ((removed++))
        fi
    fi

    # Remove hooks
    local hooks_dir="$base_dir/hooks"
    if [[ -f "$hooks_dir/manifold-context.ts" ]]; then
        rm -f "$hooks_dir/manifold-context.ts"
        print_success "Removed Gemini hooks"
    fi

    # Remove schema reference from GEMINI.md
    local gemini_md="$base_dir/GEMINI.md"
    if [[ -f "$gemini_md" ]] && grep -q "# Manifold Schema Quick Reference" "$gemini_md" 2>/dev/null; then
        local tmp_file="/tmp/manifold_uninstall_$$"
        awk '
            BEGIN { skip = 0 }
            /^# Manifold Schema Quick Reference/ { skip = 1; next }
            skip && /^# [^M]/ { skip = 0 }
            skip && /^# Manifold/ { next }
            !skip { print }
        ' "$gemini_md" > "$tmp_file"
        mv "$tmp_file" "$gemini_md"
        print_success "Removed schema reference from GEMINI.md"
    fi

    echo "$removed"
}

# Uninstall from Codex CLI
# Satisfies: TN5 (two-directory cleanup)
uninstall_codex() {
    local base_dir="$1"
    local removed=0

    print_step "Removing Manifold from Codex CLI..."

    # Remove Codex skills from ~/.agents/skills/
    local skills_dir="$HOME/.agents/skills"
    if [[ -d "$skills_dir" ]]; then
        local skill_removed=0
        for skill_dir in "$skills_dir"/manifold-*; do
            if [[ -d "$skill_dir" ]]; then
                rm -rf "$skill_dir"
                ((skill_removed++))
            fi
        done
        if [[ $skill_removed -gt 0 ]]; then
            print_success "Removed $skill_removed Codex skill directories"
            ((removed++))
        fi
    fi

    # Remove schema reference from AGENTS.md
    local agents_md="$base_dir/AGENTS.md"
    if [[ -f "$agents_md" ]] && grep -q "# Manifold Schema Quick Reference" "$agents_md" 2>/dev/null; then
        local tmp_file="/tmp/manifold_uninstall_$$"
        awk '
            BEGIN { skip = 0 }
            /^# Manifold Schema Quick Reference/ { skip = 1; next }
            skip && /^# [^M]/ { skip = 0 }
            skip && /^# Manifold/ { next }
            !skip { print }
        ' "$agents_md" > "$tmp_file"
        mv "$tmp_file" "$agents_md"
        print_success "Removed schema reference from AGENTS.md"
    fi

    echo "$removed"
}

# Remove CLI binary
uninstall_cli() {
    local removed=0

    for bin_path in "/usr/local/bin/manifold" "$HOME/.local/bin/manifold"; do
        if [[ -f "$bin_path" ]]; then
            print_step "Removing CLI binary: $bin_path"
            if [[ -w "$bin_path" ]]; then
                rm -f "$bin_path"
            elif sudo -n true 2>/dev/null; then
                sudo rm -f "$bin_path"
            else
                print_warning "Cannot remove $bin_path (need sudo). Remove manually."
                continue
            fi
            print_success "Removed $bin_path"
            ((removed++))
        fi
    done

    echo "$removed"
}

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}Manifold Uninstaller${NC}                                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    local total_removed=0

    # Remove from Claude Code
    if [[ -d "$HOME/.claude" ]]; then
        local claude_removed
        claude_removed=$(uninstall_native "$HOME/.claude" "Claude Code")
        total_removed=$((total_removed + claude_removed))
    fi

    # Remove from AMP
    if [[ -d "$HOME/.amp" ]]; then
        local amp_removed
        amp_removed=$(uninstall_native "$HOME/.amp" "AMP")
        total_removed=$((total_removed + amp_removed))
    fi

    # Remove from Gemini CLI
    if [[ -d "$HOME/.gemini" ]]; then
        local gemini_removed
        gemini_removed=$(uninstall_gemini "$HOME/.gemini")
        total_removed=$((total_removed + gemini_removed))
    fi

    # Remove from Codex CLI
    if [[ -d "$HOME/.codex" ]]; then
        local codex_removed
        codex_removed=$(uninstall_codex "$HOME/.codex")
        total_removed=$((total_removed + codex_removed))
    fi

    # Remove CLI binary
    echo ""
    local cli_removed
    cli_removed=$(uninstall_cli)
    total_removed=$((total_removed + cli_removed))

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    if [[ $total_removed -gt 0 ]]; then
        echo -e "${GREEN}  Manifold uninstalled successfully${NC}"
    else
        echo -e "${YELLOW}  Manifold was not installed${NC}"
    fi
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Note: Project data in .manifold/ directories was NOT removed."
    echo "Remove manually if needed: rm -rf .manifold/"
    echo ""
}

main "$@"
