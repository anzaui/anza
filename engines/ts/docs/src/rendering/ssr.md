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

The engine does not add shadow roots to your templates (except in the fallback
document below); write the `<template shadowrootmode="open">` markup yourself.

## 2. Rendering a page

```typescript
import { Page, htmlResponse } from '@anzaui/engine';

const doc = await new Page('/article', {
  title: 'Deep Dive into STUI',
  author: 'Alex Rivera',
}).run(engine);

// doc.html holds the full document
const response = htmlResponse(doc);
```

`engine.renderPage` (`src/render/page.ts`) runs one pipeline, the same in the
Rust and Python engines:

1. Map the route to a template with `pageTemplate(route)`: `/` →
   `pages/home.html`, `/article` and `/article/` → `pages/article.html`.
2. If that template is not loaded, use `pages/index.html` as the catch-all
   when it exists.
3. Otherwise, or when the route is not a valid name (`..`, `\`, NUL), reject
   with an `AnzaError` of code `NOT_FOUND` and the message `Page not found`.
   The route is never echoed into the error or the HTML.
4. Bind the page template with the params. If `layout/shell.html` exists, bind
   it with the params plus `content` set to the page HTML (the engine's
   `content` wins over a `content` param). Otherwise emit a minimal
   `<!DOCTYPE html>` document whose `<body>` holds a `<dock-main>` with an
   open shadow root and the page content.

Routes only resolve under `pages/`: a route can't render a fragment, a layout
or any other template. There is no route-parameter matching
(`/article/my-slug` looks for `pages/article/my-slug.html`). Map an unknown
route to a 404 yourself:

```typescript
import { AnzaError, Page, htmlResponse } from '@anzaui/engine';

try {
  return htmlResponse(await new Page(url.pathname).run(engine));
} catch (err) {
  if (err instanceof AnzaError && err.code === 'NOT_FOUND') {
    return new Response('Not Found', { status: 404 });
  }
  throw err;
}
```

With `escape: true`, write `{{{content}}}` in the shell so the page HTML is
not escaped a second time.
