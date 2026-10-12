# Runtime Support

The engine is written against Node.js built-ins. It runs wherever those are
available.

| Runtime | Status | Notes |
|---|---|---|
| **Node.js 18+** | Supported (tests run on Node) | `watch: true` needs Node 20+ on Linux (recursive `fs.watch`) |
| **Bun** | Expected to work via Bun's Node compatibility | Not covered by the test suite |
| **Deno** | Expected to work via `npm:` specifiers and Node compatibility | Not covered by the test suite |
| **Cloudflare Workers / edge** | Not supported | No filesystem for `Setup`; see [Edge runtimes](edge.md) |

APIs used: `node:crypto` (SHA-256, HMAC, Ed25519, HKDF), `node:fs` /
`node:fs/promises` (loading and watching), `node:path`, `Buffer`, and the global
`Response` (web adapter only).
