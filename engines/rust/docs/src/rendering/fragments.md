# Fragment Envelopes

Fragments and pushes return an `Envelope`.

## 1. `Envelope`

`anza::Envelope` (in `src/models/envelope.rs`):

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Envelope {
  pub slot: String,
  pub ts: u64,
  pub html: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub sig: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub css: Option<String>,
}
```

- **`slot`**: the target name you chose when rendering.
- **`ts`**: Unix time in seconds when the envelope was rendered.
- **`html`**: the bound fragment HTML (not escaped).
- **`sig`**: hex signature over `format!("{}:{}:{}", ts, slot, html)`, present for `Hmac` and `Ed25519` signing.
- **`css`**: optional CSS text; the engine never sets it, use `.style(css)`.

Helpers: `Envelope::new(slot, ts, html)`, `.sign(sig)`, `.style(css)` and
`.message()` (returns the `ts:slot:html` string that is signed).

## 2. Rendering a fragment

```rust
use anza::Fragment;

let envelope = Fragment::new("feed/card.html", "feed-slot")
  .param("title", "New Event Received")
  .param("status", "processed")
  .run(&engine)?;

println!("slot: {}", envelope.slot);
println!("ts:   {}", envelope.ts);
println!("sig:  {:?}", envelope.sig);
```

`Engine::render_fragment` looks up the template, binds the params, takes the
current time, signs `ts:slot:html` according to `engine.signing`, and returns the
envelope. The same function is available as
`anza::render::fragment::envelope(&engine, template, slot, &params)`.

To bind structured data instead of string pairs, bind the template yourself and
build the envelope:

```rust
use anza::Envelope;

let tpl = engine.get("feed/card.html")?;
let html = tpl.render(&article)?; // any serde::Serialize value
let ts = 1_724_771_200;
let mut env = Envelope::new("feed".to_string(), ts, html);
if let Some(sig) = engine.sign_payload(ts, &env.slot, &env.html)? {
  env = env.sign(sig);
}
```
