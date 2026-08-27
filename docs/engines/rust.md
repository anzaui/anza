# Rust Engine

The Anza Rust Engine (`anza`) is a zero-copy Server-Templated UI engine built for the Rust web ecosystem. It delivers Declarative Shadow DOM documents and cryptographically verified dynamic component envelopes with minimal allocations and sub-millisecond execution times.

---

## What You Get

- **Zero-copy parameter injection** — Templates compile once into memory offsets; parameter replacement uses borrowed slices
- **Native framework support** — Pre-built converters for Axum, Actix-web, and Tower
- **Serde integration** — Direct data binding from any `Serialize` struct or map
- **Real-time SSE streams** — Built-in event generators for live component streaming
- **Live template reload** — Optional `watch` feature for background filesystem monitoring in development

---

## Installation

Add `anza` to your `Cargo.toml`:

```toml
[dependencies]
anza = { version = "0.5.0", features = ["axum"] }
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

### Feature Flags

| Feature | Description |
|---------|-------------|
| `axum` | Native response conversions for Axum (`Html(doc)`, `Json(envelope)`) |
| `actix` | Actix-web response helpers and extractors |
| `tower` | Tower Service middleware for template rendering pipelines |
| `watch` | Background filesystem template watcher for development hot reloading |

---

## Quickstart (Axum)

```rust
use anza::{Setup, Page, Fragment, SignOptions};
use axum::{
    routing::get,
    response::{Html, Json},
    Router,
};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // 1. Initialize engine once at application startup
    let engine = Arc::new(
        Setup::new("./templates")
            .with_signing(SignOptions::hmac("super-secret-key-32-bytes-long!"))
            .run()
            .expect("Failed to initialize Anza engine")
    );

    let app = Router::new()
        // Mode A: Full-page SSR with Declarative Shadow DOM
        .route("/", get({
            let engine = engine.clone();
            move || async move {
                let doc = Page::new("/")
                    .with_param("title", "Anza Rust STUI")
                    .run(&engine)
                    .expect("Failed to render page");
                Html(doc.html)
            }
        }))
        // Mode B: Dynamic partial fragment (JSON envelope)
        .route("/card", get({
            let engine = engine.clone();
            move || async move {
                let envelope = Fragment::new("feed/card.html", "feed")
                    .with_param("title", "Live Metric")
                    .run(&engine)
                    .expect("Failed to render fragment");
                Json(envelope)
            }
        }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

---

## Data Binding (Serde)

Bind data directly from any Rust struct deriving `Serialize`:

```rust
use serde::Serialize;
use anza::Page;

#[derive(Serialize)]
struct UserProfile {
    user_id: String,
    user_name: String,
    role: String,
}

let profile = UserProfile {
    user_id: "usr_9482".into(),
    user_name: "Alice Developer".into(),
    role: "Admin".into(),
};

let doc = Page::new("/profile")
    .with_data(&profile)
    .run(&engine)?;
```

---

## Signing Configuration

### Ed25519 (Asymmetric)

```rust
use anza::{Setup, SignOptions};

let engine = Setup::new("./templates")
    .with_signing(SignOptions::ed25519_pem_file("keys/origin_private.pem")?)
    .run()?;
```

### HMAC-SHA256 (Symmetric)

```rust
use anza::{Setup, SignOptions};

let engine = Setup::new("./templates")
    .with_signing(SignOptions::hmac("pre-shared-secret-key-32-bytes"))
    .run()?;
```
