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
                │                     │ Sign v2 message│
                │                     │ (optional)     │
                │                     └───────┬────────┘
                ▼                             ▼
        Document { html }        Envelope { v, slot, ts, html, sig?, css? }
```

## Comparison

| | Page (`engine.renderPage`) | Fragment (`engine.renderFragment`) |
|---|---|---|
| **Return type** | `Promise<Document>` (`{ html: string }`) | `Promise<Envelope>` (`{ v, slot, ts, html, sig?, css? }`) |
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

Both reject with an `AnzaError`: `NOT_FOUND` for an unknown page or template
(or one outside the `fragments` allowlist), `VALIDATION` for a malformed
template name.

## Values and escaping

Parameters are a plain object, a `Map` or `[key, value]` pairs. Objects are
read through own properties only (`Object.hasOwn`), so `{{toString}}` renders
nothing. Strings are inserted as is, booleans as `true`/`false`, `null` and
`undefined` as nothing, and arrays and plain objects as compact JSON.

By default `{{name}}` and `{{{name}}}` both insert the value without HTML
escaping; escape untrusted input with `escapeHtml`. With `escape: true` in
`Setup`, `{{name}}` is escaped and `{{{name}}}` is raw. See
[Slot Parsing & Render Functions](../architecture/slots.md).
