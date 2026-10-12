# Hono Integration

## 1. Page, fragment and SSE handlers

```typescript
import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { Fragment, Page, Setup, escapeHtml } from '@anzaui/engine';
import { html, json, sseEvent } from '@anzaui/engine/adapters/hono';

const engine = await new Setup({ root: './templates' }).run();
const app = new Hono();

// Full page
app.get('/', async (c) => {
  const doc = await new Page('/', { title: 'Anza + Hono' }).run(engine);
  return html(c, doc);
});

// Signed fragment
app.get('/card/:id', async (c) => {
  const envelope = await new Fragment('feed/card.html', 'feed', {
    id: escapeHtml(c.req.param('id')), // values are not escaped unless `escape: true`
    title: 'Live Stream Update',
  }).run(engine);
  return json(c, envelope);
});

// One SSE event
app.get('/feed/stream', (c) => {
  c.header('Content-Type', 'text/event-stream');
  return stream(c, async (s) => {
    const envelope = await new Fragment('feed/card.html', 'feed', { title: 'Hono Push Event' }).run(engine);
    await s.write(sseEvent(envelope));
  });
});

export default app;
```

`html(c, doc, status?)` calls `c.html(...)` and `json(c, envelope, status?)` calls
`c.json(...)`. Because the engine reads templates from disk, run Hono on Node,
Bun or Deno.
