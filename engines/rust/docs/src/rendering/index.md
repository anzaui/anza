# Rendering Pipeline

There are two outputs: a full HTML `Document` for the first load, and an
`Envelope` for fragments and pushes.

```
                        Incoming request
                               │
                ┌──────────────┴──────────────┐
                │                             │
         Initial HTTP GET            Fetch / SSE / WebSocket
                │                             │
                ▼                             ▼
     Page::new(route).run()    Fragment::new(tpl, slot).run()
                │                             │
        ┌───────┴────────┐            ┌───────┴────────┐
        │ Bind page,     │            │ Bind fragment  │
        │ wrap in shell  │            │ template       │
        └───────┬────────┘            └───────┬────────┘
                │                             ▼
                │                     ┌────────────────┐
                │                     │ Sign v2 message│
                │                     │ (optional)     │
                │                     └───────┬────────┘
                ▼                             ▼
        Document { html }      Envelope { v, slot, ts, html, sig?, css? }
```

## Comparison

| | Page (`Engine::render_page`) | Fragment (`Engine::render_fragment`) |
|---|---|---|
| **Return type** | `Document` (`{ html: String }`) | `Envelope` (`{ v, slot, ts, html, sig, css }`) |
| **Output** | Complete HTML document | JSON (or an SSE / WebSocket frame) |
| **Browser side** | Parsed by the browser; open DSD attaches shadow roots | Your code puts `html` into the target; the browser library has no envelope handler and does **not** check signatures |
| **Typical use** | First paint, SEO | Partial updates, live feeds, form responses |

The builders `Page`, `Fragment` and `Stream` (`Stream` is identical to
`Fragment`, named for push use) collect parameters with `.param(key, value)` and
call the engine in `.run(&engine)`. The engine methods take a
`&HashMap<String, String>` directly:

```rust
pub fn render_page(&self, route: &str, params: &HashMap<String, String>) -> Result<Document>;
pub fn render_fragment(&self, template_name: &str, slot: &str, params: &HashMap<String, String>) -> Result<Envelope>;
```

Both return `anza::Error` on failure: `NotFound` for an unknown or malformed
page route and for an unknown template (or one outside the fragment
allowlist), `Validation` for a malformed template name. The builders also
reject an empty route, template or slot with `Validation`. Errors display as
`[Anza:CODE] message`.

## Escaping

Templates have two placeholders: `{{name}}` inserts a value and `{{{name}}}`
inserts it raw. With `escape` off (the default) both insert values as is, so
escape untrusted input yourself:

```rust
use anza::{escape_html, Fragment};

let comment = escape_html(user_input); // & < > " ' -> &amp; &lt; &gt; &quot; &#39;
let env = Fragment::new("feed/comment.html", "feed")
  .param("body", comment)
  .run(&engine)?;
```

With `escape` on, the engine escapes `{{name}}` values for you and leaves
`{{{name}}}` raw. Use `{{{content}}}` in `layout/shell.html`, or the page HTML
is escaped too:

```rust
let mut setup = Setup::new("templates");
setup.escape = true;
let engine = setup.run()?;
```

`escape_html` returns a `Cow<str>`. Its output is safe in element content and
in quoted attribute values.
