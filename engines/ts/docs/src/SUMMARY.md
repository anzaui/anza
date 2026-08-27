# Summary

- [Introduction](index.md)

- [Architecture](architecture/index.md)
  - [AST & JIT Closure Compilation](architecture/slots.md)
  - [Template Caching & Store](architecture/cache.md)

- [Rendering Pipeline](rendering/index.md)
  - [Full-Page SSR & Open DSD](rendering/ssr.md)
  - [Dynamic Fragment Envelopes](rendering/fragments.md)

- [Cryptographic Verification](crypto/index.md)
  - [Asymmetric Ed25519 Signing](crypto/ed25519.md)
  - [HMAC-SHA256 & Tamper Rejection](crypto/hmac.md)
  - [Session Key Derivation via HKDF](crypto/hkdf.md)

- [Real-Time Streaming](streaming/index.md)
  - [Server-Sent Events (SSE)](streaming/sse.md)
  - [WebSocket Packetization](streaming/ws.md)

- [Framework Adapters](adapters/index.md)
  - [Web Standards & Fetch](adapters/web.md)
  - [Hono Integration](adapters/hono.md)
  - [Express Integration](adapters/express.md)
  - [Fastify Integration](adapters/fastify.md)

- [Multi-Runtime Support](runtimes/index.md)
  - [Node.js](runtimes/node.md)
  - [Bun & Deno](runtimes/bun.md)
  - [Cloudflare Workers & Edge](runtimes/edge.md)

- [Performance & Memory](performance/index.md)
  - [JIT Closure Speed & V8 Optimization](performance/benchmarks.md)
  - [Zero-Copy String Concatenation](performance/memory.md)
