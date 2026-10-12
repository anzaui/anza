<!-- markdownlint-disable MD024 -->
# Changelog

All notable changes to the Anza project are documented here: the
`@anzaui/anza` library, `@anzaui/create-anza`, the `anza` CLI and the server
engines. They share one version number. Package changelogs
(`library/CHANGELOG.md`, `engines/*/CHANGELOG.md`) list the subset that
affects each package.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.6.0](https://github.com/anzaui/anza/compare/v0.5.1...v0.6.0) (2026-10-12)


### ⚠ BREAKING CHANGES

* **engines:** Setup::ed25519 takes only the two key paths; code that named SignMode::SessionBound, publish_meta, adapters::tower or the tower feature, or passed mode 'session', must drop it.

### Features

* **build:** bundle and minify CSS with Lightning CSS, link shared DSD styles ([7a6ae7e](https://github.com/anzaui/anza/commit/7a6ae7e8e0d1258b459d111d10239bd76338ed81))
* **build:** bundle production output into Rolldown chunks ([f46166f](https://github.com/anzaui/anza/commit/f46166f2ffe76fb816dd7c66385cbe417713219a))
* **build:** content-hash static assets and cache /assets/* immutably ([f770d67](https://github.com/anzaui/anza/commit/f770d67549cfc1d95b018967fb7db4779d42ffda))
* **build:** inline element CSS, templates and tags descriptors in production ([abf8cb8](https://github.com/anzaui/anza/commit/abf8cb8958124826f95aefc32a655f4407de3907))
* **build:** precompress text assets with brotli and gzip ([fec44ad](https://github.com/anzaui/anza/commit/fec44ad147415c4d17aa42abb89a54153566153e))
* **build:** preload each route's full module closure and emit _headers ([14ab16d](https://github.com/anzaui/anza/commit/14ab16df2cdba9c8bcd0f80538db21d6dc04c2ae))
* **build:** write type declarations beside dist, not into it ([b64dbac](https://github.com/anzaui/anza/commit/b64dbac3403e904e81946bb5c0d8a412d9e37f35))
* **docs:** make anza docs the single docs generator ([dd0d846](https://github.com/anzaui/anza/commit/dd0d846316fcb3b156e6219c26885ec0ccf6024d))


### Bug Fixes

* **api:** export router gate/ready/reset, security seal/unseal, storage quota ([08b11eb](https://github.com/anzaui/anza/commit/08b11eb1b750b50fe26818902a579df4087489c7))
* **api:** root entry re-exports shared names from one winner ([960db4e](https://github.com/anzaui/anza/commit/960db4e53c9d50b6197171c94f2b1abc9b7b3211))
* **build:** fail the build on any SSG, extract, copy or write error ([9ac02f7](https://github.com/anzaui/anza/commit/9ac02f760572cf50260ed68e6e792b2ee6f5b3f1))
* **build:** make build output deterministic ([b74bc89](https://github.com/anzaui/anza/commit/b74bc893304b0c75d86329b55ad27aa5d4b76380))
* **build:** treat duplicate routes and SSG output collisions as errors ([6fe0f5b](https://github.com/anzaui/anza/commit/6fe0f5b193a3dc57482a9260db568ad37955fed4))
* **build:** write every dist file atomically ([d7ad32e](https://github.com/anzaui/anza/commit/d7ad32e29fd8cdf2e2811362cfcbea4e7ee5c0a9))
* **cli:** lock the project so build and dev never share dist ([447fd7a](https://github.com/anzaui/anza/commit/447fd7a20f3b1ad6df861774da0e1b9e96994cb8))
* **cli:** take --version from Cargo.toml ([3cb4f99](https://github.com/anzaui/anza/commit/3cb4f994e4d4e03acf45b7fcbed38318c0eca9a5))
* **create:** scaffold registers the SW on real hosts only and caches safely ([3d5b42b](https://github.com/anzaui/anza/commit/3d5b42b7e6184c2167c48c4818a6b8e7b0dd9367))
* **dev:** inject the HMR client at serve time, never into build output ([7dcd3eb](https://github.com/anzaui/anza/commit/7dcd3eb811e6416f87db96003ede7a3ca3f616a9))
* **dev:** invalidate the dev cache on config changes and drop orphan outputs ([491e526](https://github.com/anzaui/anza/commit/491e526e4344cfb7b4296158f05678eeb6c63a09))
* **dev:** no-cache and strong ETags on every dev response ([94a17de](https://github.com/anzaui/anza/commit/94a17deed02ba775b5097e185fd639b01a41ddc1))
* **dev:** send reload on a lagged HMR stream, buffer 256 events ([e5ab622](https://github.com/anzaui/anza/commit/e5ab622b675a7ab3d5e585f1ce09328d42867601))
* **dev:** serve a self-unregistering no-op /sw.js ([4c1195a](https://github.com/anzaui/anza/commit/4c1195ab31eec73200800b4700f77b83c2cec50e))
* **docs:** write tags descriptors in anza docs --pages ([0e1df33](https://github.com/anzaui/anza/commit/0e1df33b0d9ab13a8f88ddb1bf81db7edc84210f))
* **engine-rust:** escape the route in the page fallback ([1ec14d0](https://github.com/anzaui/anza/commit/1ec14d03f91e76751ad0511e7e6c60dbf8e24c31))
* **engine-rust:** hex-encode template digests in the manifest ([d93d5f8](https://github.com/anzaui/anza/commit/d93d5f81d393cb72c3ed26661a4f0935d3eb6fde))
* **engine-rust:** reload templates when the watch feature sees a change ([cd15acc](https://github.com/anzaui/anza/commit/cd15accc52a244289a514b16ed1bc1ca62aff5d6))
* **engine-ts:** publish the compiled dist/ ([0e2cf18](https://github.com/anzaui/anza/commit/0e2cf1844de4d4c50542128cb99b18c83fcec3f1))
* **engines:** escape the route and contain template reads in ts and py ([d9f98eb](https://github.com/anzaui/anza/commit/d9f98eb896e06d14883be96ec3cdbf070c973527))
* **release:** ship the CLI binaries in @anzaui/anza and verify every npm tarball ([6448f6c](https://github.com/anzaui/anza/commit/6448f6c9ea39dba9637e99bb45fd3f3d578be33d))
* **ssg:** read templates and CSS from src through a pre-built cache ([4aeb0b7](https://github.com/anzaui/anza/commit/4aeb0b715a02506db71491c2879b39f52f71ca5b))
* **sw:** skip SW on local hosts, bypass event streams, most specific route wins ([16bf5a8](https://github.com/anzaui/anza/commit/16bf5a80a7c5ca4c3e11371d38d1e8b5e55584e6))
* **types:** match library types to the runtime exports ([76edb42](https://github.com/anzaui/anza/commit/76edb4204f5fc01c46ac6035c9348a2565ff1498))
* **ui:** run the cold-load pipeline on HTML hot-swap ([2f3f1f7](https://github.com/anzaui/anza/commit/2f3f1f77bc4ee2e48750215c1a18ccb4300ff1f6))
* **web:** no-cache unhashed files and serve SSG pages first ([ad27457](https://github.com/anzaui/anza/commit/ad27457b3ea7cfad5f5aee49707d51a6d2565fe6))


### Performance Improvements

* **build:** inline page tags descriptors so adopted SSG pages keep the mismatch check ([0dff54b](https://github.com/anzaui/anza/commit/0dff54b3dcd9273e15a0787dd5e95131e8473daa))
* **build:** merge adjacent head stylesheets into one hashed file ([9f614d7](https://github.com/anzaui/anza/commit/9f614d7aa2a1c6e375f5edd2f3a663669c9c606d))
* **build:** parallel graph walk and copy, single HTML entry parse ([79a51f0](https://github.com/anzaui/anza/commit/79a51f02c3339939875bea063426e8b27857f2ff))
* **build:** single-pass base-path rewriters ([dd41d4a](https://github.com/anzaui/anza/commit/dd41d4a17e8199af119595d56993c527fdf0869b))
* **bundle:** keep routes every page loads in the entry chunk ([5cdf8de](https://github.com/anzaui/anza/commit/5cdf8dee87b21c95f8b150c33db259982cfcfb39))
* **core:** throttle quota checks, coalesce store flushes, sort routes lazily ([60a2738](https://github.com/anzaui/anza/commit/60a2738638d2410ea5ce2bf0391c4abbba4d5896))
* **dev:** hot-copy CSS and templates before the rebuild ([163b6a6](https://github.com/anzaui/anza/commit/163b6a6cf841805dc2a129d6b2d8b771a683f4c0))
* **dev:** keep the route manifest in server state ([1c655bd](https://github.com/anzaui/anza/commit/1c655bd2963907d0bcab837431f799d30f518919))
* **sw:** respond first and cache via event.waitUntil ([c4e6934](https://github.com/anzaui/anza/commit/c4e69348835a6a5f04a78e9a574e947fa288a4e1))
* **ui:** fetch element style, template and tags in parallel ([ee0c2fb](https://github.com/anzaui/anza/commit/ee0c2fbcc460bdc40f0ce4ad6b23f65350755b24))
* **ui:** hydrate adopted DSD roots without refetching template, tags or linked CSS ([262fea4](https://github.com/anzaui/anza/commit/262fea404fa3ba5203a10f023388c5de462c83dc))
* **ui:** load element resources on first connect by default ([2761df8](https://github.com/anzaui/anza/commit/2761df87e53dc7b5669e649769023e6931e5a6db))
* **ui:** wire pre-rendered elements before fetching resources ([f1f0a68](https://github.com/anzaui/anza/commit/f1f0a68a92ef1cb17536051d0da362241da963e9))
* **web:** self-host the web fonts and preload the body face ([cdafec0](https://github.com/anzaui/anza/commit/cdafec0526f83e310c5c3e8401c92fbe9a253717))


### Code Refactoring

* **engines:** remove signing options that never did anything ([d5a4065](https://github.com/anzaui/anza/commit/d5a4065b685742b83cc658508d0a807c5a21b2d8))

## [Unreleased]

### Added

- **Production bundling.** `anza build` bundles with Rolldown into minified, content-hashed chunks (`core`, `elements`, per route group, on-demand) under `dist/assets/`, and bakes element CSS, templates and tags into their modules. Needs `rolldown` as a devDependency (scaffolded apps get it); without it, or with `--no-bundle`, the unbundled output is shipped with a warning.
- Build output for fast first loads: global CSS bundled and minified with Lightning CSS and merged into one file per page, shared DSD stylesheets linked instead of inlined in every page, full `modulepreload` lists, a generated `dist/_headers` (cache rules + `Link` preloads for 103 Early Hints), `/assets/*` cached immutably, and `.br`/`.gz` siblings. Docs pages on Fast 4G: about 290 requests and 1.1 s to ready → 12 requests and 0.46 s.
- `anza build --types <dir>`: type declarations are written beside `dist/` (default `types/`), never into it.
- `anza docs --pages` is the single docs generator, with the sidebar built from the docs tree.
- Dev server: live reload injected into every HTML response at serve time, a self-unregistering `/sw.js`, `no-cache` + ETag/304 on every response, and a forced reload when the reload stream falls behind. CSS and template edits hot-swap in about 30 ms (was about 200 ms).
- `npm run bench:load` (cold page-load benchmark with budgets, enforced in CI), `npm run doc:imports`, `npm run types:check`, `npm run versions:check`.

### Changed

- **Element resources load on first connect** (lazy by default). Pass `eager: true` to `element()`, `view()`, `part()` or `dock()` to fetch them at define time, as before.
- **`anza build` fails on errors.** Any SSG, extract, copy or write error, a missing or invalid `routes.json`, a duplicate route or two routes writing the same file now fails the build (exit 1) and lists every error. `anza dev` logs them and keeps serving.
- **The CLI crate is renamed `anza-cli`** (the command is still `anza`; the engine crate keeps the name `anza`). `anza create` now points to `npm create @anzaui/anza`. `anza --version` comes from `Cargo.toml`.
- `anza build` and `anza dev` lock the project, so they never write the same `dist/` at once.
- Faster runtime: element style, template and tags are fetched in parallel and pre-rendered elements mount before their files arrive; service worker strategies respond first and cache through `event.waitUntil`; quota checks are throttled and store flushes coalesced.
- Faster builds: parallel import-graph walk and copy, single-pass base-path rewriting (`web/` release build: 124 ms → 71 ms before compression).
- **Rust engine (breaking):** `Engine::manifest()` values are now the hex BLAKE3 digest of each template (every stored value changes); `engine::file::watch::listen` takes the engine's `CacheStore`.
- Python engine: the page tag for nested routes is `page-a-b` (was the invalid `page-a/b`).
- Releases: one version for every package, bumped by release-please and checked in CI.

### Removed

- **Engines (breaking):** signing options that never did anything: `SignMode::SessionBound` and the `publish_meta` field (Rust; `Setup::ed25519` now takes two arguments), the empty `adapters::tower` module and `tower` feature (Rust), and `mode: 'session'` / `publishMeta` (TypeScript) / `mode="session"` (Python).

### Fixed

- **Stale files after an edit ("needs a hard refresh").** The service worker is not registered on local hosts, and old workers and caches are removed there. Event streams and `/hmr` are never intercepted. The most specific SW route wins, so `/api/*` is no longer shadowed by `'*'`. Unhashed files are served `no-cache` in production; extensionless URLs serve the pre-rendered page first.
- Scaffolded apps (`npm create @anzaui/anza`) register the service worker on real hosts only and cache safely.
- HTML hot-swap runs the same pipeline as a cold load; the dev cache is invalidated when the import map, structure or base path change, and outputs of deleted files are removed.
- Build output is deterministic, written atomically, and SSG reads templates and CSS from `src`.
- Root exports: `state`, `sync`, `storage`, `events`, `view`, `cache` and `reset` were silently dropped from `@anzaui/anza` (name clashes between modules); each is now re-exported from one module.
- Missing exports added: `gate`, `ready`, `reset` (`./router`), `seal`, `unseal` (`./security`), `quota` (`./storage`).
- Types match the runtime: the root `index.d.ts` is a flat re-export, and `./defs`, `./sw`, `./elements/*` and `./bin/create` have types.
- Rust engine: the `watch` feature now reloads changed templates.
- Docs: every documented `@anzaui/anza` import resolves (checked in CI); engine and template docs no longer claim auto-escaping, `each`/`if` blocks or browser-side signature checks.

- **npm packages were published broken in 0.5.0:** `@anzaui/anza` had no `anza` CLI binary (`npx anza` failed) and `@anzaui/engine` had no compiled `dist/` (imports failed). The engine package now lists its `files`, and `tasks/publish.js` downloads the release binaries and refuses to publish any tarball that is missing a required file (see `NPM.md`).

### Security

- **Engines: reflected XSS in the page fallback.** The Rust and TypeScript engines wrote the request path into the "unknown route" HTML unescaped; it is now escaped.
- **Python engine: path traversal.** `../` in a request path could read `.html` files outside the template root; template reads must now resolve inside the root. The route is also sanitized in the page tag name and escaped in the shell `route` value.

---

## [0.5.1] — 2026-10-12

### Fixed

- **SSG deep links rendered a bare template on refresh** — `anza build` emits SSG routes in parallel, and every worker rewrote the shared `dist/routes.json`, corrupting it. Random routes failed after the CSR fragment was moved to `template.html` but before the SSG document was written, leaving the fragment at `dist/<route>/index.html`. `routes.json` is now updated once after emission. Adds a 300-route regression test.
- **Service worker** — guards against unsupported HTTP methods; CacheFirst no longer rejects on POST.

### Changed

- TypeScript engine renamed to `@anzaui/engine`; `@anzaui` packages publish with public access.
- Official SVG logo and favicons across web, docs and engines; legacy repository references replaced with `anzaui`.
- Docs: Server Templates (STUI) section and navigation, streamlined entry page, layout and README cleanups.
- Version sync: all packages at 0.5.1 (lockfiles were stale).

## [0.5.0] — 2026-08-27

### Added

- **Multi-Language STUI Template Engines** — native Server-Templated UI engines for Rust (`engines/rust`), TypeScript/JavaScript (`engines/ts`), and Python (`engines/py`) with unified cryptographic envelope protocols.
- **Zero-Dependency Core Runtimes** — TypeScript engine built entirely on native Web Standards (`globalThis.crypto.subtle`); Python engine built 100% on Python Standard Library primitives.
- **Open Declarative Shadow DOM (DSD)** — Mode A full-page server-side rendering emitting `<template shadowrootmode="open">` shells for instantaneous FCP/LCP paint and client custom element adoption without hydration overhead.
- **Cryptographic Envelopes** — Mode B partial component updates signed over canonical wire payloads (`ts:slot:html`) supporting asymmetric Ed25519 (for CDN/proxy TLS termination bypass), HMAC-SHA256, and HKDF session-bound stream keys.
- **Real-Time Streaming Protocol** — native Server-Sent Events (SSE) and WebSocket text frame encoders pushing live template fragment updates directly into client shadow roots.
- **Universal Framework Adapters**:
  - Rust: Axum, Actix-web, Tower Service layers.
  - TypeScript: Web Standards Fetch `Response`, Hono, Express.js, Fastify.
  - Python: ASGI, WSGI, FastAPI, Flask.
- **Comprehensive mdBook Documentation Suites** — engineering-grade documentation books with live search, sitemaps, and architecture references for Rust (`engines/rust/docs`) and TypeScript (`engines/ts/docs`).

### Changed

- **CLI & Tools Version Sync** — bumped `tools/Cargo.toml`, `library/package.json`, and `create/package.json` to v0.5.0.

### Tests

- Multi-engine test suite: 22 Python tests, 8 TypeScript tests, and 6 Rust tests with 100% pass rate.

---

## [0.4.11] — 2026-07-29

### Fixed

- **Docs custom domain base path** — `anza.aduki.org` serves the project site at the **domain root**, so `web/ssg.json` no longer sets `"base": "/anza"` and CI/Pages drop `ANZA_BASE_PATH`. Asset and nav URLs are `/styles/...`, `/app.js`, `/docs/...` again (not `/anza/...`).
- **Pages CNAME** — ship `web/CNAME` (`anza.aduki.org`) into the Actions artifact so the custom domain stays bound on deploy.
- **Stale SW after base clear** — docs Service Worker bumped to `shell-v3` / `api-v3` so returning visitors drop CacheFirst-pinned JS that still resolved under `/anza`.

### Changed

- **Deploy docs** — clarify `*.github.io/<repo>` needs a base path; a **project** custom domain must clear base. Origin/canonicals use `https://anza.aduki.org`. GitHub Pages deployment and package installation docs updated.

### Tests

- Router base: `resolveAssetUrl` with empty / unset `__ANZA_BASE__` leaves root-absolute asset paths unchanged.

---

## [0.4.10] — 2026-07-29

### Changed

- **Default soft-nav leaf-dock loaders** — omit `dock({ loading })` to get the built-in `.anza-loading` spinner on the deepest via dock; create scaffolds use `dock('main')` with zero loading config.
- **loading.css bootstrap** — scaffold `styles/index.css` links `styles/loading.css` on first load so dock loading chrome is available without a separate import.
- **Loading override ladder** — page → deepest dock that defines `loading` → `router.loading.configure()` → built-in spinner; `loading: false` disables for that subtree.

### Fixed

- **Keep loader through fetch** — soft-nav mounts preserve `.dock-loading` (`replaceKeepingLoading` / dock `swap`) until template/CSS fetch finishes and `anza:ready`; `waitForPageReady` resolves immediately when the page is already initialized.

### Tests

- Router loading: keep-loader-through-fetch / `replaceKeepingLoading` behavior.
- Router intercept: soft-nav loading lifecycle coverage aligned with leaf-dock defaults.

---

## [0.4.9] — 2026-07-29

### Fixed

- **Firefox SW registration** — `normalize()` in `sw/routes.js` no longer evaluates `instanceof URLPattern` when `URLPattern` is undefined (throws during SW module evaluation and aborts registration). Catch-all `*` / `/*` patterns always use the portable fallback matcher.
- **Firefox soft-nav / Navigation polyfill race** — router `setup()` and client bootstrap await the Navigation polyfill when `window.navigation` is missing, so click interception and `event.intercept()` attach instead of falling through to full page loads. `destroy()` bumps an epoch so a pending polyfill load cannot re-setup after teardown.
- **Shadow DOM soft-nav clicks** — Navigation polyfill click delegation walks `composedPath()` so anchors inside open/closed shadow trees (e.g. docs docks) are found despite retargeted `event.target`.

### Tests

- Router intercept: `setup()` loads Navigation polyfill when `window.navigation` is missing.
- Navigation polyfill: composedPath / shadow-root anchor resolution.
- SW routes: URLPattern-undefined and catch-all normalize behavior.

---

## [0.4.8] — 2026-07-29

### Fixed

- **Stale SW CacheFirst pins old JS** — docs / scaffold Service Worker bumped to `shell-v2` / `api-v2` and calls `skipWaiting()` on install so `pruneStale` drops poisoned `shell-v1` entries. Returning Pages visitors were still fetching `/styles/shared.css` (no `/anza`) from cached pre-0.4.7 `base.js` / `element.js` even after deploy.
- **preloadResources resolves deploy base** — style / template / `.tags.json` fetches always run through `resolveAssetUrl`, so root-absolute `/styles/...` cannot bypass `__ANZA_BASE__` even if a caller passes an unresolved URL.

---

## [0.4.7] — 2026-07-29

### Fixed

- **Soft-nav CSS on GitHub Pages** — `resolveAppUrl` / `resolveAssetUrl` no longer drop the deploy base for root-absolute paths (`new URL('/styles/...', origin + '/anza/')` previously resolved to `/styles/...`). Soft-nav now fetches `/anza/styles/shared.css` when `__ANZA_BASE__='/anza'`.
- **No client 404 strip-base retry** — removed the client retry that stripped `__ANZA_BASE__` on stylesheet/template 404s (unsafe on `*.github.io`); local `anza dev` still strips the base on the server.
- **Favicon under deploy base** — SSG head emits `/anza/favicon.ico`; connectivity probes use `withBase('/favicon.ico')`.
- **Service Worker under `/anza/`** — catch-all route uses `*`; URLPattern construction is guarded so SW script evaluation cannot throw on pattern init; `/api/*` is rewritten with the deploy base.

---

## [0.4.6] — 2026-07-29

### Added

- **Per-dock loading bootstrap** — `styles/loading.css` for dock loading chrome; scaffold wires `dock('main', { loading: { tag: 'ui-spinner' } })`; hard refresh / reload skips the loading overlay so SSG content stays visible.
- **Token CSS aliases** — scaffold-friendly spacing / typography / semantic light-dark variable aliases for loading and layout shells.

### Fixed

- **Soft-nav CSS under deploy base** — when a base-prefixed stylesheet / template URL 404s (common in local `anza dev` with Pages `__ANZA_BASE__`), retry without the base prefix; dev server strips base from asset requests so soft-nav styles resolve under `/anza`.
- **Loading style injection** — `ensureLoadingStyles` / `loading.ensureStyles` so fallback spinner CSS is available even when the shell did not link `loading.css`.

---

## [0.4.5] — 2026-07-29

### Added

- **Soft-nav loading UI** — leaf docks can show a loading indicator while page module / `template.html` / styles fetch; override ladder: page → dock (leaf→root) → `router.loading.configure` → built-in spinner; hard refresh / boot skips loading. Docs site uses `ui-spinner` on the content dock.
- **CSS `@import` graph walk** — build follows relative `@import` / `url(...)` chains so nested token and style files are copied into `dist`.

### Fixed

- **GitHub Pages base path** — subpath hosting for `/anza/` deploys (`base` in router + build/SSG), so asset and route URLs resolve under the Pages project path.
- **Tools crate rustc warnings** — clean up unused/dead-code warnings in the anza tools crate.

---

## [0.4.4] — 2026-07-29

### Added

- **Portable site-root asset URLs** — production `dist/` is the document root; import maps, routes, SW, and scaffolds emit `/app.js`-style paths with no `/dist` prefix.
- **Mode A SSG** — `anza build` and `anza dev` emit contentful HTML with open Declarative Shadow DOM (DSD) per public route (`dist/<route>/index.html`), including title/meta and route-scoped `modulepreload`. On fragment collision, CSR templates are preserved as `template.html` and soft-nav is rewritten to fetch them; `template.tags.json` is copied beside preserved templates for soft-nav tag derivation.
- **Client DSD adopt / hydrate** — custom elements adopt existing open shadow trees instead of wiping; soft-nav swaps the leaf only while parent docks stay mounted.
- **Mode B HTML contract** — normative contract in `docs/ssg/contract.md`, golden fixtures, contract check harness, and minimal Python / Go / Node example servers.
- **Hydration & SSG docs** — `docs/ui/hydration.md` plus web routes for hydration and the HTML contract; legacy `theme` → `anza-theme` localStorage migration.
- **Docs UI** — theme via `@anzaui/anza/theme`, fuller sidebar coverage, active-link fix, search removed; docs home canonical path is `/docs`.
- **Element library docs (Phases 1–5)** — inventory, category overviews, and full pages across primitives, forms, feedback, data, navigation, layout, and overlay patterns. See `plans/ELEMENTS.md`.
- **Overlay kit + tooltip escape** — Full docs for popover, tooltip, menu, drawer, sheet; platform `escapeOverflow` / `guard.escape` for `ui-tooltip`.
- **Mutations & events precision** — scoped `watch` buckets, `watch.children` / `watch.slot`, `on` / `events.delegate` options `attrs`, `not`, `key`; `observe.mutation.scoped`.
- **Framework globals registry** — `globals.attach|detach|count|list` and `ui.getAttachmentStats(shadowRoot)`.
- **GitHub Pages** — `.github/workflows/pages.yml` deploys `web/dist` on push to `main`; CI `build-docs` job verifies production build; docs for deploy and release in README and `docs/intro/build.md`.
- **Favicon** — optional `src/favicon.ico` copied to `dist/` at build time.

### Changed

- **`on` passive defaults** — aligned with `events.listen`; click / submit / key handlers can `preventDefault()` without `{ passive: false }`.
- **`on` matching** — uses `composedPath()` within the shadow root (same as `events.delegate`).
- **Empty `on` teardown** — last handler removal drops the shadow-root listener immediately.
- **Popover polyfill unmount MO** — prefers parent `childList` (no subtree) over `document.body` subtree while open.
- **Docs site origin** — `web/ssg.json` and CI use `https://anzaui.github.io/anza`.

### Fixed

- **Service worker response bodies** — cache strategies clone responses on read/write so `cache.put` no longer locks bodies returned to fetch handlers.
- **Soft-nav + CacheFirst** — navigations, CSR `template.html` / `.tags.json`, and `/favicon.ico` bypass the SW to avoid body-lock races.
- **Release workflow** — use CHANGELOG section notes when present without also passing `--generate-notes`.

### Planned

- Integration with external bundlers/compilers — **deferred** ([#2](https://github.com/anzaui/anza/issues/2)); not in active scope

---

## [0.4.3] — 2026-06-16

### Changed

- **Docks** — dock registry keys are separate from custom element tags; container mounting waits for asynchronous definitions.
- **Landing page** — responsive layout and button fixes, code block presentation.

---

## [0.4.2] — 2026-06-16

### Added

- **Multiple stylesheets** per element with flexible path resolution and asset preloading.
- **Typed route params and query** — contract-aware accessors passed to the element lifecycle.
- TypeScript declarations for platform feature detection.
- **Styling and Tokens Documentation**: Created a dedicated `docs/styles/` section documenting adopted stylesheet caching, multiple style loading, and design token customization.

### Changed

- Soft navigation no longer shows the browser loading spinner; route diagnostics improved and server-side route validation normalizes trailing slashes.

- **Design Tokens Simplification**: Removed unused stylesheets (`radius.css`, `shadow.css`, `zindex.css`, and `components.css`). Simplified primitive colors, motion, typography, and spacing scales.
- **Houdini Registered Colors**: Kept registrations only for core theme custom properties (`--color-surface-page`, `--color-content-primary`, `--color-interactive`, etc.) to drive seamless light/dark swaps.
- **Robust Style Fallbacks**: Added default values to all system styles (`base.css`, `transitions.css`) to allow token names/custom properties to be overridden, deleted, or mapped to user-decided variable names.
- **Customizable Swap Transitions**: Extended view transition variables with `--transition-push`, `--transition-pop`, and `--transition-offset` (sliding offset), and defined default fade-and-slide keyframe animations.

---

## [0.4.1] — 2026-06-14

### Fixed

- **URL Detection Bug**: Fixed a critical bug in both the JS runtime (`utils.js`, `element.js`) and the Rust compiler (`parse.rs`) where inline CSS strings starting with `/*` or `<!--` were mistakenly identified as file URLs. This bug was bypassing inline CSS injection when providing CSS string arrays.

---

## [0.4.0] — 2026-06-14

### Added

- Natively support arrays of multiple CSS imports in component definitions (`template: { html, css: ['./a.css', './b.css'] }`) across both the JavaScript library runtime and the Rust compiler.

### Changed

- Replaced CSS Custom Highlight API implementation with PrismJS for `view-code` syntax highlighting.

---

## [0.3.9] — 2026-06-13

### Changed

- Updated core component rendering to correctly process nested syntax logic and perform full syntax highlighting.

---

## [0.3.8] — 2026-06-13

### Fixed

- `anza build` re-copies a file when its output is missing from `dist/`, even if the build cache says it is unchanged. Deleting `dist/` no longer leaves an incomplete build.

---

## [0.3.7] — 2026-06-13

### Changed

- Updated README and package descriptions to clarify the "instant" build step.

---

## [0.3.6] — 2026-06-13

### Fixed

- Resolved NPM publish collision for the watcher hotfix.

---

## [0.3.5] — 2026-06-13

### Changed

- Prevent native browser tab loading spinner during client-side navigation.
- Removed unnecessary console logs in `boot.js`, `orchestrator.js`, and `element.js`.

---

## [0.3.4] — 2026-06-13

### Removed

- Removed the `web3/` test app from the repository. No package changes: the `v0.3.4` tag was cut without a version bump, so the published packages stayed at 0.3.3.

---

## [0.3.3] — 2026-06-13

### Changed

- Removed `<main>` to `<dock-main>` compiler auto-alignment. Apps now use `<dock-main id="main">` natively in HTML templates.
- Update `boot.js` router error messages to correctly refer to `<dock-main id="main">`.

---

## [0.3.2] — 2026-06-13

### Fixed

- Update scaffolding templates to use `<dock-main>` and ES module Service Worker registration (`{ type: 'module' }`)
- Fix CLI watcher to properly resolve Linux `inotify` absolute paths for CSS and JS Hot Module Reloading (HMR)
- Improve HMR client script with SSE auto-reconnect back-off

---

## [0.3.1] — 2026-06-13

### Changed

- Soften library README tone — remove sarcastic framework comparisons
- Update dock() example to use simplified API (no parent parameter)

---

## [0.3.0] — 2026-06-13

### Fixed

- Sync `tools/Cargo.toml` version with npm package version (0.2.1 → 0.3.0)

---

## [0.2.8] — 2026-06-09

### Fixed

- Remove empty `importmap.json` from scaffold — HTML now points to `/dist/importmap.json`
- Category barrel files for generated doc pages (`docs/*/index.js`)
- Docs root route (`/docs`) uses `entry/` folder like other pages

---

## [0.2.7] — 2026-06-09

### Fixed

- Scaffold structure: landing page moved to `src/pages/entry/` instead of `src/pages/index/`
- Node.js and Rust create commands generate consistent `src/pages/index.js` barrel file
- Docs conversion task (`tasks/docs.js`) that turns markdown into docs pages

---

## [0.2.6] — 2026-06-09

### Fixed

- `bin/anza/index.js` wrapper now uses `realpathSync` to correctly detect CLI entry through npm bin symlinks
- `npm run dev` and `npx anza` now work from installed packages

---

## [0.2.5] — 2026-06-09

### Fixed

- Add `./package.json` export to `@anzaui/anza` so `npm create` resolver works
- Fix `@anzaui/create-anza` fallback resolution for local development

---

## [0.2.4] — 2026-06-09

### Added

- **`@anzaui/create-anza`** package for `npm create @anzaui/anza <name>`
- `./bin/create` export added to `@anzaui/anza` for programmatic scaffold access

---

## [0.2.3] — 2026-06-09

### Fixed

- CI release workflow artifact naming to prevent binary overwrites
- Windows runner shell compatibility (`shell: bash`)

---

## [0.2.2] — 2026-06-09

### Added

- CI/CD workflows for GitHub Actions (build, typecheck, verify scaffolding, cross-platform release)
- Comprehensive documentation for all modules (animations, api, events, platform, router, security, state, storage, sw, ui, workers)
- `library/bin/` CLI wrappers for Node.js distribution

---

## [0.2.1] — 2026-06-09

### Added

#### Service Worker Toolkit — `@anzaui/anza/sw`

- **New subpath export** `@anzaui/anza/sw` — caching strategies, route interception, background sync, and push notifications
- **Seven caching strategies**: CacheFirst, NetworkFirst, StaleRevalidate, CacheThenNetwork, NetworkOnly, CacheOnly, OfflineFallback
- **URLPattern routing** inside the Service Worker via `router()` and `Router`
- **Install/activate helpers**: `precache()`, `pruneStale()`, `claim()`, `enableNavPreload()`
- **TTL expiry**: `pruneExpired()`, `setupAutoPrune()` with `x-expires-at` headers
- **Background sync**: `replayQueue()`, `requeueFailed()` with dead-letter queue
- **Request serialization**: `serializeRequest()`, `deserializeRequest()` for IndexedDB storage
- **Push notifications**: `subscribe()`, `notify()` with VAPID support
- **Scaffolded `src/sw.js`** generated by both `anza create` and `anza-create`

#### Theme Switching — `@anzaui/anza/theme`

- **New subpath export** `@anzaui/anza/theme`
- **Auto-init on import** — reads saved preference from `localStorage` or respects `prefers-color-scheme`
- **Attaches to `window.theme`** via `Object.defineProperty` (non-enumerable, non-configurable)
- **API**: `theme.get()`, `theme.set()`, `theme.toggle()` — all update the same global instance
- **No manual init required** — importing `@anzaui/anza/ui` triggers it automatically

#### View Transition Tokens — `tokens/semantic/transitions.css`

- **New semantic token layer** connecting the CSS View Transitions API to the design token system
- **Tokens**: `--transition-bg`, `--transition-duration`, `--transition-easing`, `--transition-push`, `--transition-pop`, `--transition-replace`
- **Router `transitions.run()`** injects a token-aware stylesheet on first use
- **Dock `swap()`** reads directional easing from tokens (`--transition-push` vs `--transition-pop`) for physically different forward/back feel
- **High-contrast theme morphing** — `contrast.css` now declares `transition:` for smooth token interpolation

#### Documentation

- **Comprehensive `docs/index.md`** — master docs entry with all modules listed by usefulness
- **`docs/sw/`** — complete SW documentation: `index.md`, `start.md`, `strategies.md`, `routes.md`, `sync.md`, `api.md`
- **Updated `docs/intro/`** — SW toolkit in feature list, build output includes `dist/sw.js`
- **View Transition token docs** added to `docs/ui/transitions.md`, `docs/router/transitions.md`, `docs/animations/tokens.md`

#### Tooling

- **`tools/src/build/graph.rs` split** into focused modules:
  - `cache.rs` — incremental build cache (`.anzacache.json`)
  - `parse.rs` — ESM AST parsing with swc
  - `entries.rs` — entry point discovery from HTML and `src/sw.js`
  - `resolve.rs` — import map and filesystem resolution
  - `html.rs` — HTML injection (importmap link, HMR script)
  - `sw.rs` — Service Worker bare-specifier rewriting
- **Auto-discovery of `src/sw.js`** as a build entry point
- **Bare specifier rewriting in `dist/sw.js`** — `@anzaui/anza/sw` → `./sw/index.js` (SW does not support import maps)

### Changed

- **Cache file renamed** from `.anza-build-cache.json` to `.anzacache.json`
- **Scaffolded `src/app.js`** now imports and auto-registers the Service Worker
- **Scaffolded `src/sw.js`** included in both Node.js and Rust `create` commands

### Fixed

- High-contrast theme (`contrast.css`) now animates token changes instead of snapping instantly

---

## [0.2.0] — 2026-06-07

### Added

#### Compiler — `anza`

- **Dependency Graph Walking**: Automated dependency resolution of ESM imports/exports.
- **Tree-Shaking**: Outputs only referenced files to `dist/`, excluding unused code.
- **Automatic Inline Importmaps**: Optimal `<script type="importmap">` generated and injected inline into HTML entry points.
- **Relative Component Styles & Templates**: Parses relative template and stylesheet file paths referenced in `ui.element` relative to `import.meta.url`.
- **Concurrent File Watcher**: Recompiles output on file modifications.
- **SSE HMR Dev Server**: CSS hot-swapping and HTML/JS auto-reloading via Server-Sent Events (SSE).
- **Nested /dist Routing**: Added router nested service mapping in Axum dev server for development path parity.

#### Structure

- **Monorepo Split**: Reorganized files into `/library` (NPM package), `/sample` (demo application), and `/tools` (Rust compiler).

#### Sample

- **Cyberpunk Blog SPA**: Features reactive store, category filters, instant search, likes count persistence, details page with lightweight custom markdown renderer, post publishing, and post deletion.

---

## [0.1.0] — 2026-05-27

### Added

#### Package

- Published as `@anzaui/anza` — pure browser ESM, zero build step
- Scoped subpath exports for every core module (`/api`, `/state`, `/storage`, etc.)
- `"type": "module"` — fully native ESM, no CommonJS wrapper
- `npm test` via `@web/test-runner` (real Chromium, no jsdom)
- `npm run serve` via `@web/dev-server` on port 8080

#### Core — `@anzaui/anza/api`

- `execute()` — fetch wrapper with AbortSignal, timeout, and `scheduler.postTask` integration
- `PlatformError` — unified error shape across all network failures
- `retry()` — exponential backoff with jitter and AbortSignal support
- `stream()` — async generator streaming over NDJSON responses
- `createNDJSONTransform()` — reusable `TransformStream` for NDJSON parsing
- `upload()` — multipart file upload with progress events
- `pipeline` — composable request/response middleware pipeline
- Cache strategies: `cache-first`, `network-first`, `stale-while-revalidate`

#### Core — `@anzaui/anza/state`

- `ReactiveStore` — Proxy-based reactive state with microtask-batched notifications
- `setActiveSubscriber` / `getActiveSubscriber` — dependency tracking context
- `derived()` — auto-tracked computed values that re-evaluate on dependency changes
- `sync()` — BroadcastChannel cross-tab state synchronization

#### Core — `@anzaui/anza/events`

- `EventBus` — typed pub/sub with wildcard patterns and AbortSignal cleanup
- `events` — singleton global event bus instance

#### Core — `@anzaui/anza/router`

- `register()` / `match()` — URL pattern registration and matching
- `clear()` / `getRoutes()` — route registry management
- `addGuard()` — async navigation guard hooks
- `setNotFound()` — 404 handler
- `setup()` — bootstraps native Navigation API interception
- Full programmatic history API: `navigate`, `replace`, `back`, `forward`, `go`, `current`, `entries`
- `renderOutlet()` — declarative route outlet rendering

#### Core — `@anzaui/anza/storage`

- `Database` — Promise-wrapped IndexedDB with sequential migrations
- `LRUCache` / `WeakLRUCache` — in-memory LRU caches with optional TTL
- `storage` — unified tiered facade: memory → IndexedDB → Cache API → OPFS
- `quota` — storage estimate and persistence request helpers

#### Core — `@anzaui/anza/offline`

- `queue` — IndexedDB-backed offline operation queue with FIFO dequeue
- `check()` / `subscribe()` — connectivity detection and change subscriptions

#### Core — `@anzaui/anza/animations`

- `animate()` — WAAPI wrapper with AbortSignal and easing controls
- `stagger()` — staggered multi-element animation groups with `finished` promise

#### Core — `@anzaui/anza/workers`

- `lock()` — Web Locks API facade with timeout and AbortSignal support
- `WorkerPool` — managed pool of Web Workers with task queue and concurrency limits

#### Core — `@anzaui/anza/security`

- `sanitize()` — XSS-safe HTML sanitizer using `DOMParser`
- `uuid()` — `crypto.randomUUID()` wrapper
- `hash()` — SHA-256/384/512 via Web Crypto API
- `generateKey()` / `deriveKey()` — AES-GCM key generation and PBKDF2 derivation
- `encrypt()` / `decrypt()` — AES-GCM symmetric encryption/decryption

#### Core — `@anzaui/anza/platform`

- `supports` — feature detection registry for 30+ browser APIs
- `reset()` — cache reset utility (used in tests)

#### Core — `@anzaui/anza/ui`

- `BaseElement` — Shadow DOM base class for all custom elements
- Design token cascade: primitive → semantic → component token layers

#### Tests

- 26 test suites, 70 assertions — all running in real Chromium via `@web/test-runner`
- Browser-native import maps injected per test run — no Node.js module resolution

#### Blog Demo

- `blog/` — sample SPA demonstrating state, storage, offline queue, and animations
- Import map mirrors the published `@anzaui/anza/*` subpath exports exactly

[Unreleased]: https://github.com/anzaui/anza/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/anzaui/anza/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/anzaui/anza/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/anzaui/anza/releases/tag/v0.1.0
