# Web Standards & Fetch Integration

The Web Standards adapter provides helpers for standard `Request` and `Response` interfaces used in **Cloudflare Workers**, **Vercel Edge**, **Next.js App Router**, **Bun**, and **Deno**.

## 1. Native `Response` Helpers

Located in `src/adapters/web.ts`:

```typescript
import { Setup, htmlResponse, jsonResponse } from 'anza';

const engine = await new Setup({ root: './templates' }).run();

export default {
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Full-Page SSR
    if (url.pathname === '/') {
      const doc = await engine.renderPage('/', { title: 'Native Fetch' });
      return htmlResponse(doc);
    }

    // Dynamic Signed Fragment
    if (url.pathname === '/card') {
      const envelope = await engine.renderFragment('feed/card.html', 'feed', { title: 'Card' });
      return jsonResponse(envelope);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```
