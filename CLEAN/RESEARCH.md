# RESEARCH — outside sources and tools

Researched 2026-10-12. Each entry: what we found → what it means for Anza.

## 1. Service workers in development (R1, R4)

- The usual fix for "localhost serves days-old files" is: **don't register the SW in dev**, and ship a one-time dev cleanup. Without the cleanup, machines that already have the worker stay broken. ([wb-starter #1108](https://github.com/CieloVistaSoftware/wb-starter/issues/1108), [FLEETii PR #109](https://github.com/knudsenjl/FLEETii-webapp/pull/109))
- `unregister()` does **not** delete caches. Also run `caches.keys()` → `caches.delete()`. Keep this cleanup gated to dev only: one project ran it on every production load by mistake. ([Data_science_dev #1871](https://github.com/BenjaminSRussell/Data_science_dev/issues/1871))
- `fetch(..., {cache: 'no-store'})` does **not** bypass a service worker.
- Kill switch: serve a no-op worker at the same URL. The server can tell a worker-script request by the `Service-Worker` request header. ([Chrome: Removing buggy service workers](https://developer.chrome.com/docs/workbox/remove-buggy-service-workers), [Rich Harris: things I wish I'd known about SWs](https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9))
- CacheFirst only for content-hashed assets. NetworkFirst or SWR for everything else. Bump the cache name on deploy.

→ Phase 1 steps 1–4.

## 2. HTTP caching for unhashed files (R3, R5)

- `max-age=31536000, immutable` is correct **only** for URLs that change when their content changes (hashed or versioned). HTML and unhashed files should be `no-cache` and revalidate with ETag or Last-Modified. ([web.dev: HTTP cache](https://web.dev/articles/http-cache), [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control), [Simon Hearne](https://simonhearne.com/2022/caching-header-best-practices/))
- A recent real failure that matches ours exactly: one-year immutable on fixed-name `.js` meant users got new HTML but old JS. ([effectcraft #174](https://github.com/storytold/effectcraft/issues/174))
- `sw.js` and `index.html` must stay `no-cache`. ([PersonalClaw #2933](https://github.com/PersonalClaw/PersonalClaw/issues/2933))
- `no-cache` only saves bandwidth if the server answers `304`. The dev server needs ETag/If-None-Match support, not just Last-Modified. ([AI-Activity PR #253](https://github.com/LouisMoretti/AI-Activity/pull/253))

→ Phase 1 steps 6–7, Phase 3 step 9.

## 3. Loading element CSS without extra fetches (P1–P4)

- **CSS module scripts** (`import s from './x.css' with { type: 'css' }`) would remove the runtime `fetch` + `CSSStyleSheet` step. They are supported in Chromium (93+), but **not yet shipped in Firefox or Safari** as of the latest sources: Firefox has it behind a pref, and it was proposed for Interop 2026. ([caniuse](https://caniuse.com/wf-css-modules), [MDN import attributes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with), [Mozilla bug 1720570](https://bugzilla.mozilla.org/show_bug.cgi?id=1720570), [Interop #1056](https://github.com/web-platform-tests/interop/issues/1056), [web.dev](https://web.dev/articles/css-module-scripts))
- Import attributes in general (`with`, JSON) work in all current engines.

→ **Don't depend on CSS module scripts yet.** Phase 3 step 8 inlines CSS, HTML and tags into the JS module **at build time** (works everywhere). Re-check CSS module support before 0.7; it could later replace the inlining step.

## 4. Finding dead code and unused deps (Sweep §4)

| Tool | Use | Notes |
|------|-----|-------|
| [knip](https://knip.dev/) | `library/`, `engines/ts`, `create/` | Unused files, exports and deps. Reports by default; `--fix` / `--allow-remove-files` are opt-in. Replaces depcheck and ts-prune (both archived 2025). |
| cargo-machete | `tools/`, `engines/rust` | Fast unused-crate check, fine for CI. Use `cargo-udeps` occasionally for exact answers. ([overview](https://repowise.dev/blog/comparisons/best-dead-code-detection-tools)) |
| `cargo clippy` | `tools/` | Dead code and general lints. |
| [lychee](https://github.com/lycheeverse/lychee) / [lychee-action](https://github.com/lycheeverse/lychee-action) | `docs/`, READMEs | Fast Rust link checker. `--include-fragments` for anchors, `.lycheeignore`, cache for CI. |

## 5. Versioning a polyglot monorepo (D9, H9)

- **release-please (manifest mode)** bumps `package.json`, `Cargo.toml` and `pyproject.toml` natively, keeps `.release-please-manifest.json` as the version source, and generates changelogs from conventional commits. The repo already uses conventional commits (`fix(sw): …`, `docs: …`). ([manifest-releaser docs](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md))
- **Changesets** is built for JS. Rust and Python need `package.json` shims plus sync scripts. ([polyglot write-up](https://luke.hsiao.dev/blog/changesets-polyglot-monorepo/))
- Release-please has a linked-versions option to keep all packages on one version. I haven't confirmed its exact config yet; check `docs/customizing.md` in the release-please repo when setting it up.

→ D-4: release-please. Phase 5.

## 6. Generated types (D6, D7)

`tsc --allowJs --declaration --emitDeclarationOnly` turns JSDoc into `.d.ts`. With a CI check that the generated output matches the committed types, the two can't drift again. This is standard TypeScript compiler behaviour; no extra tools needed.
