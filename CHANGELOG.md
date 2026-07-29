<!-- markdownlint-disable MD024 -->
# Changelog

All notable changes to `@adukiorg/anza` will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
- **Docs UI** — theme via `@adukiorg/anza/theme`, fuller sidebar coverage, active-link fix, search removed; docs home canonical path is `/docs`.
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
- **Docs site origin** — `web/ssg.json` and CI use `https://aduki-org.github.io/anza`.

### Fixed

- **Service worker response bodies** — cache strategies clone responses on read/write so `cache.put` no longer locks bodies returned to fetch handlers.
- **Soft-nav + CacheFirst** — navigations, CSR `template.html` / `.tags.json`, and `/favicon.ico` bypass the SW to avoid body-lock races.
- **Release workflow** — use CHANGELOG section notes when present without also passing `--generate-notes`.

### Planned

- Integration with external bundlers/compilers — **deferred** ([#2](https://github.com/aduki-org/anza/issues/2)); not in active scope

---

## [0.4.2] — 2026-06-15

### Added

- **Styling and Tokens Documentation**: Created a dedicated `docs/styles/` section documenting adopted stylesheet caching, multiple style loading, and design token customization.

### Changed

- **Design Tokens Simplification**: Removed unused stylesheets (`radius.css`, `shadow.css`, `zindex.css`, and `components.css`). Simplified primitive colors, motion, typography, and spacing scales.
- **Houdini Registered Colors**: Kept registrations only for core theme custom properties (`--color-surface-page`, `--color-content-primary`, `--color-interactive`, etc.) to drive seamless light/dark swaps.
- **Robust Style Fallbacks**: Added default values to all system styles (`base.css`, `transitions.css`) to allow token names/custom properties to be overridden, deleted, or mapped to user-decided variable names.
- **Customizable Swap Transitions**: Extended view transition variables with `--transition-push`, `--transition-pop`, and `--transition-offset` (sliding offset), and defined default fade-and-slide keyframe animations.

---

## [0.4.2] — 2026-06-14


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
- Docs conversion task (`tasks/docs.js`) for markdown-to-anza-page generation

---

## [0.2.6] — 2026-06-09

### Fixed

- `bin/anza/index.js` wrapper now uses `realpathSync` to correctly detect CLI entry through npm bin symlinks
- `npm run dev` and `npx anza` now work from installed packages

---

## [0.2.5] — 2026-06-09

### Fixed

- Add `./package.json` export to `@adukiorg/anza` so `npm create` resolver works
- Fix `@adukiorg/create-anza` fallback resolution for local development

---

## [0.2.4] — 2026-06-09

### Added

- **`@adukiorg/create-anza`** package for `npm create @adukiorg/anza <name>`
- `./bin/create` export added to `@adukiorg/anza` for programmatic scaffold access

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

#### Service Worker Toolkit — `@adukiorg/anza/sw`

- **New subpath export** `@adukiorg/anza/sw` — caching strategies, route interception, background sync, and push notifications
- **Seven caching strategies**: CacheFirst, NetworkFirst, StaleRevalidate, CacheThenNetwork, NetworkOnly, CacheOnly, OfflineFallback
- **URLPattern routing** inside the Service Worker via `router()` and `Router`
- **Install/activate helpers**: `precache()`, `pruneStale()`, `claim()`, `enableNavPreload()`
- **TTL expiry**: `pruneExpired()`, `setupAutoPrune()` with `x-expires-at` headers
- **Background sync**: `replayQueue()`, `requeueFailed()` with dead-letter queue
- **Request serialization**: `serializeRequest()`, `deserializeRequest()` for IndexedDB storage
- **Push notifications**: `subscribe()`, `notify()` with VAPID support
- **Scaffolded `src/sw.js`** generated by both `anza create` and `anza-create`

#### Theme Switching — `@adukiorg/anza/theme`

- **New subpath export** `@adukiorg/anza/theme`
- **Auto-init on import** — reads saved preference from `localStorage` or respects `prefers-color-scheme`
- **Attaches to `window.theme`** via `Object.defineProperty` (non-enumerable, non-configurable)
- **API**: `theme.get()`, `theme.set()`, `theme.toggle()` — all update the same global instance
- **No manual init required** — importing `@adukiorg/anza/ui` triggers it automatically

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
- **Bare specifier rewriting in `dist/sw.js`** — `@adukiorg/anza/sw` → `./sw/index.js` (SW does not support import maps)

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

- Published as `@adukiorg/anza` — pure browser ESM, zero build step
- Scoped subpath exports for every core module (`/api`, `/state`, `/storage`, etc.)
- `"type": "module"` — fully native ESM, no CommonJS wrapper
- `npm test` via `@web/test-runner` (real Chromium, no jsdom)
- `npm run serve` via `@web/dev-server` on port 8080

#### Core — `@adukiorg/anza/api`

- `execute()` — fetch wrapper with AbortSignal, timeout, and `scheduler.postTask` integration
- `PlatformError` — unified error shape across all network failures
- `retry()` — exponential backoff with jitter and AbortSignal support
- `stream()` — async generator streaming over NDJSON responses
- `createNDJSONTransform()` — reusable `TransformStream` for NDJSON parsing
- `upload()` — multipart file upload with progress events
- `pipeline` — composable request/response middleware pipeline
- Cache strategies: `cache-first`, `network-first`, `stale-while-revalidate`

#### Core — `@adukiorg/anza/state`

- `ReactiveStore` — Proxy-based reactive state with microtask-batched notifications
- `setActiveSubscriber` / `getActiveSubscriber` — dependency tracking context
- `derived()` — auto-tracked computed values that re-evaluate on dependency changes
- `sync()` — BroadcastChannel cross-tab state synchronization

#### Core — `@adukiorg/anza/events`

- `EventBus` — typed pub/sub with wildcard patterns and AbortSignal cleanup
- `events` — singleton global event bus instance

#### Core — `@adukiorg/anza/router`

- `register()` / `match()` — URL pattern registration and matching
- `clear()` / `getRoutes()` — route registry management
- `addGuard()` — async navigation guard hooks
- `setNotFound()` — 404 handler
- `setup()` — bootstraps native Navigation API interception
- Full programmatic history API: `navigate`, `replace`, `back`, `forward`, `go`, `current`, `entries`
- `renderOutlet()` — declarative route outlet rendering

#### Core — `@adukiorg/anza/storage`

- `Database` — Promise-wrapped IndexedDB with sequential migrations
- `LRUCache` / `WeakLRUCache` — in-memory LRU caches with optional TTL
- `storage` — unified tiered facade: memory → IndexedDB → Cache API → OPFS
- `quota` — storage estimate and persistence request helpers

#### Core — `@adukiorg/anza/offline`

- `queue` — IndexedDB-backed offline operation queue with FIFO dequeue
- `check()` / `subscribe()` — connectivity detection and change subscriptions

#### Core — `@adukiorg/anza/animations`

- `animate()` — WAAPI wrapper with AbortSignal and easing controls
- `stagger()` — staggered multi-element animation groups with `finished` promise

#### Core — `@adukiorg/anza/workers`

- `lock()` — Web Locks API facade with timeout and AbortSignal support
- `WorkerPool` — managed pool of Web Workers with task queue and concurrency limits

#### Core — `@adukiorg/anza/security`

- `sanitize()` — XSS-safe HTML sanitizer using `DOMParser`
- `uuid()` — `crypto.randomUUID()` wrapper
- `hash()` — SHA-256/384/512 via Web Crypto API
- `generateKey()` / `deriveKey()` — AES-GCM key generation and PBKDF2 derivation
- `encrypt()` / `decrypt()` — AES-GCM symmetric encryption/decryption

#### Core — `@adukiorg/anza/platform`

- `supports` — feature detection registry for 30+ browser APIs
- `reset()` — cache reset utility (used in tests)

#### Core — `@adukiorg/anza/ui`

- `BaseElement` — Shadow DOM base class for all custom elements
- Design token cascade: primitive → semantic → component token layers

#### Tests

- 26 test suites, 70 assertions — all running in real Chromium via `@web/test-runner`
- Browser-native import maps injected per test run — no Node.js module resolution

#### Blog Demo

- `blog/` — sample SPA demonstrating state, storage, offline queue, and animations
- Import map mirrors the published `@adukiorg/anza/*` subpath exports exactly

[Unreleased]: https://github.com/aduki-org/anza/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/aduki-org/anza/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/aduki-org/anza/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aduki-org/anza/releases/tag/v0.1.0
