# Template Cache

Templates are loaded, hashed with SHA-256 and stored in memory by `Setup::run()`.

## 1. `Template`

`anza::engine::file::Template` (in `src/engine/file/load.rs`):

```rust
#[derive(Debug, Clone)]
pub struct Template {
  pub name: String,      // path relative to the root, e.g. "pages/home.html"
  pub path: PathBuf,     // root.join(name)
  pub raw: String,       // file contents
  pub digest: [u8; 32],  // SHA-256 of the contents
  pub chunks: Vec<Chunk>,
  pub escape: bool,      // Setup::escape: HTML-escape {{name}} values
  // plus a private compiled binding plan
}

impl Template {
  pub fn new(name, path, raw, escape: bool) -> Result<Self>; // parse and compile
  pub fn bind<P: Params + ?Sized>(&self, params: &P) -> Result<String>;
  pub fn render<T: serde::Serialize>(&self, data: &T) -> Result<String>;
}
```

`render` converts the value to a `serde_json::Value` once, then binds it.

At load, every `.html` file under the root is read. A file larger than
`Setup::max_template_bytes` (default 1 MiB) or that is not UTF-8 is a
`Template` error. Symlinked directories are not followed, and symlinked files
that resolve outside the root are skipped. Errors name the template, never
its absolute path.

## 2. Store and engine

```rust
pub struct CacheStore {
  pub templates: RwLock<HashMap<String, Arc<Template>>>,
}

pub struct Engine {
  pub root: PathBuf,
  pub cache: Arc<CacheStore>,
  pub watcher: Option<FileWatcher>,
  // private: the validated signer (see `engine.signer()`) and the
  // fragment allowlist
}
```

`Engine` is not `Clone`. Share it with `Arc<Engine>` (Axum state) or
`web::Data<Engine>` (Actix-web).

### Lookup

`Engine::get(name)` takes a read lock and returns `Result<Arc<Template>>`, a
shared handle (the template is never copied). Lookups only use the cache:
request input never reaches the filesystem. A malformed name (leading `/`,
`\`, NUL, or an empty, `.` or `..` segment) is `Error::Validation`; an
unknown one is `Error::NotFound`:

```rust
let tpl = engine.get("feed/card.html")?;
let html = tpl.bind(&[("title", "Hello World")])?;
```

## 3. Manifest

`Engine::manifest()` returns `Result<Manifest>`. `Manifest::templates` is a
`HashMap<String, String>` from template name to the 64-character lowercase hex
SHA-256 of the template contents (`anza::crypto::digest`), the same digest the
TypeScript and Python engines produce. It changes whenever a file changes, so it can
be used for cache busting or deployment checks.

```rust
let manifest = engine.manifest()?;
for (name, digest) in &manifest.templates {
  println!("{name} -> {}", &digest[..12]);
}
```
