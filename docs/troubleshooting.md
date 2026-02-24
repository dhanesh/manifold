# Troubleshooting

<!-- Satisfies: RT-8 (Error Recovery), U3 (Error Recovery Guidance) -->

Common issues and how to fix them.

## Validation Errors

### "Invalid JSON structure"

```
manifold validate my-feature
  ✗ Invalid JSON structure: iterations.0.result: Required
```

**Cause:** Your `.manifold/<feature>.json` is missing a required field.

**Fix:** Check the error message for the field path (e.g., `iterations.0.result`). Add the missing field. Common missing fields:

| Field | Where | Type |
|-------|-------|------|
| `result` | `iterations[].result` | string — summary of iteration |
| `status` | `convergence.status` | `NOT_STARTED`, `IN_PROGRESS`, or `CONVERGED` |
| `phase` | root | `INITIALIZED` through `VERIFIED` |

Run `manifold validate <feature>` again to confirm the fix.

### "Exit code 2"

**Cause:** Schema validation failed. This is different from exit code 1 (file not found, permission error).

**Fix:** Run `manifold validate <feature> --all` to see all errors (default truncates at 20). Fix each reported issue.

### "Linking error: constraint B5 in JSON not found in Markdown"

**Cause:** JSON references a constraint ID that has no corresponding `#### B5:` heading in the Markdown file.

**Fix:** Either add the heading to `.manifold/<feature>.md`:
```markdown
#### B5: Your Constraint Title

Statement here.
```

Or remove the reference from `.manifold/<feature>.json`.

## Phase Transition Issues

### "Stuck in INITIALIZED"

**Cause:** No constraints discovered yet.

**Fix:** Run `/manifold:m1-constrain <feature>` to discover constraints. The phase advances to `CONSTRAINED` when constraints are added.

### Phase didn't advance

**Cause:** Manifold phases require explicit commands. They never auto-advance.

**Fix:** Check current phase with `manifold status <feature>`, then run the appropriate command:

| Current Phase | Run Next |
|---------------|----------|
| INITIALIZED | `/manifold:m1-constrain <feature>` |
| CONSTRAINED | `/manifold:m2-tension <feature>` |
| TENSIONED | `/manifold:m3-anchor <feature>` |
| ANCHORED | `/manifold:m4-generate <feature>` |
| GENERATED | `/manifold:m5-verify <feature>` |

### Want to go back to an earlier phase

**Cause:** Need to re-do constraint discovery or tension analysis.

**Fix:** Manually edit `.manifold/<feature>.json` and change the `phase` field back to the desired phase. Then run the appropriate command. Manifold supports iteration — going backward is expected.

## Format Issues

### "JSON file exists but command created YAML"

**Cause:** Format lock violation. When `.manifold/<feature>.json` exists, all updates must use JSON+MD format.

**Fix:** Delete the YAML file and use JSON+MD going forward. Or use `manifold migrate <feature>` to convert.

### "Want to convert from YAML to JSON+MD"

```bash
manifold migrate <feature>              # Single feature
manifold migrate --all                  # All YAML manifolds
manifold migrate <feature> --dry-run    # Preview first
```

The original YAML is kept as `.yaml.backup` by default.

### "Markdown headings don't match JSON IDs"

**Cause:** JSON has constraint `{"id": "B1"}` but Markdown doesn't have `#### B1:` heading.

**Fix:** Run `manifold validate <feature>` to see exact linking errors. Then align the headings:
- JSON constraint IDs → `#### B1: Title` in Markdown
- JSON tension IDs → `### TN1: Title` in Markdown
- JSON required truth IDs → `### RT-1: Title` in Markdown

## Evidence Issues

### Evidence shows STALE

**Cause:** The file was modified after the evidence was last verified.

**Fix:** Normal — just re-run verification:
```bash
manifold verify <feature> --verify-evidence
```

### Evidence shows FAILED

**Cause:** The file doesn't exist or the pattern doesn't match.

**Fix:**
1. Check the file path is relative to project root
2. For `content_match`, test your regex: `grep -E "your_pattern" path/to/file`
3. Regex uses JavaScript syntax with `gm` flags

### Test evidence skipped

**Cause:** Default verification only checks test file + name exist, doesn't run tests.

**Fix:** Add `--run-tests` flag:
```bash
manifold verify <feature> --verify-evidence --run-tests
```

## Installation Issues

### "manifold: command not found"

**Cause:** CLI binary not in PATH.

**Fix:** After installing, ensure the binary location is in your PATH:
```bash
# Check where it was installed
which manifold

# If not found, add to PATH (the install script shows the location)
export PATH="$HOME/.local/bin:$PATH"
```

### "Permission denied"

**Cause:** Binary doesn't have execute permission.

**Fix:**
```bash
chmod +x $(which manifold)
```

## Getting Help

- `manifold --help` — List all commands
- `manifold <command> --help` — Command-specific help
- `manifold status` — Current state of all features
- [CLI Reference](cli-reference.md) — Complete command documentation
- [Glossary](GLOSSARY.md) — Terminology explanations
- [GitHub Issues](https://github.com/dhanesh/manifold/issues) — Report bugs
