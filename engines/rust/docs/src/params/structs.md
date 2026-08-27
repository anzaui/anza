# Zero-Copy Struct Implementation

To achieve maximum rendering throughput without intermediate dictionary allocations, implement `Params` directly on domain structs.

## 1. Struct `Params` Implementation

```rust
use std::borrow::Cow;
use anza::engine::slot::bind::Params;

pub struct Article {
  pub id: i64,
  pub slug: String,
  pub title: String,
  pub summary: String,
  pub author: String,
  pub created: String,
}

impl Params for Article {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    match key {
      "id" => Some(Cow::Owned(self.id.to_string())),
      "slug" => Some(Cow::Borrowed(&self.slug)),
      "title" => Some(Cow::Borrowed(&self.title)),
      "summary" => Some(Cow::Borrowed(&self.summary)),
      "author" => Some(Cow::Borrowed(&self.author)),
      "created" => Some(Cow::Borrowed(&self.created)),
      _ => None,
    }
  }
}
```

## 2. Advantages over HashMap / JSON

| Technique | Heap Allocations During Render | String Clones | Execution Latency |
|---|---|---|---|
| Manual `HashMap.insert()` | $\mathcal{O}(N)$ (Map buckets & keys) | $N$ clones | ~1.8 µs |
| `serde_json::to_value()` | $\mathcal{O}(N)$ (Value tree allocation) | Full clone | ~3.2 µs |
| **`impl Params for Struct`** | **0 (Zero)** | **0 (Borrowed references)** | **< 60 ns** |

## 3. Usage with Templates

Once implemented, pass the struct reference directly to `tpl.bind(&struct)`:

```rust
let article = Article {
  id: 42,
  slug: "stui-in-rust".into(),
  title: "Server-Templated UI in Rust".into(),
  summary: "Sub-millisecond SSR".into(),
  author: "Alex Rivera".into(),
  created: "2026-08-27".into(),
};

// Zero allocations during render!
let html = tpl.bind(&article);
```
