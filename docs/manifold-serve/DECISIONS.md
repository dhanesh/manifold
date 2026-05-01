# Design Decisions — `manifold serve`

Each decision below traces back to a constraint or required truth in
`.manifold/manifold-serve.{json,md}`.

## D1. Single-binary distribution with embedded assets

Every HTML/JS/CSS/font asset that the visualiser needs is embedded in the
CLI binary at build time, served from memory at runtime. No CDN fetches,
no file extraction.

> **Satisfies:** T1, RT-1.
> **Why:** the outcome explicitly forbids file generation, and the rest of
> the CLI is air-gapped today (no network calls). Embedded assets keep
> `manifold serve` consistent with that posture.

## D2. Default port `6353` (T9 "MFLD")

The default listen port is `6353`, derived by mapping the consonants of
"manifold" through the T9 keypad (M=6, F=3, L=5, D=3). It is verified
absent from the common-conflict set
`{3000, 3001, 4200, 5000, 5173, 8000, 8080, 8443, 9000}`. `--port`
overrides it; on collision the CLI fails fast with a kernel-suggested
free port.

> **Satisfies:** T3, O1, RT-11.
> **Reversibility:** TWO_WAY (changing the default in a future release is
> a one-line patch).

## D3. Svelte 5 + Vite + d3-sankey (revised from Option C)

Svelte 5 runes for the spine + UI; Vite for chunking and the service
worker; `d3-sankey` for the backward-reasoning flow.

> **Satisfies:** RT-6, RT-7, RT-8, RT-10. Bundle profile: critical-path
> ~22 KB gz, full precache 235 KB (down from 759 KB while Cytoscape was
> in the bundle).
> **Reversibility:** REVERSIBLE_WITH_COST.

### D3a. Force-directed graph dropped in favour of a vertical story spine (post-D3)

The original Option C shipped a Cytoscape.js force-directed graph as the
primary visualisation. After dogfooding against this repo's ~30
manifolds, the force layout was found to obscure rather than illuminate
the manifold's story:

- Equal-weight edges flatten the directional reasoning (Outcome ←
  Required Truths ← Constraints).
- Force layout places the binding constraint wherever the simulation
  converges, not where its narrative role demands.
- Reading the graph required learning the visual grammar before
  extracting any value, contradicting B2 (cross-audience legibility).

Cytoscape and `cytoscape-fcose` were removed; the visualiser now uses a
**vertical story spine** that reads top-to-bottom: outcome banner →
backward-reasoning Sankey → required-truths cards → tensions cards →
constraint matrix → full narrative. The Sankey (Constraints → RTs →
Outcome via `d3-sankey`) gives the relationships a visual home with
explicit *direction* of reasoning, while the cards expose status,
evidence and resolution prose at scannable density.

> **Satisfies:** B2 (cross-audience legibility), U1, U2, RT-6.
> **Trade-off:** lost interactive pan/zoom of the full constraint graph
> for any reader who wanted to "explore" the topology. Mitigated by the
> Sankey's click-to-highlight behaviour.
> **Reversibility:** REVERSIBLE_WITH_COST — the synthesis layer in
> `cli/lib/graph-synthesis.ts` is preserved, so a graph view could be
> reintroduced as a secondary lens without re-deriving the data model.

## D4. Two-tier `/api/manifolds` surface

`GET /api/manifolds` returns metadata only (feature, phase, outcome,
counts). `GET /api/manifolds/<feature>` returns full JSON + Markdown +
synthesised graph. The client lazy-fetches detail on selection.

> **Satisfies:** U4, T4, RT-12.
> **Why:** eagerly serving every manifold's full content on first paint
> would blow the lightweight budget several times over in this repo.

## D5. Service-worker cache namespace = CLI binary version

The CLI stamps `pkg.version` into `<meta name="manifold-version">` and
into the `manifold-version` response header. The service worker uses the
stamped version as its cache namespace key, so upgrading the binary
invalidates prior caches on next visit.

> **Satisfies:** O3, RT-9, TN2, TN7.

## D6. Sanitised Markdown via `unified` + `rehype-sanitize`

Markdown is rendered with GFM features enabled and raw HTML disallowed
(`allowDangerousHtml: false`). The sanitiser runs against an OWASP-derived
XSS corpus in CI. Mermaid is rendered via the existing `beautiful-mermaid`
dependency, not through raw HTML passthrough.

> **Satisfies:** S2, U2, RT-7, TN4.

## D7. Loopback-only by default

`--host` is accepted but the default bind host is `127.0.0.1`. Any
non-loopback host emits a prominent stderr warning before the server
starts.

> **Satisfies:** S1, TN-pre-mortem-3 (the LAN-exposure scenario).
> **Reversibility:** TWO_WAY.

## D8. Server-side graph synthesis when `constraint_graph` is empty

Legacy manifolds (v1/v2 — and there are several in this repository) lack
`constraint_graph.edges`. Rather than render them as empty graphs, the
server derives edges from existing relations (`tensions[].between`,
`anchors.required_truths[].maps_to`, `draft_required_truths[].seed_from`)
before serialising the response.

> **Satisfies:** T5, U1, RT-5, TN5.
