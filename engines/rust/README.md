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
anza = "0.5.1"
```

To enable Axum framework response helpers:

```toml
[dependencies]
anza = { version = "0.5.1", features = ["axum"] }
```

## Usage

### 1. Initialize Engine

```rust
use std::sync::Arc;
use anza::Setup;

let mut setup = Setup::new("./templates");
setup.signing = Setup::hmac(b"your-secret-key-at-least-32-bytes");
let engine = Arc::new(setup.run().expect("Failed to load templates"));
```

`Setup::ed25519(private_key_file, public_key_file, false)` signs with Ed25519
(raw 32-byte key files) instead; the default is no signature.

### 2. Render Full Pages

```rust
use anza::Page;

// templates/pages/home.html inside templates/layout/shell.html ({{content}})
let doc = Page::new("/")
    .param("title", "My Web App")
    .run(&engine)
    .expect("Failed to render page");

println!("{}", doc.html);
```

### 3. Render Signed JSON Fragments

```rust
use anza::Fragment;

let envelope = Fragment::new("card.html", "feed")
    .param("title", "New Article")
    .run(&engine)
    .expect("Failed to render fragment");

// {"slot":"feed","ts":...,"html":"...","sig":"..."}
let json = serde_json::to_string(&envelope).unwrap();
```

### 4. Axum Integration Example (`features = ["axum"]`)

```rust
use std::sync::Arc;
use anza::{Fragment, Page, Setup};
use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
    let mut setup = Setup::new("./templates");
    setup.signing = Setup::hmac(b"your-secret-key-at-least-32-bytes");
    let engine = Arc::new(setup.run().unwrap());

    let app = Router::new()
        .route("/", get({
            let engine = engine.clone();
            move || async move { Page::new("/").param("title", "Home").run(&engine).unwrap() }
        }))
        .route("/api/card", get({
            let engine = engine.clone();
            move || async move { Fragment::new("card.html", "feed").run(&engine).unwrap() }
        }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

`Document` and `Envelope` implement `IntoResponse` (Axum) and `Responder`
(Actix-web) when the matching feature is on.

## Templates

Templates use `{{name}}` placeholders and are parsed once at startup. Values
are inserted without HTML escaping, so escape user input first. Template layout,
rendering rules and signing: [docs/engines](https://github.com/anzaui/anza/tree/main/docs/engines)
([Rust guide](https://github.com/anzaui/anza/blob/main/docs/engines/rust.md)).

## License

MIT © 2026 aduki, Labs
