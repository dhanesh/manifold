#!/usr/bin/env bash
# Inner script for the README demo recording. Run via scripts/demo/make-demo.sh,
# not directly -- it mutates .manifold/manifold-doctor.json and restores it on exit.
#
# Sequence (see DHA-7):
#   1. manifold status manifold-doctor   -> VERIFIED (6/6), 2 tensions resolved, 7/7 truths
#   2. add a tension referencing a constraint that does not exist
#   3. manifold validate manifold-doctor -> 2 errors
#   4. echo $?                           -> 2
set -uo pipefail

SPEC=".manifold/manifold-doctor.json"
BACKUP="$(mktemp)"
cp "$SPEC" "$BACKUP"
trap 'cp "$BACKUP" "$SPEC"; rm -f "$BACKUP"' EXIT

DIM=$'\033[38;5;245m'
PROMPT=$'\033[38;5;114m'
RESET=$'\033[0m'

# Print a prompt + the command, then run it. No typing animation: the command
# appears in full, the way it looks after you hit enter.
run() {
  printf '%s❯%s %s\n' "$PROMPT" "$RESET" "$*"
  "$@"
}

comment() {
  printf '%s❯%s %s#%s %s%s\n' "$PROMPT" "$RESET" "$DIM" "$RESET" "$DIM$*" "$RESET"
}

run manifold status manifold-doctor
sleep 2.6

printf '\n'
comment 'a tension gets added that points at a constraint we never defined:'
sleep 0.35
comment '  {"id":"TN3","type":"trade_off","between":["T3","ZZ9"],"status":"unresolved"}'

# Insert it as a single compact line so the file stays valid JSON.
python3 - "$SPEC" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path).read()
line = '    {"id": "TN3", "type": "trade_off", "between": ["T3", "ZZ9"], "status": "unresolved"},\n'
out = re.sub(r'(\n  "tensions": \[\n)', r'\1' + line, src, count=1)
assert out != src, "tensions array not found"
open(path, 'w').write(out)
PY
sleep 1.3

printf '\n'
run manifold validate manifold-doctor
rc=$?
sleep 1.2

# The ~2s hold on this last frame comes from agg's --last-frame-duration.
printf '\n%s❯%s echo $?\n%d\n' "$PROMPT" "$RESET" "$rc"
sleep 0.2
