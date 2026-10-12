# Template Syntax & Tokens

Anza Server Templates have one construct: the `{{token}}` placeholder. It is
replaced with the value of the matching parameter. The same syntax works in the
Rust, TypeScript and Python engines.

## What You Get

| Syntax | Purpose | Example |
|---|---|---|
| `{{variable}}` | Inserts the parameter's value as is | `<h1>{{title}}</h1>` |

There are no loops, conditionals or filters. Build lists and optional sections
in your handler and pass the resulting HTML in as a parameter (see
[Slotted Child Content](#slotted-child-content)).

Rules:

- Whitespace inside the braces is trimmed: `{{ title }}` is the same as `{{title}}`.
- An unclosed `{{` or an empty `{{}}` is an error when the templates load.
- A missing parameter renders as an empty string.

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

## Escaping & Security

**Values are not HTML-escaped.** Whatever string you pass is written into the
output unchanged, which is what lets a parameter carry pre-rendered HTML. Any
value that comes from users must be escaped by your code before rendering:

- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#x27;`

For example, in Python use `html.escape(value, quote=True)`; in TypeScript or
Rust, a small helper that replaces those five characters.

## Slotted Child Content

When composing nested templates or docks, render the children first and pass
the HTML in as a parameter:

```html
<dock-feed class="articles-feed">
  <template shadowrootmode="open">
    <slot></slot>
  </template>
  {{articles}}
</dock-feed>
```

In the backend handler (Rust):
```rust
let card = engine.get("feed/card.html")?;
let articles_html = articles
    .iter()
    .map(|a| card.render(a))
    .collect::<Result<Vec<_>, _>>()?
    .join("\n");

let mut params = HashMap::new();
params.insert("count".to_string(), articles.len().to_string());
params.insert("articles".to_string(), articles_html);
let html = engine.get("pages/home.html")?.bind(&params)?;
```

## Form Actions & URL Interpolation

Variables can be interpolated into attribute values for links, form actions and
data attributes. Escape them (and URL-encode path segments) when they come from
users:

```html
<div class="card-footer">
  <a href="/article/{{slug}}" class="read-link">Read article &rarr;</a>
  <form method="POST" action="/articles/{{id}}/delete">
    <button type="submit">[delete]</button>
  </form>
</div>
```

## Performance Best Practices

1. **Load templates at startup**: `Setup(...).run()` reads and parses every template once; renders never touch the filesystem.
2. **Keep logic out of markup**: format, sort and filter data in your handler before rendering.
3. **Render fragments for streaming**: use `Fragment` (or `engine.render_fragment` / `renderFragment`) to get a signed envelope, then encode it as an SSE event. See [Real-Time Streaming](../engines/streaming.md).
