# Full-Page SSR & Open Declarative Shadow DOM

A page render returns a complete HTML document. Templates can use open
Declarative Shadow DOM (`<template shadowrootmode="open">`) so that shadow roots
exist before any JavaScript runs.

## 1. Open Declarative Shadow DOM

```html
<dock-main>
  <template shadowrootmode="open">
    <style>
      :host { display: block; padding: 2rem; }
    </style>
    <slot></slot>
  </template>
  <div class="page-content">
    <h1>Rendered on the server</h1>
  </div>
</dock-main>
```

When the browser parses this HTML it attaches a `ShadowRoot` to `<dock-main>`
during parsing, so scoped styles apply before scripts load, and the light-DOM
content is visible to crawlers. A custom element defined later finds the existing
root in `this.shadowRoot` instead of creating a new one.

The engine itself does not add shadow roots to your templates (except in the
fallback document below). Write the `<template shadowrootmode="open">` markup in
your templates, or build it with `anza::render::page::wrap_dsd(tag, inner_html,
shadow_content)`.

## 2. Rendering a page

```rust
use anza::Page;

let doc = Page::new("/article")
  .param("title", "Deep Dive into STUI")
  .param("author", "Alex Rivera")
  .run(&engine)?;

// doc.html holds the full document; doc.as_str() and doc.into_bytes() also work.
```

`Engine::render_page` (`src/render/page/compile.rs`) does this:

1. Map the route to a template: `/` → `pages/home.html`, `/article` →
   `pages/article.html`. If that is missing, try `article.html`, then
   `pages/index.html`.
2. Bind the page template with the params. If no page template exists, the
   content is `<div class="content">Route: <route></div>` (the route is inserted
   unescaped).
3. If `layout/shell.html` exists, bind it with the same params plus `content` and
   `slot_main` set to the page HTML.
4. Otherwise emit a minimal `<!DOCTYPE html>` document whose `<body>` holds a
   `<dock-main>` with an open shadow root and the page content.

The route is used as is: there is no route-parameter matching (`/article/my-slug`
looks for `pages/article/my-slug.html`).
