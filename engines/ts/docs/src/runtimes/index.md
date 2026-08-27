# Multi-Runtime Support

Anza is written to pure Web Standards and Node.js built-in APIs, allowing identical execution across all major JavaScript runtimes.

## 1. Supported Runtimes

| Runtime | Cryptographic Engine | File Loading | Streaming API |
|---|---|---|---|
| **Node.js (>=18)** | `node:crypto` / `globalThis.crypto.subtle` | `node:fs/promises` | `node:http` ServerResponse |
| **Bun (>=1.0)** | Native Web Crypto & `node:crypto` | `Bun.file()` / `node:fs` | `ReadableStream` & SSE |
| **Deno (>=1.35)** | Native Web Crypto | `Deno.readTextFile()` | `ReadableStream` |
| **Cloudflare Workers** | Edge Web Crypto | Bundled VFS / KV | `Response` streaming |
