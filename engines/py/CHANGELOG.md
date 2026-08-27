# Changelog: anza (Python Engine)

All notable changes to the Python template and STUI streaming engine are documented here.

## [0.5.0] — 2026-08-27

### Added
- **0 External Runtime Dependencies**: 100% standard library implementation with zero mandatory pip dependencies.
- **Fast Slot Interpolation**: Pre-parsed chunk arrays with optimized list concatenation resolving parameters from dicts, dataclasses, and custom objects.
- **Dual-Mode Rendering**: Mode A full-page Open Declarative Shadow DOM shells (`<page-*><template shadowrootmode="open">...`) and Mode B signed JSON envelopes.
- **Cryptographic Security**: HMAC-SHA256 with constant-time `hmac.compare_digest`, Ed25519 asymmetric origin signing, and HKDF-SHA256 stream keys.
- **Framework Adapters**: Raw ASGI, raw WSGI, FastAPI, and Flask response helpers.
- **Streaming Protocols**: Server-Sent Events (SSE) and WebSocket frame generators.
