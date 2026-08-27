# Architecture & Core Design

The Anza engine separates template lifecycle into four discrete phases: **Extraction**, **Indexing**, **Resolution**, and **Envelopment**.

```
  templates/*.html
         │
         ▼ (Startup / Watcher)
  ┌──────────────┐
  │ File Loader  │ ──► BLAKE3 Digest Hashing
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Slot Parser  │ ──► Vec<Chunk> [ Static(Vec<u8>), Slot(String) ]
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Engine Cache │ ──► HashMap<String, Template> (Pre-allocated)
  └──────┬───────┘
         │
         ├───► render_page() ────► Document (Full SSR + Open DSD)
         └───► render_fragment() ► Envelope (Slot + Timestamp + HTML + Signature)
```

## 1. Zero-Allocation AST Compilation

Traditional template engines parse abstract syntax trees (ASTs) on every request or re-traverse regex match tables. 

Anza parses templates **once** at initialization into a linear array of `Chunk` elements:
- `Chunk::Static(Vec<u8>)`: Contiguous raw HTML bytes.
- `Chunk::Slot(String)`: Named placeholder identifier (e.g. `"title"`, `"user_id"`).

During rendering, the engine pre-computes the target buffer size by summing static slice lengths and parameter lengths, allocating the output `Vec<u8>` or `String` in a single heap operation without intermediate growth reallocations.

## 2. Directory Layout Convention

Templates reside in a dedicated folder hierarchy:

| Directory | Role | Example |
|---|---|---|
| `layout/` | Global document shells (`<html>`, `<head>`, `<dock-*>`) | `layout/shell.html` |
| `pages/` | Route-specific views (`<page-home>`, `<page-article>`) | `pages/home.html` |
| `feed/` | Reusable dynamic fragments (`<ui-card>`, `<ui-alert>`) | `feed/card.html` |
| `docks/` | Persistent application dock frames | `docks/main.html` |
