# AST & Slot Chunking

Slot extraction transforms raw template strings into flat, contiguous chunks.

## 1. Chunk Enum Definition

Located in `src/engine/slot/parse.rs`:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Chunk {
  Static(Vec<u8>),
  Slot(String),
}
```

- **`Chunk::Static`**: Holds immutable HTML byte slices. These are written directly into the destination buffer via `buffer.extend_from_slice()`.
- **`Chunk::Slot`**: Holds the trimmed slot key name (e.g. `{{user_name}}` becomes `"user_name"`).

## 2. Extraction Algorithm

The `extract(template: &str)` function performs a single-pass scan through the input string:

1. Finds opening delimiter `{{`.
2. Slices preceding text as `Chunk::Static(text.as_bytes().to_vec())`.
3. Finds matching closing delimiter `}}`.
4. Trims whitespace inside the placeholder and records `Chunk::Slot(name)`.
5. Returns `Result<Vec<Chunk>>`.

If an unclosed `{{` or empty placeholder `{{}}` is encountered, the parser fails fast with `Error::Template`.

```rust
use anza::engine::slot::parse::{extract, Chunk};

let raw = "<div class=\"user\">{{name}} is {{status}}</div>";
let chunks = extract(raw)?;

assert_eq!(chunks.len(), 4);
// chunks[0] = Chunk::Static(b"<div class=\"user\">".to_vec())
// chunks[1] = Chunk::Slot("name".into())
// chunks[2] = Chunk::Static(b" is ".to_vec())
// chunks[3] = Chunk::Slot("status".into())
```

## 3. Buffer Pre-Allocation

In `src/engine/slot/bind.rs`, the rendering pass computes exact capacity requirements before writing bytes:

```rust
pub fn string<P: Params + ?Sized>(chunks: &[Chunk], params: &P) -> String {
  let static_size: usize = chunks.iter().map(|c| match c {
    Chunk::Static(b) => b.len(),
    Chunk::Slot(_) => 16,
  }).sum();

  let mut buf = String::with_capacity(static_size);
  for chunk in chunks {
    match chunk {
      Chunk::Static(bytes) => {
        if let Ok(s) = std::str::from_utf8(bytes) {
          buf.push_str(s);
        }
      }
      Chunk::Slot(name) => {
        if let Some(val) = params.resolve(name) {
          buf.push_str(&val);
        }
      }
    }
  }
  buf
}
```
