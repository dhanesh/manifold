# manifold-serve

## Outcome

Provide a `manifold serve` CLI command that launches a lightweight, expressive
web interface for visualising the manifold files in the current project
repository.

The interface must:

- Render a great visual representation of the relationships encoded in each
  manifold's JSON (constraints, tensions, anchors/required truths,
  constraint graph nodes/edges, convergence) using appropriate
  visualisation libraries.
- Tell the narrative story captured in each manifold's Markdown file
  (outcome, rationale, constraint statements) alongside the structural view,
  so readers see both the structure and the prose together.
- Be served as a Progressive Web App with all assets embedded in the CLI
  binary — no files written to disk, no external CDN fetches required for
  core functionality.
- Accept an optional `--port <port_number>` flag on `manifold serve`. The
  default port must not collide with commonly used application ports and
  should be derived from the word "manifold" (e.g. via T9 keypad mapping or
  another mnemonic encoding) so it is memorable.

---

## Constraints

### Business

#### B1: One-Command Visualisation

A user inside a project that already has Manifold installed runs `manifold serve` and gets a working visualiser without any additional setup, dependency install, or asset extraction.

> **Rationale:** Manifold's competitive value over hand-authored docs is *low-friction insight into constraint state*. If readers have to install Node, fetch CDNs, or run a build, they won't bother — and the manifolds become write-only artifacts.

#### B2: Cross-Audience Legibility

The visualiser is designed for a mixed audience — engineers reading structure, PMs reading narrative, leads reading both. Constraint relationships and outcomes must be legible to a non-engineer skimming the page.

> **Rationale:** Manifolds are stakeholder-facing once a feature is in flight; a tool that only engineers can read defeats the framework's coordination purpose.

---

### Technical

#### T1: All Assets Embedded

Every HTML, CSS, JavaScript, font, and image asset required for the visualiser to function (including offline) is embedded inside the CLI binary at build time. No runtime CDN fetches, no asset extraction to disk, no postinstall download steps.

> **Rationale:** Outcome explicitly forbids file generation. Embedded assets also keep `manifold serve` working in air-gapped environments and behind corporate proxies, matching the existing CLI's "no network calls" posture.

#### T2: Read-Only Server

The HTTP server exposes only safe-method handlers (GET / HEAD). It never writes to the filesystem, never accepts request bodies that mutate state, and never invokes shell commands derived from request input.

> **Rationale:** A local visualiser that can be tricked into editing manifolds is a code-execution vector via XSS or CSRF. Read-only is the simplest invariant that closes that class of bugs.

#### T3: Default Port Derived From "manifold", Overridable

The default listen port is derived from the word "manifold" via a mnemonic encoding (T9 keypad mapping is the leading candidate: `MFLD → 6353` or `MANI → 6264`) and is verified absent from the common-conflict set `{3000, 3001, 4200, 5000, 5173, 8000, 8080, 8443, 9000}`. The CLI accepts `--port <port_number>` to override, validated as an integer in `[1024, 65535]`.

> **Rationale:** Memorable defaults reduce cognitive load (`localhost:6353` is easier than `localhost:53472`). Avoiding the conflict set keeps `manifold serve` from clashing with a project's own dev server during development.

#### T4: Lightweight Performance

Initial page payload (HTML + critical JS + critical CSS, gzipped) is ≤ 500 KB. On a localhost connection, p50 time-to-interactive is ≤ 800 ms and p99 ≤ 2 s for a manifold with up to 50 constraints + 50 graph edges.

> **Rationale:** "Lightweight" in the outcome is a hard requirement, not a preference. Heavy SPA frameworks with multi-megabyte bundles defeat the binary-embed strategy and slow startup.

#### T5: Multi-Schema Tolerance

The parser accepts manifold files declaring `schema_version` 1, 2, or 3. Fields introduced in later versions (e.g. `constraint_graph`, `iterations`, `convergence`, `evidence[]`) are optional when reading and rendered as empty / not-applicable when absent — never cause a render failure.

> **Rationale:** The repository already contains manifolds spanning all three schema versions. A visualiser that only renders v3 would silently exclude legacy work, which is the opposite of "browse manifold files in the project repository".

---

### User Experience

#### U1: Constraint Graph Visualisation

For each manifold, the UI renders an interactive graph where:
- nodes represent constraints, tensions, and required truths;
- edges represent the JSON-encoded relations: `constraint_graph.edges.dependencies`, `.conflicts`, `.satisfies`, plus tension `affects[]` and anchor `derived_from[]` links.
A reader can pan, zoom, and select a node to highlight its connections.

> **Rationale:** "Great visual representation of JSON relations" in the outcome. A flat list of constraints is what `manifold show` already does — `serve` must add the relational layer.

#### U2: Narrative Alongside Structure

The Markdown file for the active manifold is rendered next to (or interleaved with) the graph: outcome at the top, constraint statements + rationale visible while their corresponding nodes are selected.

> **Rationale:** The outcome explicitly asks the UI to "tell the story" the Markdown captures. Graph-only views lose the *why* behind each node.

#### U3: Progressive Web App, Offline-Capable

The application ships a web manifest and a service worker that pre-caches the full embedded asset bundle on first load. After that first load, refreshing or revisiting the URL works with the dev machine offline (e.g. on a flight). The app is installable from a Chromium-based browser.

> **Rationale:** Outcome explicitly says "users browse a Progressive Web App". PWA-ness also gives the cache-busting story for binary upgrades (see O3).

#### U4: Multi-Manifold Index

When `.manifold/` contains multiple feature manifolds (the typical state of this repo), the UI surfaces an index/sidebar listing every `<feature>.json + <feature>.md` pair, with the current phase shown alongside each entry, and lets the reader switch between them client-side.

> **Rationale:** The outcome says "manifold files" (plural). A serve command that only opens one feature at a time forces the user back to the CLI between feature reads, defeating the browse experience.

---

### Security

#### S1: Loopback-Only by Default

The HTTP listener binds to `127.0.0.1` by default. If a future `--host` flag is exposed, binding to any non-loopback interface emits a prominent stderr warning that the visualiser exposes internal feature plans to the network.

> **Rationale:** Manifolds frequently contain unannounced product strategy and security thresholds. A `--host 0.0.0.0` accident on a coffee-shop network would publish them to every device on the LAN.

#### S2: Sanitised Markdown Rendering

Manifold Markdown is rendered with HTML embedded in the source either stripped or sandboxed; `<script>`, inline event handlers, and `javascript:` URIs never execute. CommonMark + GFM features are supported; raw HTML passthrough is not.

> **Rationale:** Manifold prose is authored content. A teammate (or an attacker who can land a PR) could embed `<script>` in a constraint rationale; rendering it would let that script read the loopback origin and exfiltrate other manifolds.

#### S3: No Path Traversal

The HTTP layer reads exclusively from (a) the embedded asset bundle and (b) the in-memory list of manifolds parsed at startup. There is no path-parameter route that opens an arbitrary file on disk.

> **Rationale:** Closes the standard local-server escape: `GET /file?path=/etc/passwd`. Combined with S1 and T2 this makes the server a sealed read-only surface.

---

### Operational

#### O1: Port-In-Use Fail-Fast

If the chosen port is already bound, the CLI exits non-zero with a single-line error naming the port and suggesting `--port <other>`. It does not silently auto-increment, and it does not retry.

> **Rationale:** Silent auto-increment makes "where's my visualiser?" a hunt. Manifold's existing CLI uses Unix exit codes; `serve` must match.

#### O2: Graceful Shutdown

`SIGINT` / `SIGTERM` close the listener and exit 0 within 1 second. In-flight requests complete or are cancelled cleanly — no zombie processes or socket-in-TIME_WAIT messages on the next launch.

> **Rationale:** Developers Ctrl+C this command constantly. A laggy or noisy shutdown is the kind of paper cut that makes them pin a stale tab open instead of restarting.

#### O3: Service-Worker Cache Versioning (pre-mortem source)

The service worker cache key includes the CLI binary version. Upgrading the `manifold` binary invalidates the previous cache on next visit; users never see UI from an older binary version.

> **Rationale:** Pre-mortem: "the PWA cache holds stale assets after `manifold` is upgraded, users see an old UI". Without explicit cache busting, a fix shipped in a new binary is invisible to anyone who already loaded the visualiser once.

---

## Tensions

### TN1: Embedded Richness vs Lightweight Initial Payload

**Between:** T1 (all assets embedded), T4 (≤ 500 KB gz, p99 < 2s), U1 (interactive graph), U3 (PWA offline)
**Type:** trade_off · **TRIZ:** P1 Segmentation, P15 Dynamization · **Status:** resolved

A graph engine plus a Markdown renderer plus a PWA shell will not fit in 500 KB gzipped without compromise. But T1 forbids CDN fetches and U3 requires offline operation, so we cannot drop functionality.

> **Resolution:** (P1 Segmentation + P15 Dynamization) Split the bundle. The critical path (HTML, app shell, manifold index) ships in ≤ 500 KB gzipped. The graph engine, Mermaid renderer, and per-manifold detail are lazy-loaded JS chunks served from the same embedded asset map. The service worker pre-caches every chunk on first install, so subsequent loads — including offline — work end-to-end without further network access.

> **Propagation:** T4 LOOSENED (critical-path budget is achievable once heavy chunks are deferred). T1 TIGHTENED (build step must enumerate every chunk; no chunk may be CDN-resolved at runtime). U1 TIGHTENED (graph view appears after a small lazy-load delay on first visit, before the SW pre-cache completes).

### TN2: Sealed Embedded Bundle vs Cache Invalidation on Upgrade

**Between:** T1 (all embedded), O3 (cache invalidates on binary upgrade), U3 (PWA offline)
**Type:** trade_off · **TRIZ:** P15 Dynamization, P3 Local quality · **Status:** resolved

If every byte is embedded statically and the service worker aggressively pre-caches everything (so U3 holds), how do we ever invalidate after a binary upgrade?

> **Resolution:** (P15 Dynamization at the seam) The asset bundle is static, but the *served document* is not. The CLI binary stamps its own `pkg.version` into served HTML as `<meta name="manifold-version">` and into a `Cache-Control` / `ETag` header. The service worker uses that string as its cache namespace key. New binary version → new namespace → previous cache invalidated on next visit, all without an outbound network call.

> **Propagation:** T1 TIGHTENED (the served HTML template is parameterised, not literally static — but parameter is build-time-known and embedded). O3 LOOSENED (resolution gives O3 a concrete, testable mechanism rather than 'TBD').

### TN3: Memorable Default Port vs Inevitable Local Conflicts

**Between:** T3 (memorable default port), O1 (fail-fast on conflict)
**Type:** resource_tension · **TRIZ:** P11 Beforehand cushioning, P25 Self-service · **Status:** resolved

A single memorable default cannot be globally collision-free; eventually a developer's dev server will own port 6353.

> **Resolution:** (Accept + P11 Beforehand cushioning) Keep the memorable default. When the chosen port is bound, the CLI exits non-zero, prints a single-line conflict message naming the port, *and includes a kernel-suggested free port discovered via an ephemeral bind* in the suggestion, e.g.: `port 6353 in use — try \`manifold serve --port 6354\``. On success, the URL `http://127.0.0.1:<port>` is printed to stdout. No silent auto-increment.

> **Propagation:** O1 TIGHTENED (failure path probes for a free port to suggest). T3 LOOSENED (memorable default no longer needs to be globally collision-free).

### TN4: Sanitised Markdown vs Narrative Richness

**Between:** S2 (sanitised rendering), U2 (narrative legibility alongside graph)
**Type:** trade_off · **TRIZ:** P1 Segmentation, P24 Intermediary · **Status:** resolved

Manifold prose benefits from rich rendering — tables, fenced code blocks, embedded diagrams — but raw HTML passthrough opens an XSS path through authored content.

> **Resolution:** (P1 Segmentation by feature, P24 Intermediary renderer) Allowlist-based rendering. GFM features (tables, fenced code, task lists, autolinks) render through a sanitising parser. Fenced ```` ```mermaid ```` blocks render via a dedicated Mermaid component (`beautiful-mermaid` is already a dependency) — *not* by injecting raw HTML. Embedded `<script>`, inline event handlers, and `javascript:` URIs are stripped before render, with an XSS-payload regression test corpus (OWASP cheat sheet) in CI.

> **Propagation:** S2 SAFE. U2 LOOSENED (Mermaid + GFM expand expressivity within the safe set). T4 TIGHTENED (Mermaid runtime adds bundle weight) — mitigated by deferring Mermaid into a lazy chunk via TN1.

### TN5: Schema Tolerance Forces Graph Synthesis

**Between:** T5 (multi-schema tolerance v1/v2/v3), U1 (constraint graph visualisation)
**Type:** hidden_dependency · **TRIZ:** No strong match — direct analysis · **Status:** resolved

v1 / v2 manifolds in this repository (and there are several) lack `constraint_graph.edges`. A renderer bound directly to that JSON path would draw an empty graph for legacy manifolds, contradicting U1.

> **Resolution:** (synthesis layer) When `constraint_graph.edges` is empty or absent, the renderer derives an implicit graph from existing JSON: tension `between[]` becomes conflict edges, anchor `derived_from[]` (and v3 `required_truths[].seed_from[]`) becomes satisfies edges, and category membership becomes a clustering hint. The synthesis runs once at parse time on the server, so the client renderer always receives a populated graph regardless of source schema version.

> **Propagation:** U1 TIGHTENED (renderer pipeline gains a synthesis layer in addition to direct binding). T5 SAFE (tolerance preserved; legacy manifolds become viewable rather than empty).

### TN6: Eager Multi-Manifold Index vs Initial Payload Budget

**Between:** U4 (multi-manifold index), T4 (lightweight)
**Type:** trade_off · **TRIZ:** P1 Segmentation, P17 Another dimension · **Status:** resolved

This repo has ~30 manifolds. Eagerly serving every manifold's full JSON + Markdown on first load would blow the payload budget several times over.

> **Resolution:** (P1 Segmentation by URL, P17 separate index/detail dimensions) Two endpoints. `GET /api/manifolds` returns *metadata only* — feature name, phase, outcome line, constraint counts. `GET /api/manifolds/<feature>` returns the full JSON + Markdown lazily on selection. The index payload scales linearly with manifold count and stays under the lightweight budget for ≤ 100 manifolds; detail fetches are SW-cached after the first read.

> **Propagation:** T4 SAFE. U4 TIGHTENED (switching manifolds incurs a one-shot fetch; mitigated by SW caching).

### TN7: Cache Versioning Requires Build-Time Binary Version

**Between:** O3 (SW cache versioned with binary version), T1 (all embedded)
**Type:** hidden_dependency · **TRIZ:** No principle — direct dependency · **Status:** resolved

O3 presupposes the running CLI process knows its own version *and* can surface that to the embedded service worker. This isn't trivially given just by "embed all assets".

> **Resolution:** (use existing scaffolding) `cli/index.ts` already imports `pkg.version`. Wire that value into the HTTP handler so it's injected into the served HTML (`<meta name="manifold-version">`) and into response headers. The service worker registers with `?v=<version>` and uses the value as its cache namespace key. No new build-time work beyond what the existing CLI already does for `--version`.

> **Propagation:** T1 SAFE (version injection is fully in-binary; no external lookup). O3 SAFE (cache invalidation gains a concrete, testable mechanism).

---

## Required Truths

> **Binding constraint:** RT-1. Every client-side RT (RT-6 through RT-10) presupposes that assets ship inside the binary; m2 already flagged T1 as the blocker for both O3 and U1. Until the build-and-embed pipeline exists, no other client work can be exercised end-to-end.

### RT-1: Embedded Asset Bundle Lives Inside the CLI Binary

A build step compiles the web frontend (HTML, CSS, JS chunks, fonts, manifest, service worker) into an in-memory asset map that the CLI binary serves directly. No file is written to disk at runtime; no chunk is fetched from a CDN.

**Maps to:** T1, T4, B1
**Gap:** No web frontend project exists yet (`cli/web/` is absent), and no Bun build step bundles its output into the CLI binary.

### RT-2: `manifold serve` Subcommand Is Registered

A new `cli/commands/serve.ts` exposes a `serve` command on the existing Commander program (`cli/index.ts`) with `--port <number>` (and optional future `--host <addr>`) flags, returning Unix exit codes consistent with the rest of the CLI.

**Maps to:** B1, O2
**Gap:** No `serve.ts` file or `registerServeCommand` import in `cli/index.ts`.

### RT-3: Loopback HTTP Listener Serves Embedded Assets and JSON API

The `serve` command starts an HTTP listener bound to `127.0.0.1:<port>` that responds to safe-method requests only (GET/HEAD), serves embedded assets by exact path lookup, exposes the two-tier `/api/manifolds` surface, and exits cleanly on `SIGINT`/`SIGTERM` within 1 second.

**Maps to:** T2, S1, S3, B1
**Gap:** No HTTP listener; Bun's native `Bun.serve` is the natural fit but is not yet wired in.

### RT-4: Manifold Reader Normalises Across Schema Versions v1/v2/v3

The server uses the existing `cli/lib/parser.ts` + `cli/lib/markdown-parser.ts` + `cli/lib/manifold-linker.ts` pipeline to load every `.manifold/<feature>.{json,md}` pair, tolerating absence of v3-only fields when `schema_version` is 1 or 2.

**Maps to:** T5, U4
**Gap (PARTIAL):** Parser pipeline exists, but no integration test covers a v1 / v2 / v3 mix being loaded simultaneously through a single API call.

### RT-5: Graph Synthesis Layer Derives Edges When `constraint_graph` Is Empty

When the loaded manifold's `constraint_graph.edges` is empty or absent, a synthesis pass derives nodes and edges from existing JSON: tension `between[]` → conflict edges, anchor `derived_from[]` and `required_truths[*].seed_from[]` → satisfies edges, category membership → node clustering hints. The client receives a populated graph regardless of source schema.

**Maps to:** T5, U1
**Gap:** No `cli/lib/graph-synthesis.ts` (or equivalent) exists.

### RT-6: Interactive Constraint Graph Renderer

The client renders nodes (constraints, tensions, required truths) and multi-typed edges (dependencies / conflicts / satisfies) using a graph library that supports panning, zooming, and selection-driven highlighting. Library candidate: Cytoscape.js (battle-tested, smaller bundle than vis-network, predictable layout engine).

**Maps to:** U1, T4
**Gap:** No frontend exists. SPECIFICATION_READY because TN1 + TN5 fully define the rendering pipeline.

### RT-7: Sanitised Markdown Renderer with GFM and Mermaid

The client converts manifold Markdown to safe HTML using a sanitising parser (e.g. `unified` + `remark-gfm` + `rehype-sanitize`). Fenced ```` ```mermaid ```` blocks render through the existing `beautiful-mermaid` dependency. Embedded raw HTML, `<script>`, inline event handlers, and `javascript:` URIs are stripped before render. CI runs an OWASP-derived XSS payload corpus.

**Maps to:** S2, U2, T4
**Gap:** No frontend renderer wired. SPECIFICATION_READY because TN4 fully defines the allowlist.

### RT-8: PWA Shell — Manifest, Service Worker, Pre-Cache

A web app manifest declares the visualiser installable; a service worker pre-caches every embedded chunk on first install so subsequent loads work fully offline; the manifest passes Lighthouse PWA criteria.

**Maps to:** U3, T1
**Gap:** No `cli/web/static/manifest.webmanifest` or `sw.js`. SPECIFICATION_READY.

### RT-9: Service-Worker Cache Namespace Is Versioned by CLI Binary Version

The CLI stamps `pkg.version` into served HTML via `<meta name="manifold-version">` and into a `Manifold-Version` response header; the SW reads that string and uses it as its cache namespace key, so upgrading the binary invalidates prior caches on next visit.

**Maps to:** O3, T1
**Gap:** No SW, no version-stamping logic. SPECIFICATION_READY (TN2 + TN7 fully define the mechanism).

### RT-10: Bundle Is Split Into a ≤ 500 KB Critical Chunk + Lazy Chunks

Vite (or equivalent) configuration splits the build into a critical chunk (HTML + app shell + manifold index, ≤ 500 KB gzipped) and lazy chunks (graph engine, Mermaid, per-manifold detail). All chunks are enumerated into the embedded asset map at build time. The SW pre-caches every chunk on first install.

**Maps to:** T4, T1
**Gap:** No frontend build config. SPECIFICATION_READY (TN1 fully defines the split).

### RT-11: Default Port + `--port` Flag + Collision Fail-Fast With Suggestion

A canonical default port is chosen at compile time (proposed: **6353** = T9 keypad encoding of "MFLD") and verified absent from the common-conflict set. The `--port <number>` flag accepts integers in `[1024, 65535]`. On `EADDRINUSE`, the CLI exits non-zero with a single-line error including a kernel-suggested free port discovered via an ephemeral bind. On success, the URL `http://127.0.0.1:<port>` is printed to stdout.

**Maps to:** T3, O1
**Gap:** Not implemented. SPECIFICATION_READY (TN3 fully defines the behaviour).

### RT-12: Two-Tier `/api/manifolds` Surface

`GET /api/manifolds` returns metadata only — feature, phase, outcome line, constraint counts. `GET /api/manifolds/<feature>` returns full JSON + Markdown lazily on selection. The index payload stays under the lightweight budget for ≤ 100 manifolds; detail responses are SW-cached after first read.

**Maps to:** U4, T4
**Gap:** No HTTP route handlers. SPECIFICATION_READY (TN6 fully defines the contract).

---

## Solution Space

### Option A: Vanilla TypeScript + Cytoscape.js + esbuild

- **Reversibility:** TWO_WAY (no framework lock-in)
- **Satisfies:** RT-1, RT-2, RT-3, RT-4, RT-5, RT-6, RT-8, RT-9, RT-10, RT-11, RT-12 (11/12)
- **Gaps:** RT-7 — markdown sanitiser would be hand-rolled without a Svelte/React component layer to lean on
- **Critical bundle estimate:** ~150 KB gzipped
- Smallest possible critical bundle; no framework runtime cost. Best fit if narrative-rendering complexity is low. Risk: hand-rolled MD sanitiser is a security-sensitive area to maintain without a library-shaped hand to hold.

### Option B: Svelte 5 + vis-network + Vite

- **Reversibility:** REVERSIBLE_WITH_COST (Svelte 5 → other framework requires component rewrites)
- **Satisfies:** RT-1, RT-2, RT-3, RT-4, RT-5, RT-6, RT-7, RT-8, RT-9, RT-11, RT-12 (11/12)
- **Gaps:** RT-10 — vis-network's bundle weight makes the 500 KB critical-chunk target hard without aggressive code-splitting beyond its native shape
- **Critical bundle estimate:** ~250 KB gzipped (achievable but tight)
- Excellent dev velocity given the project's existing Svelte 5 best-practice skills and physics-based layouts that look great out of the box. Risk: bundle creep over time.

### Option C: Svelte 5 + d3-sankey + Vite ← **Recommended**

- **Reversibility:** REVERSIBLE_WITH_COST
- **Satisfies:** all 12 RTs
- **Gaps:** none
- **Critical bundle estimate:** ~200 KB gzipped
- Hybrid that takes the best of A and B: Svelte 5 runes for the narrative spine + UI shell (compact runtime, matches the project's existing svelte5-best-practice skill), **d3-sankey** for backward-reasoning flow (Constraints → Required Truths → Outcome — drastically smaller than the originally-considered Cytoscape force layout at ~2.9 KB gz lazy chunk vs ~176 KB), Vite for chunking + service-worker generation. Originally recorded with Cytoscape.js for an interactive force-directed graph; switched to d3-sankey during the post-launch redesign documented in `docs/manifold-serve/DECISIONS.md` D3a, which found that an emergence-ordered story spine + a directional Sankey communicates the manifold's narrative more legibly than a force layout did.

**Recommendation: Option C.** All seven tensions from m2 are CONFIRMED under this option (see `tension_validation` in JSON). It closes RT-7 (MD sanitiser via `rehype-sanitize`) without sacrificing bundle headroom, and it leans on tools the project's contributors already have skills for.
