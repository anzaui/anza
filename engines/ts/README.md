# Anza TypeScript Engine

Anza is an ultra-fast, zero-dependency, cryptographically verified Server-Templated UI (STUI) engine for JavaScript and TypeScript across Node.js, Bun, Deno, and Edge runtimes.

## Features

- **0 External Runtime Dependencies**: Built entirely on native Web Standards (`globalThis.crypto.subtle`) and standard library modules.
- **JIT Closure Compilation**: Single-pass template extraction compiling chunks directly into V8 JIT-optimized functions executing in single-digit nanoseconds.
- **Dual-Mode Rendering**: Open Declarative Shadow DOM full-page SSR and cryptographically signed dynamic `Envelope` generation.
- **Cryptographic Security**: Asymmetric Ed25519 origin signing, HMAC-SHA256, and HKDF session key derivation.
- **Multi-Runtime Support**: Node.js (>=18), Bun, Deno, Cloudflare Workers, and Vercel Edge.
- **Framework Adapters**: Web Standards `Response` (Fetch), Hono, Express.js, and Fastify.

## Installation

```bash
npm install anza
# or: pnpm add anza / bun add anza
```

## Quick Start (Fetch / Web Standards)

```typescript
import { Setup, Page, Fragment, htmlResponse, jsonResponse } from 'anza';

const engine = await new Setup({
  root: './templates',
  signing: { mode: 'hmac', secret: 'secret-key-32-chars-long-12345!' },
}).run();

export default {
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      const doc = await new Page('/', { title: 'TypeScript STUI' }).run(engine);
      return htmlResponse(doc);
    }

    if (url.pathname === '/card') {
      const env = await new Fragment('card.html', 'feed', { title: 'Live Item' }).run(engine);
      return jsonResponse(env);
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## License

MIT © 2026 Anza Contributors.
