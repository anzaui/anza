# Cryptographic Verification

In distributed architectures with CDNs (Cloudflare, Fastly) and reverse proxies terminating SSL/TLS, standard transport-layer security only protects the connection between the client and the edge proxy—not between the origin and the client.

Anza provides end-to-end payload integrity via signed envelopes.

## 1. Supported Signing Modes

Defined in `src/engine/cache/engine.rs`:

```rust
pub enum SignOptions {
  None,
  Hmac { secret: Vec<u8> },
  Ed25519 {
    private_key: Vec<u8>,
    public_key: Vec<u8>,
  },
  Session { salt: Vec<u8> },
}
```

| Mode | Use Case | CDN / Proxy Compatible? | Verification API |
|---|---|---|---|
| **`Ed25519`** | Public streams behind CDNs | ✅ **100% (Asymmetric Origin Public Key)** | `crypto.subtle.verify({ name: "Ed25519" }, ...)` |
| **`Hmac`** | Shared-secret microfrontends | ✅ Yes (Shared secret) | `crypto.subtle.verify({ name: "HMAC" }, ...)` |
| **`Session`** | User-isolated personalized streams | ✅ Yes (Derived from session token) | HKDF-derived HMAC |
| **`None`** | Local testing & development | ✅ Yes | N/A |

## 2. Canonical Wire Format

Signatures are computed strictly over the canonical string:

$$\text{Canonical Message} = \text{ts} \parallel \texttt{":"} \parallel \text{slot} \parallel \texttt{":"} \parallel \text{html}$$

Any alteration by an intermediate proxy to the timestamp, target slot, or HTML content results in an immediate signature mismatch.
