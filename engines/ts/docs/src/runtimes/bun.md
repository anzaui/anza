# Bun & Deno Runtimes

Anza executes natively in Bun and Deno without polyfills or build steps.

## 1. Bun Execution

```typescript
import { Setup, htmlResponse, jsonResponse } from 'anza';

const engine = await new Setup({ root: './templates' }).run();

export default {
  port: 3000,
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      const doc = await engine.renderPage('/', { title: 'Bun STUI' });
      return htmlResponse(doc);
    }

    if (url.pathname === '/card') {
      const envelope = await engine.renderFragment('feed/card.html', 'main', { title: 'Card' });
      return jsonResponse(envelope);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

Run directly:
```bash
bun run server.ts
```

## 2. Deno Execution

In Deno, import directly via npm specifier or local module:

```typescript
import { Setup, htmlResponse } from 'npm:anza';

const engine = await new Setup({ root: './templates' }).run();

Deno.serve({ port: 3000 }, async (req) => {
  const doc = await engine.renderPage('/', { title: 'Deno STUI' });
  return htmlResponse(doc);
});
```
