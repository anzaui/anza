# Summary

- [Introduction](index.md)

- [Architecture](architecture/index.md)
  - [Slot Chunking](architecture/slots.md)
  - [Template Cache](architecture/cache.md)

- [Rendering Pipeline](rendering/index.md)
  - [Full-Page SSR & Open DSD](rendering/ssr.md)
  - [Fragment Envelopes](rendering/fragments.md)

- [Cryptographic Verification](crypto/index.md)
  - [Ed25519 Signing](crypto/ed25519.md)
  - [HMAC-SHA256](crypto/hmac.md)
  - [Key Derivation with HKDF](crypto/hkdf.md)

- [Real-Time Streaming](streaming/index.md)
  - [Server-Sent Events (SSE)](streaming/sse.md)
  - [WebSocket Frames](streaming/ws.md)

- [Framework Adapters](adapters/index.md)
  - [Axum Integration](adapters/axum.md)
  - [Actix-web Integration](adapters/actix.md)

- [Parameter Binding](params/index.md)
  - [Implementing Params for Structs](params/structs.md)

- [Performance](performance/index.md)
  - [Buffer Pre-Sizing & Memory Layout](performance/memory.md)
