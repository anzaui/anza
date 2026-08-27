# Real-Time Streaming

Anza Server-Templated UI provides first-class support for real-time component streaming. Backends push signed component envelopes over **Server-Sent Events (SSE)** or **WebSockets**, updating client UI slots without full page refreshes or virtual DOM diffing.

---

## What You Get

- **Server-Sent Events (SSE)** — Standard HTTP transport with automatic reconnection and CDN pass-through
- **WebSocket text frames** — High-frequency bidirectional streaming for real-time collaboration
- **Declarative client listener** — `listenStream()` automatically verifies signatures and patches matching docks
- **Async generator consumption** — Programmatic `for await` streams via `api.stream()`

---

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

---

## Client Integration

### 1. `listenStream()`

Connect to an SSE stream and automatically patch matching docks in the DOM:

```javascript
import { listenStream } from '@anzaui/anza/ui';

const stream = listenStream('/api/live/stream', {
  reconnect: true,
  onUpdate(slot, envelope) {
    console.log(`Updated slot ${slot}`);
  },
  onError(err) {
    console.error('Stream error:', err);
  },
});

// To disconnect:
// stream.close();
```

### 2. `api.stream()`

Programmatic stream consumption in custom components:

```javascript
import { api } from '@anzaui/anza/api';

for await (const chunk of api.stream('/api/live/feed')) {
  const envelope = JSON.parse(chunk);
  console.log('Received live envelope:', envelope.slot, envelope.html);
}
```

---

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
