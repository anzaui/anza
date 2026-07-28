# Hydration (DSD adopt)

When a public route ships contentful HTML with open Declarative Shadow DOM (DSD), Anza **adopts** that tree on upgrade instead of clearing and re-cloning. That is the Phase 2 client path for [SSG / Mode B HTML](../ssg/contract.md).

Anza does **not** own a production Node SSR runtime. HTML comes from Mode A (`anza build` / `anza dev` SSG) or Mode B (any-language templates). The client only adopts what is already in the document.

---

## Boot sequence

1. Parser attaches open DSD → first paint with content and encapsulated styles (no JS).
2. Import map + `modulepreload` warm the route graph.
3. Entry module loads; custom elements upgrade.
4. Constructor: `this.shadowRoot || attachShadow({ mode: 'open' })`. If a shadow already exists, keep it.
5. Attr → prop sync from SSG attributes; rehydrate `ref`s, tags cache, `on`, and `watch`.
6. Soft-nav may CSR-mount a new leaf; full load / hard refresh hits contentful HTML again.

---

## Adopt, don’t wipe

```javascript
// Conceptual — done inside the element factory
const shadowRoot = this.shadowRoot || this.attachShadow({ mode: 'open' });
// If adopted: do NOT clone the client template over existing DSD nodes
```

Also handled:

- **Light-DOM DSD polyfill** — if native DSD did not attach, a lingering `<template shadowrootmode="open">` is consumed into an attached shadow.
- **Styles** — constructable sheets are assigned without removing DSD children; fallback `<style>` is skipped when DSD already shipped styles.
- **Mismatch** — if the adopted tree fails hard sanity checks vs the client template (missing critical `ref`s / empty structure), one graceful re-render runs. No flash loop.

---

## Soft-nav vs full load

| Path | Behavior |
| ---- | -------- |
| **Full load / hard refresh** | Browser fetches SSG or Mode B HTML. Orchestrator reuses a matching leaf already in the dock — it must not wipe adopted SEO content. |
| **Soft-nav (same via chain)** | Client router keeps parent docks; CSR-mounts a new leaf when the page tag changes. Fetches the **page fragment** (`template.html` when SSG collided with `./index.html`), never the full SSG document. New leaves have no DSD (CSR clone is correct). Adopt rebinds `on` / `watch` on the live shadow; the **old** leaf’s `disconnectedCallback` → `ctrl.abort()` tears down its listeners and observers. |
| **Parent docks** | Stay mounted across soft-nav in the same `via` chain; their adopted chrome is not torn down. Nested docs chrome is typically `main` → `docs` (`dock-docs`) → `content` (`dock-doccontent`). |

Document / `#main` / `body` attachments belong only to named framework globals (`router.nav-click`, `router.container-mo`, `popover.*`) — not leaf `mount` code.

`sanitizeTemplateHtml` refuses a full HTML document (doctype / `<html>` / nested `dock-main` / `dock-docs`) as a page template so a mis-pointed fragment path cannot stack docks inside the leaf.

---

## Safe to import anywhere

`element()` / `page()` / `dock()` check for `customElements` before defining. In non-browser environments:

- `element()` is a no-op
- `template()` returns a frozen empty object
- `observe` factories return no-op disposers
- `transition()` returns a resolved promise

Define elements in the browser graph that upgrades SSG HTML; the factory itself is safe to import during build tooling.

---

## Related

- [Page HTML contract](../ssg/contract.md) — Mode A / Mode B shape the client expects
- [Lifecycle](lifecycle.md) — mount / connect after adopt
- [Context](context.md) — `refs`, `tags`, `on`, `watch` after rehydrate
- Planning: [PHASE-II.md](../../plans/PHASE-II.md), [SSG-SEO.md](../../plans/SSG-SEO.md)
