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

## 3. Page pipeline

`Engine::render_page` (`src/render/page/compile.rs`) runs the same pipeline
as the TypeScript and Python engines:

1. Map the route to a template under `pages/`: `/` (or an empty route) →
   `pages/home.html`, `/article` and `/article/` → `pages/article.html`,
   `/a/b` → `pages/a/b.html`.
2. If that template doesn't exist, use `pages/index.html` as the catch-all.
3. Otherwise, or when the route is malformed (`..`, `\`, NUL), return
   `Error::NotFound("Page not found")`. The route is never echoed into the
   output or the error. Routes only resolve under `pages/`, so a route can't
   render a fragment, a layout or any other template.
4. Bind the page template with the params. If `layout/shell.html` exists,
   bind it with the same params plus `content` set to the page HTML (the
   engine's `content` wins over a param of that name). Otherwise emit the
   default document below.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Anza App</title>
</head>
<body>
  <dock-main>
    <template shadowrootmode="open">
      <slot></slot>
    </template>
    <!-- page -->
  </dock-main>
</body>
</html>
```

A minimal shell:

```html
<!DOCTYPE html>
<html lang="en">
<head><title>{{title}}</title></head>
<body>
  <dock-main>{{{content}}}</dock-main>
</body>
</html>
```

`{{{content}}}` is always raw. With `setup.escape = true`, `{{content}}` would
escape the page HTML, so use the triple-brace form in shells.

To answer unknown routes with a 404, match the error:

```rust
match Page::new(path).run(&engine) {
  Ok(doc) => Ok(doc),
  Err(anza::Error::NotFound(_)) => Err(StatusCode::NOT_FOUND),
  Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
}
```

There is no route-parameter matching: `/article/my-slug` looks for
`pages/article/my-slug.html`, then falls back to `pages/index.html`.
