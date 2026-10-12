# Fastify Integration

`src/adapters/fastify.ts` provides `sendHtml` and `sendJson`. There is no SSE
helper; write `sseEvent(envelope)` to the raw response yourself.

## 1. Handlers

```typescript
import Fastify from 'fastify';
import { Fragment, Page, Setup } from '@anzaui/engine';
import { sendHtml, sendJson } from '@anzaui/engine/adapters/fastify';

const fastify = Fastify();
const engine = await new Setup({ root: './templates' }).run();

// Full page
fastify.get('/', async (request, reply) => {
  const doc = await new Page('/', { title: 'Fastify STUI' }).run(engine);
  return sendHtml(reply, doc);
});

// Signed fragment
fastify.get('/card/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const envelope = await new Fragment('feed/card.html', 'feed', { id, title: 'Item' }).run(engine);
  return sendJson(reply, envelope);
});

await fastify.listen({ port: 3000 });
```
