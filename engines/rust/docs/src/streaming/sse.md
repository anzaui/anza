# Server-Sent Events (SSE)

## 1. Encoding a frame

`src/stream/sse/frame.rs`:

```rust
use anza::{stream::sse, Envelope};

let envelope = Envelope::new("feed", 1_724_771_200, "<article>Live Post</article>");

let frame: String = sse::encode(&envelope);
assert!(frame.starts_with("event: template\ndata: {"));
assert!(frame.ends_with("\n\n"));
```

`encode` returns a `String` (not a `Result`). Write it to any streaming
response body.

## 2. Axum SSE route

With the `axum` feature, `anza::adapters::axum::event` turns an envelope into an
`axum::response::sse::Event` named `template`. This example also needs
`futures-util` and `tokio` (with the `time` feature) in your own `Cargo.toml`.

```rust
use std::{sync::Arc, time::Duration};

use anza::{adapters::axum::event, Engine, Fragment};
use axum::{
  extract::State,
  response::sse::{Event, KeepAlive, Sse},
};
use futures_util::stream::{self, Stream};

async fn stream_feed(
  State(engine): State<Arc<Engine>>,
) -> Sse<impl Stream<Item = Result<Event, axum::Error>>> {
  let updates = stream::unfold(engine, |engine| async move {
    tokio::time::sleep(Duration::from_secs(2)).await;
    let item = Fragment::new("feed/card.html", "feed")
      .param("title", "Live Event")
      .run(&engine)
      .map_err(axum::Error::new)
      .and_then(event);
    Some((item, engine))
  });

  Sse::new(updates).keep_alive(KeepAlive::default())
}
```
