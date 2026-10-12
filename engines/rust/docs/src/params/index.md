# Parameter Binding & the `Params` Trait

`Template::bind` takes anything that implements `anza::Params`
(`src/engine/slot/bind.rs`). The builders (`Page`, `Fragment`, `Stream`) and the
`Engine::render_*` methods always use `HashMap<String, String>`; the other
implementations are for binding a template yourself with `engine.get(name)?.bind(...)`.

## 1. The trait

```rust
use std::borrow::Cow;

pub trait Params {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>>;
}
```

`Cow::Borrowed` lets a value be copied straight from your data without an extra
`String`; `Cow::Owned` is for values that must be formatted (numbers, dates).
Returning `None` renders the placeholder as an empty string.

## 2. Built-in implementations

| Type | Notes |
|---|---|
| `()` | No values |
| `[(&str, &str); N]` and `[(&str, &str)]` | Linear search; no allocation |
| `HashMap<String, String>` | Borrowed values |
| `serde_json::Value` | Object keys; numbers and booleans are formatted, `null` is empty, arrays/objects are rendered as JSON text |
| `Data<T: Serialize>` | Serializes `T` to a `serde_json::Value` **on every lookup** |
| `&T` where `T: Params` | Forwards |

```rust
use std::collections::HashMap;
use anza::Data;

let tpl = engine.get("feed/card.html")?;

let html = tpl.bind(&[("title", "STUI Guide"), ("author", "Sarah")])?;
let html = tpl.bind(&())?;

let mut map = HashMap::new();
map.insert("title".to_string(), "Dynamic Title".to_string());
let html = tpl.bind(&map)?;

let html = tpl.bind(&serde_json::json!({ "title": "From JSON", "count": 3 }))?;

// Any Serialize value (equivalent to tpl.render(&profile)):
let html = tpl.bind(&Data(&profile))?;
```

`HashMap<&str, &str>` does **not** implement `Params`; use an array of pairs or
`HashMap<String, String>`.

All values are inserted **without HTML escaping**. Escape untrusted input first.
