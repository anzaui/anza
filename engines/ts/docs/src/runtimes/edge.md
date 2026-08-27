# Cloudflare Workers & Edge Runtimes

Edge workers operate in resource-constrained V8 isolates where fast startup time and low memory footprints are mandatory.

## 1. Cloudflare Workers Integration

Because Anza core requires zero node-specific native modules, it bundles directly into Cloudflare Workers:

```typescript
import { Engine, CacheStore, Template, htmlResponse } from 'anza';

// Inlined or bundled template definitions
const templates = new Map<string, Template>();
const cache = new CacheStore(templates);
const engine = new Engine('/', cache, { mode: 'none' });

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const doc = await engine.renderPage('/', { title: 'Cloudflare Edge STUI' });
    return htmlResponse(doc);
  },
};
```

## 2. Advantages on the Edge

1. **Near-Zero Cold Start**: No heavy framework bundle to initialize or parse.
2. **Sub-10MB Memory Profile**: In-memory chunk stores consume less than 2MB of RAM for hundreds of templates.
3. **Web Crypto Native**: Uses Cloudflare's native `crypto.subtle` for hardware-accelerated signature generation.
