# Axum Integration

The `axum` feature provides automatic conversion from `Document` to HTML responses and `Envelope` to JSON responses.

## 1. Full-Page SSR Handler

```rust
use axum::{extract::State, response::IntoResponse, routing::get, Router};
use anza::{engine::cache::engine::Engine, render::page::compile as render_page};

async fn handle_home(State(engine): State<Engine>) -> impl IntoResponse {
  let doc = render_page(&engine, "/", &[("title", "Home Page")]).unwrap();
  // Document implements IntoResponse -> Content-Type: text/html; charset=utf-8
  doc
}
```

## 2. Dynamic Fragment Handler

```rust
use axum::{extract::{Path, State}, response::IntoResponse};
use anza::{engine::cache::engine::Engine, render::fragment::render as render_fragment};

async fn handle_card(
  State(engine): State<Engine>,
  Path(id): Path<String>,
) -> impl IntoResponse {
  let envelope = render_fragment(
    &engine,
    "feed/card.html",
    "feed",
    &[("id", id.as_str()), ("title", "Updated Card")]
  ).unwrap();

  // Envelope implements IntoResponse -> Content-Type: application/json
  envelope
}
```

## 3. Assembling the Router

```rust
pub fn build_router(engine: Engine) -> Router {
  Router::new()
    .route("/", get(handle_home))
    .route("/card/:id", get(handle_card))
    .with_state(engine)
}
```
