# Buffer Pre-Sizing & Memory Layout

Understanding how Anza manages memory ensures zero memory fragmentation across long-running server processes.

## 1. Memory Layout of Loaded Templates

When a template is loaded into memory:

```
Template Struct:
┌─────────────────────────────────────────────────────────────┐
│ name:   String ("feed/card.html")                           │
│ path:   PathBuf ("/app/templates/feed/card.html")           │
│ digest: String ("8a3f...") (64 hex characters)              │
│ raw:    String ("<ui-card>{{title}}</ui-card>")             │
│ chunks: Vec<Chunk>                                          │
│         ├── Chunk::Static (b"<ui-card>")                    │
│         ├── Chunk::Slot   ("title")                         │
│         └── Chunk::Static (b"</ui-card>")                   │
└─────────────────────────────────────────────────────────────┘
```

All templates are immutable after engine startup, enabling thread-safe concurrent access across all worker threads without `Mutex` or `RwLock` overhead.

## 2. Rendering Allocation Breakdown

During `tpl.bind(&params)`:

1. **Pass 1 (Length Calculation)**: Computes `sum(static_bytes_len) + estimated_slot_len`.
2. **Pass 2 (Single Allocation)**: Allocates `String::with_capacity(total_len)`.
3. **Pass 3 (Contiguous Copy)**: Directly copies static slices and borrowed string slices into the allocated buffer.

Zero reallocations, zero heap fragmentation.
