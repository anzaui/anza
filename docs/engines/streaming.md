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
data: {"slot":"feed","ts":1724771234,"html":"<ui-card>...</ui-card>","sig":"3a8f4c...","css":null}
```

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
is meant for user content, not for engine fragments. Verify `sig` with the
engine's `verify` helper on any server or edge hop that relays the stream (see
[crypto.md](crypto.md)).

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
