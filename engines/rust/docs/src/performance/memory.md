# Buffer Pre-Sizing & Memory Layout

## 1. A loaded template

```
Template
┌─────────────────────────────────────────────────────────────┐
│ name:   String   "feed/card.html"                           │
│ path:   PathBuf  "templates/feed/card.html"                 │
│ raw:    String   "<ui-card>{{title}}</ui-card>"             │
│ digest: [u8; 32] SHA-256 of raw                             │
│ chunks: Vec<Chunk>                                          │
│         ├── Chunk::Static(b"<ui-card>")                     │
│         ├── Chunk::Slot("title")                            │
│         └── Chunk::Static(b"</ui-card>")                    │
│ escape: bool                                                │
│ plan:   compiled static text + slot positions (private)     │
└─────────────────────────────────────────────────────────────┘
```

Each template keeps the raw text, the chunks and the compiled plan, so memory
is roughly three times the template source size. Templates live as
`Arc<Template>` in an `RwLock<HashMap>` inside an `Arc<CacheStore>`. They only
change when the `watch` feature reloads them.

## 2. What a render allocates

During `tpl.bind(&params)` (`anza::engine::slot::Plan::bind`):

1. **Prepare**: `Data<T>` is serialized to a `serde_json::Value` once.
2. **Resolve**: each distinct placeholder name is looked up once (pair lists
   are scanned once for all names).
3. **Allocate**: one `String`, sized from the static text plus the values (or
   an estimate for maps and objects; it grows if values are longer).
4. **Copy**: static text and resolved values are written in order, escaped
   where `escape` applies.

Values that `Params` returns as `Cow::Owned` (numbers, `Data`, JSON values)
allocate their own strings before being copied.
