# Node.js Runtime

In Node.js (v18, v20, v22+), Anza leverages native standard library modules with **zero external dependencies**.

## 1. Minimal HTTP Server Setup

```typescript
import * as http from 'node:http';
import { Setup, Page } from 'anza';

const engine = await new Setup({ root: './templates' }).run();

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    const doc = await new Page('/', { title: 'Node STUI' }).run(engine);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(doc.html);
  }
});

server.listen(3000, () => {
  console.log('Listening on http://localhost:3000');
});
```

## 2. Zero-Dependency Guarantees

No `npm install` bloat:
- **Crypto**: `node:crypto` handles HMAC and Ed25519 with C++ OpenSSL speed.
- **Filesystem**: `node:fs/promises` reads templates asynchronously at boot.
- **Buffers**: Direct `Buffer` and `Uint8Array` binary conversions.
