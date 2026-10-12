# Framework Adapters

The adapters are small helpers that turn a `Document` or `Envelope` into a
response. They have no dependencies; the framework objects are typed as `any`.

| Framework | Import | Functions |
|---|---|---|
| **Web standard `Response`** | `@anzaui/engine` or `@anzaui/engine/adapters/web` | `htmlResponse(doc, status?, headers?)`, `jsonResponse(envelope, status?, headers?)`, `sseEvent(envelope)` |
| **Hono** | `@anzaui/engine/adapters/hono` | `html(c, doc, status?)`, `json(c, envelope, status?)`, plus the web helpers |
| **Express** | `@anzaui/engine/adapters/express` | `sendHtml(res, doc, status?)`, `sendJson(res, envelope, status?)`, `sendSse(res, envelope)` |
| **Fastify** | `@anzaui/engine/adapters/fastify` | `sendHtml(reply, doc, status?)`, `sendJson(reply, envelope, status?)` |

The same modules are also available as namespaces on the root export:
`import { adapters } from '@anzaui/engine'` → `adapters.express.sendHtml(...)`.

`doc` may be a `Document` or a plain HTML string.
