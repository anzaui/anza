# Slot Chunking

Slot extraction turns a template string into a flat list of chunks.

## 1. `Chunk`

`anza::engine::slot::Chunk` (defined in `src/engine/slot/parse.rs`):

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Chunk {
  Static(Vec<u8>),
  Slot(String),
  Raw(String),
}
```

- **`Chunk::Static`**: HTML bytes, written to the output as is.
- **`Chunk::Slot`**: the trimmed placeholder name (`{{ user_name }}` becomes `"user_name"`).
  HTML-escaped when the engine runs with `escape: true`.
- **`Chunk::Raw`**: the name of a raw placeholder (`{{{ content }}}`), always
  inserted as is.

## 2. `extract`

`anza::engine::slot::extract(template: &str) -> anza::Result<Vec<Chunk>>` scans
the string once:

1. Find the next `{{`; the text before it becomes a `Chunk::Static`.
2. If it is `{{{`, find the next `}}}` and push a `Chunk::Raw`; otherwise find
   the next `}}` and push a `Chunk::Slot` with the trimmed text between.
3. The rest of the string becomes a final `Chunk::Static`.

An unclosed `{{` or `{{{`, or an empty placeholder, returns `Error::Template`.
There is no other syntax: no loops, conditionals, filters or comments.

```rust
use anza::engine::slot::{extract, Chunk};

let chunks = extract("<div class=\"user\">{{name}} is {{status}}</div>")?;

assert_eq!(chunks.len(), 5);
assert_eq!(chunks[1], Chunk::Slot("name".into()));
assert_eq!(chunks[3], Chunk::Slot("status".into()));
// chunks[0], [2] and [4] are Chunk::Static
```

## 3. Binding

Each `Template` compiles its chunks once into an
`anza::engine::slot::Plan` (in `src/engine/slot/bind.rs`): static text plus
slot positions, with each distinct name looked up once per bind.
`Template::bind` runs the plan. For each placeholder, the value comes from
`params.resolve(name)`; a missing value writes nothing.

To bind chunks without a `Template`, use the free functions (they compile a
`Plan` on every call, so keep a `Template` or `Plan` for repeated binds):

```rust
pub fn string<P: Params + ?Sized>(chunks: &[Chunk], params: &P) -> Result<String>;
pub fn string_with<P: Params + ?Sized>(chunks: &[Chunk], params: &P, escape: bool) -> Result<String>;
pub fn inject<P: Params + ?Sized, W: std::io::Write>(chunks: &[Chunk], params: &P, out: &mut W) -> Result<()>;
pub fn inject_with<P: Params + ?Sized, W: std::io::Write>(chunks: &[Chunk], params: &P, escape: bool, out: &mut W) -> Result<()>;
```

## 4. Escaping

With `escape` off (the default, and in `string` / `inject`), `{{name}}` and
`{{{name}}}` both write values **as is, without HTML escaping**. With
`escape` on (`Setup::escape`, or `string_with` / `inject_with` with `true`),
`{{name}}` values are passed through `anza::escape_html` and `{{{name}}}`
values stay raw. `escape_html` maps `&` `<` `>` `"` `'` to `&amp;` `&lt;`
`&gt;` `&quot;` `&#39;`, which is safe in element content and quoted
attribute values.
