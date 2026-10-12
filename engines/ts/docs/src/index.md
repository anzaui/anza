# Anza Engine: TypeScript & JavaScript Reference

The TypeScript engine (npm package **`@anzaui/engine`**) renders server-templated
UI (STUI) from plain `.html` files: full HTML pages for the first load, and JSON
**envelopes** (`{ v: 2, slot, ts, html, sig?, css? }`) for fragments, fetches
and SSE/WebSocket pushes. Envelopes can be signed with HMAC-SHA256 or Ed25519
over a length-prefixed v2 message, and checked with `verifyEnvelope`. The
behaviour is shared with the Rust and Python engines (see the Engine Contract,
`docs/engines/contract.md`).

```
┌─────────────────┐   Full page (HTML, open DSD)            ┌─────────────────┐
│  Node / Bun /   ├────────────────────────────────────────►│     Browser     │
│  Deno server    │   Envelopes over fetch / SSE / WS       │ (custom elements│
│ (@anzaui/engine)├────────────────────────────────────────►│  + your code)   │
└─────────────────┘   { v, slot, ts, html, sig? }           └─────────────────┘
```

## Key points

1. **No runtime dependencies.** The engine uses Node built-ins (`node:crypto`,
   `node:fs`). It runs on Node.js 18+, and on Bun and Deno through their Node
   compatibility. It does not run on runtimes without a filesystem (see
   [Edge runtimes](runtimes/edge.md)).
2. **Parse once.** `Setup.run()` reads every `.html` file under the root, splits
   it into static strings and `{{name}}` placeholders, and builds a render
   function per template. No parsing or regular expressions at request time.
3. **Placeholders only.** The syntax is `{{name}}` (value) and `{{{name}}}`
   (raw). There are no loops, conditionals, filters or includes. By default
   values are inserted **without HTML escaping**: escape anything that comes
   from users with `escapeHtml` before you bind it, or set `escape: true` so
   `{{name}}` is escaped and only `{{{name}}}` is raw.
4. **Two outputs.** `Page` returns a `Document` (full HTML). `Fragment` and
   `Stream` return an `Envelope`.
5. **Signing.** `mode: 'hmac'` and `mode: 'ed25519'` add a lowercase hex
   `sig` to every envelope. Keys are checked in `Setup.run()`: a missing or
   short key throws `CRYPTO` there. `verifyEnvelope` checks received
   envelopes. The browser library does not verify signatures for you (see
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
  signing: { mode: 'hmac', secret: process.env.ANZA_SECRET! }, // at least 32 bytes
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
  `Document`, `Envelope`, `Manifest`, `AnzaError`, `Signer`, `extract`,
  `compile`, `string`, `stringify`, `escapeHtml`, `one`, `all`, `validName`,
  `pageTemplate`, `fragmentAllowed`, `verifyEnvelope`, `signatureMessage`,
  `ENVELOPE_VERSION`, `formatEvent`, `formatPacket`, `htmlResponse`,
  `jsonResponse`, `sseEvent`, and the namespaces `crypto` (`digest`,
  `ed25519`, `hex`, `hkdf`, `hmac`, plus `Signer`, `verifyEnvelope`,
  `signatureMessage`) and `adapters` (`web`, `hono`, `express`, `fastify`).
  Types: `SetupOptions`, `SignOptions`, `VerifyKey`, `VerifyOptions`,
  `ReceivedEnvelope`, `Params`, `Chunk`, `CompiledRenderer`, `EnvelopeData`,
  `ErrorCode`.
- `@anzaui/engine/adapters/web`, `…/adapters/hono`, `…/adapters/express`,
  `…/adapters/fastify`: the framework helpers.
