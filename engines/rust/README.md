<p align="center">
  <img src="logo.svg" width="64" height="64" alt="Anza Logo" />
</p>

<h1 align="center">Anza (Rust Engine)</h1>

A server-side template and dynamic fragment rendering library for Rust web applications.

## What It Does

1. **Full-Page Rendering**: Renders complete HTML documents configured with `<template shadowrootmode="open">` Declarative Shadow DOM shells.
2. **Dynamic Fragment Envelopes**: Renders targeted HTML partials inside JSON `Envelope` payloads for partial UI updates.
3. **Payload Verification**: Signs dynamic payloads using HMAC-SHA256 or Ed25519 so clients can verify partial updates.
4. **Streaming**: Helpers for Server-Sent Events (SSE) and WebSocket message formats.

## Installation

Add `anza` to your `Cargo.toml`:

```toml
[dependencies]
anza = "0.5.0"
```

To enable Axum framework response helpers:

```toml
[dependencies]
anza = { version = "0.5.0", features = ["axum"] }
```

## Usage

### 1. Initialize Engine

```rust
use std::sync::Arc;
use anza::{Setup, SignOptions};

let engine = Arc::new(
    Setup::new("./templates")
        .with_signing(SignOptions::hmac("your-secret-key-at-least-32-chars-long"))
        .run()
        .expect("Failed to initialize template engine")
);
```

### 2. Render Full Pages

```rust
use anza::Page;

// Renders full HTML document with parameters interpolated into slots
let doc = Page::new("/")
    .with_param("title", "My Web App")
    .run(&engine)
    .expect("Failed to render page");

println!("{}", doc.html);
```

### 3. Render Signed JSON Fragments

```rust
use anza::Fragment;

// Renders a specific template fragment targeting a slot
let envelope = Fragment::new("card.html", "feed")
    .with_param("title", "New Article")
    .run(&engine)
    .expect("Failed to render fragment");

// envelope contains: slot, html, ts, and signature
let json = serde_json::to_string(&envelope).unwrap();
```

### 4. Axum Integration Example

```rust
use std::sync::Arc;
use anza::{Setup, Page, Fragment, SignOptions};
use axum::{routing::get, Router, response::{Html, Json}};

#[tokio::main]
async fn main() {
    let engine = Arc::new(
        Setup::new("./templates")
            .with_signing(SignOptions::hmac("your-secret-key-at-least-32-chars-long"))
            .run()
            .unwrap()
    );

    let app = Router::new()
        .route("/", get({
            let engine = engine.clone();
            move || async move {
                let doc = Page::new("/").with_param("title", "Home").run(&engine).unwrap();
                Html(doc.html)
            }
        }))
        .route("/api/card", get({
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

MIT © 2026 aduki, Labs
