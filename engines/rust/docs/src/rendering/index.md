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
                │                     │ Sign ts:slot:  │
                │                     │ html (optional)│
                │                     └───────┬────────┘
                ▼                             ▼
        Document { html }        Envelope { slot, ts, html, sig?, css? }
```

## Comparison

| | Page (`Engine::render_page`) | Fragment (`Engine::render_fragment`) |
|---|---|---|
| **Return type** | `Document` (`{ html: String }`) | `Envelope` (`{ slot, ts, html, sig, css }`) |
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
