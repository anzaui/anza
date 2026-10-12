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
  │ Slot parser  │ ──► Chunk[]  static | slot | raw
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

`compile(chunks, { escape })` returns a closure that walks the pre-split parts
and concatenates static strings and parameter values. It has separate loops for
plain objects, `Map`s and `[key, value]` arrays. Objects are read through own
properties only (`Object.hasOwn`), so `{{toString}}` never reaches the
prototype. With `escape: true`, `{{name}}` values go through `escapeHtml` and
`{{{name}}}` values stay raw.

## 2. Template names

A template's name is its path relative to the root with `/` separators, e.g.
`feed/card.html`. Only files ending in `.html` are loaded. A name with a leading
`/`, a `\`, a NUL, or an empty, `.` or `..` segment is a `VALIDATION` error
(`validName` checks this). Lookups only use the in-memory cache, so request
input never reaches the filesystem. Page rendering uses these names:

| Path | Used by |
|---|---|
| `layout/shell.html` | Optional document shell for every page. The page goes into `{{content}}`. |
| `pages/home.html` | Route `/` |
| `pages/<route>.html` | Route `/<route>` (fallback: `pages/index.html`, else `NOT_FOUND`) |
| anything else | Fragments, addressed by name, e.g. `feed/card.html` (limited by the `fragments` allowlist when set) |

## 3. Reloading

With `watch: true`, `Setup` watches the root with `fs.watch(root, { recursive: true })`
and reloads **all** templates when a file changes. A burst of events triggers
one reload 50 ms after the last event, and reloads never overlap, so the newest
tree always lands last. A reload that fails (a half-written or oversized file)
keeps the last good templates. Recursive watching needs Node.js 20+ on Linux.
Use it in development only.

## 4. Loading limits

A template file larger than `maxTemplateBytes` (default 1 MiB) is a `TEMPLATE`
error at setup. Symlinked directories are not followed, and symlinked files
that resolve outside the root are skipped. Errors name the template, never the
absolute path.
