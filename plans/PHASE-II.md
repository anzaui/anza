# Phase 2 — Server-Side Rendering (SSR) & Native DOM Hydration

This document outlines the scope and design for Phase 2, focusing on full Server-Side Template Rendering (SSR) and browser-native Client DOM Adoption (hydration) for public routes and search engine crawlers.

---

## 1. Server-Side Template Compilation (SSR)

To support complete server pre-rendering, the server needs to output the actual visual markup and encapsulated styling directly inside the HTML shell before any JavaScript loads:

### Layout Shell Compilation

- The server matches the requested URL against the route registry.
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

---

## 2. Non-Destructive Client-Side DOM Adoption

Once the JavaScript loads, the browser upgrades the custom elements. The framework must adopt the existing DOM structure rather than clearing and recreating it:

### Bypassing `attachShadow()`

- Update the custom element constructor to check for a pre-existing shadow root:

  ```javascript
  const shadowRoot = this.shadowRoot || this.attachShadow({ mode: 'open' });
  ```

- If `this.shadowRoot` exists (from the parsed DSD template), **do not clone or append** the template markup.

### Context Rehydration

- Run `createComponentContext` on the existing shadow root:
  - Traverse the pre-existing DOM tree to parse and register `ref` mappings.
  - Warm the `TagsCache` query index with existing DOM element IDs.
  - Bind delegated event listeners (`on`) and mutation observers (`watch`) on the pre-existing nodes.

---

## 3. State Reconciliation & Hydration Safety

Avoid visual flashing and mismatched state bugs when client-side properties are initialized:

- **Property-to-Attribute Syncing**: Custom elements should check their initial attributes (set by the server) and sync them into their reactive backing store symbols during the constructor phase.
- **Hydration Mismatches**: Implement sanity checks. If the client template differs from the server template, fall back gracefully by re-rendering the shadow root.

---

## 4. Crawlers & SEO Optimization

Target public pages to improve search index indexing:

- **Public Route Isolation**: Identify routes that do not require authentication (e.g., `/` or `/docs`).
- **Crawler Detection**: Enable SSR dynamically for search crawler User-Agents (Googlebot, Bingbot, etc.) while allowing lightweight SPA shells for authenticated user sessions.
