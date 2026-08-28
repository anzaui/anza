# Server Templates

Anza Server Templates are zero-overhead `.html` files designed for high-performance Server-Templated UI (STUI). Templates combine Web Standards Declarative Shadow DOM (DSD), token-based data binding, and cryptographic origin signing into a lightweight architecture that renders instantly on the server and streams safely across proxies and CDNs.

---

## What You Get

| Feature | Description |
|---|---|
| **Zero JS Runtime** | Pure HTML/CSS templates requiring zero client JavaScript bundles to display initial or updated UI |
| **Declarative Shadow DOM** | Native browser encapsulation via `<template shadowrootmode="open">` without hydration delays |
| **Token Binding** | Fast string substitution for `{{token}}` variables and slotted content injections |
| **Component Modularity** | Clean separation of Shell layouts (`layout/shell.html`), Pages (`pages/home.html`), and Partials (`feed/card.html`) |
| **Dual Mode Output** | Output either full HTML documents for SEO crawlers or signed STUI stream envelopes for clients |
| **Universal Engine Support** | Native parsers and renderers for Rust, Python (FastAPI/ASGI/Flask), and TypeScript (Node/Hono) |

---

## Template Structure

In an Anza application, server templates reside in a structured `templates/` directory:

```text
templates/
├── layout/
│   └── shell.html       # Full document shell, <head>, meta tags, and root <dock-main>
├── pages/
│   ├── home.html        # Home page body with feed container and slotted docks
│   ├── article.html     # Single article view with metadata and actions
│   └── editor.html      # Article composer and edit form
└── feed/
    └── card.html        # Individual article card partial with scoped <style>
```

---

## Quickstart

### 1. Define a Shell Layout

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{title}}</title>
  <meta name="description" content="{{description}}">
  <meta name="anza-key" content="{{anza_key}}">
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <div class="app-layout">
    <header class="app-header">
      <a href="/" class="brand">Anza App</a>
    </header>

    <main class="app-main">
      <dock-main>
        <template shadowrootmode="open">
          <slot></slot>
        </template>
        {{content}}
      </dock-main>
    </main>
  </div>
</body>
</html>
```

### 2. Define a Component Partial

```html
<article class="feed-card">
  <style>
    .feed-card {
      padding: 1.25rem;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .feed-card h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; }
    .feed-card a { color: var(--accent); text-decoration: none; }
  </style>

  <h2><a href="/article/{{slug}}">{{title}}</a></h2>
  <p>{{summary}}</p>
  <time datetime="{{created}}">{{created}}</time>
</article>
```

### 3. Render via Server Engine

In Rust:

```rust
use anza::Engine;
use serde_json::json;

let engine = Engine::new("templates")?;

// Render partial card
let card_html = engine.render("feed/card.html", &json!({
    "slug": "getting-started",
    "title": "Getting Started with Anza STUI",
    "summary": "Build high-performance web applications with server templates.",
    "created": "2026-08-28"
}))?;

// Render full shell
let full_page = engine.render_page("pages/home.html", &json!({
    "title": "Home — Anza Blog",
    "articles": card_html
}))?;
```

---

## Dual Rendering Modes

Server templates support two output targets without code duplication:

1. **Full Page SSR (Initial Navigation)**:
   Embeds the page inside `layout/shell.html` with Declarative Shadow DOM for instant first paint and perfect SEO.
2. **Stream Envelope (Soft Navigation / Live Updates)**:
   Renders only the partial HTML, generates an Ed25519 cryptographic signature, and streams an envelope to the client:
   ```json
   {
     "ts": 1772150400000,
     "slot": "dock-feed",
     "html": "<article class=\"feed-card\">...</article>",
     "sig": "3a8f...92c1"
   }
   ```

---

## Next Steps

- **[Syntax & Tokens](/docs/templates/syntax)**: Learn interpolation rules, array iteration, and escaping.
- **[Layouts & Shells](/docs/templates/layouts)**: Build composable shells and nested Declarative Shadow DOM docks.
- **[Components & Partials](/docs/templates/components)**: Encapsulate UI cards, scoped styles, and forms.
- **[Data Binding](/docs/templates/binding)**: Connect Rust, Python, and TypeScript backend models to templates.
