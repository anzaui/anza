# Element library documentation

Planning document for documenting the shipped custom elements under `library/src/elements/`. Complements [NEXT.md](./NEXT.md) (recommended next phase after SSG / hydration).

**Related:** CHANGELOG Planned · `library/importmap.json` · `library/src/elements/index.js` · [MUTATIONS-EVENTS.md](./MUTATIONS-EVENTS.md) (lifecycle contract — **complete**)

---

## Goal / non-goals

### Goals

- **Discoverable element kit** — every shipped element has a tag, import path, and docs status.
- **Import map clarity** — document `@anzaui/anza/elements/<name>` (and the barrel).
- **Solid Phase 1 foundation** — index + category overviews + a few full reference pages; remaining elements listed as stubs / TODO.

### Non-goals (this phase)

| Anti-pattern | Why |
|--------------|-----|
| Perfect props API for all 46 elements in one pass | Too large; inventory + samples first |
| Interactive live playground / Storybook | Out of scope; `view-code` examples are enough |
| Renaming tags or changing element APIs | Docs-only phase |
| Replacing `docs/ui/elements.md` | That page documents the `element()` **factory**, not the kit |

---

## Inventory (source of truth)

All tags are `ui-*`. Package imports come from `library/importmap.json`.

| Category | Element | Tag | Import | Docs status |
|----------|---------|-----|--------|-------------|
| primitives | button | `ui-button` | `@anzaui/anza/elements/button` | **Full** (Phase 1) |
| primitives | icon | `ui-icon` | `@anzaui/anza/elements/icon` | **Full** (Phase 2) |
| primitives | badge | `ui-badge` | `@anzaui/anza/elements/badge` | **Full** (Phase 2) |
| primitives | avatar | `ui-avatar` | `@anzaui/anza/elements/avatar` | **Full** (Phase 2) |
| primitives | divider | `ui-divider` | `@anzaui/anza/elements/divider` | **Full** (Phase 2) |
| primitives | text | `ui-text` | `@anzaui/anza/elements/text` | **Full** (Phase 2) |
| primitives | link | `ui-link` | `@anzaui/anza/elements/link` | **Full** (Phase 2) |
| primitives | spinner | `ui-spinner` | `@anzaui/anza/elements/spinner` | **Full** (Phase 2) |
| forms | input | `ui-input` | `@anzaui/anza/elements/input` | **Full** (Phase 1) |
| forms | textarea | `ui-textarea` | `@anzaui/anza/elements/textarea` | **Full** (Phase 2) |
| forms | select | `ui-select` | `@anzaui/anza/elements/select` | **Full** (Phase 2) |
| forms | checkbox | `ui-checkbox` | `@anzaui/anza/elements/checkbox` | **Full** (Phase 2) |
| forms | radio | `ui-radio` | `@anzaui/anza/elements/radio` | **Full** (Phase 2) |
| forms | toggle | `ui-toggle` | `@anzaui/anza/elements/toggle` | **Full** (Phase 2) |
| forms | field | `ui-field` | `@anzaui/anza/elements/field` | **Full** (Phase 2) |
| forms | upload | `ui-upload` | `@anzaui/anza/elements/upload` | **Full** (Phase 2) |
| forms | form | `ui-form` | `@anzaui/anza/elements/form` | **Full** (Phase 2) |
| overlay | dialog | `ui-dialog` | `@anzaui/anza/elements/dialog` | **Full** (Phase 1) |
| overlay | popover | `ui-popover` | `@anzaui/anza/elements/popover` | **Full** |
| overlay | tooltip | `ui-tooltip` | `@anzaui/anza/elements/tooltip` | **Full** (escape helper) |
| overlay | menu | `ui-menu` | `@anzaui/anza/elements/menu` | **Full** |
| overlay | drawer | `ui-drawer` | `@anzaui/anza/elements/drawer` | **Full** |
| overlay | sheet | `ui-sheet` | `@anzaui/anza/elements/sheet` | **Full** |
| feedback | alert | `ui-alert` | `@anzaui/anza/elements/alert` | **Full** (Phase 1) |
| feedback | toast | `ui-toast` | `@anzaui/anza/elements/toast` | **Full** (Phase 3) |
| feedback | progress | `ui-progress` | `@anzaui/anza/elements/progress` | **Full** (Phase 3) |
| feedback | skeleton | `ui-skeleton` | `@anzaui/anza/elements/skeleton` | **Full** (Phase 3) |
| feedback | empty | `ui-empty` | `@anzaui/anza/elements/empty` | **Full** (Phase 3) |
| data | table | `ui-table` | `@anzaui/anza/elements/table` | **Full** (Phase 4) |
| data | list | `ui-list` | `@anzaui/anza/elements/list` | **Full** (Phase 4) |
| data | card | `ui-card` | `@anzaui/anza/elements/card` | **Full** (Phase 4) |
| data | chart | `ui-chart` | `@anzaui/anza/elements/chart` | **Full** (Phase 4) |
| data | stat | `ui-stat` | `@anzaui/anza/elements/stat` | **Full** (Phase 4) |
| navigation | nav | `ui-nav` | `@anzaui/anza/elements/nav` | **Full** (Phase 4) |
| navigation | tabs | `ui-tabs` | `@anzaui/anza/elements/tabs` | **Full** (Phase 1) |
| navigation | breadcrumb | `ui-breadcrumb` | `@anzaui/anza/elements/breadcrumb` | **Full** (Phase 4) |
| navigation | pagination | `ui-pagination` | `@anzaui/anza/elements/pagination` | **Full** (Phase 4) |
| navigation | steps | `ui-steps` | `@anzaui/anza/elements/steps` | **Full** (Phase 4) |
| layout | app | `ui-app` | `@anzaui/anza/elements/app` | **Full** (Phase 4) |
| layout | header | `ui-header` | `@anzaui/anza/elements/header` | **Full** (Phase 4) |
| layout | sidebar | `ui-sidebar` | `@anzaui/anza/elements/sidebar` | **Full** (Phase 4) |
| layout | stack | `ui-stack` | `@anzaui/anza/elements/stack` | **Full** (Phase 4) |
| layout | grid | `ui-grid` | `@anzaui/anza/elements/grid` | **Full** (Phase 4) |
| layout | split | `ui-split` | `@anzaui/anza/elements/split` | **Full** (Phase 4) |
| layout | scroll | `ui-scroll` | `@anzaui/anza/elements/scroll` | **Full** (Phase 4) |
| layout | surface | `ui-surface` | `@anzaui/anza/elements/surface` | **Full** (Phase 4) |

**Totals:** 46 elements · **46 full** · **0 listed**.

Also: barrel `@anzaui/anza/elements` → `library/src/elements/index.js`.

---

## Architecture summary

```
docs/elements/                  Markdown source of truth
  index.md                      Overview + import + inventory
  {category}.md                 Category overview (list + status)
  button.md | input.md | …      Full pages (Phase 1 samples)

web/src/docs/elements/          Anza page() routes (SSG)
  index/ | primitives/ | …      Scaffold
  button/ | input/ | …          Full pages

Sidebar "Elements" group        docks/docs/index.html
docs/index.md + docs entry      Cross-links
```

**Import pattern (documented everywhere):**

```javascript
import '@anzaui/anza/elements/button';   // registers <ui-button>
// or
import '@anzaui/anza/elements';          // full kit
```

---

## Phase 1 — Scaffold + samples (this pass)

### Objective

Ship a navigable Elements docs section with inventory, category overviews, and 5 representative full pages. Remaining elements stay listed-only with TODO in this plan.

### Deliverables

- [x] **Inventory** — tag + import path + status table (above)
- [x] **Plan** — this file (`plans/ELEMENTS.md`)
- [x] **Markdown** — `docs/elements/index.md` + 7 category overviews + 5 full pages
- [x] **Web routes** — `web/src/docs/elements/**` with `page()`, `via: ['main','docs','content']`, `shared.css`, SEO titles
- [x] **Sidebar + entry** — "Elements" group; links from `docs/index.md` and docs landing
- [x] **Build** — `cd web && npm run build` includes new SSG pages

### Full pages (Phase 1)

| Page | Route | Why representative |
|------|-------|--------------------|
| Button | `/docs/elements/button` | Primitive + form-associated |
| Input | `/docs/elements/input` | Forms + validation |
| Dialog | `/docs/elements/dialog` | Overlay / native `<dialog>` |
| Alert | `/docs/elements/alert` | Feedback / ARIA live |
| Tabs | `/docs/elements/tabs` | Navigation / slots + keyboard |

### Acceptance tests

1. `docs/elements/index.md` lists all 46 elements with tag, import, and status.
2. Sidebar has an **Elements** group with Overview, categories, and the 5 full pages.
3. curl / View Source of `/docs/elements/index/` and each full page shows unique `<title>`, open DSD, and an `<h1>`.
4. Full pages document purpose, import, basic `view-code` usage, and key props from source.
5. Remaining elements are clearly "TODO" / listed-only — not fake empty "full" pages.

### NOT done if…

- Only markdown exists with no web routes / SSG
- Sidebar never links Elements
- Full pages omit import path or basic usage

---

## Phase 2 — Complete primitives + forms (done)

- [x] Full pages for remaining primitives (icon, badge, avatar, divider, text, link, spinner)
- [x] Full pages for remaining forms (textarea, select, checkbox, radio, toggle, field, upload, form)
- [x] Acceptance: each has purpose, import, usage, props; inventory status updated to Full

## Phase 3 — Feedback (done) + overlay patterns

- [x] Full page for toast (+ `show` / `showToast` helper)
- [x] Full pages for remaining feedback (progress, skeleton, empty)
- [x] Overlay **patterns / architecture** page (`docs/elements/overlay.md`) — native popover/menu (`showPopover`), dialog/drawer/sheet (`showModal`), tooltip escape via `escapeOverflow` / `guard.escape`, toast as deliberate `document.body` portal exception
- [x] Overlay per-tag Full pages (popover, tooltip, menu, drawer, sheet) — thin props + usage + link to Overlay patterns (2026-07-28)

## Phase 4 — Data + navigation + layout (done)

- [x] Full pages for data (table, list, card, chart, stat)
- [x] Full pages for remaining navigation (nav, breadcrumb, pagination, steps)
- [x] Full pages for layout (app, header, sidebar, stack, grid, split, scroll, surface)
- [x] Acceptance: each has purpose, import, usage, props; inventory status updated to Full; barrel + sidebar wired

## Phase 5 — Polish (done 2026-07-28)

- [x] Cross-links from UI docs (`docs/ui/forms.md`, `elements.md`, `advanced.md`, `index.md`) and events troubleshooting → kit / overlay patterns
- [x] Light `::part` / deeper notes where thin and high-value (dialog, select, overlay parts table) — not every page
- [x] CHANGELOG: move full element library documentation from Planned → Added
- [x] Stamp this file + [NEXT.md](./NEXT.md)

## Follow-up (2026-07-28) — Overlay Full + tooltip escape

- [x] Thin Full pages for popover, tooltip, menu, drawer, sheet (props + usage + Overlay patterns)
- [x] Platform `escapeOverflow` / `guard.escape`; `ui-tooltip` uses popover + fixed fallback (not body portal)
- [x] Tests: `escape.test.js`, `tooltip.test.js`
- [x] Inventory → **46 Full**; bundlers stay deferred in [NEXT.md](./NEXT.md) / [#2](https://github.com/anzaui/anza/issues/2)

**Related:** lifecycle / soft-nav ownership contract is complete in [MUTATIONS-EVENTS.md](./MUTATIONS-EVENTS.md) (closed track).

## Follow-up (2026-07-29) — Comprehensive web HTML pass

- [x] Audited all 46 shipped elements against `library/importmap.json` — **0 missing**
- [x] Enhanced every `web/src/docs/elements/<name>/index.html` with advanced `view-code` samples, slots/parts tables, lifecycle/memory notes where relevant, and sibling cross-links
- [x] Navigation already wired: `web/src/docs/elements/index.js` barrel, `web/src/docks/docs/index.html` sidebar (46 elements + 7 category overviews + overlay patterns)
- [x] Inventory remains **46 Full** · **0 listed**

---

## Decision log

| Decision | Status | Notes |
|----------|--------|--------|
| Docs live under `docs/elements/` (not under `docs/ui/`) | **Accepted** | UI docs = factory; Elements = shipped kit |
| Phase 1 = scaffold + 5 full samples | **Accepted** | Matches NEXT.md "highest user-facing gap" without boiling the ocean |
| Status column in inventory | **Accepted** | Honest Listed until a Full page ships |
| Side-effect import as primary pattern | **Accepted** | Matches import map + element registration |
| Overlay / body-portal approach | **Accepted (2026-07-28)** | No shared overlay portal. Native top-layer for popover/menu + dialog/drawer/sheet; toast alone portals to `body`. |
| Overlay per-tag Full pages | **Accepted (2026-07-28)** | Thin Full routes for popover/tooltip/menu/drawer/sheet (props + usage + Overlay patterns link). |
| Tooltip overflow escape | **Accepted (2026-07-28)** | Library `escapeOverflow` / `guard.escape` (popover top-layer + fixed fallback); not CSS-only and not a body-portal rewrite. |

---

## Implementer quick-start order

1. Keep inventory in this file in sync with `library/importmap.json`.
2. Add/adjust markdown under `docs/elements/`.
3. Mirror as `web/src/docs/elements/<route>/` with `page()` + SEO (or `node tasks/docs.js`).
4. Wire sidebar + docs index/entry.
5. `cd web && npm run build` and spot-check SSG HTML.
6. Flip inventory status to **Full** only when a page has purpose + import + usage + props.
