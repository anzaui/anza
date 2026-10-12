# Memory Layout

## 1. A loaded template

```
Template
┌─────────────────────────────────────────────────────────────┐
│ name:     'feed/card.html'                                  │
│ path:     'templates/feed/card.html'                        │
│ raw:      '<ui-card>{{title}}</ui-card>'                    │
│ digest:   hex SHA-256 of raw (64 characters)                │
│ chunks:   Chunk[]                                           │
│           ├── { type: 'static', value: '<ui-card>' }        │
│           ├── { type: 'slot',   name: 'title' }             │
│           └── { type: 'static', value: '</ui-card>' }       │
│ renderer: (params?) => string                               │
└─────────────────────────────────────────────────────────────┘
```

Each template keeps the raw text, the chunks and the closure's own parts array.
Templates are not changed after startup unless `watch: true` is set, in which
case the whole `Map` is replaced (at most once per 50 ms burst of changes).
`maxTemplateBytes` (default 1 MiB) caps each file.

## 2. What a render allocates

During `tpl.bind(params)`:

1. Static strings are reused from the parts array.
2. The output is built with `+=`; JavaScript engines use rope strings for this,
   so intermediate copies are usually avoided until the string is flattened.
3. Non-string values are converted with `stringify` as they are appended
   (numbers and booleans with `String()`, arrays and plain objects with
   `JSON.stringify`).
