---
seo_title: "Rust STUI Engine — Anza"
description: "Zero-copy, cryptographically verified Server-Templated UI engine for Rust web frameworks."
---

# Rust Engine

The Anza Rust Engine (crate `anza`) renders full HTML pages and signed JSON
fragment envelopes from `.html` templates. Templates are loaded and parsed once
at startup; a render walks the pre-split chunks and copies parameter values in.

## What You Get

- **Parse once** — every template under the root is read and split into static chunks and `{{slot}}` placeholders by `Setup::run()`
- **Framework adapters** — `IntoResponse` (Axum) and `Responder` (Actix-web) for `Document` and `Envelope`, plus SSE helpers
- **Serde binding** — render any `Serialize` value with `Template::render`, or wrap it in `Data(...)`
- **Signing** — HMAC-SHA256 or Ed25519 signatures over the v2 message (see [Engine Contract](contract.md)), and `verify_envelope` to check received envelopes
- **Watch** — with the `watch` feature and `setup.watch = true`, edited, added and removed `.html` templates are reloaded into the cache

## Installation

```toml
[dependencies]
anza = { version = "0.6", features = ["axum"] }
tokio = { version = "1", features = ["full"] }
```

### Feature Flags

| Feature | Description |
|---------|-------------|
| *(default)* | No web framework and no async runtime |
| `axum` | `IntoResponse` for `Document` (HTML) and `Envelope` (JSON); `adapters::axum::stream::event` builds an SSE `Event` |
| `actix` | `Responder` for `Document` and `Envelope`; `adapters::actix::stream::bytes` for SSE bodies |
| `watch` | Watches the root with `notify` and reloads changed templates into the cache |
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

`engine.get(name)` returns `Result<Arc<Template>>`, a shared handle to the
cached template. Lookups only use the cache: a malformed name (leading `/`,
`\`, NUL, or an empty, `.` or `..` segment) is a `Validation` error, and an
unknown one is `NotFound`. `Template::render` converts the value to JSON once
per render.

`Template::bind` accepts anything that implements `Params`: `HashMap<String, String>`,
arrays of `(&str, &str)` pairs, `serde_json::Value`, or `Data(value)` for any
`Serialize` type.

By default, `{{name}}` and `{{{name}}}` both insert values **as is, without
HTML escaping**. Escape user input with `anza::escape_html` before passing it
in, or set `setup.escape = true`: then `{{name}}` is HTML-escaped (`&` `<` `>`
`"` `'`) and `{{{name}}}` stays raw. With escaping on, the shell must use
`{{{content}}}` so the page HTML isn't escaped.

Values are stringified the same way in every engine: booleans as
`true`/`false`, integral floats without `.0`, `null` as nothing, arrays and
objects as compact JSON.

## Signing Configuration

`Setup::new(root)` returns the defaults; set its public fields before `run()`:

| Field | Meaning | Default |
|-------|---------|---------|
| `signing` | `SignMode::Hmac`, `SignMode::Ed25519` or `SignMode::None` | `None` |
| `watch` | Reload templates on change (feature `watch`) | `false` |
| `fragments` | Allowlist for fragments: exact names, or prefixes ending in `/` (`"fragments/"`). Other templates are reported as not found | empty (all templates) |
| `escape` | HTML-escape `{{name}}` values | `false` |
| `max_template_bytes` | Larger template files are a `Template` error | 1 MiB |

Two helpers build the signing mode:

```rust
use anza::{Setup, SignMode};

// HMAC-SHA256 with a shared secret
let mut setup = Setup::new("./templates");
setup.signing = Setup::hmac(b"pre-shared-secret-key-32-bytes!!");

// Ed25519: the files hold the raw 32-byte private seed and public key.
// A missing or unreadable file is an error.
setup.signing = Setup::ed25519("keys/origin.key", "keys/origin.pub")?;

// No signature (development)
setup.signing = SignMode::None;

let engine = setup.run()?;
```

Keys are validated once, in `run()`. An HMAC secret shorter than 32 bytes, an
Ed25519 private key that is not a 32-byte seed, or a public key that doesn't
match the seed is a `Crypto` error at setup, never an unsigned envelope.
`engine.signer()` returns the validated key; its `Debug` output never shows
key material.

The signature is lowercase hex over the v2 message
(`anza::crypto::envelope::message(ts, slot, html, css)`, also
`envelope.message()`); see [Cryptographic Verification](crypto.md).

### Verifying Envelopes

`anza::verify_envelope` checks a received envelope: version, signature format,
freshness, slot, then the signature (constant time). Every failure is a
`Crypto` error naming the check (`envelope expired`, `slot mismatch`,
`bad signature`, ...).

```rust
use anza::{verify_envelope, Envelope, VerifyKey, VerifyOptions};

let envelope: Envelope = serde_json::from_str(&body)?;
// Accept envelopes for slot "feed" that are at most 60 seconds old.
let options = VerifyOptions::new("feed", 60);
verify_envelope(VerifyKey::Hmac(&secret), &envelope, &options)?;
// or with an Ed25519 public key: VerifyKey::Ed25519(&public_key)

// With the engine's own key:
engine.verify_envelope(&envelope, &options)?;
```

`VerifyOptions` also has `skew_secs` (future timestamps allowed, default 5)
and `now` (`Option<u64>`, defaults to the system clock).

## Page Rendering

`Page::new(route)` maps the route to a template under `pages/`: `/` →
`pages/home.html`, `/about` → `pages/about.html`, `/a/b` → `pages/a/b.html`.
When that template is missing, `pages/index.html` is the catch-all. Otherwise,
or when the route is malformed (`..`, `\`, NUL), the result is a `NotFound`
error, `Page not found`; the route is never echoed. Routes never resolve
outside `pages/`.

The page is bound with the params, then inserted into `layout/shell.html` as
`{{content}}`. Without a shell, a minimal document with a `<dock-main>` is
emitted.

## Errors

`anza::Error` has five variants, with the same codes as the other engines:
`Validation`, `NotFound`, `Template`, `Crypto`, `Internal`. `Error::code()`
returns `VALIDATION`, `NOT_FOUND`, and so on, and errors display as
`[Anza:CODE] message`.

## Streaming

`Stream` renders an envelope like `Fragment`; `stream::sse::frame::encode(&envelope)`
formats it as an SSE `template` event and `stream::ws::packet::encode` as a
WebSocket text frame. With the `axum` feature, `adapters::axum::stream::event`
returns an `axum::response::sse::Event`. See [Real-Time Streaming](streaming.md).

## Crate Layout

| Module | Contents |
|--------|----------|
| `data::r#in` | `Setup` (config) and the `Page`, `Fragment`, `Stream` operations |
| `engine::slot` | `{{slot}}` parser (`extract`) and binder (`Params`, `Data`) |
| `engine::file` | Template loading (`load::all`, `Template`), reading, watching |
| `engine::cache` | `Engine`, `SignMode`, the template store (`Arc<Template>` entries) |
| `render` | Page and fragment rendering |
| `crypto` | `envelope` (v2 message, `verify`), `signer`, `hmac`, `ed25519`, `hkdf`, `hex`, `digest` (SHA-256 manifest digests) |
| `stream` | SSE and WebSocket encoders |
| `adapters` | Axum and Actix-web integration (feature-gated) |
| `models` | `Document`, `Envelope`, `Manifest` |
