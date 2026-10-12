# Buffer Pre-Sizing & Memory Layout

## 1. A loaded template

```
Template
┌─────────────────────────────────────────────────────────────┐
│ name:   String   "feed/card.html"                           │
│ path:   PathBuf  "templates/feed/card.html"                 │
│ raw:    String   "<ui-card>{{title}}</ui-card>"             │
│ digest: [u8; 32] BLAKE3 of raw                              │
│ chunks: Vec<Chunk>                                          │
│         ├── Chunk::Static(b"<ui-card>")                     │
│         ├── Chunk::Slot("title")                            │
│         └── Chunk::Static(b"</ui-card>")                    │
└─────────────────────────────────────────────────────────────┘
```

Each template keeps both the raw text and the chunks, so memory is roughly twice
the template source size. Templates live in an `RwLock<HashMap>` inside an
`Arc<CacheStore>` and are not changed after startup.

## 2. What a render allocates

During `tpl.bind(&params)` (`anza::engine::slot::string`):

1. **Estimate**: sum of static chunk lengths + 32 bytes per placeholder.
2. **Allocate**: one `Vec<u8>` with that capacity (it grows if values are longer).
3. **Copy**: static chunks and resolved values are written in order.
4. **Convert**: the bytes become a `String` (UTF-8 check, no copy).

Values that `Params` returns as `Cow::Owned` (numbers, `Data`, JSON values)
allocate their own strings before being copied.
