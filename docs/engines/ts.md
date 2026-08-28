# TypeScript Engine

The Anza TypeScript Engine (`@anzaui/engine`) is a zero-dependency, JIT-optimized template and STUI streaming engine. It executes with identical behavior and wire compatibility across Node.js, Bun, Deno, Cloudflare Workers, and Vercel Edge.

## What You Get

- **Zero dependencies** — Built exclusively on native Web Standards (`Request`, `Response`, `SubtleCrypto`)
- **Universal runtime support** — Runs on Node.js (18+), Bun, Deno, Cloudflare Workers, and edge runtimes
- **JIT closure compilation** — Compiles templates once into memory functions for maximum throughput
- **Framework adapters** — First-class helpers for Hono, Express, Fastify, and raw Fetch API
- **Live SSE streaming** — Built-in `sseEvent()` helper for real-time Server-Sent Events

## Installation

```bash
npm install @anzaui/engine
# or: pnpm add @anzaui/engine
# or: bun add @anzaui/engine
```

## Quickstart (Web Standards / Fetch API)

```typescript
import { Setup, Page, Fragment, htmlResponse, jsonResponse } from '@anzaui/engine';

// 1. Initialize engine once at application startup
const engine = await new Setup({
  root: './templates',
  signing: {
    mode: 'hmac',
    secret: 'super-secret-key-32-chars-long!!',
  },
}).run();

export default {
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Mode A: Full-Page SSR with Declarative Shadow DOM
    if (url.pathname === '/') {
      const doc = await new Page('/', { title: 'TypeScript STUI' }).run(engine);
      return htmlResponse(doc);
    }

    // Mode B: Dynamic Signed Fragment
    if (url.pathname === '/card') {
      const envelope = await new Fragment('feed/card.html', 'feed', { title: 'Live Card' }).run(engine);
      return jsonResponse(envelope);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## Framework Integration

### Hono

```typescript
import { Hono } from 'hono';
import { Setup, htmlResponse, jsonResponse } from '@anzaui/engine';

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
import { Setup, Page, Fragment } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();
const app = express();

app.get('/', async (req, res) => {
  const doc = await new Page('/', { title: 'Express STUI' }).run(engine);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(doc.html);
});

app.get('/card', async (req, res) => {
  const env = await new Fragment('feed/card.html', 'feed', { title: 'Card' }).run(engine);
  res.json(env);
});

app.listen(3000);
```
