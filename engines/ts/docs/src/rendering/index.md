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
     new Page(route).run()      new Fragment(tpl, slot).run()
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

| | Page (`engine.renderPage`) | Fragment (`engine.renderFragment`) |
|---|---|---|
| **Return type** | `Promise<Document>` (`{ html: string }`) | `Promise<Envelope>` (`{ slot, ts, html, sig?, css? }`) |
| **Output** | Complete HTML document | JSON (or an SSE / WebSocket frame) |
| **Browser side** | Parsed by the browser; open DSD attaches shadow roots | Your code puts `html` into the target; the browser library has no envelope handler and does **not** check signatures |
| **Typical use** | First paint, SEO | Partial updates, live feeds, form responses |

`Page`, `Fragment` and `Stream` (`Stream` is identical to `Fragment`, named for
push use) validate their arguments and call the engine. You can also call the
engine directly:

```typescript
renderPage(route: string, params?: Params): Promise<Document>;
renderFragment(templateName: string, slot: string, params?: Params): Promise<Envelope>;
```
