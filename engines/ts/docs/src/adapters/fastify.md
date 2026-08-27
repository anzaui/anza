# Fastify Integration

The Fastify adapter provides type-safe reply helpers for high-throughput microservices.

## 1. Handlers in Fastify

Located in `src/adapters/fastify.ts`:

```typescript
import Fastify from 'fastify';
import { Setup } from 'anza';
import { sendHtml, sendJson } from 'anza/adapters/fastify.js';

const fastify = Fastify();
const engine = await new Setup({ root: './templates' }).run();

// Full-Page SSR
fastify.get('/', async (request, reply) => {
  const doc = await engine.renderPage('/', { title: 'Fastify STUI' });
  return sendHtml(reply, doc);
});

// Partial Signed Fragment
fastify.get('/card/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const envelope = await engine.renderFragment('feed/card.html', 'feed', { id, title: 'Item' });
  return sendJson(reply, envelope);
});

fastify.listen({ port: 3000 });
```
