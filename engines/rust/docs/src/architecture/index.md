# Architecture

The engine has three steps: **load** (read and hash files), **parse** (split into
chunks) and **render** (copy chunks and values into a buffer, then optionally
sign).

```
  templates/**/*.html
         │  Setup::run()
         ▼
  ┌──────────────┐
  │ File loader  │ ──► SHA-256 digest of each file
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Slot parser  │ ──► Vec<Chunk> [ Static, Slot, Raw ] + compiled plan
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Cache store  │ ──► RwLock<HashMap<String, Arc<Template>>>
  └──────┬───────┘
         ├───► Engine::render_page()     ► Document
         └───► Engine::render_fragment() ► Envelope (+ signature)
```

## 1. Parse once

Templates are parsed once, when `Setup::run()` is called, into a flat list of
`Chunk`s:

- `Chunk::Static(Vec<u8>)`: raw HTML bytes.
- `Chunk::Slot(String)`: a placeholder name (`{{ title }}` becomes `"title"`).
- `Chunk::Raw(String)`: a raw placeholder (`{{{ content }}}`), never escaped.

Each template is also compiled once into a binding plan: static text and slot
positions, with every distinct name resolved once per render. A render sizes
one output buffer and writes into it.

## 2. Template names

A template's name is its path relative to the root, `/`-separated, e.g.
`feed/card.html`. Only files ending in `.html` are loaded. Names have no
leading `/`, no `\` or NUL and no empty, `.` or `..` segment; anything else
is a `Validation` error. Page rendering uses these names:

| Path | Used by |
|---|---|
| `layout/shell.html` | Optional document shell for every page. The page goes into `{{content}}` (`{{{content}}}` with `escape` on). |
| `pages/home.html` | Route `/` |
| `pages/<route>.html` | Route `/<route>` |
| `pages/index.html` | Catch-all for routes without their own page |
| anything else | Fragments, addressed by name, e.g. `feed/card.html` (limited by `Setup::fragments` when set) |

## 3. Reloading

Without `watch`, templates are not reloaded while the process runs. With the
`watch` feature and `setup.watch = true`, a `notify` watcher on the root keeps
the cache in sync: created and changed `.html` files are reloaded, removed
ones are evicted. A reload that fails keeps the last good template. Dropping
the engine (and its `FileWatcher`) stops watching.
