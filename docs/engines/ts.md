# TypeScript & JavaScript STUI Template Engine

The **Anza TypeScript Engine** (`@anzaui/engine`) is a **zero-dependency**, JIT-optimized template and STUI streaming engine that executes identically across **Node.js**, **Bun**, **Deno**, **Cloudflare Workers**, and **Vercel Edge**.

## Installation

```bash
npm install @anzaui/engine
# or: pnpm add @anzaui/engine / bun add @anzaui/engine
```

## Quickstart (Web Standards / Fetch)

```typescript
import { Setup, Page, Fragment, htmlResponse, jsonResponse } from '@anzaui/engine';

// 1. Initialize engine once at application startup
const engine = await new Setup({
  root: './templates',
  signing: { mode: 'hmac', secret: 'super-secret-key-32-chars-long!!' },
}).run();

export default {
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Full-Page SSR
    if (url.pathname === '/') {
      const doc = await new Page('/', { title: 'TypeScript STUI' }).run(engine);
      return htmlResponse(doc);
    }

    // Dynamic Signed Fragment
    if (url.pathname === '/card') {
      const env = await new Fragment('feed/card.html', 'feed', { title: 'Live Card' }).run(engine);
      return jsonResponse(env);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## Framework Integration

### Hono

```typescript
import { Hono } from 'hono';
import { Setup, htmlResponse, jsonResponse, sseEvent } from 'anza';

const engine = await new Setup({ root: './templates' }).run();
const app = new Hono();

app.get('/', async (c) => {
  const doc = await engine.renderPage('/', { title: 'Hono STUI' });
  return htmlResponse(doc);
});

app.get('/card/:id', async (c) => {
  const env = await engine.renderFragment('feed/card.html', 'feed', { id: c.req.param('id') });
  return jsonResponse(env);
});

export default app;
```

### Express.js

```typescript
import express from 'express';
import { Setup, Page, Fragment } from 'anza';
import { sendHtml, sendJson } from 'anza/adapters/express.js';

const engine = await new Setup({ root: './templates' }).run();
const app = express();

app.get('/', async (req, res) => {
  const doc = await new Page('/', { title: 'Express STUI' }).run(engine);
  sendHtml(res, doc);
});

app.get('/card', async (req, res) => {
  const env = await new Fragment('feed/card.html', 'feed', { title: 'Item' }).run(engine);
  sendJson(res, env);
});

app.listen(3000);
```
