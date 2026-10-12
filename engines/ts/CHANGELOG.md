# Changelog: anza (TypeScript Engine)

All notable changes to the TypeScript / JavaScript template and STUI streaming engine are documented here.

## [Unreleased]

### Added
- `verifyEnvelope(key, envelope, { maxAgeSecs, slot })` and `engine.verifyEnvelope`: version, freshness (max age, 5 s future skew), expected slot, then the signature (constant-time). Failures throw `AnzaError` `CRYPTO` with a fixed message per check.
- `escapeHtml`, the `escape` setup option (`{{x}}` HTML-escaped, `{{{x}}}` raw; default off), `fragments` (fragment allowlist), `maxTemplateBytes` (default 1 MiB).
- `crypto.hex` (strict lowercase hex), `Signer`, `signatureMessage`, `validName`, `pageTemplate`, `fragmentAllowed`, `stringify`.
- Golden fixtures shared with the Rust and Python engines (`engines/fixtures/`), and `docs/engines/contract.md`.

### Changed
- **Breaking: signature v2.** The message is `anza-sig-v2\n` + length-prefixed `ts`, `slot`, `html`, `css` (was `ts:slot:html`); envelopes gain `v: 2` (first JSON key) and `Envelope.message()` returns a `Buffer`.
- **Breaking:** keys are validated in `Setup.run()`: a missing or short (< 32 bytes) HMAC secret, an Ed25519 key that is not a 32-byte seed / 64-char hex / PEM / `KeyObject`, or a mismatched `publicKey` throws `CRYPTO`. `engine.signing` is replaced by `engine.signer`. A string private key is hex or PEM (a 32-character string is no longer a raw seed).
- **Breaking: pages.** `/a/b` renders `pages/a/b.html`, then `pages/index.html`, else rejects with `NOT_FOUND` ("Page not found"). The "Route: …" placeholder and the bare `<route>.html` fallback are gone; the shell gets `{{content}}` only (no `slot_main`).
- **Breaking: values.** Plain objects and arrays render as compact JSON (were `[object Object]`); only own properties are read.
- The watcher debounces bursts (50 ms) and serializes reloads, so the newest tree always wins.
- Faster rendering: templates compile to statics and names once, the params type is checked once per render, Ed25519 keys are decoded once, and unsigned renders skip the signature message.

### Security
- The page fallback wrote the request path into HTML unescaped; the fallback page is gone.
- Signing failed open: a missing key produced unsigned envelopes. It is now a setup error.
- `verify` accepted non-canonical hex (`sig + "zz"` verified); hex is now strict lowercase.
- `{{toString}}`/`{{__proto__}}` no longer read the prototype (`Object.hasOwn`).
- Template names with `..`, `\`, NUL, empty segments or a leading `/` are rejected; symlinks that resolve outside the root are not loaded (others now are); errors name the template, never the absolute path; `inspect`/`JSON.stringify` of `Setup`, `Engine` and `Signer` redact keys.

### Removed
- **Breaking:** `mode: 'session'` and `publishMeta` in `SignOptions`. They never signed anything.

## [0.5.1] — 2026-10-12

### Changed
- Version sync with the Anza 0.5.1 release. No engine changes.

## [0.5.0] — 2026-08-27

### Added
- **0 External Runtime Dependencies**: Built entirely on native Web Standards (`globalThis.crypto.subtle`) and standard library primitives.
- **JIT Closure Compilation**: Single-pass template extraction compiling chunks directly into V8 JIT-optimized functions executing in single-digit nanoseconds.
- **Dual-Mode Rendering**: Open Declarative Shadow DOM full-page SSR and cryptographically signed dynamic `Envelope` generation.
- **Cryptographic Topologies**: Asymmetric Ed25519 origin signing, HMAC-SHA256, and HKDF session key derivation.
- **Multi-Runtime Support**: Node.js (>=18), Bun, Deno, Cloudflare Workers, and Vercel Edge.
- **Framework Adapters**: Web Standards `Response` (Fetch), Hono, Express.js, and Fastify.
- **Documentation**: Comprehensive mdBook documentation in `docs/`.
