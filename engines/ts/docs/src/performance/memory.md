# Zero-Copy String Concatenation

Understanding how JavaScript runtimes manage strings ensures zero memory fragmentation across long-running server processes.

## 1. Memory Layout of Loaded Templates

When a template is loaded into memory:

```
Template Instance:
┌─────────────────────────────────────────────────────────────┐
│ name:     string ("feed/card.html")                         │
│ path:     string ("/app/templates/feed/card.html")          │
│ digest:   string ("8a3f...") (64 hex characters)            │
│ raw:      string ("<ui-card>{{title}}</ui-card>")           │
│ chunks:   Chunk[]                                           │
│           ├── { type: 'static', value: '<ui-card>' }        │
│           ├── { type: 'slot',   name: 'title' }             │
│           └── { type: 'static', value: '</ui-card>' }       │
│ renderer: (params) => string (Pre-compiled Closure)        │
└─────────────────────────────────────────────────────────────┘
```

All templates are immutable after engine startup, enabling thread-safe concurrent access across all Node.js cluster worker threads or Web Worker isolates.

## 2. String Accumulator Mechanics

During `tpl.bind(params)`:

1. Static strings are borrowed directly from memory.
2. The runtime string accumulator leverages V8 sequential rope concatenation without intermediate allocation garbage collection pauses.
3. Emitted strings are passed directly to `res.end()` or Web `Response` stream buffers.
