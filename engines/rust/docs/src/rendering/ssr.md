# Full-Page SSR & Open Declarative Shadow DOM

Server-Templated UI (STUI) renders complete HTML documents wrapped with Open Declarative Shadow DOM (`<template shadowrootmode="open">`).

## 1. How Open Declarative Shadow DOM Works

Declarative Shadow DOM allows server-rendered HTML to define scoped shadow trees without requiring JavaScript execution in the browser.

```html
<!-- Server-Rendered Output -->
<dock-main>
  <template shadowrootmode="open">
    <style>
      :host { display: block; padding: 2rem; }
    </style>
    <slot></slot>
  </template>
  <div class="page-content">
    <h1>Sub-millisecond First Contentful Paint</h1>
  </div>
</dock-main>
```

When the browser parses this HTML:
1. It attaches a `ShadowRoot` to `<dock-main>` immediately during HTML streaming.
2. Scoped styles apply instantly before JavaScript bundles are fetched or executed.
3. Search engines (Googlebot, Bing) crawl the light-DOM slot content directly.

## 2. Non-Destructive Client-Side Adoption

When custom element JavaScript initializes later:

```javascript
class DockMain extends HTMLElement {
  connectedCallback() {
    // Adopts existing server-rendered shadowRoot without re-mounting or flashing!
    const shadow = this.shadowRoot;
  }
}
customElements.define('dock-main', DockMain);
```

No Virtual DOM reconciliation, no layout shifts (CLS = 0), and zero hydration tax.

## 3. Invoking SSR in Rust

Located in `src/render/page/compile.rs`:

```rust
use anza::render::page::compile as render_page;

let doc = render_page(&engine, "/article/my-slug", &[
  ("title", "Deep Dive into STUI"),
  ("author", "Alex Rivera"),
])?;

// doc.html contains the full <!DOCTYPE html> document
```

The compiler resolves the page template (`pages/article.html`), wraps it in `layout/shell.html`, and injects the parameters into both page and shell slots.
