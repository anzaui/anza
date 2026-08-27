# Server-Sent Events (SSE)

Server-Sent Events provide lightweight, unidirectional streaming over standard HTTP/2 and HTTP/3.

## 1. The `formatEvent` / `sseEvent` Helper

Located in `src/stream/sse.ts`:

```typescript
import { sseEvent, Envelope } from 'anza';

const envelope = new Envelope(
  'feed',
  1724771200,
  '<article>Live Post</article>',
  '9f83...'
);

const wireChunk = sseEvent(envelope);
// Outputs: "event: template\ndata: {\"slot\":\"feed\",...}\n\n"
```

## 2. Native Node.js HTTP Streaming

```typescript
import * as http from 'node:http';
import { sseEvent } from 'anza';

http.createServer(async (req, res) => {
  if (req.url === '/feed/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    setInterval(async () => {
      const envelope = await engine.renderFragment('feed/card.html', 'feed', {
        title: 'Live Event',
      });
      res.write(sseEvent(envelope));
    }, 2000);
  }
}).listen(3000);
```
