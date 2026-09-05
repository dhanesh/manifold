<!--
Thanks for sending this. Two short sections and you're done — no checklist gauntlet.
If CI catches something, that's CI's job, not yours to pre-empt.
-->

## What changed

<!-- One or two sentences. If it closes an issue, say "Closes #123". -->

## Why

<!-- What was broken or missing. If the issue already explains it, "see #123" is enough. -->

---

<details>
<summary>Two things that will save you a CI round-trip</summary>

- **Edit `install/`, never `plugin/`.** `plugin/` is generated. If you touched
  `install/`, run `bun run build:all` and commit the result — the diff-guard
  workflow fails otherwise.
- **Conventional commit title** (`fix:`, `feat:`, `docs:`, `test:`, `chore:`)
  — releases are automated from it. `docs:`, `test:` and `chore:` cut no release.

Full detail: [CONTRIBUTING.md](../CONTRIBUTING.md)

</details>
