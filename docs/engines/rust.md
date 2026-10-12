# Rust Engine

The Anza Rust Engine (crate `anza`) renders full HTML pages and signed JSON
fragment envelopes from `.html` templates. Templates are loaded and parsed once
at startup; a render walks the pre-split chunks and copies parameter values in.

## What You Get

- **Parse once** — every template under the root is read and split into static chunks and `{{slot}}` placeholders by `Setup::run()`
- **Framework adapters** — `IntoResponse` (Axum) and `Responder` (Actix-web) for `Document` and `Envelope`, plus SSE helpers
- **Serde binding** — render any `Serialize` value with `Template::render`, or wrap it in `Data(...)`
- **Signing** — HMAC-SHA256 or Ed25519 signatures over `ts:slot:html`
- **Watch (incomplete)** — the `watch` feature starts a file watcher, but changes are not reloaded yet; restart to pick up template edits

## Installation

```toml
[dependencies]
anza = { version = "0.5", features = ["axum"] }
tokio = { version = "1", features = ["full"] }
```

### Feature Flags

| Feature | Description |
|---------|-------------|
| *(default)* | No web framework and no async runtime |
| `axum` | `IntoResponse` for `Document` (HTML) and `Envelope` (JSON); `adapters::axum::stream::event` builds an SSE `Event` |
| `actix` | `Responder` for `Document` and `Envelope`; `adapters::actix::stream::bytes` for SSE bodies |
| `tower` | Placeholder: pulls in `tower`, but `adapters::tower` has no `Service` yet |
| `watch` | Starts a `notify` watcher on the root; events are not applied to the cache yet |
| `full` | All of the above |

## Quickstart (Axum)

```rust
use std::sync::Arc;
use anza::{Fragment, Page, Setup};
use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
    // 1. Load and parse every template once at startup.
    let mut setup = Setup::new("./templates");
    setup.signing = Setup::hmac(b"super-secret-key-32-bytes-long!!");
    let engine = Arc::new(setup.run().expect("load templates"));

    let app = Router::new()
        // Full page: templates/pages/home.html inside templates/layout/shell.html
        .route("/", get({
            let engine = engine.clone();
            move || async move {
                Page::new("/").param("title", "Anza Rust").run(&engine).unwrap()
            }
        }))
        // Fragment: templates/feed/card.html as a signed JSON envelope
        .route("/card", get({
            let engine = engine.clone();
            move || async move {
                Fragment::new("feed/card.html", "feed")
                    .param("title", "Live Metric")
                    .run(&engine)
                    .unwrap()
            }
        }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

`Document` and `Envelope` implement `IntoResponse` with the `axum` feature, so
handlers can return them directly.

## Parameters

`Page::param` and `Fragment::param` take string pairs. For structured data,
bind a template yourself:

```rust
use serde::Serialize;

#[derive(Serialize)]
struct UserProfile {
    user_id: String,
    user_name: String,
}

let profile = UserProfile { user_id: "usr_9482".into(), user_name: "Alice".into() };
let html = engine.get("partials/profile.html")?.render(&profile)?;
```

`Template::bind` accepts anything that implements `Params`: `HashMap<String, String>`,
arrays of `(&str, &str)` pairs, `serde_json::Value`, or `Data(value)` for any
`Serialize` type.

Values are inserted **as is, without HTML escaping**. Escape user input before
passing it in.

## Signing Configuration

`Setup` has public fields (`root`, `signing`, `watch`). Two helpers build the
signing mode:

```rust
use anza::{Setup, SignMode};

// HMAC-SHA256 with a shared secret
let mut setup = Setup::new("./templates");
setup.signing = Setup::hmac(b"pre-shared-secret-key-32-bytes!!");

// Ed25519: the files hold the raw 32-byte private key and public key
setup.signing = Setup::ed25519("keys/origin.key", "keys/origin.pub", false);

// No signature (development)
setup.signing = SignMode::None;
```

`SignMode::SessionBound` is accepted but does not sign yet. The signature is
hex-encoded; see [crypto.md](crypto.md).

## Page Rendering

`Page::new(route)` maps the route to a template: `/` → `pages/home.html`,
`/about` → `pages/about.html`, then falls back to `about.html` and
`pages/index.html`. The page is bound with the params, then inserted into
`layout/shell.html` as `{{content}}` (also `{{slot_main}}`). Without a shell,
a minimal document with a `<dock-main>` is emitted.

## Streaming

`Stream` renders an envelope like `Fragment`; `stream::sse::frame::encode(&envelope)`
formats it as an SSE `template` event and `stream::ws::packet::encode` as a
WebSocket text frame. With the `axum` feature, `adapters::axum::stream::event`
returns an `axum::response::sse::Event`. See [streaming.md](streaming.md).

## Crate Layout

| Module | Contents |
|--------|----------|
| `data::r#in` | `Setup` (config) and the `Page`, `Fragment`, `Stream` operations |
| `engine::slot` | `{{slot}}` parser (`extract`) and binder (`Params`, `Data`) |
| `engine::file` | Template loading (`load::all`, `Template`), reading, watching |
| `engine::cache` | `Engine`, `SignMode`, the template store |
| `render` | Page and fragment rendering |
| `crypto` | `hmac`, `ed25519` (sign / verify), `hkdf`, `blake` digests |
| `stream` | SSE and WebSocket encoders |
| `adapters` | Axum and Actix-web integration (feature-gated); `tower` is an empty placeholder |
| `models` | `Document`, `Envelope`, `Manifest` |
