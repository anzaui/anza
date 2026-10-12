# Architecture

The engine has three steps: **load** (read and hash files), **parse** (split into
chunks) and **render** (copy chunks and values into a buffer, then optionally
sign).

```
  templates/**/*.html
         │  Setup::run()
         ▼
  ┌──────────────┐
  │ File loader  │ ──► BLAKE3 digest of each file
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Slot parser  │ ──► Vec<Chunk> [ Static(Vec<u8>), Slot(String) ]
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Cache store  │ ──► RwLock<HashMap<String, Template>>
  └──────┬───────┘
         ├───► Engine::render_page()     ► Document
         └───► Engine::render_fragment() ► Envelope (+ signature)
```

## 1. Parse once

Templates are parsed once, when `Setup::run()` is called, into a flat list of
`Chunk`s:

- `Chunk::Static(Vec<u8>)`: raw HTML bytes.
- `Chunk::Slot(String)`: a placeholder name (`{{ title }}` becomes `"title"`).

A render estimates the output size (static bytes plus 32 bytes per slot),
allocates one buffer and writes into it.

## 2. Template names

A template's name is its path relative to the root, e.g. `feed/card.html`.
Only files ending in `.html` are loaded. Page rendering uses these names:

| Path | Used by |
|---|---|
| `layout/shell.html` | Optional document shell for every page. The page goes into `{{content}}` (also `{{slot_main}}`). |
| `pages/home.html` | Route `/` |
| `pages/<route>.html` | Route `/<route>` (fallbacks: `<route>.html`, then `pages/index.html`) |
| anything else | Fragments, addressed by name, e.g. `feed/card.html` |

## 3. Reloading

Templates are not reloaded while the process runs. The `watch` feature starts a
filesystem watcher, but its events are not applied to the cache yet, so restart
the server to pick up template changes.
