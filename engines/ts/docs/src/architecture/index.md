# Architecture & Core Design

The TypeScript engine structure mirrors the Hao platform architectural standard, separating the template lifecycle into four discrete phases: **Extraction**, **Indexing**, **Resolution**, and **Envelopment**.

```
  templates/*.html
         │
         ▼ (Startup / Watcher)
  ┌──────────────┐
  │ File Loader  │ ──► SHA-256 Digest Hashing
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Slot Parser  │ ──► Chunk[] [ { type: 'static' }, { type: 'slot' } ]
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ JIT Compiler │ ──► (params) => string (V8 Optimized Function)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Engine Cache │ ──► Map<string, Template> (Pre-allocated)
  └──────┬───────┘
         │
         ├───► renderPage() ────► Document (Full SSR + Open DSD)
         └───► renderFragment() ► Envelope (Slot + Timestamp + HTML + Signature)
```

## 1. JIT Closure Compilation

Instead of walking an AST or performing regex substitutions on incoming HTTP requests, Anza compiles each template into a direct closure at startup.

When the closure executes, V8 JIT compiles it to machine code. Slot parameter reads use direct object property lookups, executing in **sub-100 nanoseconds**.

## 2. Directory Layout Convention

Templates reside in a dedicated folder hierarchy:

| Directory | Role | Example |
|---|---|---|
| `layout/` | Global document shells (`<html>`, `<head>`, `<dock-*>`) | `layout/shell.html` |
| `pages/` | Route-specific views (`<page-home>`, `<page-article>`) | `pages/home.html` |
| `feed/` | Reusable dynamic fragments (`<ui-card>`, `<ui-alert>`) | `feed/card.html` |
| `docks/` | Persistent application dock frames | `docks/main.html` |
