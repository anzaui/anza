# Anza Engine: TypeScript & JavaScript Reference

The TypeScript engine (npm package **`@anzaui/engine`**) renders server-templated
UI (STUI) from plain `.html` files: full HTML pages for the first load, and JSON
**envelopes** (`{ slot, ts, html, sig?, css? }`) for fragments, fetches and
SSE/WebSocket pushes. Envelopes can be signed with HMAC-SHA256 or Ed25519 over
`ts:slot:html`.

```
┌─────────────────┐   Full page (HTML, open DSD)            ┌─────────────────┐
│  Node / Bun /   ├────────────────────────────────────────►│     Browser     │
│  Deno server    │   Envelopes over fetch / SSE / WS       │ (custom elements│
│ (@anzaui/engine)├────────────────────────────────────────►│  + your code)   │
└─────────────────┘   { slot, ts, html, sig? }              └─────────────────┘
```

## Key points

1. **No runtime dependencies.** The engine uses Node built-ins (`node:crypto`,
   `node:fs`). It runs on Node.js 18+, and on Bun and Deno through their Node
   compatibility. It does not run on runtimes without a filesystem (see
   [Edge runtimes](runtimes/edge.md)).
2. **Parse once.** `Setup.run()` reads every `.html` file under the root, splits
   it into static strings and `{{name}}` placeholders, and builds a render
   function per template. No parsing or regular expressions at request time.
3. **Placeholders only.** The syntax is `{{name}}`. There are no loops,
   conditionals, filters or includes. Values are inserted **without HTML
   escaping**: escape anything that comes from users before you bind it.
4. **Two outputs.** `Page` returns a `Document` (full HTML). `Fragment` and
   `Stream` return an `Envelope`.
5. **Signing.** `mode: 'hmac'` and `mode: 'ed25519'` add a hex `sig` to every
   envelope. `mode: 'session'` exists but does not sign yet. The browser library
   does not verify signatures for you (see
   [Cryptographic Verification](crypto/index.md)).

## Quick example

```bash
npm install @anzaui/engine
```

```typescript
import { Setup, Page, Fragment } from '@anzaui/engine';

// 1. Load and parse ./templates once.
const engine = await new Setup({
  root: './templates',
  signing: { mode: 'hmac', secret: 'super-secret-origin-key-32-bytes' },
}).run();

// 2. Full page: templates/pages/home.html inside templates/layout/shell.html.
const doc = await new Page('/', { title: 'Home Page' }).run(engine);
console.log(doc.html);

// 3. Signed fragment envelope from templates/feed/card.html.
const envelope = await new Fragment('feed/card.html', 'main', {
  title: 'Real-Time Update',
  author: 'Alex',
}).run(engine);
console.log(JSON.stringify(envelope, null, 2));
```

## Exports

- `@anzaui/engine`: `Setup`, `Page`, `Fragment`, `Stream`, `Engine`, `Template`,
  `Document`, `Envelope`, `Manifest`, `AnzaError`, `extract`, `compile`,
  `string`, `one`, `all`, `formatEvent`, `formatPacket`, `htmlResponse`,
  `jsonResponse`, `sseEvent`, and the namespaces `crypto` (`digest`, `ed25519`,
  `hkdf`, `hmac`) and `adapters` (`web`, `hono`, `express`, `fastify`). Types:
  `SetupOptions`, `SignOptions`, `Params`, `Chunk`, `CompiledRenderer`,
  `EnvelopeData`, `ErrorCode`.
- `@anzaui/engine/adapters/web`, `…/adapters/hono`, `…/adapters/express`,
  `…/adapters/fastify`: the framework helpers.
