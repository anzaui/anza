# Changelog: anza (TypeScript Engine)

All notable changes to the TypeScript / JavaScript template and STUI streaming engine are documented here.

## [0.5.0] — 2026-08-27

### Added
- **0 External Runtime Dependencies**: Built entirely on native Web Standards (`globalThis.crypto.subtle`) and standard library primitives.
- **JIT Closure Compilation**: Single-pass template extraction compiling chunks directly into V8 JIT-optimized functions executing in single-digit nanoseconds.
- **Dual-Mode Rendering**: Open Declarative Shadow DOM full-page SSR and cryptographically signed dynamic `Envelope` generation.
- **Cryptographic Topologies**: Asymmetric Ed25519 origin signing, HMAC-SHA256, and HKDF session key derivation.
- **Multi-Runtime Support**: Node.js (>=18), Bun, Deno, Cloudflare Workers, and Vercel Edge.
- **Framework Adapters**: Web Standards `Response` (Fetch), Hono, Express.js, and Fastify.
- **Documentation**: Comprehensive mdBook documentation in `docs/`.
