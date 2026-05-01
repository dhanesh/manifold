# manifold serve — Playwright suite

Browser-level tests for the visualiser PWA. These live in their own
directory because they need a real browser and a running CLI; the rest of
the suite runs under Bun's native test runner.

## One-time setup

```bash
bun install                     # at the repo root — pulls @playwright/test
bunx playwright install chrome  # uses your system Chrome (no extra download)
cd cli/web && bun install && bun run build && cd ../..
bun scripts/build-web.ts        # bake assets into the binary
```

## Running

```bash
bunx playwright test --config tests/manifold-serve/e2e/playwright.config.ts
```

The config boots `manifold serve` on port 6358 as `webServer`. To target an
already-running instance:

```bash
MANIFOLD_E2E_BASE_URL=http://127.0.0.1:6353 bunx playwright test \
  --config tests/manifold-serve/e2e/playwright.config.ts
```

## What's covered

| Spec | Constraints |
|------|-------------|
| `visualiser.spec.ts` | RT-6, RT-7, RT-8, U1, U2, U3, U4 |
| `sw-cache-flip.spec.ts` | O3, RT-9, TN2 |

CI hint: gate the Playwright job behind a `e2e/` label or run only on
release branches if browser test cost is a concern.
