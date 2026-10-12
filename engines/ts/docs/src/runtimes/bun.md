# Bun & Deno

Bun and Deno implement the Node.js APIs the engine uses. Neither is covered by
the engine's test suite, so check your setup.

## 1. Bun

```typescript
import { Fragment, Page, Setup, htmlResponse, jsonResponse } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();

export default {
  port: 3000,
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      const doc = await new Page('/', { title: 'Bun STUI' }).run(engine);
      return htmlResponse(doc);
    }

    if (url.pathname === '/card') {
      const envelope = await new Fragment('feed/card.html', 'main', { title: 'Card' }).run(engine);
      return jsonResponse(envelope);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

```bash
bun run server.ts
```

## 2. Deno

```typescript
import { Page, Setup, htmlResponse } from 'npm:@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();

Deno.serve({ port: 3000 }, async () => {
  const doc = await new Page('/', { title: 'Deno STUI' }).run(engine);
  return htmlResponse(doc);
});
```

```bash
deno run --allow-read --allow-net server.ts
```
