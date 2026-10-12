<p align="center">
  <img src="logo.svg" width="64" height="64" alt="Anza Logo" />
</p>

<h1 align="center">Anza (TypeScript Engine)</h1>

A zero-dependency template and dynamic fragment rendering library for Node.js, Bun, Deno, and Edge runtimes.

## What It Does

1. **Full-Page Rendering**: Renders complete HTML pages with `<template shadowrootmode="open">` Declarative Shadow DOM templates.
2. **Dynamic Fragment Envelopes**: Generates signed JSON `Envelope` payloads to update specific client UI slots.
3. **Cryptographic Signing**: Signs envelopes with HMAC-SHA256 or Ed25519 (`node:crypto`) and verifies received ones with `verifyEnvelope`.
4. **Streaming**: Helpers for Server-Sent Events (SSE) and WebSocket message formats.
5. **No External Dependencies**: Built on Node.js built-ins (`node:fs`, `node:crypto`) and the standard `Response` class.

## Installation

```bash
npm install @anzaui/engine
```

## Usage

### 1. Initialize Engine

```typescript
import { Setup } from '@anzaui/engine';

const engine = await new Setup({
  root: './templates',
  signing: {
    mode: 'hmac',
    secret: process.env.ANZA_SECRET!, // at least 32 bytes
  },
}).run();
```

`Setup.run()` checks the key once. An HMAC secret shorter than 32 bytes, or an
Ed25519 `privateKey` that is not a 32-byte seed, 64-char lowercase hex seed,
PEM or `KeyObject`, throws an `AnzaError` with code `CRYPTO`. The engine never
falls back to unsigned envelopes.

### 2. Render Full Pages

```typescript
import { Page } from '@anzaui/engine';

const doc = await new Page('/', { title: 'Dashboard' }).run(engine);
console.log(doc.html);
```

### 3. Render Signed JSON Fragments

```typescript
import { Fragment } from '@anzaui/engine';

const envelope = await new Fragment('card.html', 'feed', {
  title: 'New Post',
  content: 'Article content here',
}).run(engine);

// {"v":2,"slot":"feed","ts":1724771234,"html":"…","sig":"…"}
console.log(JSON.stringify(envelope));
```

### 4. Verify a Received Envelope

```typescript
import { verifyEnvelope } from '@anzaui/engine';

// Throws an AnzaError (code CRYPTO) naming the failed check.
verifyEnvelope({ mode: 'hmac', secret: process.env.ANZA_SECRET! }, received, {
  maxAgeSecs: 60,
  slot: 'feed',
});
```

### 5. HTTP Server Example (Web Standard fetch / Bun / Deno)

```typescript
import { Setup, Page, Fragment, htmlResponse, jsonResponse } from '@anzaui/engine';

const engine = await new Setup({
  root: './templates',
  signing: { mode: 'hmac', secret: process.env.ANZA_SECRET! },
}).run();

export default {
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      const doc = await new Page('/', { title: 'Home' }).run(engine);
      return htmlResponse(doc);
    }

    if (url.pathname === '/api/card') {
      const env = await new Fragment('card.html', 'feed', { title: 'Card' }).run(engine);
      return jsonResponse(env);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## Templates

Templates use `{{name}}` (value) and `{{{name}}}` (raw) placeholders and are
parsed once at startup. By default both insert values as-is, so escape user
input with `escapeHtml` first. With `escape: true` in `Setup`, `{{name}}` is
HTML-escaped and `{{{name}}}` stays raw. Unknown page routes reject with
`NOT_FOUND`. Template layout,
rendering rules and signing: [docs/engines](https://github.com/anzaui/anza/tree/main/docs/engines)
([TypeScript guide](https://github.com/anzaui/anza/blob/main/docs/engines/ts.md),
[Engine Contract](https://github.com/anzaui/anza/blob/main/docs/engines/contract.md)).

## License

MIT © 2026 aduki, Labs
