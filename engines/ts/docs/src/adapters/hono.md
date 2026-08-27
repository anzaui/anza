# Hono Integration

Hono runs universally across Cloudflare Workers, Node.js, Bun, Deno, and AWS Lambda.

## 1. Full-Page SSR & Fragment Handlers

```typescript
import { Hono } from 'hono';
import { Setup, htmlResponse, jsonResponse, sseEvent } from 'anza';

const engine = await new Setup({ root: './templates' }).run();
const app = new Hono();

// 1. Full-Page SSR with Open DSD
app.get('/', async (c) => {
  const doc = await engine.renderPage('/', {
    title: 'Anza + Hono',
  });
  return htmlResponse(doc);
});

// 2. Dynamic Signed Fragment
app.get('/card/:id', async (c) => {
  const envelope = await engine.renderFragment('feed/card.html', 'feed', {
    id: c.req.param('id'),
    title: 'Live Stream Update',
  });
  return jsonResponse(envelope);
});

// 3. Live SSE Stream
app.get('/feed/stream', async (c) => {
  return c.stream(async (stream) => {
    const envelope = await engine.renderFragment('feed/card.html', 'feed', {
      title: 'Hono Push Event',
    });
    await stream.write(sseEvent(envelope));
  });
});

export default app;
```
