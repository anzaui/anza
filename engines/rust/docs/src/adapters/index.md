# Framework Adapters

Anza provides native response types and middleware adapters for popular Rust web frameworks.

## 1. Feature Flags

Enable the respective framework feature in `Cargo.toml`:

```toml
[dependencies]
# For Axum integration:
anza = { version = "0.1", features = ["axum"] }

# For Actix-web integration:
anza = { version = "0.1", features = ["actix"] }

# For Tower middleware:
anza = { version = "0.1", features = ["tower"] }

# All features:
anza = { version = "0.1", features = ["full"] }
```

## 2. Universal Trait Implementation

- **`IntoResponse` for Axum**: `Document` and `Envelope` implement `axum::response::IntoResponse`.
- **`Responder` for Actix-web**: `Document` and `Envelope` implement `actix_web::Responder`.
