# Changelog: anza (Rust Engine)

All notable changes to the Rust template and STUI streaming engine are documented here.

## [Unreleased]

### Removed
- **Breaking:** `SignMode::SessionBound`, the `publish_meta` field of `SignMode::Ed25519` (`Setup::ed25519` now takes the two key paths only), the empty `adapters::tower` module and the `tower` feature. None of them did anything.

### Changed
- **Breaking: `Engine::manifest()` values.** Each entry is now the hex BLAKE3 digest of the template content (what `b3sum` prints). It used to be the BLAKE3 of that digest, so every stored manifest value changes.
- `engine::file::watch::listen` takes the engine's `CacheStore`.

### Fixed
- The unknown-route page fallback escapes the request path (reflected XSS). Routes with `.`/`..` segments never select a template by name.
- The `watch` feature reloads edited and added templates and evicts removed ones (events used to be dropped).

## [0.5.1] — 2026-10-12

### Changed
- Version sync with the Anza 0.5.1 release. No engine changes.

## [0.5.0] — 2026-08-27

### Added
- **Zero-Copy Template Parsing**: Single-pass delimiter extraction compiling `.html` templates into continuous string slices.
- **Dual-Mode Rendering**:
  - Mode A: Full-page SSR with `<template shadowrootmode="open">`.
  - Mode B: Dynamic JSON `Envelope` generation with cryptographic tamper-proofing.
- **Cryptographic Security**: HMAC-SHA256, Asymmetric Ed25519 origin signing, HKDF-SHA256 session stream key derivation.
- **Streaming Encoders**: Server-Sent Events (SSE) and WebSocket packetization.
- **Framework Adapters**: Direct Axum and Actix-web response types.
- **Documentation**: Comprehensive mdBook documentation in `docs/`.
