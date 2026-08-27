# Real-Time Streaming

Server-Sent Events (SSE) and WebSockets allow Node.js and Bun backends to push live component fragment updates directly into client shadow roots.

## 1. Streaming Lifecycle

```
  Client (EventSource / WS)              Node/Bun Server (Anza Engine)
            │                                           │
            │  1. GET /feed/stream (HTTP/2 SSE)         │
            ├──────────────────────────────────────────►│
            │                                           │
            │  2. event: template                       │
            │     data: {"slot":"feed","html":...,...}  │
            │◄──────────────────────────────────────────┤ (Push Fragment 1)
            │                                           │
            │  3. event: template                       │
            │     data: {"slot":"feed","html":...,...}  │
            │◄──────────────────────────────────────────┤ (Push Fragment 2)
            │                                           │
            ▼                                           ▼
```

## 2. The STUI Stream Protocol

Every stream message represents an atomic DOM update for a specific slot:

1. **`event: template`**: Declares that the payload is a STUI template envelope.
2. **`data: { ... }`**: JSON-serialized `Envelope` containing `slot`, `ts`, `html`, and `sig`.
3. **Double Newline `\n\n`**: Standard SSE frame terminator.
