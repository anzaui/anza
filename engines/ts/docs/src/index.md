# Anza Engine: TypeScript & JavaScript Reference

**Anza** (`@adukiorg/anza-engine` / `anza`) is a zero-dependency, JIT-optimized Server-Templated UI (STUI) template and component streaming engine for modern JavaScript and TypeScript backends.

It delivers sub-millisecond initial page renders using **Open Declarative Shadow DOM (DSD)** and provides cryptographically signed component envelopes for dynamic partial fetches and Server-Sent Events (SSE) streams.

```
┌─────────────────┐       Initial SSR (HTML + Open DSD)        ┌─────────────────┐
│                 ├───────────────────────────────────────────►│                 │
│   Node / Bun    │                                            │  Client Browser │
│   (Anza Engine) │       Signed Dynamic Envelopes (SSE/Fetch) │ (Native Custom  │
│                 ├───────────────────────────────────────────►│   Elements)     │
└─────────────────┘      [ts:slot:html + Ed25519/HMAC Sig]     └─────────────────┘
```

## Key Characteristics

1. **Zero External Runtime Dependencies**:
   - Built on native Web Standards (`globalThis.crypto.subtle`) and standard library primitives.
   - Operates identically across **Node.js (>=18)**, **Bun**, **Deno**, **Cloudflare Workers**, and **Vercel Edge**.

2. **JIT Closure Compilation**:
   - Templates are parsed once at boot into flat AST chunks and compiled into V8 JIT-optimized closures.
   - Parameter interpolation executes in **single-digit nanoseconds** with zero regular expression evaluations at request time.

3. **Dual-Mode Rendering**:
   - **Mode A (Full-Page SSR)**: Emits complete HTML documents with open Declarative Shadow DOM shells (`<template shadowrootmode="open">`) for instantaneous paint and SEO crawling.
   - **Mode B (Fragment Envelopes)**: Emits signed JSON envelopes (`{ slot, ts, html, sig, css }`) for partial updates and live SSE streams.

4. **Cryptographic Tamper-Proofing**:
   - Every partial envelope includes a cryptographic signature computed over `ts:slot:html`.
   - Supports **Asymmetric Ed25519** (for CDN/proxy TLS termination bypass), **HMAC-SHA256**, and **HKDF session-bound keys**.

## Quick Example

```typescript
import { Setup, Page, Fragment, htmlResponse, jsonResponse } from 'anza';

// 1. Initialize engine once
const engine = await new Setup({
  root: './templates',
  signing: {
    mode: 'hmac',
    secret: 'super-secret-origin-key-32-bytes!!',
  },
  watch: false,
}).run();

// 2. Render full SSR page with open Declarative Shadow DOM
const doc = await new Page('/', { title: 'Home Page' }).run(engine);
console.log(doc.html);

// 3. Render signed partial component fragment for SSE/fetch
const envelope = await new Fragment('feed/card.html', 'main', {
  title: 'Real-Time Update',
  author: 'Alex',
}).run(engine);
console.log(JSON.stringify(envelope, null, 2));
```
