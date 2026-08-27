<p align="center">
  <img src="logo.svg" width="64" height="64" alt="Anza Logo" />
</p>

<h1 align="center">Anza (TypeScript Engine)</h1>

A zero-dependency template and dynamic fragment rendering library for Node.js, Bun, Deno, and Edge runtimes.

## What It Does

1. **Full-Page Rendering**: Renders complete HTML pages with `<template shadowrootmode="open">` Declarative Shadow DOM templates.
2. **Dynamic Fragment Envelopes**: Generates signed JSON `Envelope` payloads to update specific client UI slots.
3. **Cryptographic Signing**: Uses the Web Crypto API (`crypto.subtle`) for HMAC-SHA256 and Ed25519 payload signatures.
4. **Streaming**: Helpers for Server-Sent Events (SSE) and WebSocket message formats.
5. **No External Dependencies**: Built entirely on standard JavaScript and web platform APIs.

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
    secret: 'your-secret-key-at-least-32-chars-long',
  },
}).run();
```

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

// envelope contains: slot, html, ts, and signature
console.log(envelope);
```

### 4. HTTP Server Example (Web Standard fetch / Bun / Deno)

```typescript
import { Setup, Page, Fragment, htmlResponse, jsonResponse } from '@anzaui/engine';

const engine = await new Setup({
  root: './templates',
  signing: { mode: 'hmac', secret: 'your-secret-key-at-least-32-chars-long' },
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

## License

MIT © 2026 aduki, Labs
