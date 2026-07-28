# SSG & SEO — Fast Hard Refresh Without Owning a Server

Planning document for Anza’s HTML-first, SEO-friendly delivery model. Implements the architecture researched for multi-file ESM + portable static HTML (no Next/Nuxt-owned runtime).

**Related:** [plans/PHASE-II.md](./PHASE-II.md) (client DSD adoption / hydration) · [GitHub issue #3](https://github.com/aduki-org/anza/issues/3)

---

## Goal / non-goals

### Goals

- **Fast + SEO-friendly hard refresh** — for every public URL, the first HTML response already contains unique meta, visible primary content (H1 + body), and open Declarative Shadow DOM (DSD). Content is readable with JS disabled (curl / View Source).
- **Multi-file ESM forever** — native modules + import maps + per-route `modulepreload`. No mega-bundle “for speed.”
- **No Anza-owned server runtime** — `anza build` may generate HTML; serving works with any static host or any-language template server. Production must not require `anza dev`.
- **One HTML contract** — Mode A (SSG at build) and Mode B (request-time templates) emit the same shape so hydration (Phase 2) has one adoption path.

### Non-goals (cheap fixes that are NOT the product)

These may remain as optional host adapters or DX helpers, but **shipping them alone does not count as done**:

| Anti-pattern | Why it fails |
|--------------|--------------|
| Worker `/dist/` strip (`web/worker.js`) as the “path fix” | Host glue; does not make plain `dist/` portable or contentful |
| Empty SPA shell + redirects / fallbacks as “SEO” | Hard refresh still has no indexable content until JS runs |
| Requiring `anza serve` / `anza dev` in production | Contradicts “any static server”; locks hosts to Anza |
| Crawler UA detection → SSR, humans → SPA | Cloaking risk; rejected — see Decision log |
| Bundling the app into one `app.js` for LCP | Violates multi-file ESM philosophy; wrong lever vs HTML + preload |

---

## Architecture summary

```
anza build
  ├─ copy multi-file ESM graph → dist/          (unchanged)
  ├─ emit portable importmap (NO /dist prefix)
  ├─ emit routes.json (+ public / ssg flags, via, module graph)
  └─ Mode A: SSG public routes → dist/<route>/index.html
        real title/meta + open DSD tree + critical CSS
        + modulepreload from routes.json
        + deferred <script type="module"> entry

Any static server (python, nginx, Pages, S3+CDN)
  └─ GET /docs/... → file exists → SEO HTML

Mode B (later): any-lang templates
  └─ emit SAME HTML contract; assets still from dist/
```

| Mode | When | Who emits HTML | Assets | Anza owns runtime? |
|------|------|----------------|--------|--------------------|
| **A — Pure static** | Build time | `anza build` SSG | `dist/` as site root | No |
| **B — Any-lang templates** | Request time | Jinja / EJS / HBS / Go / … | `dist/` static | No — only HTML contract |

**Portable site-root rule:** production artifacts treat `dist/` as the document root. Public URLs are `/app.js`, `/importmap.json`, `/docs/...` — never `/dist/...`.

**Phase 2 (client):** after paint, custom elements **adopt** existing open DSD (`this.shadowRoot || attachShadow({ mode: 'open' })`) — no wipe. See [PHASE-II.md](./PHASE-II.md) §§1–3. Hydration work **depends on** Phase 1 contentful HTML existing.

**Boot sequence (after SSG HTML is in place):**

1. Parser attaches open DSD → first paint with content + encapsulated styles (no JS).
2. Import map registered; `modulepreload` warms the route graph.
3. Entry module loads; custom elements upgrade.
4. Constructor adopts existing shadow; rehydrates refs / tags / `on` / `watch`; syncs attrs → props.
5. Client router owns in-app navigations; full navigations / hard refresh hit SSG (or Mode B) HTML again.

---

## Phase 0 — Portable site-root assets

### Objective

Make `dist/` a self-contained site root: ESM, CSS, import maps, and SW registration resolve without `/dist/` prefixes and without a Worker rewrite. Prerequisite for every later phase.

### Deliverables

- [x] **Import map emission** — targets like `/app.js`, `/core/ui/index.js`, not `/dist/...`
  - Touch: `tools/src/build/resolve.rs`, `tools/src/build/graph.rs`, `tools/src/build/entries.rs`, library `importmap.json` / build copy path
- [x] **Compile-time asset paths in `routes.json`** — `resolve_compile_time_asset_path` in `tools/src/extract/routes.rs` emits site-root URLs
- [x] **Dev / Axum asset resolution** — `tools/src/server/runner.rs` (`resolve_asset_path`, modulepreload injection) aligns with site-root (dev may still mount equivalently; production artifacts must not bake `/dist/`)
- [x] **Scaffold & create templates**
  - `tools/src/create/run.rs`
  - `library/bin/create/run.js` (and related create helpers)
  - `web/src/index.html`, `web/src/app.js` (SW register), `web/src/sw.js`
- [x] **SW build / rewrite** — `tools/src/build/sw.rs` and scaffold precache lists use site-root paths
- [x] **Docs that teach `/dist/...` URLs** — update intro/SW docs so examples match the new contract
- [x] **Worker (optional cleanup)** — `web/worker.js` `/dist/` strip becomes unnecessary for correctness; may remain as transitional glue but must not be required for the acceptance tests below

### Acceptance tests (must survive)

1. **Clean build + plain static serve**
   ```bash
   rm -rf dist && npm run build   # or project-equivalent: anza build from web/
   cd dist && python3 -m http.server PORT
   ```
2. **Asset URLs**
   - `curl -sI http://127.0.0.1:PORT/app.js` → **200**
   - `curl -sI http://127.0.0.1:PORT/dist/app.js` → **404** is OK (and preferred: no dual namespace)
   - `curl -sI http://127.0.0.1:PORT/importmap.json` → **200**; JSON `imports` values do **not** start with `/dist/`
3. **Shell loads modules** — browser opens `http://127.0.0.1:PORT/` → Network shows module graph resolving (no 404s on import map targets); CSS for tokens/styles loads from site-root paths
4. **No Anza process** — acceptance is against `python3 -m http.server` (or nginx), not `anza dev`
5. **Unit coverage** — update/extend resolve/importmap tests in `tools/src/build/resolve.rs` so expected map values are site-root

### Acceptance — verification

**Verified 2026-07-28** — Clean `web` build + `python3 -m http.server` on 8770: `/app.js` 200, `/dist/app.js` 404, importmap/CSS/ui site-root (no `/dist/` prefixes).

### NOT done if…

- Production HTML or import map still references `/dist/app.js` (or any `/dist/...` asset)
- Tests only pass behind `web/worker.js` or `anza serve`
- SW still precaches `/dist/*` paths that 404 when `dist/` is the site root

---

## Phase 1 — SSG HTML per public route

### Objective

For every public / SSG-eligible route, `anza build` emits a real HTML file under `dist/` so hard refresh and crawlers see meta + content **without executing JS**. Mode A product default for docs / marketing / public pages.

Depends on **Phase 0** portable URLs.

### Deliverables

- [x] **`routes.json` flags** — extend emission in `tools/src/extract/routes.rs` (and types) with at least:
  - `public` and/or `ssg: true` (convention acceptable for v1: all `/docs/**` + `/`)
  - Keep existing `via`, `html`, `css`, layouts/templates/styles for composition
- [x] **Page SEO inputs** — convention for title/description/canonical/OG (e.g. `page({ seo: { … } })` or frontmatter); wired into extract → routes → SSG
- [x] **SSG emitter** — new build step (likely under `tools/src/build/`, possibly extending `html.rs` / extract HTML helpers) that, for each SSG route:
  - Writes `dist/<route>/index.html` (directory indexes; `/` → `dist/index.html`)
  - Walks `via` (e.g. `main` → `docs` → leaf) and nests custom tags with **open** DSD:
    ```html
    <page-…>
      <template shadowrootmode="open">
        <style>/* component CSS */</style>
        <!-- template body -->
      </template>
    </page-…>
    ```
  - Inlines leaf (and layout) template HTML/CSS into DSD so first paint does not wait on template fetches
  - Injects `<title>`, meta description, canonical, OG/Twitter; optional JSON-LD in light DOM
  - Injects import map + **route-scoped** `<link rel="modulepreload">` (logic today in `tools/src/server/runner.rs` moves into **build-emitted** HTML)
  - Deferred `<script type="module" src="/app.js">` (or route entry)
- [x] **Parametric routes** — documented rule: public params need a **build-time expansion manifest**; no expansion → no SSG file (Mode B or 404 later). **v1:** any path with `:param` / `*` (or non-empty `params`) gets `ssg: false` even when `public: true`.
- [x] **Auth / private routes** — remain SPA shell or intentionally non-indexed; not SSG by default

### Acceptance tests (must survive)

1. **Build emits files**
   ```bash
   rm -rf dist && npm run build
   test -f dist/docs/intro/start/index.html   # adjust to a known public route
   ```
2. **curl without JS — content in body**
   ```bash
   cd dist && python3 -m http.server PORT
   curl -s http://127.0.0.1:PORT/docs/intro/start | grep -E '<h1|<title'
   ```
   - Response includes the route’s **H1 (or primary heading) text** and a **unique `<title>`**
   - Response includes `<template shadowrootmode="open">` (open only)
3. **View Source** — browser “View Page Source” on a docs URL shows the same heading/meta (not an empty `<dock-main></dock-main>` only)
4. **Hard refresh** — hard reload on `/docs/...` shows content **before** / without waiting on the full ESM graph (paint may complete with DSD alone; JS upgrade is progressive)
5. **No cloaking** — same URL returns the same contentful HTML regardless of User-Agent
6. **Regression with Phase 0** — still: `/app.js` 200, `/dist/app.js` 404 OK, python static server only

### Acceptance — verification

**Verified 2026-07-28** — Clean `web` build + `python3 -m http.server` on 8772: `dist/docs/intro/start/index.html` and `dist/index.html` present; curl shows unique title, open DSD, `<h1>`; 0 closed DSD; `/app.js` 200 / `/dist/app.js` 404; Googlebot vs Mozilla `<h1>` counts match; `routes.json` reports 123 `ssg` routes.

### NOT done if…

- Only one shared `index.html` SPA shell is served for all routes (Worker/SPA fallback)
- HTML has meta but **empty** body / empty custom elements with no DSD content
- Acceptance relies on Googlebot UA or JS rendering to “see” content
- `shadowrootmode="closed"` used for public content

---

## Phase 2 — Client DSD adoption (hydration)

### Objective

When SSG (or Mode B) HTML is present, the client **adopts** the existing open shadow trees instead of clearing and re-cloning. Aligns with [PHASE-II.md](./PHASE-II.md) §§1–3 and [issue #3](https://github.com/aduki-org/anza/issues/3).

**Dependency:** Phase 1 contentful HTML must exist for public routes. Hydration against an empty shell is not a valid acceptance path for SEO routes.

### Deliverables

- [x] **Adopt, don’t wipe** — element constructors: `this.shadowRoot || this.attachShadow({ mode: 'open' })`; if DSD shadow exists, **do not** clone/append the client template over it
  - Primary touch: `library/src/core/ui/` (define / element lifecycle; `createComponentContext` in `define/proxy.js`)
- [x] **Context rehydration** — on existing shadow root: register `ref` maps, warm `TagsCache`, bind delegated `on` and `watch`
- [x] **Attr → prop sync** — server/SSG attributes initialize reactive backing store in constructor
- [x] **Mismatch fallback** — if client template differs hard from server tree, re-render shadow gracefully (no infinite flash loop)
- [x] **Client navigations** — soft-nav may swap regions; full load always hits SSG/Mode B HTML again
  - Soft-nav: client router CSR-mounts a new leaf when the page tag changes; parent docks stay mounted (adopted DSD kept).
  - Full load / hard refresh: contentful SSG/Mode B HTML; orchestrator reuses matching leaf (no wipe). See [PHASE-II.md](./PHASE-II.md) §4.
  - Coverage: `library/tests/core/ui/soft-nav.test.js`
- [x] **DSD polyfill path** — constructor also consumes light-DOM `<template shadowrootmode>` when native DSD did not attach; `library/src/core/platform/polyfills/shadow.js` remains compatible

### Acceptance tests (must survive)

1. **No flash / wipe on hard refresh** — open a SSG’d public route, hard reload: content stays visible; no blank frame from tearing down DSD then rebuilding (record with DevTools filmstrip or visual check)
2. **Refs & events work** — after upgrade, `ref`-based APIs and delegated listeners behave as on a CSR-only mount (unit/integration tests preferred)
3. **Mismatch fallback** — force a deliberate template mismatch in a fixture; client recovers with a single re-render, no stuck empty shadow
4. **curl still contentful** — Phase 1 curl/View Source tests remain green (hydration must not require removing SSG markup from the build)
5. **Issue #3 checklist** — items in PHASE-II §§1–3 marked done only when the above pass on real SSG HTML

### Acceptance — verification

**Verified 2026-07-28 (client adopt)** — `library` hydration suite `tests/core/ui/hydration.test.js`: **8 passed** (adopt/no-wipe, CSR path, empty-shadow fill, attr→prop, style dedupe, mismatch once, `on.click` rehydrate, light-DOM DSD polyfill). Clean `web` build + `python3 -m http.server` on **8773**: curl `/docs/intro/start/` contentful (`<title>Getting Started — Anza</title>`, open DSD, `<h1>Start</h1>`); `/app.js` **200**.

**Verified 2026-07-28 (client navigations)** — Orchestrator reuses SSG leaf on `found`/`load` (no DSD wipe); soft-nav to a different tag CSR-swaps leaf only; cascade `ensure` adopts pre-rendered docks instead of `replaceChildren` wipe. Suite: `library/tests/core/ui/soft-nav.test.js`. Contract documented in [PHASE-II.md](./PHASE-II.md) §4. Full document navigation still serves SSG/Mode B HTML (Phase 1 curl).

### NOT done if…

- Constructor always `attachShadow` + clone template even when `this.shadowRoot` exists
- “Hydration” only tested against empty SPA shell
- Hard refresh briefly wipes visible content (CLS / flash regressions accepted as normal)

---

## Phase 3 — Mode B HTML contract + fixture examples

### Objective

Document and prove that any language can emit the **same** HTML shape as Mode A SSG at request time, without Anza owning the server. Optional language packages later; contract + fixtures first.

### Deliverables

- [x] **Page HTML contract doc** — normative description of required head (meta, import map, modulepreload), body (via/DSD nesting), open-only DSD, site-root asset URLs, light-DOM recommendations for critical text → [docs/ssg/contract.md](../docs/ssg/contract.md)
- [x] **Golden HTML fixtures** — checked-in samples produced by Mode A SSG for 1–2 public routes (canonical expected output) → [plans/fixtures/ssg/](./fixtures/ssg/)
- [x] **Example template servers** (minimal, under e.g. `examples/` or `plans/fixtures/`):
  - [x] One Python (stdlib `http.server` + string/HTML template) — `examples/mode-b-python/`
  - [x] One Go (stdlib `net/http`) — `examples/mode-b-go/`
  - [x] One Node (stdlib `node:http`, no Express) — `examples/mode-b-node/`
  - Each serves assets from a built `dist/` and renders one dynamic page matching the golden shape
- [x] **Contract test harness** — fixture diff / golden match (normalize volatile bits if needed: timestamps, HMR) · lightweight invariants: `node tasks/ssg-contract-check.js`
- [x] **Auth / personalized routes guidance** — when to use Mode B vs CSR; never UA-branch for indexing → [docs/ssg/contract.md](../docs/ssg/contract.md) (Mode A vs Mode B)

### Acceptance tests (must survive)

1. **Golden match** — SSG output for the fixture route matches (or intentionally updates) the checked-in golden file in CI
2. **Example server parity** — example Python/Go/Node response for the fixture route diffs equal to golden HTML (same meta, H1, open DSD structure, site-root script/link hrefs)
3. **curl on example server** — `curl` shows H1 without JS; asset URLs 200 from static `dist/`
4. **No Anza runtime** — examples do not import an Anza Node SSR package as a required runtime (templates + static files only)

**Verified 2026-07-28** — `node tasks/ssg-contract-check.js --rebuild` passed (goldens + built `/` and `/docs/intro/start`). Mode B Python on **8780**, Go on **8781**, Node on **8782**: curl `/docs/intro/start/` shows `<title>`, open DSD, `<h1>Start</h1>`, `src="/app.js"`; `/app.js` **200**.

### NOT done if…

- Contract is prose-only with no golden fixtures
- Examples embed a full Anza/Node DOM SSR stack as the only way to produce HTML
- Mode B docs revive crawler UA detection

---

## Performance & SEO gates (cross-cutting)

These gates apply once Phase 0–1 land; Phase 2 must not regress them.

| Gate | Measure / check |
|------|-----------------|
| **TTFB content visible** | curl/View Source of public URL contains primary text; first paint does not require waiting on entry module execution |
| **`modulepreload` present** | SSG HTML includes `<link rel="modulepreload">` for route entry + critical layout/leaf modules from `routes.json` |
| **Open DSD only** | Public markup uses `shadowrootmode="open"` only; closed shadow banned for indexable UI |
| **Light DOM for critical text** | Recommendation (and fixtures where practical): H1 / main copy also available as light-DOM / slotted text so weak crawlers see words in source |
| **No cloaking** | Identical contentful HTML for all UAs on public URLs |
| **Portable static serve** | `cd dist && python3 -m http.server` passes Phase 0 + 1 tests |
| **No mega-bundle** | Multi-file ESM graph remains; speed comes from HTML + preload + HTTP/2, not collapsing modules |
| **Import map before modules** | Import map appears before `type="module"` entry in emitted HTML |
| **Deferred behavior** | SW registration / heavy islands idle or on interaction; not blocking first paint |

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Weak / AI crawlers mishandle shadow trees | Medium | Critical copy in light DOM + open DSD; SSG so View Source has text |
| Closed DSD used for docs | High | Ban in contract + lint/CI check on SSG output |
| Template duplication (SSG vs Mode B vs client) | High long-term | Single source: component HTML/CSS; golden fixtures; Mode B matches SSG |
| DSD style verbosity | Medium | Critical CSS in head; accept some in-DSD duplication for first paint; shared sheets after upgrade |
| Parametric public routes | Medium | Build-time param manifests; else Mode B |
| Hydration mismatch flash | Medium | Adopt-first; re-render only on hard mismatch |
| Large ESM graphs without preload | Medium | `routes.json` → per-route modulepreload in build HTML |
| Treating Worker `/dist` strip as done | High (process) | Acceptance tests use python static server only |
| UA cloaking revived | High (policy) | Decision log + Phase 1 “same HTML for everyone” tests |

---

## Decision log

| Decision | Status | Notes |
|----------|--------|--------|
| **SSG real HTML per public route into `dist/` (Mode A)** | **Accepted** | Primary SEO + hard-refresh product |
| **Portable site-root asset URLs** | **Accepted** | Ship with Mode A; not a Worker-only rewrite |
| **Mode B = same HTML contract, any language** | **Accepted** | Phase 3; Anza does not own the server |
| **Phase 2 = adopt existing open DSD** | **Accepted** | [PHASE-II.md](./PHASE-II.md) §§1–3; [issue #3](https://github.com/aduki-org/anza/issues/3); depends on Phase 1 HTML |
| **Multi-file ESM + import maps + modulepreload** | **Accepted** | No bundling escape hatch as the SEO/perf fix |
| **Crawler UA detection / SPA for users** | **Rejected** | Cloaking risk; public routes get contentful HTML for **everyone** |
| **Empty SPA shell as SEO strategy** | **Rejected** | “Google will run the JS” is not the product |
| **Bundling into one mega `app.js`** | **Rejected** | Violates Anza philosophy; wrong lever |
| **Worker `/dist` strip / anza-dev-required serve as the milestone** | **Rejected** as product | Optional host/DX only; not acceptance |

---

## Implementer quick-start order

1. **Phase 0** — portable URLs → prove with `python3 -m http.server` from `dist/`.
2. **Phase 1** — SSG `dist/<route>/index.html` → prove with curl + View Source + hard refresh.
3. **Phase 2** — adopt DSD on that HTML → prove no wipe; refs/events; mismatch fallback ([PHASE-II.md](./PHASE-II.md)).
4. **Phase 3** — contract + goldens + one Python and one Go/Node example → prove fixture diff.

Do not mark a phase complete until its **Acceptance tests** section survives and none of its **NOT done if…** conditions apply.
