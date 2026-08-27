# Anza Engine: Rust STUI Reference

**Anza** (`anza`) is a lightweight, zero-allocation Server-Templated UI (STUI) template and component streaming engine built for high-performance Rust web services.

It delivers sub-millisecond initial page renders using **Open Declarative Shadow DOM (DSD)** and provides cryptographically signed component envelopes for dynamic partial fetches and Server-Sent Events (SSE) streams.

```
┌─────────────────┐       Initial SSR (HTML + Open DSD)        ┌─────────────────┐
│                 ├───────────────────────────────────────────►│                 │
│   Rust Server   │                                            │  Client Browser │
│   (Anza Engine) │       Signed Dynamic Envelopes (SSE/Fetch) │ (Native Custom  │
│                 ├───────────────────────────────────────────►│   Elements)     │
└─────────────────┘      [ts:slot:html + Ed25519/HMAC Sig]     └─────────────────┘
```

## Key Characteristics

1. **Ultra-Minimal Footprint**:
   - `default = []` in `Cargo.toml`. Zero mandatory web frameworks or async runtimes in the core crate.
   - Opt-in features for `axum`, `actix`, `tower`, and `watch`.

2. **Zero-Copy Parameter Resolution**:
   - Standalone `.html` files are chunked into contiguous static byte slices and slot indices at startup.
   - Domain structs implement the `Params` trait via `Cow<'_, str>` returns, eliminating heap allocations, intermediate string clones, and runtime regex matching.

3. **Dual-Mode Rendering**:
   - **Mode A (Full-Page SSR)**: Emits complete HTML documents with open Declarative Shadow DOM shells (`<template shadowrootmode="open">`) for instantaneous paint and SEO crawling.
   - **Mode B (Fragment Envelopes)**: Emits signed JSON envelopes (`{ slot, ts, html, sig, css }`) for partial updates and live SSE streams.

4. **Cryptographic Tamper-Proofing**:
   - Every partial envelope includes a cryptographic signature computed over `ts:slot:html`.
   - Supports **Asymmetric Ed25519** (for CDN/proxy TLS termination bypass), **HMAC-SHA256**, and **HKDF session-bound keys**.

## Quick Example

```rust
use anza::{
  data::r#in::setup::Setup,
  engine::cache::engine::{Engine, SignOptions},
  models::document::Document,
  render::page::compile as render_page,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  // 1. Initialize engine with templates directory
  let engine: Engine = Setup::new("templates")
    .signing(SignOptions::Hmac {
      secret: "super-secret-origin-key-32-bytes!!".into(),
    })
    .run()?;

  // 2. Render full SSR page with open Declarative Shadow DOM
  let doc: Document = render_page(&engine, "/", &[("title", "Home Page")])?;
  println!("Rendered SSR HTML:\n{}", doc.html);

  // 3. Render signed partial component fragment for SSE/fetch
  let env = engine.render_fragment(
    "feed/card.html",
    "main",
    &[("title", "Real-Time Update"), ("author", "Alex")]
  )?;
  println!("Signed Envelope:\n{}", serde_json::to_string_pretty(&env)?);

  Ok(())
}
```
