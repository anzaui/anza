# Changelog: anza (Rust Engine)

All notable changes to the Rust template and STUI streaming engine are documented here.

## [Unreleased]

### Added
- `anza::verify_envelope(VerifyKey, &Envelope, &VerifyOptions)` and `Engine::verify_envelope`: version, freshness (max age, 5 s future skew), expected slot, then the signature (constant-time). Failures are `Error::Crypto` with a fixed message per check.
- `anza::escape_html`, the `Setup::escape` option (`{{x}}` HTML-escaped, `{{{x}}}` raw; default off), `Setup::fragments` (fragment allowlist) and `Setup::max_template_bytes` (default 1 MiB).
- `crypto::hex` (strict lowercase hex), `crypto::signer::Signer` (keys decoded once), `crypto::envelope`, `engine::name`, `Error::code()` / `Error::message()`, `Template::new`.
- Golden fixtures shared with the TS and Python engines (`engines/fixtures/`), and `docs/engines/contract.md`.

### Changed
- **Breaking: signature v2.** The message is `anza-sig-v2\n` + length-prefixed `ts`, `slot`, `html`, `css` (was `ts:slot:html`); `Envelope` gains `v` (always 2) and `Envelope::message()` returns the v2 bytes.
- **Breaking:** `Setup::ed25519` returns `Result<SignMode>` (a missing key file is an error). `Engine.signing` is replaced by `Engine::signer()`. Keys are validated in `Setup::run` (HMAC secret at least 32 bytes, Ed25519 32-byte seed, matching public key).
- **Breaking: pages.** `/a/b` renders `pages/a/b.html`, then `pages/index.html`, else `Error::NotFound("Page not found")`. The "Route: …" placeholder and the bare `<route>.html` fallback are gone; the shell gets `{{content}}` only (no `slot_main`).
- **Breaking:** `Engine::manifest()` values are SHA-256 hex (was BLAKE3; the `blake3` dependency and `crypto::blake` are gone, see `crypto::digest`).
- **Breaking:** `Engine::get` returns `Arc<Template>`; `Chunk` gains `Raw`; `Params` gains `prepare`/`indexed`/`fill` (with defaults); errors display as `[Anza:CODE] message`; `engine::file::watch::listen` takes the engine's `CacheStore` and `LoadOptions`.
- Integral floats render without `.0`.
- Faster rendering: cached templates are shared instead of cloned per render, templates compile to a plan once, `Data<T>` serializes once per render (was once per slot), pair lists are scanned once, and unsigned renders skip the signature message (100-slot fragment: 8.3 → 1.8 µs).

### Security
- Hex decoding is byte-wise: a non-ASCII signature no longer panics the verifier; uppercase and odd-length hex are rejected.
- HMAC no longer signs with an empty key; `Debug` of `SignMode`, `Setup` and `Signer` redacts keys.
- Template names with `..`, `\`, NUL, empty segments or a leading `/` are rejected; symlinks that resolve outside the root are not loaded; load errors name the template, not the absolute path.

### Removed
- **Breaking:** `SignMode::SessionBound`, the `publish_meta` field of `SignMode::Ed25519` (`Setup::ed25519` now takes the two key paths only), the empty `adapters::tower` module and the `tower` feature. None of them did anything.

### Fixed
- The unknown-route page fallback wrote the request path unescaped (reflected XSS); the fallback page is gone.
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
