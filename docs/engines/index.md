# Server-Templated UI (STUI) Engines

Anza provides high-performance, multi-language **Server-Templated UI (STUI)** engines for **Rust**, **TypeScript / JavaScript**, and **Python**.

They enable sub-millisecond initial page renders using **Open Declarative Shadow DOM (DSD)** alongside cryptographically verified dynamic component updates for partial fetches and real-time streaming.

```
┌─────────────────┐       Mode A: Initial SSR (HTML + Open DSD)        ┌─────────────────┐
│                 ├───────────────────────────────────────────────────►│                 │
│  Backend Engine │                                                    │  Client Browser │
│ (Rust / TS / Py)│       Mode B: Signed Dynamic Envelopes (SSE/Fetch) │ (Native Custom  │
│                 ├───────────────────────────────────────────────────►│    Elements)    │
└─────────────────┘         [ts:slot:html + Ed25519/HMAC Signature]    └─────────────────┘
```

## Architectural Principles

1. **Dual-Mode Rendering**:
   - **Mode A (Full-Page SSR)**: Emits full HTML documents containing Declarative Shadow DOM (`<template shadowrootmode="open">`) shells for instant first paint and SEO indexability without hydration pauses.
   - **Mode B (Fragment Envelopes)**: Emits signed JSON envelopes (`{ slot, ts, html, sig, css }`) for targeted partial updates and live Server-Sent Events (SSE).
2. **Zero External Runtime Dependencies**:
   - The TypeScript engine uses native Web Standards (`globalThis.crypto.subtle`) and standard library modules.
   - The Python engine uses 100% standard library modules.
   - The Rust engine uses minimal, high-throughput crate dependencies.
3. **Single-Pass Compilation**:
   - Delimiters `{{slot}}` are extracted once during template loading, eliminating regular expression parsing on incoming HTTP requests.
4. **Cryptographic Tamper-Proofing**:
   - Origin backend signs dynamic fragment payloads over `ts:slot:html` with asymmetric Ed25519 (to bypass intermediate CDN/proxy TLS termination), symmetric HMAC-SHA256, or HKDF per-user session keys.

## Engine Implementations

| Engine | Package / Crate | Key Focus | Adapters |
|---|---|---|---|
| [Rust Engine](rust.md) | `anza` (Cargo) | Zero-copy byte slices, maximum throughput | Axum, Actix-web, Tower |
| [TypeScript Engine](ts.md) | `anza` (npm) | JIT closure compilation, zero dependencies | Web Standards (Fetch), Hono, Express, Fastify |
| [Python Engine](py.md) | `anza` (PyPI) | Pure standard library, fast dict/dataclass binding | ASGI, WSGI, FastAPI, Flask |

## Related Guides

- [Cryptographic Verification](crypto.md) — Asymmetric Ed25519, HMAC-SHA256, and HKDF session key derivation.
- [Real-Time Streaming](streaming.md) — Server-Sent Events (SSE) and WebSocket text frame protocols.
