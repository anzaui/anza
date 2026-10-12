# Web Standard `Response`

`htmlResponse` and `jsonResponse` build a standard `Response`, for servers with a
`fetch(request)` handler such as Bun and Deno.

## 1. Helpers

`src/adapters/web.ts`:

```typescript
htmlResponse(document: Document | string, status = 200, headers?: HeadersInit): Response; // text/html; charset=utf-8
jsonResponse(envelope: Envelope | any, status = 200, headers?: HeadersInit): Response;    // application/json; charset=utf-8
sseEvent(envelope: Envelope): string;
```

## 2. Example

```typescript
import { Fragment, Page, Setup, htmlResponse, jsonResponse } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/') {
    const doc = await new Page('/', { title: 'Native Fetch' }).run(engine);
    return htmlResponse(doc);
  }

  if (url.pathname === '/card') {
    const envelope = await new Fragment('feed/card.html', 'feed', { title: 'Card' }).run(engine);
    return jsonResponse(envelope);
  }

  return new Response('Not Found', { status: 404 });
}
```

The engine still needs `node:fs` and `node:crypto`, so this runs on Node, Bun and
Deno, not on filesystem-less edge runtimes (see [Edge runtimes](../runtimes/edge.md)).
