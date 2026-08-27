# Cryptographic Verification & Tamper-Proofing

Anza enforces cryptographic signatures across all dynamic partial fetches and real-time streaming envelopes.

## The Canonical Wire Payload

Every cryptographic signature is computed strictly across:

```
ts:slot:html
```

- `ts`: Unix timestamp in seconds (integer).
- `slot`: Target shadow DOM mount point identifier.
- `html`: Rendered HTML template fragment string.

## Cryptographic Topologies

### 1. Asymmetric Ed25519 (Universal Standard)

Used in modern micro-frontends and multi-tier architectures where traffic traverses reverse proxies, API gateways, and CDNs:

```
[Origin Backend] ──(Private Key Sign)──► [Edge CDN / Proxy] ──► [Client Browser]
                                                                        │
                                                   (Verifies via Origin Public Key)
```

- **Origin**: Generates signature using private key.
- **Client**: Verifies signature against public key embedded in `<meta name="anza-key">` or served from `/.well-known/anza.json`.
- **Security**: CDN/proxy TLS termination cannot inject malicious scripts or alter DOM fragments without failing signature validation.

### 2. Symmetric HMAC-SHA256

Used for private internal services and single-tier web applications:
- Computed via `HMAC-SHA256(secret, message)`.
- Verified in constant time via `crypto.timingSafeEqual` / `hmac.compare_digest` to prevent timing attacks.

### 3. Per-User Session Keys (HKDF-SHA256)

For authenticated real-time channels:
- Derives a 32-byte stream key from user session credentials via HKDF:
```
stream_key = HKDF(ikm=jwt_signature, salt=session_id, info="anza-stui-session-v1")
```
- Eliminates database session lookups during high-frequency live push broadcasts.
