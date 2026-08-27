# Next after Phase 2 / issue #3

Issue [#3](https://github.com/aduki-org/anza/issues/3) is **closed**. Client adopt (Phase 2) and SSG Mode A/B core (Phases 0–3) shipped. Canonical SSG tracker: [SSG-SEO.md](./SSG-SEO.md).

---

## SSG / SEO — remaining phases checklist

Canonical detail + acceptance criteria: [SSG-SEO.md](./SSG-SEO.md) (status table + Phases 4–6).

### Done (brief)

| Phase | What |
|-------|------|
| **0** | Portable site-root URLs (no baked `/dist/` in production artifacts) |
| **1** | Mode A SSG: contentful HTML + open DSD per public route into `dist/` |
| **2** | Client hydrate: adopt DSD; soft-nav swaps page leaf only; mismatch fallback |
| **3** | Mode B contract (`docs/ssg/contract.md`), goldens, `examples/mode-b-*`, `tasks/ssg-contract-check.js` |
| **4** | Nested docks light-DOM after open DSD; `template.html` fragment coexistence; Axum prefers SSG; `sanitizeTemplateHtml` |
| **5** | Parametric Mode A expansion: `ssg.expand` / `ssg.params.json` → concrete `dist/<path>/index.html`; unexpanded stay `ssg: false` |
| **6** | SEO extras: `ssg.json` origin, sitemap/robots, absolute canonicals, JSON-LD, corpus closed-DSD CI gate |

Also shipped alongside: theme via `@anzaui/anza/theme`; issue #3 closed.

### Remaining (priority order)

**SSG/SEO track complete** (Phases **0–6** verified; **no Phase 7**). See [SSG-SEO.md](./SSG-SEO.md) Status.

Residual optional SSG host polish only (not product phases):

| Item | Status |
|------|--------|
| Worker `/dist/` strip | **Already removed** from `web/worker.js` |
| Worker SPA fallback → try SSG `pathname/index.html` first | Optional Cloudflare host glue; acceptance stays plain static `dist/` serve |
| Mode B npm / language packages | Demand-driven |

### Explicit non-goals / deferred

| Item | Why deferred |
|------|----------------|
| Mode B npm / language packages | Phase 3 acceptance was contract + examples only |
| Anza-owned production SSR runtime | Rejected — Mode A SSG + any-lang Mode B |
| Crawler UA cloaking / empty SPA for humans | Rejected (decision log) |
| Mega-bundle for LCP | Rejected — multi-file ESM + preload |
| Worker `/dist/` strip as product fix | Already removed; was host glue only — Phase 0 portable URLs are the gate |
| Worker SPA→SSG prefer on Cloudflare | Optional host polish; not a numbered SSG phase |
| External bundlers | **Deferred** — separate track → [#2](https://github.com/aduki-org/anza/issues/2); do not start bundler work from this plan |
| Residual docs nav 404s from new element routes | Elements docs / sidebar inventory — not SSG pipeline ([ELEMENTS.md](./ELEMENTS.md)) |

---

## Recommended next **product** phase (after SSG 0–6)

**Prefer: full element library documentation** (`library/src/elements/` → docs + web docs) — **shipped** (Phases 1–5; see [ELEMENTS.md](./ELEMENTS.md)).

**Status (2026-07-28):** ELEMENTS Phases 1–5 done + overlay per-tag Full pages + tooltip escape helper — see [ELEMENTS.md](./ELEMENTS.md). Inventory **46 Full / 0 Listed**. Mutations & Events track is **complete** ([MUTATIONS-EVENTS.md](./MUTATIONS-EVENTS.md)). SSG/SEO Phases **0–6** complete ([SSG-SEO.md](./SSG-SEO.md)). View Transitions for docks + schedule AbortSignal **shipped** ([VIEW-TRANSITIONS.md](./VIEW-TRANSITIONS.md)).

| Option | Why now / why later |
| ------ | ------------------- |
| **Element library docs** | **Done** — 46 Full (including overlay kit) + Overlay patterns; tooltip uses `escapeOverflow`. |
| **Storage / state / guards / default dock pages** | **Next product track** — harden storage↔state contracts, clarify platform vs router guards, finish 404/5xx/offline dock defaults + override ladder. Canonical plan: [STORAGE-STATE-GUARDS-PAGES.md](./STORAGE-STATE-GUARDS-PAGES.md). |
| **Project structure contract** | **Complete (Phases 0–5)** — doctor/check, via/dock, DX, `anza generate`. Canonical plan: [STRUCTURE.md](./STRUCTURE.md). |
| **Docs generator (MD → `dist/`)** | **Tooling track — Phase 0–1 MVP** — `docs/` + `docs/config.toml` → `anza docs` → test dist `tmp/docs-site/` (not live `web/`). Folder assets; no hand-maintained docs tree. Canonical: [DOCS-GENERATOR.md](./DOCS-GENERATOR.md). |
| **Bundlers / compilers** ([issue #2](https://github.com/aduki-org/anza/issues/2)) | **Deferred** — tooling DX; product bet stays multi-file ESM. Do not work on bundlers from this plan. |
| **Mode B language packages** | Demand-driven; not required for SEO contract. |
| **Worker SPA→SSG prefer** | Optional Cloudflare host polish only; `/dist/` strip already gone. |
| **View Transitions** | **Done** — element-scoped dock VT, CSS groups, fallback, schedule signals ([VIEW-TRANSITIONS.md](./VIEW-TRANSITIONS.md)). |

**Rationale:** SSG/SEO delivery is complete through Phase 6 (no Phase 7). Element kit docs are complete (46 Full). Bundlers stay deferred ([#2](https://github.com/aduki-org/anza/issues/2)). Preferred next **product** engineering track is [STORAGE-STATE-GUARDS-PAGES.md](./STORAGE-STATE-GUARDS-PAGES.md). Tooling track [STRUCTURE.md](./STRUCTURE.md) is **complete** (Phases 0–5). Parallel tooling track (dist-first docs site from markdown): [DOCS-GENERATOR.md](./DOCS-GENERATOR.md) (plan only). Mode B packages remain demand-driven; not Worker/host polish and not bundlers.

---

## Draft closing comment for issue #3

*(Already posted / issue closed — kept for history.)*

```markdown
## Closing — Phase 2 / SSR & Native DOM Hydration

Core scope from this issue and [plans/PHASE-II.md](https://github.com/aduki-org/anza/blob/main/plans/PHASE-II.md) is complete. Product shape evolved to **SSG / Mode B HTML + client DSD adopt** (not an Anza-owned Node SSR runtime, and not crawler UA detection — rejected in [plans/SSG-SEO.md](https://github.com/aduki-org/anza/blob/main/plans/SSG-SEO.md)).

### Done
- Adopt existing open DSD (`this.shadowRoot || attachShadow`); no wipe on hard refresh
- Context rehydrate: refs, TagsCache, `on`, `watch`; attr → prop sync; one-shot mismatch fallback
- Soft-nav leaf swap vs full-load reuse (parent docks kept)
- Light-DOM DSD polyfill path
- Mode A SSG + Mode B HTML contract, goldens, Python/Go/Node examples
- Docs: `docs/ui/hydration.md`, `docs/ssg/contract.md` (+ web docs routes)
- Tests: `library/tests/core/ui/hydration.test.js`, `soft-nav.test.js`

### Explicitly out of scope (do not reopen for these)
- Mode B npm/language packages beyond the contract examples
- External bundler integration → [#2](https://github.com/aduki-org/anza/issues/2)
- Full `src/elements/` documentation → next phase ([plans/NEXT.md](https://github.com/aduki-org/anza/blob/main/plans/NEXT.md))
- Nested-dock / `template.html` polish → SSG-SEO Phase 4 (**done** 2026-07-28)

Closing this issue. Follow-ups belong in new issues or NEXT.md / SSG-SEO.md.
```
