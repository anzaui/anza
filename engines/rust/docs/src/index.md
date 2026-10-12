# Anza Engine: Rust Reference

The Rust engine (crate **`anza`**) renders server-templated UI (STUI) from plain
`.html` files: full HTML pages for the first load, and JSON **envelopes**
(`{ slot, ts, html, sig?, css? }`) for fragments, fetches and SSE/WebSocket
pushes. Envelopes can be signed with HMAC-SHA256 or Ed25519 over `ts:slot:html`.

```
┌─────────────────┐   Full page (HTML, open DSD)            ┌─────────────────┐
│   Rust server   ├────────────────────────────────────────►│     Browser     │
│  (crate `anza`) │   Envelopes over fetch / SSE / WS       │ (custom elements│
│                 ├────────────────────────────────────────►│  + your code)   │
└─────────────────┘   { slot, ts, html, sig? }              └─────────────────┘
```

> The CLI is a different crate: **`anza-cli`** (its binary is `anza`). This book
> covers only the engine crate `anza`.

## Key points

1. **Small core.** `default = []` in `Cargo.toml`: no web framework and no async
   runtime unless you enable the `axum`, `actix`, `tower` or `watch` features.
2. **Parse once.** `Setup::run()` reads every `.html` file under the root and
   splits it into static byte chunks and `{{name}}` placeholders. Rendering only
   copies chunks and parameter values into one pre-sized buffer.
3. **Placeholders only.** The syntax is `{{name}}`. There are no loops,
   conditionals, filters or includes. Values are inserted **without HTML
   escaping**: escape anything that comes from users before you bind it.
4. **Two outputs.** `Page` returns a `Document` (full HTML). `Fragment` and
   `Stream` return an `Envelope`.
5. **Signing.** `SignMode::Hmac` and `SignMode::Ed25519` add a hex `sig` to every
   envelope. `SignMode::SessionBound` exists but does not sign yet. The browser
   library does not verify signatures for you (see
   [Cryptographic Verification](crypto/index.md)).

## Quick example

```toml
[dependencies]
anza = "0.5"
serde_json = "1"
```

```rust
use anza::{Fragment, Page, Setup};

fn main() -> Result<(), Box<dyn std::error::Error>> {
  // 1. Load and parse ./templates once.
  let mut setup = Setup::new("templates");
  setup.signing = Setup::hmac(b"super-secret-origin-key-32-bytes");
  let engine = setup.run()?;

  // 2. Full page: templates/pages/home.html inside templates/layout/shell.html.
  let doc = Page::new("/").param("title", "Home Page").run(&engine)?;
  println!("{}", doc.html);

  // 3. Signed fragment envelope from templates/feed/card.html.
  let env = Fragment::new("feed/card.html", "main")
    .param("title", "Real-Time Update")
    .param("author", "Alex")
    .run(&engine)?;
  println!("{}", serde_json::to_string_pretty(&env)?);

  Ok(())
}
```

## Root exports

`anza::{Setup, Page, Fragment, Stream, Engine, SignMode, Params, Data, Document,
Envelope, Manifest, Error, Result}`. Everything else is reached through its module
path (`anza::crypto::…`, `anza::stream::…`, `anza::render::…`,
`anza::engine::…`, `anza::adapters::…`).
