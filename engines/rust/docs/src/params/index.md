# Parameter Binding & The `Params` Trait

Parameter interpolation in Anza is governed by the `Params` trait defined in `src/engine/slot/bind.rs`.

## 1. The `Params` Trait Definition

```rust
use std::borrow::Cow;

pub trait Params {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>>;
}
```

By returning `Cow<'_, str>`, the engine supports:
- **`Cow::Borrowed(&'a str)`**: Direct borrowed slices from existing domain models—**zero allocations and zero string copies**.
- **`Cow::Owned(String)`**: Dynamically formatted numbers or generated timestamps when needed.

## 2. Built-in Implementations

### Key-Value Slices `&[(&str, &str)]`
```rust
let params = [("title", "STUI Guide"), ("author", "Sarah")];
let html = tpl.bind(&params);
```

### Static Array of Tuples `[(&str, &str); N]`
```rust
let html = tpl.bind(&[("title", "STUI Guide")]);
```

### Empty Context `()`
```rust
let html = tpl.bind(&());
```

### `HashMap<String, String>` and `HashMap<&str, &str>`
```rust
let mut map = std::collections::HashMap::new();
map.insert("title", "Dynamic Title");
let html = tpl.bind(&map);
```
