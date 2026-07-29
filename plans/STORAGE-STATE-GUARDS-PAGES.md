# Storage, State, Guards & Default Dock Pages

Planning document for hardening Anza’s **storage** and **state** contracts, clarifying the two **guard** surfaces (platform vs router), and completing **default / overrideable dock error pages** (404, 5xx, offline).

**Related:** [NEXT.md](./NEXT.md) · [VIEW-TRANSITIONS.md](./VIEW-TRANSITIONS.md) · [MUTATIONS-EVENTS.md](./MUTATIONS-EVENTS.md) · [SSG-SEO.md](./SSG-SEO.md) · `docs/storage/*` · `docs/state/*` · `docs/router/{guards,pages,docks,events}.md` · `docs/platform/guards.md`

**Status:** Implementing — Phases 0–2 landed (dock/page-scoped resolver + custom `{ tag }` overrides); Phase 3 types/facade smoke done; Phase 4 docs/SSG notes partial.

---

## Override story — dock/page-scoped 404 / 5xx / offline

**Critical constraint:** fallbacks are **scoped to docks (and route pages under them)** — not a single global shell UI. Soft-nav miss/error swaps the **leaf** inside the active dock chain; parent chrome stays mounted.

**Defaults are shared library built-ins**, not per-dock scaffolding:

- Built-ins live in `pages.js` (`DEFAULT_*_HTML`) — **one shared HTML** (or later tag) per kind.
- Bare `dock('name')` gets miss/error/offline UI **for free** via the resolver; host = leaf dock in `via`.
- Override only with dock/page `{ notfound|error|offline: { tag } }` (or HTML) when branded UI is needed.
- Do **not** copy `404.html` into every dock folder. Scaffold creates bare docks without error-page files — that is correct.

### Precedence (highest → lowest)

```text
1. Page/route   page({ error: { tag } })     // error only — matched route then failed
2. Dock         dock('content'|'docs'|…, { notfound|error|offline })
                // walk leaf → root; deepest dock that defines the kind supplies the template
3. App (optional)  router.pages.configure({ … })   // when no dock in the chain defines the kind
4. Built-in     DEFAULT_*_HTML (shared library — not copied per dock)
```

**Host vs template:** the **host** (where we `swap`) is always the **deepest live dock** in the current `via` / `lastVia` chain (the leaf). The **template** may come from that dock or a shallower ancestor — parents are never torn down just to show a 404.

`router.notFound(fn)` / `router.pages.onError(fn)` are optional **escape hatches** (full manual control). Prefer dock / `configure` tags for normal apps. Escape hatches run only when you opt in; they do not redefine the product model as “one global 404.”

### Nested docks — branded override per section (optional)

```javascript
import { view, dock, page } from '@adukiorg/anza/ui';
import { router } from '@adukiorg/anza/router';

view('page-docs-not-found', {
  template: { html: './docs-404.html' }
}, import.meta.url);

view('page-app-not-found', {
  template: { html: './app-404.html' }
}, import.meta.url);

view('page-docs-error', {
  template: { html: './docs-error.html' },
  props: { message: { type: String }, phase: { type: String } }
}, import.meta.url);

dock('main', {
  template: '<slot></slot>',
  // Shell-wide fallback — used only when a deeper dock has none
  notfound: { tag: 'page-app-not-found' },
  error: { tag: 'page-app-not-found' }
});

dock('docs', {
  parent: 'main',
  template: '<aside></aside><slot></slot>'
});

// Leaf dock — soft-nav miss under docs swaps HERE, not over <main>
dock('content', {
  parent: 'docs',
  notfound: { tag: 'page-docs-not-found' },
  error: { tag: 'page-docs-error' }
});

page('/docs/:slug', {
  tag: 'page-doc',
  via: ['main', 'docs', 'content'],
  error: { tag: 'page-docs-error' },
  template: { html: './doc.html' }
}, import.meta.url);

// Optional shared kinds when some docks omit config
router.pages.configure({
  offline: { tag: 'page-offline' }
});
```

Unmatched `/docs/…` after a docs soft-nav: **content** receives `page-docs-not-found`; `docs` / `main` chrome stay.

### Bare docks (library defaults — recommended start)

```javascript
dock('main');
dock('docs', { parent: 'main' });
dock('content', { parent: 'docs' });
// no notfound/error files — resolver uses DEFAULT_*_HTML into the leaf
```

### App-only configure (shared branded UI, still leaf-hosted)

```javascript
view('page-not-found', {
  template: { html: './not-found.html' }
}, import.meta.url);

router.pages.configure({
  notfound: { tag: 'page-not-found' },
  error: { tag: 'page-server-error' }
});
```

Still mounts into the **leaf** dock of the active chain — not a document-level wipe. Use when docks omit a kind and you want one branded default without repeating dock config.

### Escape hatch

```javascript
router.notFound(async (ctx) => {
  const host = router.getContainer('content') ?? router.getContainer('main');
  const el = document.createElement('page-not-found');
  el.classList.add('page-content');
  await host.swap(el, { direction: 'replace' });
});

router.pages.onError(async (ctx) => {
  // return false → fall through to page → dock → configure → built-in
});
```

### Soft-nav / SSG implications

| Context | Behavior |
| ------- | -------- |
| Soft-nav miss in nested docks | Swap leaf inside deepest `via` dock; use that dock’s (or ancestor’s) notfound; **do not** replace the whole shell |
| Soft-nav error | Same host = leaf dock; page `{ error }` then dock chain |
| Hard refresh / boot miss | Same resolver; host from live graph / leaf / `main` |
| SSG | Host may 404 the URL; CSR paints the dock-scoped leaf after boot |

---

## Problem / motivation

Anza already ships substantial storage, state, and guard code, plus a minimal 404 path. The product gap is not “greenfield APIs” — it is **contract clarity, override hierarchy, and missing error surfaces**:

1. **Two storage stories** — `@adukiorg/anza/storage` (tiered gateway) and `state.storage` / `PlatformStorage` (store-oriented IDB). Authors must guess which to use; types and docs under-specify the relationship.
2. **Two “guard” words** — `platform.guard` (feature + polyfill) vs `router.guard` / `page({ guard })` (navigation). Both are correct but easy to conflate in docs and search.
3. **404 is half-finished** — built-in HTML + `dock({ notfound })` + `router.notFound` exist, but “deepest dock wins,” boot vs navigate parity, and custom-element pages are incomplete or wrong.
4. **No first-class 5xx / CSR offline pages** — `router.on('error')` emits phases; SW has `OfflineFallback('/offline.html')`; neither mounts a dock-scoped error leaf the way 404 almost does.
5. **SSG / static hosts** — unmatched paths often get plain `404 Not Found` text from the Axum/dev server or static host, disconnected from CSR dock chrome and branded pages.
6. **Soft-nav / VT / AbortSignal** — error and not-found swaps must obey the same leaf-swap + `signal` rules as happy-path pages, or they orphan listeners / break transitions.

Goal: one coherent story — **where defaults live, how apps override them (app → dock → route), and how storage/state/guards plug into that without a second framework.**

---

## Current state (file pointers)

### Storage (`@adukiorg/anza/storage`)

| Piece | Location | Behavior |
| ----- | -------- | -------- |
| Facade | `library/src/core/storage/index.js` | `get` / `set` / `delete` / `list` / `clear` / `configure` / quota helpers; tiers `memory` \| `idb` \| `opfs` \| `cache`; TTL envelopes; gzip >64KB; localStorage write journal |
| Adapters | `idb.js`, `opfs.js`, `cache.js`, `lru.js`, `quota.js` | Tier implementations |
| Notes | `library/src/core/storage/notes/usage.md` | Authoritative internal guide |
| Public docs | `docs/storage/{index,quickstart,tiers,idb,opfs,cache,lru,quota,api,troubleshooting}.md` | Full doc tree + web mirrors |
| Types | `library/types/core/storage/index.d.ts` | Partial — missing `configure`, options/`ttl` forms |
| Tests | `library/tests/core/storage/{idb,lru,cache,opfs,quota}.test.js` | Per-adapter; **no dedicated facade integration suite** |

### State (`@adukiorg/anza/state`)

| Piece | Location | Behavior |
| ----- | -------- | -------- |
| Namespace | `library/src/core/state/index.js` | `state.create`, `derived`, `sync`, `storage` |
| Store | `store.js` | Proxy store; `subscribe(key, cb, signal)` already AbortSignal-aware |
| Derived / sync | `derived.js`, `sync.js` | Lazy compute; BroadcastChannel |
| Persist | `persist.js` → `PlatformStorage` | Separate IDB API: `set(store, key, value)`, migrations, TTL, quota eviction |
| Offline connectivity store | `library/src/core/offline/state.js` | Separate `ReactiveStore` (`online` / `status` / `pending`) — not the public `state` facade |
| Notes / docs | `notes/usage.md`, `docs/state/*` | Implemented contract documented |
| Types / tests | `library/types/core/state/index.d.ts`, `tests/core/state/{store,derived,sync,persist}.test.js` | Solid core coverage |

### Guards (two surfaces)

| Surface | Location | Role |
| ------- | -------- | ---- |
| **Platform** `guard` / `typeGuard` / `supports` | `library/src/core/platform/{guard.js,supports.js,index.js}` | Async feature gates + polyfill load (`urlPattern`, `navigation`, `popover`, `escape`, …) |
| Docs | `docs/platform/guards.md`, `docs/platform/supports.md` | Feature-gate docs |
| **Router** `router.guard` / `router.guards` | `library/src/core/router/intercept.js` | Global nav guards; precommit + Safari post-commit |
| **Route-scoped** `page({ guard })` | `library/src/core/ui/defs/page.js` → wraps as global with URLPattern match | Redirect or allow |
| Docs | `docs/router/guards.md`, `docs/router/pages.md` | Navigation guards |

### Default / miss / error pages (today)

| Piece | Location | Behavior |
| ----- | -------- | -------- |
| Shared built-ins | `pages.js` `DEFAULT_*_HTML` | One shared HTML per kind; bare docks use these via resolver — **not** per-dock file copies |
| Resolver | `pages.js` `renderPageKind` | Host = leaf in `via`; template = page → dock leaf→root → `configure` → built-in |
| Dock override | `dock({ notfound\|error\|offline })` → `Cls.*` | Optional `{ tag }` / HTML; omit for library defaults |
| App override | `router.pages.configure` | Optional when no dock defines the kind |
| Escape hatches | `router.notFound` / `pages.onError` | Full manual control; `return false` falls through |
| Events | `found` / `notfound` / `error` | Error phases then default UI unless suppressed |
| SW offline HTML | `docs/sw/*`, `OfflineFallback` | Separate document URL, not dock leaf |
| Dev/static 404 | `tools/src/server/runner.rs` | Plain `404 Not Found` body when no SSG/SPA HTML |
| Scaffold | `library/bin/create/run.js` | Bare `dock('main')` — no error-page files (correct) |

### Soft-nav / VT / signal (already shipped; error pages must join)

| Piece | Location |
| ----- | -------- |
| Leaf swap + abort | `orchestrator.js`, `container.js`, MUTATIONS-EVENTS track |
| Dock VT + `{ signal }` | `ui/transitions.js`, `defs/dock.js` `swap`, VIEW-TRANSITIONS track |
| Schedule AbortSignal | `ui/schedule.js` |

---

## Identified gaps & failure modes

| ID | Gap | Why it hurts |
| -- | --- | ------------ |
| G1 | Dual storage APIs without a documented decision tree | Wrong default DB / duplicate schemas / surprise quota |
| G2 | Storage `.d.ts` lags facade (`configure`, `{ tier, ttl }`) | TS apps drift from runtime |
| G3 | No facade-level storage tests | Adapter green ≠ gateway green (journal, default tier, compress) |
| G4 | `state.storage` vs `@adukiorg/anza/storage` share names / default DB name `platform-db` | Collision risk if both opened casually |
| G5 | Platform vs router “guard” naming | Docs and support confusion |
| G6 | `renderNotFound` ≠ “deepest configured wins” | Nested docs chrome shows root 404 or wrong template |
| G7 | Boot path ignores `router.notFound` | App branding broken on hard refresh miss |
| G8 | `notfound` is HTML string only — not a `page` / custom element | No props, no `on.load`, no a11y component kit |
| G9 | No 5xx / recoverable error dock UI | Guard/handler/container failures leave blank or stale leaf |
| G10 | No CSR offline page (only SW document fallback) | Soft-nav offline ≠ full navigation offline |
| G11 | No per-route error / miss override | One dock template for every miss |
| G12 | SSG host 404 ≠ app shell | SEO/crawler and branded CSR diverge |
| G13 | Error/miss swaps may omit VT `signal` / leaf abort discipline | Regresses soft-nav leak invariants |
| G14 | Guard throw → `error` event, no default page | Auth failures can look like blank nav |

---

## Goals / non-goals

### Goals

1. **One decision tree** for storage vs state persistence (when to use which; shared DB naming rules).
2. **Stable public contracts** for storage + state (types, docs, facade tests) without rewriting working adapters.
3. **Clear guard vocabulary** — platform feature-gates vs navigation guards; cross-links only.
4. **Default dock pages** for **404**, **5xx** (nav/handler failure), and optionally **offline**, with a documented **override ladder**: page → dock → optional app → built-in (dock/page-scoped, not global shell).
5. **Parity** — soft-nav and hard boot / hard refresh use the same miss/error resolution; swaps honor VT + AbortSignal.
6. **SSG-aware guidance** — what static hosts should serve for unknown paths vs what the CSR router paints inside docks.

### Non-goals

| Anti-pattern | Why |
| ------------ | --- |
| New global reactive framework / Redux clone | Store + derived + sync already fit Anza |
| Merging platform `guard` into `router.guard` | Different domains; rename would churn |
| Replacing SW `OfflineFallback` with CSR-only offline | Keep SW for cold navigations; CSR page is additive |
| Anza-owned production SSR error pages | Rejected product shape (SSG-SEO) |
| Bundler-driven code-splitting for error pages | Multi-file ESM; lazy `page` tags already gate |
| Perfect HTTP status mapping for every API `fetch` 5xx | API retries stay in `@adukiorg/anza/api`; this track is **navigation / dock UI** |
| Auto-generating branded 404 HTML into every SSG `dist/` path | Optional host glue later; not blocking CSR contract |

---

## Design

### A. Storage

**Keep** the tiered facade as the general-purpose persistence gateway.

```javascript
import { storage } from '@adukiorg/anza/storage';

storage.configure({
  idb: { name: 'app-db', version: 1, migrations: [/* … */] },
  lru: { maxSize: 200 },
  cache: { name: 'app-cache' }
});

await storage.set('session', data, { tier: 'idb', ttl: 60_000 });
const session = await storage.get('session'); // memory → idb
```

**Contract polish (phases):**

1. Align `library/types/core/storage/index.d.ts` with runtime (`configure`, options object, return types).
2. Document **when not** to use the facade: prefer `state.storage` for reactive-store snapshots keyed by store name; prefer Cache API tier for HTTP Response caching; prefer OPFS for large blobs.
3. **DB naming rule:** apps that use both must configure distinct IDB names (`storage.configure({ idb: { name } })` vs `state.storage.setDatabaseName(...)`). Default `platform-db` collision is a documented footgun → warn in troubleshooting; optional dev warning if both modules open the same name.
4. Optional additive: `storage.get/set(..., { signal })` abort in-flight IDB/OPFS where feasible — not required for v1 of this track.
5. Facade integration tests: configure → set/get/delete across tiers, TTL expiry, journal replay smoke, compression threshold.

**Non-goal for storage:** rewrite adapters or change default tier.

---

### B. State

**Keep** `state.create` / `derived` / `sync` / `PlatformStorage` as the reactive layer.

```javascript
import { state } from '@adukiorg/anza/state';

const store = state.create({ user: null, theme: 'system' }, { deep: true });
store.subscribe('user', (u) => { /* … */ }, ctrl.signal);

await state.storage.set('keyval', 'user', store.get('user'));
store.hydrate({ user: await state.storage.get('keyval', 'user') });
```

**Contract polish:**

1. Docs: **persist bridge pattern** — subscribe → debounce → `state.storage.set`; hydrate on boot before first paint when possible.
2. Clarify `offline.state` (connectivity) vs app `state.create` — rename in docs only (`offline.connectivity` narrative); no forced API rename unless a later offline plan owns it.
3. Optional helper (later phase): `state.persist(store, { keys, storage: 'state' | storageFacade, debounce })` — **only if** manual bridge proves too error-prone; prefer docs first.
4. Ensure derived `subscribe` documents AbortSignal parity (store already has it).

**UI binding:** continue to use component `watch` / props / explicit subscribe with `ctrl.signal` (MUTATIONS-EVENTS). No automatic store→DOM binding framework.

---

### C. Guards

Keep both APIs; **docs and glossary** make the split unmistakable:

| Name | Import | Job |
| ---- | ------ | --- |
| Feature guard | `import { guard, typeGuard, supports } from '@adukiorg/anza/platform'` | Capability + polyfill |
| Nav guard | `import { router } from '@adukiorg/anza/router'` · `page({ guard })` | Allow / redirect |

**Nav guard contract (unchanged shape, clearer failure UI):**

```javascript
router.guard(async (destination, controller) => {
  if (!authed() && destination.url.pathname.startsWith('/app')) return '/login';
});

page('/checkout', {
  tag: 'page-checkout',
  via: ['main'],
  guard: (destination) => cart.empty ? '/cart' : null
});
```

**Additions:**

1. Glossary blurb at top of `docs/router/guards.md` and `docs/platform/guards.md` pointing to the other.
2. When a nav guard **throws**, after `emit('error', { phase: 'guard' })`, run the **error-page resolver** (below) instead of silent return — unless `router.on('error')` handler calls `event.preventDefault?.()`-style opt-out (design: disposer flag or `router.errors.suppressDefault`).
3. Guards remain non-security boundaries (already documented).

Platform `guard.*` needs no API change in this track (escape/tooltip already shipped).

---

### D. Default dock / error pages — where they live & how routing selects them

#### Kinds

| Kind | Trigger | Default content |
| ---- | ------- | --------------- |
| `notfound` (404) | No route match (soft-nav + boot) | Shared library `DEFAULT_NOTFOUND_HTML` in `pages.js` (one copy for all docks) |
| `error` (5xx-class) | `phase` in `container` \| `guard` \| `handler` \| `navigation` \| `match` after emit | Shared library `DEFAULT_ERROR_HTML` |
| `offline` (optional) | Soft-nav attempted while `navigator.onLine === false` **or** explicit `router.pages.show('offline')` | Shared library `DEFAULT_OFFLINE_HTML`; SW document fallback remains for cold loads |

HTTP status numbers are **labels for authors**, not literal `Response.status` from the Navigation API. Map: unmatched → 404 UI; thrown/failed nav pipeline → 5xx UI; connectivity → offline UI.

Bare `dock('name')` wires **by reference** to these shared built-ins via the resolver — **not** by scaffolding HTML into each dock folder.

#### Override ladder (highest wins) — dock/page-scoped

See **Override story** above. Fallbacks are **not** a single global shell UI.

```text
1. Page/route   page({ error })
2. Dock         leaf→root; deepest dock that defines the kind (template)
3. App (optional)  router.pages.configure
4. Built-in
```

**Resolution:**

1. **Host** = deepest live dock in `via` / `lastVia` (leaf). Soft-nav never replaces the whole shell.
2. **Template** = route `error` → dock chain leaf→root → `configure` → built-in.
3. Optional `router.notFound` / `onError`: return `false` to fall through to auto-mount into the leaf host.
4. Materialize `{ tag }` / HTML into that host via `swap(..., { direction: 'replace', signal })`.

Fixes G6–G8 with dock-scoped host + custom view tags.

#### Selection vs soft-nav / SSG / VT / AbortSignal

| Context | Behavior |
| ------- | -------- |
| Soft-nav miss | Replace **leaf** inside deepest live dock; parents stay; pass leaf/`swap` `signal` from nav generation if available |
| Soft-nav error mid-swap | Prefer error leaf in same target dock; abort in-flight VT via existing `skipTransition` |
| Hard refresh miss | Boot resolver after gates; same templates; SSG did not emit a page for this URL |
| SSG Mode A/B | Unknown URLs: host returns 404 body **or** SPA `index.html` — document recommended host config; CSR still paints dock 404 after boot when shell loads |
| VT | Error/miss swaps use dock element-scoped VT; `transition: false` / reduced-motion honored |
| AbortSignal | Miss/error render must no-op if a newer navigation superseded them |

---

## Phased implementation

### Phase 0 — Contract freeze & docs truth (no behavior change except doc fixes)

- Glossary: platform vs router guards; storage vs `state.storage`.
- Fix docs that claim deepest-dock wins / list `notfound` on non-dock APIs — mark **as-intended after Phase 1** or align wording to current code temporarily.
- Inventory acceptance checklist in this file (below).
- Pointer from [NEXT.md](./NEXT.md).

**Done when:** authors can read one page and know which API to import; no silent doc lies about deepest-dock (either “bug known” note or fixed).

### Phase 1 — Miss/error resolver + 404 parity

- Extract `renderNotFound` → `renderPageKind(kind, ctx)` shared by navigate + boot.
- Implement deepest-configured-dock walk; honor `router.notFound` on boot.
- Add built-in `DEFAULT_ERROR_HTML`; call resolver on error phases (opt-out API).
- Dock config: `error` (+ keep `notfound`); types + `docs/router/docks.md`.
- Tests: boot miss + soft-nav miss; nested dock override; app handler wins.

**Done when:** G6–G7 fixed; 5xx-class failures show default or dock error UI; VT/signal smoke test green.

### Phase 2 — App `router.pages` + element tags

- `router.pages.configure({ notfound, error, offline? })`.
- Support `{ tag }` mounting via existing orchestrator/createElement path (not raw `innerHTML` only).
- Optional offline kind wired to connectivity (conservative: explicit show + optional auto on soft-nav fail).
- Keep `router.notFound` / `router.miss` as aliases / escape hatches.

**Done when:** an app can brand all three with custom elements without a global handler function.

### Phase 3 — Storage/state contract hardening

- Fix storage `.d.ts`; facade integration tests; troubleshooting for dual-DB.
- State persist bridge docs (+ optional helper only if needed).
- Cross-links from storage ↔ state ↔ router pages docs.

**Done when:** types compile against facade; facade tests cover happy path; docs decision tree published.

### Phase 4 — SSG / host guidance + optional goldens

- Document recommended static/Axum behavior for unknown paths (SPA fallback vs hard 404).
- Optional Mode B / fixture note for branded CSR 404 after shell load.
- Per-route `error` override if still demanded by real apps.

**Done when:** `docs/ssg` or `docs/router` states host vs CSR responsibilities; no requirement to bake 404 into every `dist/**` path.

---

## Acceptance criteria (track-level)

- [x] **Docs:** Glossary platform vs router guards; storage vs `state.storage`; [fallbacks.md](../docs/router/fallbacks.md) dock-scoped ladder.
- [x] **404:** Soft-nav and boot share resolver; leaf host + deepest dock template; nested-dock tests.
- [x] **5xx UI:** `fail()` renders error/offline leaf; route/dock/`configure` overrides.
- [x] **Overrides:** Page → dock → optional app → built-in; `{ tag }` custom views; escape hatch `return false`.
- [ ] **Soft-nav:** Explicit soft-nav orphan leak assertion for miss leaf (reuse soft-nav pattern) — follow-up.
- [x] **Storage types + facade tests** match runtime (configure / options smoke).
- [x] **No regression** intercept suite green with microtask flush.

---

## Risks / open questions

| ID | Question | Lean |
| -- | -------- | ---- |
| Q1 | Should `{ tag }` error pages be full `page()` routes (URL stays unmatched) or headless elements? | Headless elements mounted by resolver; URL stays the missed/failed URL |
| Q2 | Auto-show offline page on every soft-nav while offline, or only on fetch failure? | Prefer explicit / failure-driven to avoid fighting SW + chrome banners |
| Q3 | Map API module 5xx to dock error pages? | **No** by default — toast / inline; apps may bridge via `router.pages.show('error', detail)` |
| Q4 | Merge `PlatformStorage` into `@adukiorg/anza/storage`? | **No** in this track — document + naming; merge only if a later storage redesign owns it |
| Q5 | Rename platform `guard` to `ensure` / `polyfill`? | **No** — docs glossary only unless a breaking major is planned |
| Q6 | Should Axum serve branded `404.html` from `dist/`? | Optional host polish; CSR resolver is the product acceptance |
| Q7 | `innerHTML` for string templates vs sanitizer? | Reuse existing sanitize policy for untrusted strings; app-authored templates trusted like today |
| Q8 | Guard redirect loops + error page | Keep existing sync loop guards; error page must not re-enter navigate without replace |

---

## Test plan

| Area | Tests |
| ---- | ----- |
| Resolver | `library/tests/core/router/pages.test.js` (new): boot vs navigate miss; deepest dock; app handler; error phase render; opt-out |
| Soft-nav | Extend `soft-nav.test.js`: miss swap aborts leaf attachments; VT signal abort |
| Guards | Existing intercept/events tests + error-page-after-guard-throw |
| Storage | `storage/facade.test.js`: configure, tiers, TTL, compress smoke |
| State | Existing persist/store tests; doc-only bridge unless helper ships |
| Types | `tsc` / types runner already in tools — storage `.d.ts` must pass |

---

## Docs plan

| Doc | Change |
| --- | ------ |
| `docs/router/docks.md` | Optional `notfound` / `error` / `offline`; bare docks use library defaults |
| `docs/router/pages.md` or new `docs/router/fallbacks.md` | Shared built-ins + overrides + soft-nav/SSG; **no** copy-404-per-dock guidance |
| `docs/router/guards.md` | Glossary link to platform guards; error-page on throw |
| `docs/platform/guards.md` | Glossary link to router guards |
| `docs/router/events.md` | Error phases → default UI |
| `docs/storage/index.md` + troubleshooting | vs `state.storage`; DB naming |
| `docs/state/persist.md` | Bridge pattern; link storage facade |
| `docs/ssg/contract.md` or index | Host 404 vs CSR dock 404 |
| Web mirrors | Regenerated via existing docs pipeline / `tasks/docs.js` as usual |
| Fix drift | `docs/ui/api.md` — `notfound` is dock (and future `router.pages`), not generic `element` |

---

## Suggested library touch list (implementation later)

- `library/src/core/router/intercept.js` — resolver extraction, boot parity, error UI
- `library/src/core/router/pages.js` (new) — configure + defaults + kind registry
- `library/src/core/router/index.js` — export `pages` API
- `library/src/core/ui/defs/dock.js` — `error` / `offline` statics
- `library/types/core/router/index.d.ts`, `storage/index.d.ts`
- Tests under `library/tests/core/router/`, `storage/`
- Docs as above

---

## Out of scope reminders

- Bundlers ([issue #2](https://github.com/aduki-org/anza/issues/2))
- Mode B language packages
- Worker SPA→SSG prefer host polish
- Element kit visual redesign of error pages (apps own branding)
