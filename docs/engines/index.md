# STUI Engines

Anza provides high-performance, multi-language **Server-Templated UI (STUI)** engines for **Rust**, **TypeScript / Node.js / Bun / Deno**, and **Python**.

STUI bridges server-side rendering and client-side web components. It enables sub-millisecond initial page delivery using **Open Declarative Shadow DOM (DSD)** alongside cryptographically verified dynamic component updates for partial fetches, live navigation, and real-time streaming.

## What You Get

- **Open Declarative Shadow DOM (DSD)** — Instant initial render without client-side hydration pauses
- **Zero-copy parameter injection** — Templates are pre-parsed once at startup into memory offsets
- **Cryptographic tamper-proofing** — Signed JSON envelopes protect dynamic fragments across CDNs and proxies
- **Multi-language wire compatibility** — Identical envelope format across Rust, TypeScript, and Python
- **Universal streaming** — First-class Server-Sent Events (SSE) and WebSocket text frame support
- **Zero external runtime dependencies** — Standard libraries and Web Standards across all engines

## Package Map

| Engine | Package / Crate | Ecosystem | Key Feature |
|--------|-----------------|-----------|-------------|
| [rust.md](rust.md) | `anza` (Cargo) | Axum, Actix-web, Tower | Zero-copy byte slices, sub-millisecond latency |
| [ts.md](ts.md) | `@anzaui/engine` (npm) | Node.js, Bun, Deno, Hono, Express | Zero dependencies, JIT closure compilation |
| [py.md](py.md) | `anza` (PyPI) | FastAPI, Starlette, Flask, Django | Pure standard library, async streaming generator |
| [crypto.md](crypto.md) | Built-in | All engines | Ed25519, HMAC-SHA256, and HKDF session key derivation |
| [streaming.md](streaming.md) | Built-in | All engines | Server-Sent Events (SSE) and WebSocket frame protocols |

## Dual-Mode Rendering

Every template in the `templates/` directory supports two rendering modes:

### Mode A: Full-Page SSR (Initial Paint & SEO)

Generates complete HTML documents containing root layout shells and Declarative Shadow DOM components:

```html
<!-- templates/pages/profile.html -->
<page-profile id="{{user_id}}">
  <template shadowrootmode="open">
    <style>
      :host { display: block; padding: 24px; color: var(--color-text); }
      .title { font-size: 1.5rem; font-weight: 700; }
    </style>
    <div class="title">Profile for {{user_name}}</div>
    <p class="bio">{{bio}}</p>
  </template>
</page-profile>
```

### Mode B: Dynamic Fragment Envelopes (SSE & Fetch)

Generates targeted JSON envelopes for real-time slot replacement and live streaming:

```json
{
  "slot": "feed",
  "ts": 1724771234,
  "html": "<ui-card class=\"stream-card\"><div slot=\"header\">Live Card</div></ui-card>",
  "sig": "3a8f4c2e1b...",
  "css": null
}
```

## File Map

| File | What It Covers |
|------|----------------|
| [rust.md](rust.md) | Rust engine setup, Axum/Actix adapters, and Serde data binding |
| [ts.md](ts.md) | TypeScript engine setup, Web Standards, Hono, and Express |
| [py.md](py.md) | Python engine setup, FastAPI, Flask, and dataclass binding |
| [crypto.md](crypto.md) | Cryptographic signing, Ed25519, and tamper verification |
| [streaming.md](streaming.md) | Real-time SSE streaming, WebSockets, and client adoption |
