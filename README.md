# Anza

Anza is a modern web platform providing reactive custom elements, client-side routing, offline storage, and multi-language Server-Templated UI (STUI) engines with zero build-step overhead.

## Overview

- **Browser-Native ESM**: Direct ES module imports in the browser with native Declarative Shadow DOM adoption.
- **Multi-Language STUI Engines**: High-performance template rendering and streaming engines for Rust, TypeScript, and Python.
- **Cryptographic Security**: Asymmetric Ed25519 origin signing, HMAC-SHA256, and HKDF session key derivation for tamper-proof dynamic partials.
- **Real-Time Streaming**: Atomic Server-Sent Events (SSE) and WebSocket text frame protocols.
- **Rust Tooling**: Instant dev server with live HMR and static site generation (SSG).

## Repository Organization

| Path | Purpose |
|---|---|
| `library/` | Client-side reactive runtime, custom elements, and router (`@adukiorg/anza`). |
| `tools/` | High-throughput Rust CLI binary (`anza`) for dev server, HMR, and SSG. |
| `engines/rust/` | Standalone Rust STUI template and streaming engine crate. |
| `engines/ts/` | Standalone TypeScript / JavaScript STUI engine with zero dependencies. |
| `engines/py/` | Standalone Python STUI engine built 100% on the standard library. |
| `docs/` | Comprehensive technical documentation and specifications. |
| `web/` | Official documentation site source. |

## Quick Start

### Scaffold a New Application

```bash
npm create @adukiorg/anza my-app
cd my-app
anza dev
```

### Build Tools Locally

```bash
cargo build --release --manifest-path tools/Cargo.toml
```

### Run Tests

```bash
# Core library tests
cd library && npm test

# Rust engine tests
cd engines/rust && cargo test

# TypeScript engine tests
cd engines/ts && npm test

# Python engine tests
cd engines/py && python3 -m unittest discover -s tests
```

## Documentation

Full documentation is available at [https://anza.aduki.org](https://anza.aduki.org) or locally within the `docs/` directory.

## License

MIT © 2026 Anza Contributors.
