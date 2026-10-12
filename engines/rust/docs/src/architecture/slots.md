# Slot Chunking

Slot extraction turns a template string into a flat list of chunks.

## 1. `Chunk`

`anza::engine::slot::Chunk` (defined in `src/engine/slot/parse.rs`):

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Chunk {
  Static(Vec<u8>),
  Slot(String),
}
```

- **`Chunk::Static`**: HTML bytes, written to the output as is.
- **`Chunk::Slot`**: the trimmed placeholder name (`{{ user_name }}` becomes `"user_name"`).

## 2. `extract`

`anza::engine::slot::extract(template: &str) -> anza::Result<Vec<Chunk>>` scans
the string once:

1. Find the next `{{`; the text before it becomes a `Chunk::Static`.
2. Find the next `}}`; the trimmed text between becomes a `Chunk::Slot`.
3. The rest of the string becomes a final `Chunk::Static`.

An unclosed `{{` or an empty `{{}}` returns `Error::Template`. There is no other
syntax: no loops, conditionals, filters, comments or escaping.

```rust
use anza::engine::slot::{extract, Chunk};

let chunks = extract("<div class=\"user\">{{name}} is {{status}}</div>")?;

assert_eq!(chunks.len(), 5);
assert_eq!(chunks[1], Chunk::Slot("name".into()));
assert_eq!(chunks[3], Chunk::Slot("status".into()));
// chunks[0], [2] and [4] are Chunk::Static
```

## 3. Binding

`anza::engine::slot::{string, inject}` (in `src/engine/slot/bind.rs`) do the
rendering:

```rust
pub fn string<P: Params + ?Sized>(chunks: &[Chunk], params: &P) -> Result<String>;
pub fn inject<P: Params + ?Sized, W: std::io::Write>(
  chunks: &[Chunk],
  params: &P,
  out: &mut W,
) -> Result<()>;
```

`string` sizes a `Vec<u8>` (static bytes + 32 bytes per slot), calls `inject`,
and converts the result to a `String`. For each `Chunk::Slot`, the value comes
from `params.resolve(name)`; a missing value writes nothing. Values are written
**as is, without HTML escaping**.
