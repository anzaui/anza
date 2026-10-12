# Server-Sent Events (SSE)

## 1. Encoding a frame

`src/stream/sse.ts` (`formatEvent`; `sseEvent` is the same function from the web
adapter):

```typescript
import { Envelope, sseEvent } from '@anzaui/engine';

const envelope = new Envelope('feed', 1724771200, '<article>Live Post</article>');

const frame = sseEvent(envelope);
// 'event: template\ndata: {"v":2,"slot":"feed","ts":1724771200,"html":"<article>Live Post</article>"}\n\n'
```

## 2. Node.js HTTP streaming

```typescript
import * as http from 'node:http';
import { Fragment, Setup, sseEvent } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();

http
  .createServer((req, res) => {
    if (req.url !== '/feed/stream') {
      res.writeHead(404).end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const timer = setInterval(async () => {
      const envelope = await new Fragment('feed/card.html', 'feed', { title: 'Live Event' }).run(engine);
      res.write(sseEvent(envelope));
    }, 2000);

    req.on('close', () => clearInterval(timer));
  })
  .listen(3000);
```
