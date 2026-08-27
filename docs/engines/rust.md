# Rust STUI Template Engine

The **Anza Rust Engine** (`anza`) is a zero-copy, cryptographically verified Server-Templated UI engine for Rust web frameworks.

## Installation

Add `anza` to your `Cargo.toml`:

```toml
[dependencies]
anza = { version = "0.5.0", features = ["axum"] }
```

Available features:
- `axum`: Native Axum response converters (`Html(doc)`, `Json(env)`).
- `actix`: Actix-web response helpers.
- `tower`: Tower Service middleware.
- `watch`: Live filesystem template watching.

## Quickstart (Axum)

```rust
use anza::{Setup, Page, Fragment, SignOptions};
use axum::{routing::get, Router, response::{Html, Json}};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // 1. Initialize engine once at startup
    let engine = Arc::new(
        Setup::new("./templates")
            .with_signing(SignOptions::hmac("super-secret-key-32-bytes-long"))
            .run()
            .expect("Failed to initialize anza engine")
    );

    let app = Router::new()
        // Full-Page SSR with Open Declarative Shadow DOM
        .route("/", get({
            let engine = engine.clone();
            move || async move {
                let doc = Page::new("/")
                    .with_param("title", "Rust STUI")
                    .with_param("count", "42")
                    .run(&engine)
                    .unwrap();
                Html(doc.html)
            }
        }))
        // Dynamic Signed Partial Fragment
        .route("/card", get({
            let engine = engine.clone();
            move || async move {
                let env = Fragment::new("feed/card.html", "feed")
                    .with_param("title", "Live Rust Card")
                    .run(&engine)
                    .unwrap();
                Json(env)
            }
        }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Parameter Injection

The Rust engine supports both map-based parameter injection and direct `Serialize` structs:

```rust
use serde::Serialize;
use anza::Page;

#[derive(Serialize)]
struct Article {
    title: String,
    author: String,
    views: u32,
}

let article = Article {
    title: "Zero-Copy STUI".into(),
    author: "Aduki Team".into(),
    views: 1250,
};

let doc = Page::new("/article").with_data(&article).run(&engine).unwrap();
```
