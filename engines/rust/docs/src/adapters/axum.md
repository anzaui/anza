# Axum Integration

With the `axum` feature, `Document` converts to an HTML response and `Envelope`
to a JSON response, so handlers can return them directly.

## 1. Page handler

```rust
use std::sync::Arc;

use anza::{Document, Engine, Page};
use axum::{extract::State, http::StatusCode};

async fn home(State(engine): State<Arc<Engine>>) -> Result<Document, StatusCode> {
  Page::new("/")
    .param("title", "Home Page")
    .run(&engine)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
```

## 2. Fragment handler

```rust
use std::sync::Arc;

use anza::{Engine, Envelope, Fragment};
use axum::{
  extract::{Path, State},
  http::StatusCode,
};

async fn card(
  State(engine): State<Arc<Engine>>,
  Path(id): Path<String>,
) -> Result<Envelope, StatusCode> {
  Fragment::new("feed/card.html", "feed")
    .param("id", anza::escape_html(&id)) // values are inserted as is unless `escape` is on
    .param("title", "Updated Card")
    .run(&engine)
    .map_err(|_| StatusCode::NOT_FOUND)
}
```

## 3. Router

```rust
use std::sync::Arc;

use anza::Setup;
use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
  let engine = Arc::new(Setup::new("templates").run().expect("load templates"));

  let app = Router::new()
    .route("/", get(home))
    .route("/card/{id}", get(card))
    .with_state(engine);

  let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
  axum::serve(listener, app).await.unwrap();
}
```

For SSE, see [Server-Sent Events](../streaming/sse.md).
