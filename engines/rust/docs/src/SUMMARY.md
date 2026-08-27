# Summary

- [Introduction](index.md)

- [Architecture](architecture/index.md)
  - [AST & Slot Chunking](architecture/slots.md)
  - [Template Caching & Storage](architecture/cache.md)

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
  - [Axum Integration](adapters/axum.md)
  - [Actix-web Integration](adapters/actix.md)

- [Parameter Binding](params/index.md)
  - [Zero-Copy Struct Implementation](params/structs.md)

- [Performance & Memory](performance/index.md)
  - [Buffer Pre-Sizing & Zero-Copy](performance/memory.md)
