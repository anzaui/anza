# Template Syntax & Tokens

Anza Server Templates use double-curly brace delimiters (`{{token}}`) for dynamic variable substitution, content slot insertion, and component composition. The syntax is designed to be deterministic, zero-allocation during execution, and safe against cross-site scripting (XSS).

---

## What You Get

| Syntax Pattern | Purpose | Example |
|---|---|---|
| `{{variable}}` | Auto-escaped scalar substitution (strings, numbers, dates) | `<h1>{{title}}</h1>` |
| `{{#raw slot}}` / `{{{slot}}}` | Raw unescaped HTML insertion for slotted docks and children | `<dock-main>{{content}}</dock-main>` |
| `{{#each items}}` / Array map | Array rendering and list iterations | Repeated `<article>` cards |
| `{{#if condition}}` | Optional section toggle based on boolean or presence | Conditional alert or badge |

---

## Variable Substitution

Simple values are substituted directly into template placeholders:

```html
<div class="user-profile">
  <h2>{{username}}</h2>
  <span class="user-role">{{role}}</span>
  <time datetime="{{joined}}">Member since {{joined}}</time>
</div>
```

When provided with data:
```json
{
  "username": "alex",
  "role": "Maintainer",
  "joined": "2026-01-15"
}
```

Renders as:
```html
<div class="user-profile">
  <h2>alex</h2>
  <span class="user-role">Maintainer</span>
  <time datetime="2026-01-15">Member since 2026-01-15</time>
</div>
```

---

## Auto-Escaping & Security

All standard `{{token}}` variables are automatically HTML-escaped by the engine to prevent XSS vulnerabilities:

- `&` becomes `&amp;`
- `<` becomes `&lt;`
- `>` becomes `&gt;`
- `"` becomes `&quot;`
- `'` becomes `&#x27;`

If a user supplies `<script>alert(1)</script>` inside `{{title}}`, it renders safely as:
```html
<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>
```

---

## Slotted Child Content

When composing nested templates or docks, slotted child content (such as pre-rendered HTML cards or nested dock views) is injected into designated slot tokens:

```html
<dock-feed class="articles-feed">
  <template shadowrootmode="open">
    <slot></slot>
  </template>
  {{articles}}
</dock-feed>
```

In the backend handler:
```rust
let articles_html: String = articles
    .iter()
    .map(|a| engine.render("feed/card.html", a))
    .collect::<Result<Vec<_>, _>>()?
    .join("\n");

let page_html = engine.render("pages/home.html", &json!({
    "count": articles.len(),
    "articles": articles_html
}))?;
```

---

## Form Actions & URL Interpolation

Variables can be interpolated directly into attribute values for dynamic links, form actions, and data attributes:

```html
<div class="card-footer">
  <a href="/article/{{slug}}" class="read-link">Read article &rarr;</a>
  <form method="POST" action="/articles/{{id}}/delete">
    <button type="submit">[delete]</button>
  </form>
</div>
```

---

## Performance Best Practices

1. **Pre-compile Templates at Startup**: Load and parse template files once when the server initializes (`Engine::new("templates")`).
2. **Avoid Heavy Logic in Markup**: Perform data transformations, formatting, and sorting in backend handlers before passing data to templates.
3. **Use Monospace Envelopes for Streaming**: For real-time updates, pass the rendered template string directly into `engine.sign_envelope()`.
