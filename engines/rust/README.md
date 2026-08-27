# Anza Rust Engine

Anza is an ultra-lightweight, zero-copy, cryptographically verified Server-Templated UI (STUI) engine for Rust.

## Features

- **Zero-Copy Template Parsing**: Single-pass template extraction compiling HTML fragments into continuous string slices.
- **Dual-Mode Rendering**:
  - Mode A: Full-page SSR emitting `<template shadowrootmode="open">` Declarative Shadow DOM shells.
  - Mode B: Dynamic JSON `Envelope` generation with cryptographic signatures.
- **Cryptographic Security**: HMAC-SHA256, Ed25519 asymmetric origin signing, and HKDF session key derivation.
- **Real-Time Streaming**: Native Server-Sent Events (SSE) and WebSocket packetization.
- **Framework Adapters**: Direct Axum and Actix-web response types.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
anza = { version = "0.5.0", features = ["axum"] }
```

## Quick Start (Axum)

```rust
use std::sync::Arc;
use anza::{Setup, Page, Fragment, SignOptions};
use axum::{routing::get, Router, response::{Html, Json}};

#[tokio::main]
async fn main() {
    let engine = Arc::new(
        Setup::new("./templates")
            .with_signing(SignOptions::hmac("secret-key-32-bytes-long-12345"))
            .run()
            .expect("Failed to initialize anza engine")
    );

    let app = Router::new()
        .route("/", get({
            let engine = engine.clone();
            move || async move {
                let doc = Page::new("/").with_param("title", "Rust STUI").run(&engine).unwrap();
                Html(doc.html)
            }
        }))
        .route("/card", get({
            let engine = engine.clone();
            move || async move {
                let env = Fragment::new("card.html", "feed").run(&engine).unwrap();
                Json(env)
            }
        }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## License

MIT OR Apache-2.0
