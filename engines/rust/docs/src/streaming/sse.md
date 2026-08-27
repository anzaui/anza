# Server-Sent Events (SSE)

Server-Sent Events provide lightweight, unidirectional streaming over standard HTTP/2 and HTTP/3.

## 1. The `Event` Formatter

Located in `src/stream/sse/event.rs`:

```rust
use anza::stream::sse::event::format as format_sse_event;
use anza::models::envelope::Envelope;

let envelope = Envelope {
  slot: "feed".into(),
  ts: 1724771200,
  html: "<article>Live Post</article>".into(),
  sig: Some("9f83...".into()),
  css: None,
};

let wire_chunk = format_sse_event(&envelope)?;
assert!(wire_chunk.starts_with("event: template\ndata: {"));
assert!(wire_chunk.ends_with("\n\n"));
```

## 2. Axum SSE Stream Route Handler

```rust
use axum::{response::sse::{Event, KeepAlive, Sse}, extract::State};
use futures_util::stream::Stream;
use std::time::Duration;

pub async fn stream_feed(
  State(engine): State<Engine>,
) -> Sse<impl Stream<Item = Result<Event, std::convert::Infallible>>> {
  let stream = async_stream::stream! {
    loop {
      tokio::time::sleep(Duration::from_secs(2)).await;
      
      let envelope = engine.render_fragment(
        "feed/card.html",
        "feed",
        &[("title", "Live Event")]
      ).unwrap();

      let json = serde_json::to_string(&envelope).unwrap();
      yield Ok(Event::default().event("template").data(json));
    }
  };

  Sse::new(stream).keep_alive(KeepAlive::default())
}
```
