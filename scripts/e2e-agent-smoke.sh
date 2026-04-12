#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BASE_DIR="${TMPDIR:-/tmp}/manifold-e2e-${TIMESTAMP}"
KEEP_TEMP=0
AGENTS=("claude" "codex")
INTERACTIVE=1

SOFTWARE_FEATURE="payment-retry"
SOFTWARE_OUTCOME="95% retry success rate for transient payment failures within 72 hours"
SOFTWARE_OPTION="A"
SOFTWARE_VERIFY_FLAGS="--actions"
SOFTWARE_INTEGRATE_FLAGS="--check-only"

NONSOFTWARE_FEATURE="career-change"
NONSOFTWARE_OUTCOME="Make the right career move"
NONSOFTWARE_OPTION="A"
NONSOFTWARE_VERIFY_FLAGS="--actions"
NONSOFTWARE_INTEGRATE_FLAGS="--check-only"

SOFTWARE_BUSINESS="No duplicate charges, 95% retry success target, retries must finish within 72 hours."
SOFTWARE_TECHNICAL="Classify transient vs permanent failures, keep API latency under 200ms, respect provider rate limits."
SOFTWARE_UX="Users should see retry status clearly and should not need to manually retry."
SOFTWARE_SECURITY="No card data in logs, audit every retry attempt, protect sensitive payment metadata."
SOFTWARE_OPERATIONAL="Monitor queue depth and success rate, alert below 90%, support rollback and incident debugging."

NONSOFTWARE_BUSINESS="The decision must be financially responsible and aligned with long-term career goals."
NONSOFTWARE_TECHNICAL="Available time, savings runway, and realistic transition steps are limited resources."
NONSOFTWARE_UX="The plan should feel understandable, low-regret, and easy to explain to stakeholders."
NONSOFTWARE_SECURITY="Protect personal information and avoid commitments that create irreversible downside too early."
NONSOFTWARE_OPERATIONAL="Track milestones, deadlines, and fallback plans so the transition remains observable."

info() {
  printf '[info] %s\n' "$*"
}

warn() {
  printf '[warn] %s\n' "$*" >&2
}

error() {
  printf '[error] %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: scripts/e2e-agent-smoke.sh [options]

Runs isolated Manifold smoke tests for Claude Code and Codex without mutating
your real ~/.claude, ~/.codex, or ~/.agents state.

The script walks the full phase chain:
  m0-init -> m1-constrain -> m2-tension -> m3-anchor -> m4-generate -> m5-verify -> m6-integrate

For interactive phases it can ask the human running the script for the answers
that would otherwise be gathered during agent conversation, then feeds those
answers into the non-interactive agent prompts.

Options:
  --agent <claude|codex|all>  Limit execution to one agent (default: all)
  --base-dir <path>           Output directory for homes, workspaces, and logs
  --keep-temp                 Keep temp directories
  --non-interactive           Use built-in defaults instead of prompting
  -h, --help                  Show this help
EOF
}

prompt_value() {
  local label="$1"
  local current="$2"
  local reply=""

  if [[ "$INTERACTIVE" -eq 0 ]] || [[ ! -t 0 ]]; then
    printf '%s' "$current"
    return
  fi

  printf '%s\n' "$label"
  printf 'Default: %s\n> ' "$current"
  IFS= read -r reply || true
  if [[ -z "$reply" ]]; then
    printf '%s' "$current"
  else
    printf '%s' "$reply"
  fi
}

write_summary() {
  local summary_file="$1"
  shift
  printf '%s\n' "$@" >"$summary_file"
}

copy_if_exists() {
  local src="$1"
  local dest_dir="$2"
  if [[ -f "$src" ]]; then
    mkdir -p "$dest_dir"
    cp "$src" "$dest_dir/"
  fi
}

create_git_workspace() {
  local dir="$1"
  mkdir -p "$dir"
  (
    cd "$dir"
    git init -q
  )
}

install_manifold_into_home() {
  local test_home="$1"
  local log_file="$2"
  mkdir -p "$test_home"
  HOME="$test_home" bash "$ROOT_DIR/install/install.sh" >"$log_file" 2>&1
}

run_claude_prompt() {
  local prompt="$1"
  local log_file="$2"

  claude -p \
    --permission-mode bypassPermissions \
    --plugin-dir "$ROOT_DIR/plugin" \
    "$prompt" >"$log_file" 2>&1
}

run_codex_prompt() {
  local test_home="$1"
  local workdir="$2"
  local prompt="$3"
  local log_file="$4"
  local last_file="$5"

  HOME="$test_home" codex exec \
    --full-auto \
    --skip-git-repo-check \
    -C "$workdir" \
    -o "$last_file" \
    "$prompt" >"$log_file" 2>&1
}

run_agent_phase() {
  local agent="$1"
  local test_home="$2"
  local workdir="$3"
  local phase_name="$4"
  local prompt="$5"
  local phase_log="$6"
  local phase_last="$7"

  if [[ "$agent" == "claude" ]]; then
    run_claude_prompt "$prompt" "$phase_log"
  else
    run_codex_prompt "$test_home" "$workdir" "$prompt" "$phase_log" "$phase_last"
  fi
}

build_phase_prompt() {
  local agent="$1"
  local feature="$2"
  local domain="$3"
  local phase="$4"

  local codex_question_note="Codex does not provide AskUserQuestion. If more user input is needed, ask a concise inline question with labeled options such as A/B/C and stop for the user's reply."

  case "$phase" in
    m0-init)
      local outcome_var
      if [[ "$domain" == "software" ]]; then
        outcome_var="$SOFTWARE_OUTCOME"
      else
        outcome_var="$NONSOFTWARE_OUTCOME"
      fi
      printf 'Execute `/manifold:m0-init %s --outcome="%s" --domain=%s`. Create or update only the Manifold files needed for this phase. %s' \
        "$feature" "$outcome_var" "$domain" "$codex_question_note"
      ;;
    m1-constrain)
      local business technical ux security operational
      if [[ "$domain" == "software" ]]; then
        business="$SOFTWARE_BUSINESS"
        technical="$SOFTWARE_TECHNICAL"
        ux="$SOFTWARE_UX"
        security="$SOFTWARE_SECURITY"
        operational="$SOFTWARE_OPERATIONAL"
      else
        business="$NONSOFTWARE_BUSINESS"
        technical="$NONSOFTWARE_TECHNICAL"
        ux="$NONSOFTWARE_UX"
        security="$NONSOFTWARE_SECURITY"
        operational="$NONSOFTWARE_OPERATIONAL"
      fi
      printf 'Execute `/manifold:m1-constrain %s`. Use these interview answers as user input: Business/Obligations: %s Technical/Resources: %s UX/Desires: %s Security/Risks: %s Operational/Dependencies: %s. Update only the manifold files for this phase. %s' \
        "$feature" "$business" "$technical" "$ux" "$security" "$operational" "$codex_question_note"
      ;;
    m2-tension)
      printf 'Execute `/manifold:m2-tension %s --resolve`. If multiple resolution options exist, prefer the recommended option unless it conflicts with the stated outcome. %s' \
        "$feature" "$codex_question_note"
      ;;
    m3-anchor)
      local outcome_var
      if [[ "$domain" == "software" ]]; then
        outcome_var="$SOFTWARE_OUTCOME"
      else
        outcome_var="$NONSOFTWARE_OUTCOME"
      fi
      printf 'Execute `/manifold:m3-anchor %s --outcome="%s"`. If multiple solution options are produced, note them clearly and recommend one. %s' \
        "$feature" "$outcome_var" "$codex_question_note"
      ;;
    m4-generate)
      local option_var
      if [[ "$domain" == "software" ]]; then
        option_var="$SOFTWARE_OPTION"
      else
        option_var="$NONSOFTWARE_OPTION"
      fi
      printf 'Execute `/manifold:m4-generate %s --option=%s`. Generate the full artifact set appropriate for the current domain and selected option. %s' \
        "$feature" "$option_var" "$codex_question_note"
      ;;
    m5-verify)
      local verify_flags
      if [[ "$domain" == "software" ]]; then
        verify_flags="$SOFTWARE_VERIFY_FLAGS"
      else
        verify_flags="$NONSOFTWARE_VERIFY_FLAGS"
      fi
      printf 'Execute `/manifold:m5-verify %s %s`. Report any coverage gaps clearly. %s' \
        "$feature" "$verify_flags" "$codex_question_note"
      ;;
    m6-integrate)
      local integrate_flags
      if [[ "$domain" == "software" ]]; then
        integrate_flags="$SOFTWARE_INTEGRATE_FLAGS"
      else
        integrate_flags="$NONSOFTWARE_INTEGRATE_FLAGS"
      fi
      printf 'Execute `/manifold:m6-integrate %s %s`. Wire safe integrations or produce the checklist required by this phase. %s' \
        "$feature" "$integrate_flags" "$codex_question_note"
      ;;
    *)
      return 1
      ;;
  esac
}

check_phase_artifact() {
  local workdir="$1"
  local feature="$2"
  [[ -f "$workdir/.manifold/${feature}.json" ]] && [[ -f "$workdir/.manifold/${feature}.md" ]]
}

run_full_agent_workflow() {
  local agent="$1"
  local base="$2"
  local feature="$3"
  local domain="$4"

  local test_home="$base/home"
  local workdir="$base/$domain"
  local logs_dir="$base/logs/$domain"
  local summary_file="$logs_dir/summary.txt"
  local phases=("m0-init" "m1-constrain" "m2-tension" "m3-anchor" "m4-generate" "m5-verify" "m6-integrate")

  mkdir -p "$logs_dir"
  create_git_workspace "$workdir"

  if [[ "$agent" == "claude" ]] && ! command -v claude >/dev/null 2>&1; then
    write_summary "$summary_file" "status=skipped" "reason=claude_cli_missing"
    return
  fi
  if [[ "$agent" == "codex" ]] && ! command -v codex >/dev/null 2>&1; then
    write_summary "$summary_file" "status=skipped" "reason=codex_cli_missing"
    return
  fi

  for phase in "${phases[@]}"; do
    local prompt phase_log phase_last
    prompt="$(build_phase_prompt "$agent" "$feature" "$domain" "$phase")"
    phase_log="$logs_dir/${phase}.log"
    phase_last="$logs_dir/${phase}.last.txt"

    info "[$agent][$domain] running $phase"

    if ! run_agent_phase "$agent" "$test_home" "$workdir" "$phase" "$prompt" "$phase_log" "$phase_last"; then
      if [[ "$agent" == "claude" ]] && grep -q 'Not logged in' "$phase_log" 2>/dev/null; then
        write_summary "$summary_file" "status=skipped" "reason=claude_not_logged_in" "phase=$phase" "log=$phase_log"
        return
      fi
      if [[ "$agent" == "codex" ]] && \
         { grep -q 'Could not create otel exporter' "$phase_log" 2>/dev/null || grep -q 'failed to refresh available models' "$phase_log" 2>/dev/null; }; then
        write_summary "$summary_file" "status=skipped" "reason=codex_runtime_failure" "phase=$phase" "log=$phase_log"
        return
      fi
      write_summary "$summary_file" "status=failed" "reason=phase_execution_failed" "phase=$phase" "log=$phase_log"
      return
    fi

    if ! check_phase_artifact "$workdir" "$feature"; then
      write_summary "$summary_file" "status=failed" "reason=missing_manifold_files" "phase=$phase" "log=$phase_log"
      return
    fi
  done

  write_summary "$summary_file" \
    "status=passed" \
    "feature=$feature" \
    "domain=$domain" \
    "json=$workdir/.manifold/${feature}.json" \
    "md=$workdir/.manifold/${feature}.md" \
    "logs=$logs_dir"
}

run_cli_init_and_eval() {
  local feature="$1"
  local outcome="$2"
  local domain="$3"
  local workdir="$4"
  local eval_repo="$5"
  local eval_log="$6"

  mkdir -p "$workdir"
  (
    cd "$workdir"
    git init -q
    bun run "$ROOT_DIR/cli/index.ts" init "$feature" -o "$outcome" -d "$domain" >"$eval_log.init" 2>&1
  )

  mkdir -p "$eval_repo/.manifold" "$eval_repo/tests/evals/$feature" "$eval_repo/bin"
  ln -sfn "$ROOT_DIR/node_modules" "$eval_repo/node_modules"
  cp "$ROOT_DIR/tests/evals/run-golden.ts" "$eval_repo/tests/evals/run-golden.ts"
  cp "$workdir/.manifold/${feature}.json" "$eval_repo/.manifold/${feature}.json"

  cat >"$eval_repo/tests/evals/$feature/assertions.yaml" <<EOF
phases:
  m0-init:
    assertions:
      - type: schema_valid
      - type: phase_correct
        expected: INITIALIZED
      - type: field_exists
        field: domain
        expected: $domain
EOF

  cat >"$eval_repo/bin/manifold" <<EOF
#!/usr/bin/env bash
exec bun run "$ROOT_DIR/cli/index.ts" "\$@"
EOF
  chmod +x "$eval_repo/bin/manifold"

  (
    cd "$eval_repo"
    PATH="$eval_repo/bin:$PATH" bun run tests/evals/run-golden.ts "$feature" >"$eval_log" 2>&1
  )
}

gather_inputs() {
  SOFTWARE_OUTCOME="$(prompt_value "Software workflow outcome?" "$SOFTWARE_OUTCOME")"
  SOFTWARE_BUSINESS="$(prompt_value "Software constraint interview: business answer?" "$SOFTWARE_BUSINESS")"
  SOFTWARE_TECHNICAL="$(prompt_value "Software constraint interview: technical answer?" "$SOFTWARE_TECHNICAL")"
  SOFTWARE_UX="$(prompt_value "Software constraint interview: UX answer?" "$SOFTWARE_UX")"
  SOFTWARE_SECURITY="$(prompt_value "Software constraint interview: security answer?" "$SOFTWARE_SECURITY")"
  SOFTWARE_OPERATIONAL="$(prompt_value "Software constraint interview: operational answer?" "$SOFTWARE_OPERATIONAL")"
  SOFTWARE_OPTION="$(prompt_value "Software generation option for m4-generate?" "$SOFTWARE_OPTION")"
  SOFTWARE_VERIFY_FLAGS="$(prompt_value "Software m5-verify flags?" "$SOFTWARE_VERIFY_FLAGS")"
  SOFTWARE_INTEGRATE_FLAGS="$(prompt_value "Software m6-integrate flags?" "$SOFTWARE_INTEGRATE_FLAGS")"

  NONSOFTWARE_OUTCOME="$(prompt_value "Non-software workflow outcome?" "$NONSOFTWARE_OUTCOME")"
  NONSOFTWARE_BUSINESS="$(prompt_value "Non-software interview: obligations/business answer?" "$NONSOFTWARE_BUSINESS")"
  NONSOFTWARE_TECHNICAL="$(prompt_value "Non-software interview: resources/technical answer?" "$NONSOFTWARE_TECHNICAL")"
  NONSOFTWARE_UX="$(prompt_value "Non-software interview: desires/UX answer?" "$NONSOFTWARE_UX")"
  NONSOFTWARE_SECURITY="$(prompt_value "Non-software interview: risks/security answer?" "$NONSOFTWARE_SECURITY")"
  NONSOFTWARE_OPERATIONAL="$(prompt_value "Non-software interview: dependencies/operational answer?" "$NONSOFTWARE_OPERATIONAL")"
  NONSOFTWARE_OPTION="$(prompt_value "Non-software generation option for m4-generate?" "$NONSOFTWARE_OPTION")"
  NONSOFTWARE_VERIFY_FLAGS="$(prompt_value "Non-software m5-verify flags?" "$NONSOFTWARE_VERIFY_FLAGS")"
  NONSOFTWARE_INTEGRATE_FLAGS="$(prompt_value "Non-software m6-integrate flags?" "$NONSOFTWARE_INTEGRATE_FLAGS")"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      case "${2:-}" in
        claude) AGENTS=("claude") ;;
        codex) AGENTS=("codex") ;;
        all) AGENTS=("claude" "codex") ;;
        *)
          error "Invalid --agent value: ${2:-}"
          usage
          exit 2
          ;;
      esac
      shift 2
      ;;
    --base-dir)
      BASE_DIR="${2:-}"
      shift 2
      ;;
    --keep-temp)
      KEEP_TEMP=1
      shift
      ;;
    --non-interactive)
      INTERACTIVE=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

mkdir -p "$BASE_DIR"

cleanup() {
  if [[ "$KEEP_TEMP" -ne 1 ]]; then
    info "Artifacts retained at $BASE_DIR"
  fi
}
trap cleanup EXIT

gather_inputs

for agent in "${AGENTS[@]}"; do
  agent_dir="$BASE_DIR/$agent"
  logs_dir="$agent_dir/logs"
  mkdir -p "$logs_dir"

  info "Preparing isolated environment for $agent"

  if [[ "$agent" == "claude" ]]; then
    mkdir -p "$agent_dir/home/.claude"
    copy_if_exists "$HOME/.claude/.env" "$agent_dir/home/.claude"
    install_manifold_into_home "$agent_dir/home" "$logs_dir/install.log"
  else
    mkdir -p "$agent_dir/home/.codex"
    copy_if_exists "$HOME/.codex/auth.json" "$agent_dir/home/.codex"
    install_manifold_into_home "$agent_dir/home" "$logs_dir/install.log"
    cat >"$logs_dir/codex-askuserquestion-alternative.txt" <<'EOF'
Codex AskUserQuestion alternative:
- Codex does not provide Claude's AskUserQuestion tool.
- The practical replacement is a concise inline question with labeled choices
  such as A/B/C, then stopping for the user's reply.
- In this smoke script, those answers are gathered by the shell before phase
  execution and injected into the non-interactive prompts.
EOF
  fi

  run_full_agent_workflow "$agent" "$agent_dir" "$SOFTWARE_FEATURE" "software"
  run_full_agent_workflow "$agent" "$agent_dir" "$NONSOFTWARE_FEATURE" "non-software"

  eval_base="$agent_dir/evals"
  mkdir -p "$eval_base"

  info "Running deterministic fallback evals for $agent"
  run_cli_init_and_eval \
    "$SOFTWARE_FEATURE" \
    "$SOFTWARE_OUTCOME" \
    "software" \
    "$agent_dir/software-cli-fallback" \
    "$eval_base/software-repo" \
    "$logs_dir/software-fallback-eval.log"

  run_cli_init_and_eval \
    "$NONSOFTWARE_FEATURE" \
    "$NONSOFTWARE_OUTCOME" \
    "non-software" \
    "$agent_dir/nonsoftware-cli-fallback" \
    "$eval_base/nonsoftware-repo" \
    "$logs_dir/nonsoftware-fallback-eval.log"
done

info "Smoke test artifacts written to $BASE_DIR"
