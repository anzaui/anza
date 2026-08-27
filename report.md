# Implementation Plan: Anza Multi-Language Template Engines & Rust Engine Design

Establish the architectural standards and developer specifications for Anza's multi-language Server-Templated UI (STUI) engines, beginning with the Rust reference engine (`anza-engine`). The design is framework-agnostic (integrating seamlessly with Axum, Actix-web, Tower, Hyper, and Salvo), operates on standalone `.html` template files on disk, achieves zero-allocation streaming performance, and provides cryptographic tamper-proofing against intermediate CDN/proxy overrides.

---

## User Review Required

> [!IMPORTANT]
> **No server framework is being invented.** The Anza template engine is an embedding library/middleware crate that plugs into existing Rust web frameworks (Axum, Actix-web, Hyper, Tower) via standard response types, zero-copy byte buffers, and SSE/WS stream adapters.

> [!IMPORTANT]
> All Rust specifications will strictly adhere to the engineering standards established in `engines/rust/DESIGN.md` and the user's global naming rules (grouped tree imports, granular import exhaustion, prohibition of `as` aliases, scoped submodules with single-word verbs, operation structs implementing `.validate()` and `.run()`, and one-word first naming).

---

## Proposed Artifacts & Documentation Structure

```
engines/
├── DESIGN.md                  # Global cross-language STUI engine specification (Rust, Go, Node, Python)
└── rust/
    ├── DESIGN.md              # Rust-specific engine crate architecture, traits, zero-copy buffers, crypto signing
    ├── DOC.md                 # Developer cookbook: Axum / Actix-web integration, SSE streaming, file templates
    ├── SKILL.md               # Optimization and benchmarking guide
    └── docs/                  # In-depth module guides
```

---

## Proposed Changes

### 1. Global Multi-Language Template Engine Specification
#### [NEW] [engines/DESIGN.md](file:///home/femar/A10B/anza/engines/DESIGN.md)
- **Universal File-Based Template Architecture**: Standalone `.html` fragments organized by domain/feature, with slot placeholders and compile-time AST pre-parsing.
- **Universal Wire Protocol Envelope**: Standard JSON and binary SSE/WS event format (`slot`, `ts`, `html`, `sig`, `css`).
- **Cryptographic Tamper-Proofing Contract**:
  - Pre-computed static template SHA-256 / BLAKE3 hashes for structural integrity.
  - Symmetric HMAC-SHA256 and optional Ed25519 payload signatures to guarantee freshness and prevent unauthorized CDN/proxy alterations or XSS reflection.
- **Client Hydration Contract**: Seamless integration with Anza's native custom elements (`<ui-card>`, `<ui-badge>`, `<ui-progress>`), slot projection, and automatic rejection on signature mismatch.

---

### 2. Rust Engine Architecture Specification
#### [MODIFY] [engines/rust/DESIGN.md](file:///home/femar/A10B/anza/engines/rust/DESIGN.md)
- **Crate Architecture & Module Hierarchy**:
  - `engine/`: Core template loading, hot-reloading file watchers, memory mapping (`memmap2`), and zero-copy byte slice rendering.
  - `crypto/`: Fast HMAC-SHA256, BLAKE3, and Ed25519 signing submodules (`crypto::hmac::sign`, `crypto::blake::digest`).
  - `stream/`: Framework-agnostic SSE and WebSocket frame emitters (`stream::sse::frame`, `stream::ws::packet`).
  - `adapter/`: Native adapters for **Axum** (`IntoResponse`, `Sse`), **Actix-web** (`Responder`, `HttpResponse`), and **Hyper/Tower** (`Body`).
  - `data/`: Typed request/operation structs (`data::r#in::template::Render`, `data::r#in::template::Sign`) with `.validate()` and `.run()`.
- **Zero-Allocation Memory Model**: Pre-parsed template fragments stored as static byte slices with slot byte offsets; parameter injection directly into reusable output buffers.
- **Strict Compliance with `engines/rust/DESIGN.md` Rules**:
  - Grouped tree imports (e.g. `use engine::{core::view, crypto::hmac};`).
  - Granular import exhaustion.
  - No `as` aliases.
  - Scoped submodules with single-word verbs (`template::file::load`, `template::slot::bind`, `crypto::hmac::sign`).

---

### 3. Developer Guide & Framework Cookbook
#### [NEW] [engines/rust/DOC.md](file:///home/femar/A10B/anza/engines/rust/DOC.md)
- **Quickstart Guide**: Adding `anza-engine` to an existing Axum or Actix-web project.
- **Directory Layout**: Organizing `.html` template files (e.g., `templates/metrics/card.html`).
- **Axum Integration Recipes**:
  - Static template rendering endpoint.
  - Real-time verified SSE streaming route (`Sse::new(engine.stream(...))`).
- **Actix-web Integration Recipes**:
  - Verified SSE route using `actix_web_lab::sse` or raw chunked response.
- **Cryptographic Configuration**:
  - Enabling signature verification.
  - Managing ephemeral session secrets with browser client handshakes.
- **Benchmarking & Latency Best Practices**: Sub-microsecond rendering tips, buffer pooling, and memory-mapped templates.

---

## Verification Plan

### Automated Documentation & Code Checks
- Validate that all code snippets in `engines/DESIGN.md`, `engines/rust/DESIGN.md`, and `engines/rust/DOC.md` parse as valid Rust and JavaScript/ESM.
- Verify that module paths, operation structs, and import hierarchies in `engines/rust/DESIGN.md` conform to the rules in `engines/rust/DESIGN.md` and user global rules.

### Manual Verification
- Review API ergonomy across Axum and Actix-web sample snippets to ensure zero boilerplate for downstream developers.
