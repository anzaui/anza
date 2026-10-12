# Node.js

## 1. Minimal HTTP server

```typescript
import * as http from 'node:http';
import { Page, Setup } from '@anzaui/engine';

const engine = await new Setup({ root: './templates' }).run();

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    const doc = await new Page('/', { title: 'Node STUI' }).run(engine);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(doc.html);
    return;
  }
  res.writeHead(404).end();
});

server.listen(3000, () => {
  console.log('Listening on http://localhost:3000');
});
```

## 2. What it uses

- **Crypto**: `node:crypto` for SHA-256 digests, HMAC, Ed25519 and HKDF.
- **Filesystem**: `node:fs/promises` reads templates at startup; `fs.watch` when `watch: true` (50 ms debounce, serialized reloads).
- No npm runtime dependencies.
