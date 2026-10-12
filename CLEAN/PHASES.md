# PHASES — fix plan

Work top to bottom. Each phase is one or more PRs, and each PR names the audit
IDs it closes. Every phase must keep the baseline suites green (see README).

```
P0 Sweep + guards ─► PB Build correctness ─► P1 Reload ─► P2 Dev speed ─► P3 Runtime speed ─► P4 Docs & types ─► P5 Release 0.6.0
   (1–2 days)          (2–3 days)              (1 day)       (2–3 days)       (4–6 days)           (3–5 days)          (1 day)
```

**Hotfix already done (B1):** the SSG `routes.json` race that broke deep links on refresh. Ship it as `0.5.1` right away, ahead of the phases.

Why this order:
- **P0** first: don't fix code that is about to be deleted, and get CI guarding the library before touching it.
- **P1** next: the reload bug hurts every edit and the fix is small.
- **P3 before P4**: the performance work changes how elements load (inlining), and the docs should describe the final behaviour.

## Decisions (decided 2026-10-12)

| # | Question | Decision |
|---|----------|----------|
| D-1 | Which scaffolder survives (H4)? | **JS** `library/bin/create`. `anza create` becomes a hint pointing to `npm create @anzaui/anza`. Delete `tools/src/create/`. |
| D-2 | `plans/` and `bugs/`? | **Delete.** Git history keeps them. |
| D-3 | `examples/`? | **Track a minimal set**: one SSG site + one server example per engine (Rust/TS/Py), no `target/` or `node_modules`. |
| D-4 | Release tooling? | **release-please** (manifest mode, one shared version). |
| D-5 | Purge `package/bin/anza` from history? | **No.** Just `git rm`. |
| D-6 | Production bundler? | **Rolldown 1.x via its stable JS API** (npm devDependency) called by `anza build`. Output: **minified chunks per core, per route group, per element**, content-hashed. Unbundled + full preload stays for dev / `--no-bundle`. |
| D-7 | Crate name collision (D11)? | **CLI crate → `anza-cli`** (binary is still `anza`). The engine keeps the crate name `anza`. |

## Rust build rules (apply to every phase)

- **One shared `target/`** at the repo root (`.cargo/config.toml`) for `tools`, `tools/src/logs`, `engines/rust` and `examples`. Never set a per-crate `CARGO_TARGET_DIR` locally. (Before: 4 target dirs, 4.4 GB. After: 1, about 0.9 GB.)
- Dev profile: line tables only for our crates, no debuginfo for dependencies.
- **One Rust worker at a time.** Parallel workers do JS/docs work; only one builds Rust, against the shared target (no duplicate target dirs, no lock contention).
- Don't rebuild needlessly: `cargo check` while editing, and one `cargo test` per finished change.
- Clean up when needed: `cargo clean -p anza` (our crate only) if the target goes stale, and a full `cargo clean` only when the target is over about 5 GB. Delete temporary build copies in `/tmp` after each check.
- CI: `Swatinem/rust-cache` (keyed on the toolchain and `Cargo.lock`, which is now committed). Release builds use `CARGO_TARGET_DIR=target` inside `tools/` because `cross` only mounts `tools/`.
- Optional local speed-up: `sccache` as `RUSTC_WRAPPER` in your **user** config (`~/.cargo/config.toml`), never in the repo config. Builds would fail for anyone without it installed.

## Phase 0 — Sweep and guards

**Status (2026-10-12):** done except S3/S4 (docs generator, moved to Phase 4), S9/S10 (`tasks/` and `cf-build.sh` stay until release-please replaces them, because the Cloudflare dashboard points at `cf-build.sh`), D-1 deletion of `tools/src/create` (Rust worker), D-3 minimal examples (Phase 4), and knip/machete (Phase 0b).

**Closes:** H1 H2 H3 H5 H6 H7 H8 H10 H13, SWEEP §1–§2.

1. Run [SWEEP.md](./SWEEP.md) §1 and §2 (one commit per row, so each is easy to revert).
2. CI: add a `library` job (`npm ci && npm run check && npm test`) using Playwright/puppeteer Chromium (H6).
3. Commit `tools/Cargo.lock`. Fix the cache paths in `ci.yml`, `pages.yml`, `release.yml` (H7).
4. `library/package.json`: add `typescript` and `@web/test-runner` to devDependencies. Copy `LICENSE` (H8).
5. Root `package.json`: name `anza`, scripts `test`, `check`, `build` → real commands. Drop `jsdom` (H5).
6. Rewrite `.gitignore` (H10). Fix the `create/index.js` fallback path (H13).
7. Phase 0b: run `knip`, `cargo machete` and `clippy` to find dead code, and review and delete it.

**Exit:** SWEEP "Done when" ticked. CI runs all 5 suites on every PR.

## Phase B — Build correctness ("we can't afford mistakes")

**Closes:** B2–B11, BP1–BP4.

1. **Fail loudly (B2, B3):** `emit` / `compile` / `graph` return `Result` with every error collected. `anza build` exits 1 on any SSG, write, copy or parse error. `anza dev` prints the errors and keeps serving.
2. **Output-path guard (B4):** before `par_iter`, map every route → `output_path`. Any collision (duplicate route, `/x` vs `/x/`, literal vs expanded) is a build error naming both sources.
3. **Atomic writes (B5, B6):** add `fs_atomic::write(path, bytes)` (temp file in the same dir + `rename`) and use it for every dist write. Each route builds all of its outputs in memory, then commits them.
4. **Read-only inputs (B7):** SSG reads from src through a cache built **before** the parallel step (docks, CSS, templates; also closes BP1). It never reads dist.
5. **Determinism (B10):** sorted walks, BTreeMap. CI builds `web/` twice and diffs `dist/`; any difference fails.
6. **Dev cache (B8, B9, B11):** config hash in the cache key, orphan removal, tags.json written only when changed, a lock file between `build` and `dev`.
7. **Speed (BP2–BP4):** parse once, parallel graph BFS, single-pass rewriters (`aho-corasick` / `memchr`). Benchmark with `hyperfine 'anza build'` before and after on `web/` and on a synthetic 5,000-route site.

**Tests:** fault-injection tests (unwritable dist, corrupt `routes.json`, duplicate routes → non-zero exit), the existing race regression test, and the double-build diff in CI.
**Exit:** CI fails on any build error. Two builds produce byte-identical output. Every SSG route's `index.html` starts with `<!DOCTYPE` (CI check over `dist/`). The 5,000-route build time is recorded.

## Phase 1 — Reload ("hard refresh") fixes

**Closes:** R1 R2 R3 R4 R6 R7, and partly R5.

1. **R1** `web/src/app.js`: register the SW only when `location.hostname` isn't `localhost`/`127.0.0.1` **and** the dev server didn't flag dev mode. Add a one-time dev cleanup: `getRegistrations()` → `unregister()` plus `caches.keys()` → `delete()`.
2. **R1** dev server: answer `/sw.js` with a no-op worker (install → `skipWaiting`, activate → delete caches, then `registration.unregister()`). This fixes machines that already have the old worker.
3. **R1/R6** `web/src/sw.js`: CacheFirst only for hashed or versioned assets. Unhashed `.js`/`.css` → StaleRevalidate. Register `/api/*` before `'*'` (or make `Router.handle` choose the most specific match). Bump the cache name.
4. **R4** bypass `/hmr` and `Accept: text/event-stream` in `shouldBypass`, and in the library default strategies too.
5. **R2** `tools/src/server/runner.rs`: inject the HMR client while serving **every** `text/html` response in dev. Remove the injection from `inject_assets` (also closes **R7**).
6. **R3** a dev tower layer: `Cache-Control: no-cache` + ETag on everything.
7. **R5 (interim)** `web/worker.js`: `no-cache` for everything except files under a hashed folder. Full `immutable` comes back in P3 step 9.

**Tests:** a Rust integration test (`GET /` contains `EventSource`, has `cache-control: no-cache`). A wtr test that the SW router chooses NetworkFirst for `/api/x` and bypasses `/hmr`.
**Exit:** edit a JS, CSS or HTML file → the browser shows it with **no** manual reload, and a manual normal reload never shows stale content. Check this on a profile that had the old SW installed.

## Phase 2 — Dev server speed

**Closes:** P6 P7 R9 (and R8 checked).

1. Watcher sorts events by kind: CSS/HTML → copy file + send the HMR event **immediately**, then rebuild in the background if needed.
2. JS changes rebuild only the part of the import graph they affect. SSG re-emit only for routes whose module set includes the changed file.
3. `build/cache.rs`: check mtime + size before hashing the content.
4. `ServerState` holds the parsed `routes.json` and refreshes it on watch events. `tokio::fs` for the remaining file reads.
5. SSE: on `Lagged`, send a `reload` event instead of closing. Raise the channel capacity to 256.
6. Check R8: an HTML hot-swap goes through `sanitizeTemplateHtml` and evicts `assetCache`.

**Bench:** time from save to HMR event for a CSS edit on `web/` (194 routes), measured in `tools/tests/dev_latency.rs`.
**Exit:** CSS save → swap < **100 ms**. JS save → reload < **500 ms** on `web/`.

## Phase 3 — Runtime speed

**Closes:** P1–P5 P8–P12, and the rest of R5.

1. **Benchmark first (P12).** Replace `bugs/speed.md` and the microbenchmarks with:
   - a Puppeteer script (already a dependency) that loads `web/` `/` and `/docs/...` with throttling ("Fast 4G") and records request count, critical-path depth, time to `anza:ready`, LCP;
   - a count of fetches caused by `import '@anzaui/anza/elements'`.
   Record the baseline numbers here before changing anything.
2. **P2** `utils.js`: fetch style, template and tags in parallel. Cache the **promise**.
3. **P1** elements fetch resources on first connect, not at define time (lazy by default; `eager: true` to opt out).
4. **P3** DSD-adopted roots: mount right away, without awaiting `getResources()`. Remove the rAF polling in `cascade.js`.
5. **P8** SW strategies: respond first, `waitUntil(cache.put)`, clear timers, no blob round-trip.
6. **P9 / P10 / P11** storage quota throttle, store `#scheduled` flag, lazy route sort.
7. **Optimize the build output: follow [DIST.md](./DIST.md) §3 steps 1–9 in order.**
   - Remove junk from dist.
   - Preload the full module closure, with Early Hints.
   - Bundle and minify CSS with lightningcss, and link shared CSS from DSD.
   - Inline element resources (P1/P4).
   - Bundle into chunks with Rolldown (D-6).
   - Hash names and generate `_headers` (R5 final).
   - Precompress.
   - Prefetch on navigation.
   - Add runtime yielding.

**Exit:** the [DIST.md §4 budgets](./DIST.md#4-budgets-enforced-in-ci-phase-d-exit) pass in CI for every SSG route (today: 267 modules, depth 5, 4 preloads, 76 KB HTML).

## Phase 4 — Docs and types agree with code

**Closes:** D1–D12, H9 (partially), H11, H12.

1. Apply the FREEZE §3.2 decisions: export `gate/ready/reset`, `seal/unseal`, `quota`. Fix every other doc import (D5).
2. **Types are generated**: `tsc --allowJs --declaration --emitDeclarationOnly` from JSDoc into `library/types`. Delete the hand-written d.ts. CI fails if the generated types differ from the committed ones (D6, D7).
3. A CI **doc import check**: a script that extracts every `import … from '@anzaui/anza…'` in `docs/**/*.md` and checks that each named symbol is exported (catches D5 for good).
4. Rewrite the root `README.md`, `library/README.md` and `create/README.md` against FREEZE §3 (D1–D4, D8). Fix the "antigravity" header in `src/index.js`.
5. `anza docs` generates the sidebar from the tree (D10). CI builds `web/src/docs` (H3 follow-up).
6. `lychee` in CI on `docs/` and the READMEs.
7. One changelog per published package. Repair the root history (duplicate 0.4.2, missing 0.4.11, empty Unreleased) (D9).
8. Merge `engines/*/{DESIGN,DOC,STRUCTURE}.md` content into `docs/engines/` + engine READMEs (H11). Rename the CLI crate to `anza-cli`, keeping the `anza` binary (D11, D-7).
9. Fix the test that leaves the router boot unawaited (H12).

**Exit:** doc-import check, type-diff check and lychee all pass in CI. No `anza-*` tags anywhere except in a changelog note.

## Phase 5 — Release 0.6.0 and unfreeze

1. release-please manifest config covering library, create, tools, engines/{rust,ts,py}, with one shared version (H9).
2. `create` depends on `@anzaui/anza` `^0.6.0`, bumped by the release tool.
3. Write the 0.6.0 changelog: the cleanup summary plus breaking changes (lazy element loading default, flat root types, crate rename).
4. Tag, publish, deploy the docs.
5. Delete `CLEAN/`. Lift the freeze.

**Exit:** `v0.6.0` published from CI with no manual steps. `CLEAN/` removed.
