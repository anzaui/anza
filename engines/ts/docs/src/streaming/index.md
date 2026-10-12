# Real-Time Streaming

Server-Sent Events (SSE) and WebSockets carry the same `Envelope` JSON as a
fragment fetch. The engine provides the encoders; the transport (and the loop
that pushes updates) is your server's.

```
  Client (EventSource / WS)              Node / Bun / Deno server
            │  1. GET /feed/stream (SSE)                │
            ├──────────────────────────────────────────►│
            │  2. event: template                       │
            │     data: {"slot":"feed","ts":…,"html":…} │
            │◄──────────────────────────────────────────┤
            │  3. event: template …                     │
            │◄──────────────────────────────────────────┤
```

## Wire format

Each SSE message is:

1. **`event: template`**
2. **`data: <Envelope JSON>`** with `slot`, `ts`, `html` and, when signed, `sig`
3. a blank line (`\n\n`)

A WebSocket message is the envelope JSON as a text frame.

| Helper | Output |
|---|---|
| `formatEvent(envelope)` / `sseEvent(envelope)` | `"event: template\ndata: {…}\n\n"` |
| `formatPacket(envelope)` | `"{…}"` |
| `adapters.express.sendSse(res, envelope)` | Writes `formatEvent(envelope)` to an Express response |

The browser library has no built-in listener for these events. Use
`EventSource` / `WebSocket` and apply `envelope.html` to the target yourself.
