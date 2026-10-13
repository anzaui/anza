---
title: "Engines"
order: 17
seo_title: "Server-Templated UI (STUI) Engines — Anza"
description: "High-performance STUI template and streaming engines for Rust, TypeScript, and Python."
---

# STUI Engines

Anza provides high-performance, multi-language **Server-Templated UI (STUI)** engines for **Rust**, **TypeScript / Node.js / Bun / Deno**, and **Python**.

STUI bridges server-side rendering and client-side web components. It enables sub-millisecond initial page delivery using **Open Declarative Shadow DOM (DSD)** alongside cryptographically verified dynamic component updates for partial fetches, live navigation, and real-time streaming.

## What You Get

- **Open Declarative Shadow DOM (DSD)** — Instant initial render without client-side hydration pauses
- **Zero-copy parameter injection** — Templates are pre-parsed once at startup into memory offsets
- **Cryptographic tamper-proofing** — Signed JSON envelopes protect dynamic fragments across CDNs and proxies
- **Multi-language wire compatibility** — Byte-identical envelopes, signatures and SSE frames across Rust, TypeScript, and Python, pinned by one [Engine Contract](contract.md)
- **Universal streaming** — First-class Server-Sent Events (SSE) and WebSocket text frame support
- **Small dependency footprint** — The TypeScript engine has no runtime dependencies, the Python engine needs only `cryptography`, and the Rust crate uses a few audited crates (`serde`, `sha2`, `hmac`, `ed25519-dalek`)

## Package Map

| Engine | Package / Crate | Ecosystem | Key Feature |
|--------|-----------------|-----------|-------------|
| [Rust Engine](rust.md) | `anza` (Cargo) | Axum, Actix-web | Zero-copy byte slices, sub-millisecond latency |
| [TypeScript Engine](ts.md) | `@anzaui/engine` (npm) | Node.js, Bun, Deno, Hono, Express | Zero dependencies, JIT closure compilation |
| [Python Engine](py.md) | `anza` (PyPI) | FastAPI, Starlette, Flask, Django | Standard library plus `cryptography`, async streaming generator |
| [Engine Contract](contract.md) | Specification | All engines | Wire format v2, signatures, pages, values, escaping and errors |

Each engine is its own repository with its own version, releases and full documentation site:

| Engine | Repository | Documentation |
|--------|------------|---------------|
| Rust | [anzaui/rust](https://github.com/anzaui/rust) | [anzaui.github.io/rust](https://anzaui.github.io/rust/) |
| TypeScript | [anzaui/ts](https://github.com/anzaui/ts) | [anzaui.github.io/ts](https://anzaui.github.io/ts/) |
| Python | [anzaui/py](https://github.com/anzaui/py) | [anzaui.github.io/py](https://anzaui.github.io/py/) |

The pages here summarize each engine; the [Engine Contract](contract.md) is the shared specification all three follow.
| [Cryptographic Verification](crypto.md) | Built-in | All engines | Ed25519, HMAC-SHA256, and HKDF session key derivation |
| [Real-Time Streaming](streaming.md) | Built-in | All engines | Server-Sent Events (SSE) and WebSocket frame protocols |

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
  "v": 2,
  "slot": "feed",
  "ts": 1724771234,
  "html": "<ui-card class=\"stream-card\"><div slot=\"header\">Live Card</div></ui-card>",
  "sig": "3a8f4c2e1b..."
}
```

On the wire the envelope is compact JSON (no spaces) with `v` first. `sig` and
`css` are left out when absent.

## Templates

All three engines read the same template tree:

```text
templates/
├── layout/
│   └── shell.html      # document wrapper; the page goes into {{content}}
├── pages/
│   ├── home.html       # route "/"
│   └── about.html      # route "/about"
└── feed/
    └── card.html       # any other file can be rendered as a fragment
```

- Placeholders are `{{name}}` and `{{{name}}}` (raw). Whitespace inside the braces is trimmed. An unclosed or empty placeholder is a load error.
- Every template is loaded and parsed once, when `Setup` runs. Rendering only joins the parsed chunks with the parameter values.
- A missing parameter renders as an empty string. Booleans render as `true` / `false`, and lists, arrays, dicts and objects render as compact JSON.
- By default values are **not HTML-escaped**. Escape anything that comes from users with `escape_html` (TS `escapeHtml`) before binding it, or turn on the `escape` setup option so `{{name}}` is escaped and only `{{{name}}}` is raw.
- Fragments are addressed by their path under the root (`feed/card.html`) and a target `slot` name. The optional `fragments` setup option limits which templates can be rendered as fragments.
- Template names are relative `/`-separated paths. Lookups only use the in-memory cache, so request input never reaches the filesystem.

The envelope (`v`, `slot`, `ts`, `html`, `sig`, `css`), its signature and page
rendering are identical across engines. A route resolves only under `pages/`
(`/` is `pages/home.html`, `/about` is `pages/about.html`), falls back to
`pages/index.html` when it exists, and is otherwise a `NOT_FOUND` error. The
page markup goes into `layout/shell.html` as `{{content}}`, or into a minimal
`<dock-main>` document when there is no shell. See the
[Engine Contract](contract.md).

## File Map

| File | What It Covers |
|------|----------------|
| [Rust Engine](rust.md) | Rust engine setup, Axum/Actix adapters, and Serde data binding |
| [TypeScript Engine](ts.md) | TypeScript engine setup, Web Standards, Hono, and Express |
| [Python Engine](py.md) | Python engine setup, FastAPI, Flask, and dataclass binding |
| [Cryptographic Verification](crypto.md) | Cryptographic signing, Ed25519, and tamper verification |
| [Real-Time Streaming](streaming.md) | Real-time SSE streaming, WebSockets, and client adoption |
| [Engine Contract](contract.md) | The behaviour all three engines share: wire format v2, signatures, pages, values and errors |
