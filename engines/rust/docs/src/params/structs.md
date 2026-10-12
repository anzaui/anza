# Implementing `Params` for Your Structs

Implementing `Params` directly on a struct avoids building a `HashMap` or a JSON
value for each render: string fields are borrowed, and only formatted values
allocate.

## 1. Implementation

```rust
use std::borrow::Cow;
use anza::Params;

pub struct Article {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub author: String,
}

impl Params for Article {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    match key {
      "id" => Some(Cow::Owned(self.id.to_string())),
      "slug" => Some(Cow::Borrowed(self.slug.as_str())),
      "title" => Some(Cow::Borrowed(self.title.as_str())),
      "author" => Some(Cow::Borrowed(self.author.as_str())),
      _ => None,
    }
  }
}
```

## 2. Usage

```rust
let article = Article {
  id: 42,
  slug: "stui-in-rust".into(),
  title: "Server-Templated UI in Rust".into(),
  author: "Alex Rivera".into(),
};

let html = engine.get("feed/article.html")?.bind(&article)?;
```

`Engine::get` clones the template out of the cache, and `bind` allocates the
output buffer once (plus any growth if values are longer than the estimate).

## 3. Compared with the alternatives

| Technique | Extra work per render |
|---|---|
| `impl Params for Struct` | None for borrowed fields |
| `HashMap<String, String>` | Building the map (one `String` per key and value) |
| `serde_json::Value` | Building the value tree |
| `Data(&value)` / `Template::render` | Serializing the whole value once **per placeholder** |

No benchmark numbers are published for these; measure in your own setup.

Values are inserted without HTML escaping, whichever technique you use.
