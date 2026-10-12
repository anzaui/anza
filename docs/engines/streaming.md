---
seo_title: "Real-Time STUI Streaming — Anza"
description: "Server-Sent Events and WebSocket protocols pushing signed template updates to client shadow roots."
---

# Real-Time Streaming

Anza Server-Templated UI provides first-class support for real-time component streaming. Backends push signed component envelopes over **Server-Sent Events (SSE)** or **WebSockets**, updating client UI slots without full page refreshes or virtual DOM diffing.

## What You Get

- **Server-Sent Events (SSE)** — Standard HTTP transport with automatic reconnection and CDN pass-through
- **WebSocket text frames** — High-frequency bidirectional streaming for real-time collaboration
- **Plain browser client** — the standard `EventSource` / `WebSocket` APIs; no extra runtime
- **Async generator consumption** — `for await` over newline-delimited JSON via `api.stream()`

## Protocol Overview

### Server-Sent Events (SSE)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: template
data: {"v":2,"slot":"feed","ts":1724771234,"html":"<ui-card>...</ui-card>","sig":"3a8f4c..."}

```

Each frame is `event: template\ndata: <json>\n\n`, where `<json>` is the v2
envelope as compact JSON: no spaces, keys in the order `v`, `slot`, `ts`,
`html`, `sig`, `css`, non-ASCII characters left as UTF-8, and `sig` and `css`
left out when absent. All three engines produce byte-identical frames (Rust
`stream::sse::frame::encode`, TS `formatEvent` or `sseEvent`, Python
`format_event`). A WebSocket packet is the same JSON alone. See the
[Engine Contract](contract.md).

## Client Integration

The library has no built-in stream listener and does not verify envelope
signatures in the browser. Use the platform APIs directly and decide how a
`slot` name maps to an element in your page.

### 1. `EventSource` (SSE)

```javascript
const source = new EventSource('/api/live/stream');

source.addEventListener('template', (event) => {
  const envelope = JSON.parse(event.data);
  const target = document.getElementById(envelope.slot);
  if (target) target.innerHTML = envelope.html;
});

// To disconnect:
// source.close();
```

`EventSource` reconnects on its own. Only inject HTML from a stream you
trust: `sanitize()` from `@anzaui/anza/security` strips custom elements, so it
is meant for user content, not for engine fragments. Verify each envelope
with `verify_envelope` on any server or edge hop that relays the stream. It
checks the version (`v: 2`), the age, the slot and the signature (see
[Cryptographic Verification](crypto.md)).

### 2. `api.stream()` (NDJSON)

`api.stream()` reads a newline-delimited JSON body (one envelope per line,
`Content-Type: application/x-ndjson`) and yields each line already parsed:

```javascript
import { api } from '@anzaui/anza/api';

for await (const envelope of api.stream('/api/live/feed')) {
  console.log('Received live envelope:', envelope.slot, envelope.html);
}
```

## Server Implementation

### TypeScript / Hono SSE

```typescript
import { Hono } from 'hono';
import { Setup, sseEvent } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();
const app = new Hono();

app.get('/api/live/stream', (c) => {
  const stream = new ReadableStream({
    async start(controller) {
      const timer = setInterval(async () => {
        const env = await engine.renderFragment('feed/card.html', 'feed', {
          title: 'Live Notification',
        });
        controller.enqueue(new TextEncoder().encode(sseEvent(env)));
      }, 2000);

      c.req.raw.signal.addEventListener('abort', () => clearInterval(timer));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
```
