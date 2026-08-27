# Changelog: anza (Rust Engine)

All notable changes to the Rust template and STUI streaming engine are documented here.

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
