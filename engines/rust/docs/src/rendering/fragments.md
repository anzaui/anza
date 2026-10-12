# Fragment Envelopes

Fragments and pushes return an `Envelope`.

## 1. `Envelope`

`anza::Envelope` (in `src/models/envelope.rs`):

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Envelope {
  #[serde(default)]
  pub v: u32,
  pub slot: String,
  pub ts: u64,
  pub html: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub sig: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub css: Option<String>,
}
```

- **`v`**: wire-format version, always `2` (serialized first). An envelope
  without `v` deserializes as `0` and fails verification.
- **`slot`**: the target name you chose when rendering.
- **`ts`**: Unix time in seconds when the envelope was rendered.
- **`html`**: the bound fragment HTML (values escaped only with `escape` on).
- **`sig`**: lowercase hex signature over the v2 message (see
  [Cryptographic Verification](../crypto/index.md)), present for `Hmac` and
  `Ed25519` signing.
- **`css`**: optional CSS text; the engine never sets it, use `.style(css)`.

Helpers: `Envelope::new(slot, ts, html)` (sets `v: 2`), `.sign(sig)`,
`.style(css)` and `.message()` (returns the v2 message bytes, `Vec<u8>`, that
the signature covers).

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

`Engine::render_fragment` looks up the template, checks the fragment
allowlist, binds the params, takes the current time, signs the v2 message with
the engine's key (if any), and returns the envelope. The same function is
available as `anza::render::fragment::envelope(&engine, template, slot, &params)`.

## 3. Fragment allowlist

By default any cached template can be rendered as a fragment. Set
`Setup::fragments` to limit that. An entry ending in `/` allows that prefix;
any other entry allows that exact name:

```rust
let mut setup = Setup::new("templates");
setup.fragments = vec!["fragments/".into(), "feed/card.html".into()];
let engine = setup.run()?;

// Allowed: fragments/... and feed/card.html.
// Anything else (pages/home.html, layout/shell.html) is
// Error::NotFound("Template 'pages/home.html' not found"), the same as a
// missing template.
```

Template names are checked first: a malformed name (leading `/`, `\`, NUL,
or an empty, `.` or `..` segment) is a `Validation` error.

## 4. Structured data

To bind structured data instead of string pairs, bind the template yourself and
build the envelope:

```rust
use anza::Envelope;

let tpl = engine.get("feed/card.html")?; // Arc<Template>
let html = tpl.render(&article)?; // any serde::Serialize value
let ts = 1_724_771_200;
let mut env = Envelope::new("feed".to_string(), ts, html);
if let Some(sig) = engine.sign_payload(ts, &env.slot, &env.html)? {
  env = env.sign(sig);
}
```
