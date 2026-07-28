# Phase 2 — Server-Side Rendering (SSR) & Native DOM Hydration

This document outlines the scope and design for Phase 2, focusing on browser-native Client DOM Adoption (hydration) for public routes that already ship contentful HTML.

**HTML production (SSG / Mode B) is specified in [plans/SSG-SEO.md](./SSG-SEO.md).** This file covers the **client adopt** path once that HTML exists. Tracking: [GitHub issue #3](https://github.com/aduki-org/anza/issues/3).

**Dependency:** Hydration work assumes [SSG-SEO.md](./SSG-SEO.md) Phase 1 HTML is present for public routes (`dist/<route>/index.html` with real meta + open DSD). Adopting an empty SPA shell is not a valid acceptance path for SEO routes.

---

## 1. Server-Side Template Compilation (SSR)

To support complete server pre-rendering, the **HTML emitter** (build-time SSG or any-language templates — see [SSG-SEO.md](./SSG-SEO.md) Mode A/B) needs to output the actual visual markup and encapsulated styling directly inside the HTML shell before any JavaScript loads:

### Layout Shell Compilation

- The emitter matches the requested URL against the route registry.
- It walks the container `via` chain (from `main` to the leaf page).
- For each container/dock/page:
  - It generates its custom tag (e.g., `<dock-main>`, `<page-profile>`).
  - It nests the template inside a `<template shadowrootmode="open">` element:

    ```html
    <page-profile id="123">
      <template shadowrootmode="open">
        <style>/* encapsulated component css */</style>
        <h2>Profile for User 123</h2>
      </template>
    </page-profile>
    ```

Anza does **not** own a production server runtime for this; Mode A SSG into `dist/` is the default, Mode B is the same HTML contract at request time.

---

## 2. Non-Destructive Client-Side DOM Adoption

Once the JavaScript loads, the browser upgrades the custom elements. The framework must adopt the existing DOM structure rather than clearing and recreating it:

### Bypassing `attachShadow()`

- [x] Update the custom element constructor to check for a pre-existing shadow root:

  ```javascript
  const shadowRoot = this.shadowRoot || this.attachShadow({ mode: 'open' });
  ```

- [x] If `this.shadowRoot` exists (from the parsed DSD template), **do not clone or append** the template markup.

### Context Rehydration

- [x] Run `createComponentContext` on the existing shadow root:
  - [x] Traverse the pre-existing DOM tree to parse and register `ref` mappings (`createRefs` scans `[ref]`).
  - [x] Warm the `TagsCache` query index with existing DOM element IDs (`prewarmTags` + `rehydrateTagsFromDom` when `adopted`).
  - [x] Bind delegated event listeners (`on`) and mutation observers (`watch`) on the pre-existing nodes (AbortSignal cleanup via `ctrl.signal`).

---

## 3. State Reconciliation & Hydration Safety

Avoid visual flashing and mismatched state bugs when client-side properties are initialized:

- [x] **Property-to-Attribute Syncing**: Custom elements check their initial attributes (set by the server/SSG) and sync them into their reactive backing store symbols during the constructor phase.
- [x] **Hydration Mismatches**: Sanity checks via `hasHydrationMismatch` (missing critical `ref`s / empty structure vs client template). One graceful re-render via `replaceShadowTemplate` + `hydrationFallbackMap` (no flash loop).

Acceptance tests for adopt / no-flash / mismatch fallback live in [SSG-SEO.md](./SSG-SEO.md) Phase 2 (`library/tests/core/ui/hydration.test.js`). Soft-nav vs full-load contract: `library/tests/core/ui/soft-nav.test.js`.

---

## 4. Client navigations (soft-nav vs full load)

| Path | What happens |
|------|----------------|
| **Full load / hard refresh** | Browser fetches SSG (Mode A) or Mode B HTML for that URL. Open DSD paints first; custom elements **adopt** existing shadows ( §§2–3 ). Orchestrator `found` with `direction: 'load'` **reuses** a matching leaf tag already in the leaf dock — it must not `swapView`/`replaceChildren` over adopted SEO content. |
| **Soft-nav** (in-app `<a href>` / `router.navigate`) | Client router intercepts; cascade keeps mounted parent docks; orchestrator **CSR-mounts** a new leaf when the page tag changes (`createElement` + `swapView`). New leaves have no DSD — CSR clone is correct. If a leaf somehow still has open DSD, the element constructor adopts it. |
| **Parent docks** | Stay mounted across soft-nav within the same `via` chain. Their adopted DSD (chrome / sidebar) must not be torn down when only the leaf swaps. |

**Rule of thumb:** full document navigation → contentful HTML again; soft-nav → client router may CSR-mount the leaf only.

---

## 5. Public routes & SEO

Target public pages to improve search indexing:

- **Public route isolation**: Identify routes that do not require authentication (e.g., `/` or `/docs`) via `routes.json` `public` / `ssg` flags — see [SSG-SEO.md](./SSG-SEO.md) Phase 1.
- **Contentful HTML for everyone**: Public routes receive the same contentful HTML (meta + body + open DSD) for all clients — browsers and crawlers alike. No User-Agent branching.

~~**Crawler Detection**: Enable SSR dynamically for search crawler User-Agents (Googlebot, Bingbot, etc.) while allowing lightweight SPA shells for authenticated user sessions.~~

**Rejected:** crawler UA detection / “SPA for users, SSR for bots.” That approach risks cloaking and is not the product. See [SSG-SEO.md](./SSG-SEO.md) Decision log.
