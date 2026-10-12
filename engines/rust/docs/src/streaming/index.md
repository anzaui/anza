# Real-Time Streaming

Server-Sent Events (SSE) and WebSockets carry the same `Envelope` JSON as a
fragment fetch. The engine provides the encoders; the transport (and the loop
that pushes updates) is your web framework's.

```
  Client (EventSource / WS)                 Rust server
            │  1. GET /feed/stream (SSE)                │
            ├──────────────────────────────────────────►│
            │  2. event: template                       │
            │     data: {"v":2,"slot":"feed","ts":…}    │
            │◄──────────────────────────────────────────┤
            │  3. event: template …                     │
            │◄──────────────────────────────────────────┤
```

## Wire format

Each SSE message is:

1. **`event: template`**
2. **`data: <Envelope JSON>`**: compact JSON with `v` (always `2`), `slot`, `ts`, `html` and, when signed, `sig`
3. a blank line (`\n\n`)

A WebSocket message is the envelope JSON as a text frame.

| Encoder | Output |
|---|---|
| `anza::stream::sse::encode(&Envelope) -> String` | `"event: template\ndata: {…}\n\n"` |
| `anza::stream::ws::encode(&Envelope) -> String` | `"{…}"` |
| `anza::adapters::axum::event(Envelope) -> Result<axum::response::sse::Event, axum::Error>` | Axum SSE `Event` (feature `axum`) |
| `anza::adapters::actix::bytes(&Envelope) -> actix_web::web::Bytes` | SSE frame bytes (feature `actix`) |

The browser library has no built-in listener for these events. Use
`EventSource` / `WebSocket` and apply `envelope.html` to the target yourself.
