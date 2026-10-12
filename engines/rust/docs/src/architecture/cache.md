# Template Cache

Templates are loaded, hashed with BLAKE3 and stored in memory by `Setup::run()`.

## 1. `Template`

`anza::engine::file::Template` (in `src/engine/file/load.rs`):

```rust
#[derive(Debug, Clone)]
pub struct Template {
  pub name: String,      // path relative to the root, e.g. "pages/home.html"
  pub path: PathBuf,     // root.join(name)
  pub raw: String,       // file contents
  pub digest: [u8; 32],  // BLAKE3 hash of the contents
  pub chunks: Vec<Chunk>,
}

impl Template {
  pub fn bind<P: Params + ?Sized>(&self, params: &P) -> Result<String>;
  pub fn render<T: serde::Serialize>(&self, data: &T) -> Result<String>;
}
```

## 2. Store and engine

```rust
pub struct CacheStore {
  pub templates: RwLock<HashMap<String, Template>>,
}

pub struct Engine {
  pub root: PathBuf,
  pub cache: Arc<CacheStore>,
  pub signing: SignMode,
  pub watcher: Option<FileWatcher>,
}
```

`Engine` is not `Clone`. Share it with `Arc<Engine>` (Axum state) or
`web::Data<Engine>` (Actix-web).

### Lookup

`Engine::get(name)` takes a read lock and returns a **clone** of the template,
or `Error::NotFound`:

```rust
let tpl = engine.get("feed/card.html")?;
let html = tpl.bind(&[("title", "Hello World")])?;
```

## 3. Manifest

`Engine::manifest()` returns `Result<Manifest>`. `Manifest::templates` is a
`HashMap<String, String>` from template name to a 64-character hex BLAKE3 digest
derived from the template contents. It changes whenever a file changes, so it can
be used for cache busting or deployment checks.

```rust
let manifest = engine.manifest()?;
for (name, digest) in &manifest.templates {
  println!("{name} -> {}", &digest[..12]);
}
```
