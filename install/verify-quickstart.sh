#!/usr/bin/env bash
#
# Verifies the documented quickstart end to end against an installed `manifold`.
#
# This is the executable definition of "a stranger can get from zero to working
# output". Every command below is one a newcomer is told to run in README.md or
# docs/quickstart.md — if this script fails, the docs are lying.
#
# Usage:
#   install/verify-quickstart.sh            # uses `manifold` from PATH
#   MANIFOLD_BIN=/path/to/manifold install/verify-quickstart.sh
#
# Exit codes: 0 = quickstart works, 1 = quickstart is broken.

set -uo pipefail

MANIFOLD_BIN="${MANIFOLD_BIN:-manifold}"
FAILURES=0
STEP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILURES=$((FAILURES + 1)); }

step() {
    STEP=$((STEP + 1))
    echo ""
    echo -e "${DIM}── step $STEP ─────────────────────────────────────────${NC}"
    echo "\$ $*"
}

# Run a command, echoing it first. Fails the run on non-zero exit.
run() {
    step "$@"
    if "$@"; then
        pass "exit 0"
    else
        fail "exit $? (expected 0)"
    fi
}

# Assert that the previous kind of command emits some expected text.
run_expect() {
    local expected="$1"; shift
    step "$@"
    local out
    if ! out=$("$@" 2>&1); then
        echo "$out"
        fail "exit non-zero (expected 0)"
        return
    fi
    echo "$out"
    if grep -qF -- "$expected" <<<"$out"; then
        pass "output contains \"$expected\""
    else
        fail "output missing \"$expected\""
    fi
}

assert_file() {
    if [[ -f "$1" ]]; then
        pass "created $1"
    else
        fail "missing $1"
    fi
}

echo "════════════════════════════════════════════════════════"
echo "  Manifold quickstart verification"
echo "  binary: $MANIFOLD_BIN"
echo "════════════════════════════════════════════════════════"

if ! command -v "$MANIFOLD_BIN" &> /dev/null && [[ ! -x "$MANIFOLD_BIN" ]]; then
    echo ""
    fail "\`$MANIFOLD_BIN\` is not executable or not on PATH — install did not complete"
    exit 1
fi

START=$(date +%s)

# --- The documented quickstart -------------------------------------------

# README: "Verify it worked: manifold --version"
run "$MANIFOLD_BIN" --version

WORKDIR="$(mktemp -d)"
cd "$WORKDIR" || exit 1
echo ""
echo "Working in a fresh empty directory: $WORKDIR"

# README quickstart step 1: initialize a manifold.
run_expect "payment-retry" "$MANIFOLD_BIN" init payment-retry \
    --outcome="95% of failed payments recover within 3 retries"
assert_file "$WORKDIR/.manifold/payment-retry.json"
assert_file "$WORKDIR/.manifold/payment-retry.md"

# README quickstart step 2: see the state.
run_expect "INITIALIZED" "$MANIFOLD_BIN" status

# README quickstart step 3: the schema is valid.
run_expect "Valid" "$MANIFOLD_BIN" validate

# README: constraint templates are advertised as a headline feature.
run_expect "checkout-auth" "$MANIFOLD_BIN" init checkout-auth \
    --template=auth --outcome="Users authenticate without session loss"
run_expect "checkout-auth" "$MANIFOLD_BIN" show checkout-auth

# README: "Drift Detection", "Bottleneck Identification" — both CLI-reachable.
run "$MANIFOLD_BIN" graph checkout-auth
run "$MANIFOLD_BIN" doctor

# --- Result ---------------------------------------------------------------

ELAPSED=$(( $(date +%s) - START ))
cd / && rm -rf "$WORKDIR"

echo ""
echo "════════════════════════════════════════════════════════"
if [[ $FAILURES -eq 0 ]]; then
    echo -e "  ${GREEN}Quickstart works.${NC} ${STEP} steps, ${ELAPSED}s."
    echo "════════════════════════════════════════════════════════"
    exit 0
else
    echo -e "  ${RED}Quickstart is broken: ${FAILURES} failure(s)${NC} across ${STEP} steps."
    echo "════════════════════════════════════════════════════════"
    exit 1
fi
