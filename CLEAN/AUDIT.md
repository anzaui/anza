# AUDIT — findings (2026-10-12)

Severity: **C** critical · **H** high · **M** medium · **L** low.
Status: `[ ]` open · `[~]` partly done · `[x]` closed.

Partly done: R1 (client done, the dev-server no-op `/sw.js` is left), R5 (interim headers, final once names are hashed), P1 (lazy loading at runtime, build-time inlining is left), P12 (element fetch count 138 → 0, the page-load benchmark is left).

## R — Reload / "needs a hard refresh"

The main cause: the service worker runs in dev and caches every path with
CacheFirst, and production sends `immutable` for files whose names never change.

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| [~] R1 | C | SW is registered on every host, including localhost. `'*'` → `CacheFirst('shell-v4')` with a constant cache name, so after an edit the old JS/CSS is served forever. | `web/src/app.js:18`, `web/src/sw.js:24-25`, `library/src/sw/strategies.js:40-64` | Don't register on localhost or in dev, and ship a one-time dev unregister plus cache wipe. CacheFirst only for hashed assets. Unhashed JS/CSS use NetworkFirst or StaleRevalidate. |
| [ ] R2 | C | Pages served in dev have **no HMR client**. `ssg::emit` overwrites the HTML that `inject_assets` injected into, and `build_head` never adds the client. Checked: `curl /` returns 0 `EventSource`. | `tools/src/build/html.rs:140-234`, `tools/src/extract/runner.rs:62`, `tools/src/build/ssg.rs:424-550`, `tools/src/server/runner.rs:282-298` | Inject the HMR script **at serve time** for every HTML response in dev. Remove it from build output. |
| [ ] R3 | H | Dev responses have no `Cache-Control` and no ETag, so the browser serves modules from heuristic cache. | `tools/src/server/runner.rs:76-86, 415` | Add a dev-wide layer that sets `Cache-Control: no-cache` (and ETag/304). |
| [x] R4 | H | `/hmr` (SSE) is not bypassed in the SW. CacheFirst awaits `cache.put` on a response body that never ends, so HMR hangs. | `web/src/sw.js:29-46`, `strategies.js:55-56` | Bypass `/hmr` and anything with `Accept: text/event-stream`. |
| [~] R5 | H | Prod sends `max-age=31536000, immutable` for **every** path with a dot, including unhashed `app.js`, modules, `importmap.json`, `routes.json` and `sw/*.js`. After a deploy, users need a hard reload. | `web/worker.js:6-15` | `no-cache` for unhashed files, sw.js and HTML. `immutable` only once assets have content hashes (P-phase). |
| [x] R6 | M | `/api/*` NetworkFirst is never reached because `'*'` is registered first and the first match wins. | `web/src/sw.js:25-26`, `library/src/sw/routes.js:100-112` | Register specific routes first, or make the router pick the most specific match. |
| [ ] R7 | L | Every copied `.html` fragment (component templates) gets the import map and HMR script injected. | `tools/src/build/graph.rs:342-344` | Inject only into real documents (`<!DOCTYPE`/`<html>`). |
| [x] R8 | M? | HTML hot-swap skips `sanitizeTemplateHtml`, drops the tags descriptor and leaves the old template in `assetCache`. *(suspected)* | `library/src/core/ui/define/element.js:176` | Run the same pipeline as a cold load, and evict the cache entry. |
| [ ] R9 | M? | SSE stream ends on `RecvError::Lagged`, and the channel holds only 16, so events are silently lost. *(suspected)* | `tools/src/server/runner.rs:157`, `tools/src/data/dev.rs:27` | On lag, send a "full reload" event instead of closing. |
| [x] R10 | L? | The prod worker always serves the SPA shell for extensionless paths, never the SSG HTML. | `web/worker.js:18-27` | Try `pathname/index.html` first. |

## P — Performance ("a bit slower")

The bottleneck is the **network waterfall**, not CPU.

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| [~] P1 | H | `import '@anzaui/anza/elements'` defines all 46 elements at once, and each one fetches style + template + tags: **~138 requests** even for unused elements. | `library/src/elements/index.js`, `core/ui/define/element.js:133-136` | Fetch on first connect (default `lazy`), then build-time inlining (P-phase). |
| [x] P2 | H | Each element's 3 fetches run **one after another** (CSS → HTML → tags.json). | `core/ui/define/utils.js:47-69, 96, 112` | `Promise.all`, and cache the in-flight promise rather than the result (also fixes S1). |
| [x] P3 | H | Pre-rendered (SSG/DSD) elements still await `getResources()` before `mount()`. The router polls rAF up to 50× for it. | `element.js:259-263`, `core/router/cascade.js:96-99` | When the shadow root is adopted, wire refs/on/mount right away. Fetch lazily only for a mismatch check. |
| [ ] P4 | M | CSS preloaded with `as="style"` but loaded via `fetch()`, so the preload doesn't match and the file downloads twice. SSG head never preloads templates/CSS. | `tools/src/server/runner.rs:239-247`, `tools/src/build/ssg.rs:496-540` | Match the destination, or drop the fetch by inlining (P-phase). |
| [ ] P5 | M | Render-blocking `@import` chains (10 + 4). | `library/src/tokens/index.css:10-23`, `styles/index.css:8-11` | Concatenate in the build. |
| [ ] P6 | H (dev) | **Any** save (even CSS) runs a full `extract::compile`: walks all of src, rebuilds the graph, re-emits SSG for all ~194 routes. Hash cache re-reads every file. | `tools/src/watcher/runner.rs:87-104`, `tools/src/extract/runner.rs:25-62`, `tools/src/build/cache.rs:23-30` | CSS/HTML: copy + HMR immediately. JS: rebuild only the affected part of the graph. SSG only for affected routes. mtime/size check before hashing. |
| [ ] P7 | M | Blocking `std::fs` in an async handler, and `routes.json` parsed twice per fallback request. | `tools/src/server/runner.rs:261, 300, 312, 383` | Keep the manifest in `ServerState` and refresh it on watch events. Use `tokio::fs`. |
| [x] P8 | M | SW awaits `cache.put` before responding. TTL path reads the whole body into a blob. StaleRevalidate update not passed to `waitUntil`. NetworkFirst timer never cleared. | `library/src/sw/strategies.js:16-29, 54-57, 84-87` | Respond first, then `event.waitUntil(put)`. Clear the timer. |
| [x] P9 | M | Every storage `set` awaits `navigator.storage.estimate()` (even memory tier), writes a sync localStorage journal and stringifies twice. | `library/src/core/storage/index.js:205, 232-245` | Throttle the quota check, skip it for memory, stringify once. |
| [x] P10 | L | Store queues a microtask per write (no "already scheduled" flag). | `library/src/core/state/store.js:172-176` | Add a `#scheduled` flag. |
| [x] P11 | L | Router `register` re-sorts on every call (O(n²) overall). | `library/src/core/router/match.js:68-91` | Sort once, lazily, before the first match. |
| [~] P12 | M | `bugs/speed.md` benchmarks measure the wrong things (in-memory string formatting, sync loops). Nothing measures load waterfall or save→HMR time. | `tools/tests/speed.rs:92-120`, `library/tests/core/platform/speed.test.js` | Replace with the benchmarks in PHASES.md Phase 3. |

Lower-confidence leads (verify while in Phase 3): one task yield per element during parsing (`element.js:270-275`), per-element MutationObserver with shallow invalidation (`core/ui/define/proxy.js:250-254`), 60 s `setInterval` cache scan (`sw/expire.js:40`).

## D — Docs inconsistent with code

| ID | Sev | Finding | Where | Truth |
|----|-----|---------|-------|-------|
| [x] D1 | H | Root README uses `<anza-dock>` / `<anza-page>`, which don't exist. | `README.md:68-71` | `dock('main')` / `page(...)` in JS; tag `dock-<name>`. See `library/README.md:96-105`. |
| [x] D2 | H | `anza generate element` is not a valid kind. | `README.md:57` | `page \| dock \| view \| part` (`tools/src/generate/mod.rs:21-30`). |
| [x] D3 | H | Root README example is a hand-written `class extends HTMLElement` in `src/elements/` (a legacy slot that `anza check` warns about). | `README.md:76-98` | `element()` / `view()` / `part()`, no classes. |
| [x] D4 | M | `anza dev` shown as a global command. `anza check` described wrongly. `scan`, `doctor`, `create`, `docs` not mentioned. | `README.md:25, 48-54` | `npm run dev` / `npx anza dev`. `check` = strict structure contract (`tools/src/main.rs:41-128`). |
| [x] D5 | H | Docs import symbols that aren't exported: router `gate/ready/reset/boot`, `isCallback/resolveTag/runCallback`, `get`; subpaths `router/match`, `router/intercept`; security `seal/unseal`; storage `CacheStorage/quota`; ui `listenStream`, `specRegistry`. | `docs/router/{advanced,api,handlers,troubleshooting}.md`, `docs/security/{api,index}.md`, `docs/storage/*.md`, `docs/engines/streaming.md:33`, `docs/ui/troubleshooting.md:164` | Decide per symbol in FREEZE.md §API: export it or remove it from the docs. |
| [x] D6 | H | `types/index.d.ts` declares namespaces (`export * as api`) but `src/index.js` does flat `export *`. `theme`/`elements`/`sw` not re-exported. Header still says "antigravity". | `library/types/index.d.ts`, `library/src/index.js` | Pick flat (recommended, matches runtime) and generate types to match. |
| [x] D7 | H | ~45 runtime exports have no types (ui `view`, `part`, transitions…; router `prefetch`, `load`…; storage classes; animations; platform). `dock()` options missing `notfound/error/offline/loading/transition`. `./defs`, `./sw`, `./elements/*` have no types. | `library/types/**` | Generate types from JSDoc (`tsc --declaration --allowJs`) instead of hand-writing them. |
| [x] D8 | M | `create/README.md` lists `src/pages/index/`, but the scaffold writes `src/pages/entry/` + `docks/ views/ parts/`. | `create/README.md:17-20` | Match `library/bin/create/run.js`. |
| [~] D9 | M | Root `CHANGELOG.md`: `[0.4.2]` twice, 0.4.1/0.4.3/0.3.4/0.3.8/0.4.11 missing, `[Unreleased]` empty despite 16 commits. `library/CHANGELOG.md` is a second, contradicting history. | `CHANGELOG.md:174,189`, `library/CHANGELOG.md` | One changelog per published package, generated (see RESEARCH.md). |
| [ ] D10 | M | `docs/config.toml` sidebar lists 7 of ~150 pages. | `docs/config.toml` | Generate the sidebar from the folder tree. |
| [ ] D11 | M | Crate name collision: `tools` and `engines/rust` are both `anza`. README says the engine is "`anza` on crates.io". Old notes say `anza-engine`. | `tools/Cargo.toml`, `engines/rust/Cargo.toml`, `README.md:103` | Decided D-7: CLI crate → `anza-cli` (binary stays `anza`), engine keeps `anza`. |
| [x] D12 | L | `plans/*` claim "Complete" for things that aren't (e.g. dock types). `CHANGELOG.md:295` mentions "anza-page". | `plans/STORAGE-STATE-GUARDS-PAGES.md:7`, `CHANGELOG.md:295` | `plans/` is archived by the sweep. |

### Found while fixing docs (2026-10-12)

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| [ ] D13 | H | **Root module name clashes.** `state`, `storage`, `sync`, `events`, `cache`, `view` and `reset` are each exported by two core modules. Per the ES spec, `export *` silently **drops** ambiguous names, so `import { state } from '@anzaui/anza'` is `undefined`. Types now match this behaviour. | `library/src/index.js` | Decision: explicit re-exports picking one winner per name, or keep them dropped and document "import from the subpath". |
| [x] D14 | C | Template/engine docs claimed auto-escaping and `each`/`if` blocks, which no engine has (an **XSS trap**). Rust/Python docs described APIs that don't exist. Docs claimed the browser verifies envelope signatures. | `docs/engines`, `docs/templates`, engine READMEs | Fixed in the docs. |
| [ ] D15 | M | mdBook engine docs (`engines/rust/docs`, `engines/ts/docs`) probably repeat the wrong API from D14. | `engines/*/docs` | Audit them against code, the same way as D14. |
| [ ] D16 | M | `web/src/docs` is stale for about 30 changed docs pages. | `web/src/docs` | Regenerate. Then S3/S4 (one generator, generated in CI, untracked). |
| [x] D17 | H | Scaffolded apps registered the SW on localhost with `'*'` CacheFirst (same stale-reload trap as R1). | `library/bin/create/run.js` | Fixed. |
| [ ] D18 | L | Changelog still lacks 0.3.4 and 0.3.8 entries. | `CHANGELOG.md` | Write them from `git log`. |

## B — Rust build pipeline correctness (`tools/`)

Measured on `web/` (194 routes, 299 modules): a clean build takes about 0.1 s, so speed is fine. **Correctness is not.**

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| [x] B1 | C | **Deep links show a bare template on refresh in production.** SSG emits routes in parallel and each worker did a read-modify-write of the shared `routes.json`. Readers saw half-written JSON (`EOF while parsing`), and `emit_route` returned an error **after** moving the fragment to `template.html` and **before** writing the full page. So `dist/<route>/index.html` stayed a fragment (108 of 199 in the hosted build, 39–45 per run). Client navigation worked because it fetches `template.html`. | `tools/src/build/ssg.rs` `emit` / `preserve_csr_template` / `rewrite_routes_html_field` | **Fixed:** workers return a flag, and `routes.json` is rewritten once after the parallel step. Regression test `emit_many_preserved_routes_keeps_documents_and_manifest` (300 routes). 3 clean builds: 0 failures, 193/193 full pages, identical output. |
| [ ] B2 | C | **`anza build` exits 0 when SSG fails** (and when `routes.json` is missing or invalid). This is how B1 shipped unnoticed. | `ssg.rs` `emit`, `extract/runner.rs:61`, `data/build.rs:21` | `emit` returns `Result<Stats, Vec<Error>>`. `compile` → `Result`. Build exits 1. |
| [ ] B3 | H | Errors swallowed across the pipeline (`.ok()`, `let _ = write`, `.is_ok()` copies). A JS parse error silently drops the page from `routes.json`. | `build/graph.rs`, `extract/routes.rs:713,756`, `extract/runner.rs:152,175,183-196`, `build/base.rs:337,357,377` | Collect errors. Fail the build in strict mode, and print them in dev. |
| [ ] B4 | H | Duplicate route paths only warn, then both are emitted, and two workers race on the same `index.html` and JS. `/docs` and `/docs/` map to the same output. | `extract/routes.rs:491`, `ssg.rs` `output_path` | Group by output path before `par_iter`. A collision is a hard error. |
| [ ] B5 | H | Writes go straight to final paths (truncate + write). The dev server re-reads `routes.json` per request mid-rebuild, and the graph copy puts the fragment at `index.html` before SSG overwrites it. | everywhere `fs::write` is used, `server/runner.rs:260,312` | One `write_atomic` helper (temp file + rename). Dev: build into `dist.tmp` and swap. |
| [ ] B6 | M | `preserve_csr_template` is multi-step and not atomic (template → JS rewrite → page). If a later step fails, the JS points at `template.html` but `index.html` is still the fragment. It also writes interpolated HTML as a shared template. | `ssg.rs` `preserve_csr_template` | Build all outputs in memory, then commit them. Use the raw (non-interpolated) fragment. |
| [ ] B7 | M | SSG falls back to reading **dist** while other workers write it (`dist/docks/content/index.html` probed 192×, never exists). | `ssg.rs:785,812,828` | Read from src or a pre-loaded cache only. A missing file is an error. |
| [ ] B8 | M | Dev hash cache ignores the importmap, slots and base config, so a new bare import or a `base` change leaves stale HTML or doubles the prefix (`/new/old/x`). Dev never removes outputs of deleted routes. | `build/graph.rs:322-325` | Add a config hash to the cache key. Remove orphan outputs. |
| [ ] B9 | M | Each compile writes `.tags.json` into **src**, which wakes the watcher and dirties git. Remove events are missed (canonicalize fails on a deleted path). | `extract/html.rs:99`, `watcher/runner.rs` | Write only when changed, or to dist. Don't canonicalize removed paths. |
| [ ] B10 | L | Not deterministic: WalkDir order picks the winner for duplicate tags. `props`/`meta` HashMaps reorder `.d.ts`. | `extract/runner.rs:81` | `sort_by_file_name()`, BTreeMap/IndexMap. |
| [ ] B11 | L | `anza build` while `anza dev` runs deletes the dev server's dist and shares `.anzacache.json`. | `build/runner.rs:36` | Lock file, or a separate out dir for dev. |

Build performance (scaling and dev latency; not urgent at 0.1 s):

| ID | Finding | Fix |
|----|---------|-----|
| [ ] BP1 | Dock data is resolved, read and parsed again **per route** (`docks/docs/index.{js,html,css}` about 193× each). `collect_docks` is empty because `routes.json` has no dock rows. | Pre-build a dock/CSS cache before `par_iter`. Emit dock rows. |
| [ ] BP2 | Each JS file is parsed 3× and read 4+×. The graph BFS is serial (largest phase, about 40%). | Parse once in extract and reuse the AST/import list. Parallel BFS frontier. `par_iter` the copy loop. |
| [ ] BP3 | `rewrite_html_urls`: 6 `find` calls per iteration (quadratic on big pages). 15 sequential `replace` calls in `rewrite_js_root_literals`. `dist/index.html` processed twice. | One `aho-corasick` / `memchr::memmem` pass. |
| [ ] BP4 | Importmap re-serialized per HTML file. `strip_importmap` drains in a loop. `escape_html`/`interpolate_params` take multiple passes. | Serialize once. Single-pass scanners. `write!` into a pre-sized String. |

## H — Repo hygiene and tooling

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| [x] H1 | H | `package/` is a stale old layout: **8.6 MB ELF binary** tracked in git, drifted copies of `run.js` and `boot.js`. Nothing refers to it. | `package/` | Delete (SWEEP). Optionally purge from history. |
| [x] H2 | M | Root `dist/` is tracked despite `.gitignore`. | `dist/` | `git rm -r --cached dist`. |
| [ ] H3 | H | `web/src/docs/` (727 generated files) is committed **and** there are two generators for it: `tasks/docs.js` and `anza docs` (`tools/src/docs`). | `web/src/docs`, `tasks/docs.js`, `tools/src/docs/*` | Keep one generator (`anza docs`), generate in CI, untrack output. |
| [ ] H4 | H | Two scaffolders kept in sync by hand: `library/bin/create/run.js` and `tools/src/create/run.rs` ("Keep in sync" comment). | both | Keep one (decision in PHASES Phase 0). |
| [x] H5 | H | Root `package.json` ("native-monorepo") scripts point at a `scripts/` dir that doesn't exist. Unused `jsdom` dependency. | `package.json` | Point the scripts at real commands, drop `jsdom`, rename. |
| [x] H6 | H | CI never runs the **library** (tsc + browser tests), the main published package. | `.github/workflows/ci.yml` | Add a library job. |
| [x] H7 | M | `Cargo.lock` is gitignored, so the CLI isn't reproducible and the CI cache key `hashFiles('tools/Cargo.lock')` never changes. The engines/rust cache path is the wrong `target/`. | `.gitignore:59`, `ci.yml`, `pages.yml`, `release.yml` | Commit `tools/Cargo.lock` and fix the paths. |
| [x] H8 | M | `library/package.json` has no devDependencies (tsc only works because it's installed globally) and ships without the LICENSE it lists in `files`. | `library/package.json` | Add `typescript`, `@web/test-runner`. Copy the LICENSE. |
| [ ] H9 | M | Release check only compares the tag to `library/package.json`. `create` pins `@anzaui/anza@0.5.0` by hand. | `.github/workflows/release.yml`, `create/package.json` | Have one version source, checked in CI. |
| [x] H10 | L | `.gitignore` has rules copied from other projects (`k8/hermes`, `config/prod.toml`, `*.onnx`, `book/`) and a broad `*.bin`. | `.gitignore` | Rewrite it minimally. |
| [x] H11 | L | Local-only clutter: `report.md`, `reserch.md`, `DESIGN.md`, `SKILL.md`, `engines/*/{DESIGN,DOC,STRUCTURE,SKILL}.md`, `test/`, `tmp/`, `examples/` (891 MB with Rust `target/`). | root, `engines/*` | Fold useful content into docs, delete the rest locally. |
| [x] H12 | L | Test log noise: `[Router] <dock-main id="main"> is required but was not found` thrown outside a test. | `library/src/core/router/boot.js:50` | Find the test that isn't awaited and add cleanup. |
| [x] H13 | L | `create/index.js:20-22` local fallback points at the repo root, which has no `bin/create`. | `create/index.js` | Point at `library/bin/create`. |
