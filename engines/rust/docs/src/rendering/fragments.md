# Dynamic Fragment Envelopes

Partial HTTP fetches and live streams emit the signed Anza `Envelope`.

## 1. The `Envelope` Struct

Located in `src/models/envelope.rs`:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
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

- **`slot`**: The target DOM slot or element ID in the client document.
- **`ts`**: Unix timestamp in seconds for freshness validation and replay prevention.
- **`html`**: Rendered semantic HTML fragment.
- **`sig`**: Hex-encoded signature calculated over the canonical message `format!("{}:{}:{}", ts, slot, html)`.
- **`css`**: Optional dynamic stylesheet override scoped to the fragment.

## 2. Rendering a Fragment in Rust

Located in `src/render/fragment/render.rs`:

```rust
use anza::render::fragment::render as render_fragment;

let envelope = render_fragment(
  &engine,
  "feed/card.html",
  "feed-slot",
  &[
    ("title", "New Event Received"),
    ("status", "processed"),
  ]
)?;

println!("Slot: {}", envelope.slot);
println!("Timestamp: {}", envelope.ts);
println!("Signature: {:?}", envelope.sig);
```

The engine automatically handles parameter binding, fetches current system time, calculates the cryptographic signature according to configured `SignOptions`, and packages the result into the `Envelope`.
