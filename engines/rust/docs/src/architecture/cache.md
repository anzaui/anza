# Template Caching & Storage

Templates are loaded, hashed with BLAKE3, and stored in an in-memory index at server boot.

## 1. The `Template` Struct

Located in `src/engine/file/load.rs`:

```rust
#[derive(Debug, Clone)]
pub struct Template {
  pub name: String,
  pub path: PathBuf,
  pub raw: String,
  pub digest: String,
  pub chunks: Vec<Chunk>,
}
```

- **`name`**: Normalized relative path identifier without leading slashes (e.g. `"pages/home.html"`).
- **`path`**: Absolute filesystem path.
- **`raw`**: Full raw HTML string.
- **`digest`**: 64-character hex BLAKE3 hash of the file contents.
- **`chunks`**: Pre-compiled AST chunks ready for instant interpolation.

## 2. In-Memory Store and Engine Coordination

Located in `src/engine/cache/store.rs` and `src/engine/cache/engine.rs`:

```rust
pub struct Store {
  pub templates: HashMap<String, Template>,
}

pub struct Engine {
  pub root: PathBuf,
  pub cache: Store,
  pub signing: SignOptions,
}
```

### Template Lookup

Template lookup is an $O(1)$ hash map read. If a requested template is absent, `Engine::get` returns `Error::NotFound`:

```rust
let tpl = engine.get("feed/card.html")?;
let rendered = tpl.bind(&[("title", "Hello World")]);
```

## 3. Template Manifest & Hash Auditing

The engine generates a `Manifest` containing all active template digests:

```rust
let manifest = engine.manifest();
for (name, digest) in &manifest.templates {
  println!("Template: {} -> BLAKE3: {}", name, &digest[..12]);
}
```

This manifest enables:
1. **Deterministic Cache Busting**: Client components can verify if their cached shadow roots match the server's compiled template digest.
2. **Cold-Start Verification**: Verifies template integrity against deployment build artifacts.
