# Framework Adapters

Anza provides native response helpers and middleware adapters for standard JavaScript and TypeScript web frameworks.

## 1. Available Adapters

| Framework / Standard | Adapter Module | Key Functions |
|---|---|---|
| **Web Standards / Fetch** | `anza/adapters/web.js` | `htmlResponse()`, `jsonResponse()`, `sseEvent()` |
| **Hono** | `anza/adapters/hono.js` | `html()`, `json()`, `sseEvent()` |
| **Express.js** | `anza/adapters/express.js` | `sendHtml()`, `sendJson()`, `sendSse()` |
| **Fastify** | `anza/adapters/fastify.js` | `sendHtml()`, `sendJson()` |

All adapters are zero-dependency and convert Anza models directly to the framework's native response types.
