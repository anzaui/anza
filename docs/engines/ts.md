---
seo_title: "TypeScript & JS STUI Engine — Anza"
description: "Zero-dependency JIT template and STUI streaming engine for Node, Bun, Deno, and Edge runtimes."
---

# TypeScript Engine

The Anza TypeScript Engine (`@anzaui/engine`) renders full HTML pages and
signed JSON fragment envelopes from `.html` templates. It has no npm
dependencies; it uses Node's `node:fs` and `node:crypto` modules, so it runs on
Node.js 18+ and on runtimes with Node compatibility (Bun, Deno). Responses use
the standard `Response` class.

## What You Get

- **Parse once** — `new Setup(...).run()` loads every template under the root and compiles it into a render function
- **Framework adapters** — `htmlResponse` / `jsonResponse` / `sseEvent` for Fetch-style handlers, plus helpers for Hono, Express and Fastify under `adapters`
- **Signing** — HMAC-SHA256 or Ed25519 signatures over the length-prefixed v2 message, checked with `verifyEnvelope`
- **Live SSE streaming** — `sseEvent()` / `formatEvent()` turn an envelope into a `template` event
- **Live reload** — `watch: true` reloads templates when files change (50 ms debounce, serialized reloads)

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
    secret: process.env.ANZA_SECRET!, // at least 32 bytes
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

### Fastify

```typescript
import Fastify from 'fastify';
import { Setup, Page, Fragment, adapters } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();
const app = Fastify();

app.get('/', async (req, reply) => {
  const doc = await new Page('/', { title: 'Fastify' }).run(engine);
  return adapters.fastify.sendHtml(reply, doc);
});

app.get('/card', async (req, reply) => {
  const env = await new Fragment('feed/card.html', 'feed', { title: 'Card' }).run(engine);
  return adapters.fastify.sendJson(reply, env);
});

await app.listen({ port: 3000 });
```

## Parameters

Params can be a plain object, a `Map`, or an array of `[key, value]` pairs.
Only own properties of an object are read (`Object.hasOwn`), so `{{toString}}`
renders nothing. Strings are inserted as-is, booleans as `true`/`false`,
`null`/`undefined` as nothing, and plain objects and arrays as compact JSON.

`{{name}}` inserts a value and `{{{name}}}` inserts it raw. By default both
insert the value **without HTML escaping**: escape user input with
`escapeHtml` before passing it in. With `escape: true` in `Setup`, `{{name}}`
is HTML-escaped and `{{{name}}}` stays raw (use `{{{content}}}` in the shell).

Other setup options: `fragments` (an allowlist of exact names and `dir/`
prefixes that `renderFragment` may use; others are `NOT_FOUND`) and
`maxTemplateBytes` (default 1 MiB; a larger file is a `TEMPLATE` error).

## Signing

```typescript
await new Setup({ root: './templates', signing: { mode: 'hmac', secret: process.env.ANZA_SECRET! } }).run();
await new Setup({ root: './templates', signing: { mode: 'ed25519', privateKey: seed32Bytes } }).run();
```

The HMAC `secret` must be at least 32 bytes. `privateKey` is a 32-byte seed,
a 64-char lowercase hex seed, a PEM string or a `KeyObject`; an optional
`publicKey` must match it. A missing or bad key throws an `AnzaError` with
code `CRYPTO` from `Setup.run()`; the engine never sends unsigned envelopes
by accident. The validated key is `engine.signer` (it never prints key
material).

Envelopes are `{"v":2,"slot","ts","html","sig"?,"css"?}`. The signature covers
the v2 message from `signatureMessage(ts, slot, html, css)` (also
`envelope.message()`). To check a received envelope:

```typescript
import { verifyEnvelope } from '@anzaui/engine';

verifyEnvelope({ mode: 'ed25519', publicKey }, envelope, { maxAgeSecs: 60, slot: 'feed' });
engine.verifyEnvelope(envelope, { maxAgeSecs: 60, slot: 'feed' }); // with the engine's own key
```

Both throw an `AnzaError` with code `CRYPTO` naming the failed check (version,
signature format, freshness, slot, signature). See
[Cryptographic Verification](crypto.md) and the [Engine Contract](contract.md).

## Page Rendering

`Page(route)` maps the route to a template: `/` → `pages/home.html`, `/about` →
`pages/about.html`. When that template is missing, `pages/index.html` is the
catch-all. Otherwise, or for a malformed route (`..`, `\`, NUL), it rejects
with an `AnzaError` of code `NOT_FOUND` and the message `Page not found`.
Routes only resolve under `pages/`. The page is bound with the params and
inserted into `layout/shell.html` as `{{content}}`. Without a shell, a minimal
document with a `<dock-main>` is emitted.
