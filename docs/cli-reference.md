# CLI Reference

<!-- Satisfies: RT-2 (CLI Reference), T3 (CLI Completeness), O3 (Single Source of Truth) -->

The `manifold` CLI provides instant operations (<100ms) without AI round-trips. Use it for status checks, validation, CI/CD integration, and visualization.

## Global Options

```
manifold [options] <command>

  -v, --version      Output version number
  --no-color         Disable colored output
  --force-color      Force colored output even when not a TTY
  -h, --help         Display help
```

## Commands

### `manifold status [feature]`

Show manifold state, constraints, and suggested next action.

```bash
manifold status                          # All features
manifold status payment-retry            # Single feature
manifold status payment-retry --json     # Machine-readable
manifold status payment-retry --history  # Include iteration log
manifold status payment-retry --graph    # ASCII constraint network
manifold status payment-retry --mermaid  # Mermaid constraint network
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--history` | boolean | false | Show full iteration history |
| `--graph` | boolean | false | Show constraint network as ASCII |
| `--mermaid` | boolean | false | Output constraint network as Mermaid syntax |

**Exit codes:** `0` success, `1` error

---

### `manifold validate [feature]`

Validate manifold schema. Supports v1, v2, and v3 schemas, both YAML and JSON+MD formats.

```bash
manifold validate                                 # All features
manifold validate payment-retry                   # Single feature
manifold validate payment-retry --conflicts       # Semantic conflict detection
manifold validate --cross-feature                 # Cross-feature conflicts
manifold validate payment-retry --metrics         # Error pattern analysis
manifold validate payment-retry --all             # Show all errors (no truncation)
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--strict` | boolean | false | Enable strict validation (extra warnings) |
| `--all` | boolean | false | Show all errors (default truncates at 20) |
| `--conflicts` | boolean | false | Run semantic conflict detection |
| `--cross-feature` | boolean | false | Detect conflicts across all features |
| `--metrics` | boolean | false | Show validation metrics summary |

**Exit codes:** `0` valid, `1` error, `2` validation failure

**Example output:**
```
Validating: payment-retry
  Format: JSON+Markdown
  Schema: v3
  Linked: 12/12 constraints, 3/3 tensions, 5/5 required truths
  Result: ✓ Valid
```

---

### `manifold init <feature>`

Create a new manifold with optional template.

```bash
manifold init user-auth                                    # Basic init
manifold init user-auth -o "Secure login with 2FA"         # With outcome
manifold init user-auth --template=auth                    # From template
manifold init checkout --template=pm/feature-launch        # PM template
manifold init user-auth --force                            # Overwrite existing
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-o, --outcome` | string | "TBD" | Set the outcome statement |
| `-f, --force` | boolean | false | Overwrite existing manifold |
| `-t, --template` | string | none | Use a constraint template |
| `--json` | boolean | false | Output as JSON |

**Templates:** `auth`, `crud`, `payment`, `api`, `pm/feature-launch`, `pm/experiment`, `pm/deprecation`, and [10 more PM templates](../install/templates/README.md).

**Exit codes:** `0` success, `1` error

---

### `manifold verify [feature]`

Verify that generated artifacts exist and constraints are covered.

```bash
manifold verify payment-retry                              # Basic verify
manifold verify payment-retry --artifacts                  # Check artifact files exist
manifold verify payment-retry --verify-evidence            # Check evidence (v3)
manifold verify payment-retry --verify-evidence --run-tests # Execute tests too
manifold verify payment-retry --strict                     # Require 100% coverage
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--artifacts` | boolean | false | Verify generated artifact files exist |
| `--strict` | boolean | false | Require all artifacts and 100% coverage |
| `--verify-evidence` | boolean | false | Verify evidence for required truths (v3) |
| `--run-tests` | boolean | false | Execute test evidence (requires `--verify-evidence`) |

**Exit codes:** `0` pass, `1` error, `2` verification failure

See [Evidence System](evidence-system.md) for details on evidence types and verification.

---

### `manifold graph [feature]`

Output the constraint network in multiple visualization formats.

```bash
manifold graph payment-retry                  # JSON (default)
manifold graph payment-retry --ascii          # ASCII art
manifold graph payment-retry --mermaid        # Mermaid syntax
manifold graph payment-retry --dot            # GraphViz DOT format
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | true | Output as JSON |
| `--ascii` | boolean | false | Output as ASCII visualization |
| `--mermaid` | boolean | false | Output as Mermaid syntax |
| `--dot` | boolean | false | Output as GraphViz DOT format |

**Exit codes:** `0` success, `1` error

**Use cases:**
- Paste `--mermaid` output into GitHub markdown for rendered diagrams
- Pipe `--dot` output to `dot -Tpng` for image generation
- Use `--ascii` for quick terminal visualization

---

### `manifold solve [feature]`

Generate a parallel execution plan from the constraint network, including backward reasoning.

```bash
manifold solve payment-retry                            # Execution plan
manifold solve payment-retry --backward                 # Backward reasoning
manifold solve payment-retry --backward --target=B1     # From specific constraint
manifold solve payment-retry --mermaid                  # As Mermaid diagram
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | true | Output as JSON |
| `--ascii` | boolean | false | Output as ASCII visualization |
| `--mermaid` | boolean | false | Output as Mermaid syntax |
| `--dot` | boolean | false | Output as GraphViz DOT format |
| `--backward` | boolean | false | Reason backward from outcome |
| `--target` | string | "outcome" | Target node for backward reasoning |

**Exit codes:** `0` success, `1` error

---

### `manifold show [feature]`

Display a combined view of JSON structure + Markdown content. Lists all features with format detection when no feature specified.

```bash
manifold show                                           # List all features
manifold show payment-retry                             # Combined view
manifold show payment-retry --structure                 # JSON only
manifold show payment-retry --content                   # Markdown only
manifold show payment-retry --validate                  # Include link validation
manifold show payment-retry --map                       # ASCII relationship map
manifold show payment-retry --mermaid                   # Mermaid relationship map
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--structure` | boolean | false | Show only JSON structure |
| `--content` | boolean | false | Show only Markdown content |
| `--validate` | boolean | false | Include linking validation results |
| `--map` | boolean | false | Show constraint relationship map (ASCII) |
| `--mermaid` | boolean | false | Output relationship map as Mermaid syntax |

**Exit codes:** `0` success, `1` error, `2` linking validation failure

**Feature listing example:**
```
Features:
  📄 payment-retry (json-md)
  📄 user-auth (json-md)
  📝 legacy-feature (yaml)
```

---

### `manifold migrate [feature]`

Convert YAML manifolds to JSON+Markdown hybrid format.

```bash
manifold migrate payment-retry                # Single feature
manifold migrate --all                        # All YAML manifolds
manifold migrate payment-retry --dry-run      # Preview without changes
manifold migrate payment-retry --no-backup    # Don't keep .yaml.backup
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--dry-run` | boolean | false | Preview migration without writing files |
| `--backup` | boolean | true | Keep original YAML as `.backup` |
| `--all` | boolean | false | Migrate all YAML manifolds at once |

**Exit codes:** `0` success, `1` error, `2` migration failure

---

### `manifold completion [shell]`

Generate shell completion scripts for tab-completion of commands, features, and templates.

```bash
# Generate and install completions
manifold completion bash > ~/.bash_completion.d/manifold
manifold completion zsh > ~/.zsh/completions/_manifold
manifold completion fish > ~/.config/fish/completions/manifold.fish

# Source immediately (bash)
source <(manifold completion bash)
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `shell` | string | "bash" | Shell type: `bash`, `zsh`, or `fish` |

**Completions include:** command names, feature names (from `.manifold/`), template names, and flag names.

**Exit codes:** `0` success, `1` error

---

## Exit Code Summary

| Code | Meaning | Commands |
|------|---------|----------|
| `0` | Success | All commands |
| `1` | Error (missing files, permissions, etc.) | All commands |
| `2` | Validation/verification failure | `validate`, `verify`, `migrate`, `show --validate` |

## When to Use CLI vs AI Commands

| Use Case | Tool | Why |
|----------|------|-----|
| Quick status check | `manifold status` | Instant, no AI needed |
| CI/CD pipeline | `manifold validate --json` | Deterministic, exit codes |
| Constraint discovery | `/manifold:m1-constrain` | Requires AI reasoning |
| Tension analysis | `/manifold:m2-tension` | Requires AI reasoning |
| Code generation | `/manifold:m4-generate` | Requires AI reasoning |
| Schema migration | `manifold migrate` | Deterministic transformation |
| Visualization | `manifold graph --mermaid` | Instant, no AI needed |

## See Also

- [Quickstart](quickstart.md) — Get started in 15 minutes
- [Evidence System](evidence-system.md) — Evidence types and verification
- [Troubleshooting](troubleshooting.md) — Common errors and fixes
