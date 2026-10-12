# Architecture

The engine has three steps: **load** (read and hash files), **parse** (split into
chunks and build a render function) and **render** (call the function, then
optionally sign).

```
  templates/**/*.html
         │  Setup.run()
         ▼
  ┌──────────────┐
  │ File loader  │ ──► SHA-256 digest of each file
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Slot parser  │ ──► Chunk[]  { type: 'static' } | { type: 'slot' }
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ compile()    │ ──► (params?) => string
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Cache store  │ ──► Map<string, Template>
  └──────┬───────┘
         ├───► engine.renderPage()     ► Document
         └───► engine.renderFragment() ► Envelope (+ signature)
```

## 1. Render functions

`compile(chunks)` returns a closure that walks the pre-split parts and
concatenates static strings and parameter values. It has separate loops for plain
objects, `Map`s and `[key, value]` arrays, so no conversion happens per request.

## 2. Template names

A template's name is its path relative to the root with `/` separators, e.g.
`feed/card.html`. Only files ending in `.html` are loaded. Page rendering uses
these names:

| Path | Used by |
|---|---|
| `layout/shell.html` | Optional document shell for every page. The page goes into `{{content}}` (also `{{slot_main}}`). |
| `pages/home.html` | Route `/` |
| `pages/<route>.html` | Route `/<route>` (fallbacks: `<route>.html`, then `pages/index.html`) |
| anything else | Fragments, addressed by name, e.g. `feed/card.html` |

## 3. Reloading

With `watch: true`, `Setup` watches the root with `fs.watch(root, { recursive: true })`
and reloads **all** templates when any `.html` file changes. Recursive watching
needs Node.js 20+ on Linux. Use it in development only.
