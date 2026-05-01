# `manifold serve`

A local web visualiser for the constraint manifolds in this project.

```bash
manifold serve                  # http://127.0.0.1:6353
manifold serve --port 7000      # override the default
```

The visualiser is served as a Progressive Web App with all assets embedded
in the CLI binary — no files are written to disk and no external CDN is
hit. After the first visit the service worker pre-caches every chunk, so
subsequent loads work fully offline.

## What you see

The right pane is a **vertical story spine** that reads top-to-bottom in the
same order as the manifold itself:

| Section | Contents |
|---------|----------|
| Sidebar | Every `<feature>.json + <feature>.md` pair under `.manifold/`, sorted newest-first by `json.created` (file mtime fallback). |
| Outcome banner | Feature name, phase, convergence status, binding-constraint badge, recommended option, full outcome statement. |
| Backward-reasoning Sankey | `Constraints → Required Truths → Outcome` rendered with `d3-sankey`. Width = number of dependency links; binding RT highlighted in gold; nodes coloured by verification status when `<feature>.verify.json` is present. Click a node to highlight its supporting/supported chain and scroll the narrative to the matching section. |
| Required Truths panel | Cards sorted with the binding constraint pinned first, then `NOT_SATISFIED → PARTIAL → SPECIFICATION_READY → SATISFIED`. Each card shows status pill, evidence verified/total, and `maps_to` chips. |
| Tensions panel | One card per tension with type, `between[]` constraints, a 280-character resolution excerpt parsed from the Markdown, TRIZ principles and propagation effects (TIGHTENED ↘ / LOOSENED ↗). |
| Constraint matrix | 5 category rows × 3 type columns (invariant / boundary / goal). Each cell holds chips coloured by verification status. Clicking a chip surfaces it in the Sankey + scrolls the narrative. |
| Narrative | Full sanitised Markdown rendering of the manifold story (GFM tables, fenced code, Mermaid). |

## Default port

`6353` — T9 keypad encoding of "MFLD" (the consonants of "manifold"). It is
not in the common-conflict set used by popular dev servers
(`3000, 3001, 4200, 5000, 5173, 8000, 8080, 8443, 9000`). On collision the
CLI fails fast and suggests a kernel-reported free port.

## Security posture

- Bind host defaults to `127.0.0.1`. Any non-loopback `--host` value emits a
  prominent stderr warning before the server starts.
- HTTP layer is read-only — only `GET` and `HEAD` are accepted; everything
  else returns `405 Method Not Allowed`.
- File reads are bounded to the embedded asset map and the in-memory list
  of manifolds enumerated at startup. There is no path-parameter route
  that opens an arbitrary path on disk.
- Markdown is rendered through `unified` + `remark-gfm` + `rehype-sanitize`
  with `allowDangerousHtml: false`. Embedded `<script>`, inline event
  handlers, and `javascript:` URIs are stripped. CI runs an OWASP-derived
  XSS payload corpus on every change.

## Building the embedded bundle

```bash
cd cli/web && bun install && bun run build       # Vite → cli/web/dist
bun scripts/build-web.ts                         # → cli/lib/embedded-assets.generated.ts
bun --cwd cli compile                            # bake the new assets into the binary
```

The generated module is checked in so the binary build does not require a
frontend build at compile time, but must be regenerated whenever the web
project changes. CI enforces this.

## Schema tolerance

The server accepts manifolds declaring `schema_version` 1, 2, or 3. When a
manifold's `constraint_graph.edges` is empty or absent (typical for v1/v2),
the server synthesises edges from `tensions[].between`,
`anchors.required_truths[].maps_to`, and `draft_required_truths[].seed_from`,
so legacy manifolds render as a populated graph rather than an empty one.
