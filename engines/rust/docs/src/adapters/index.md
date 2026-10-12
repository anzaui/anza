# Framework Adapters

Adapters are behind Cargo features, so the default build has no web framework.

## 1. Feature flags

```toml
[dependencies]
# Axum 0.8
anza = { version = "0.6", features = ["axum"] }

# Actix-web 4
anza = { version = "0.6", features = ["actix"] }

# Everything
anza = { version = "0.6", features = ["full"] }
```

| Feature | Provides |
|---|---|
| `axum` | `IntoResponse` for `Document` (HTML) and `Envelope` (JSON); `anza::adapters::axum::event` for SSE |
| `actix` | `Responder` for `Document` (HTML) and `Envelope` (JSON); `anza::adapters::actix::bytes` for SSE |
| `watch` | Starts a `notify` watcher on the template root and reloads changed templates into the cache |
| `full` | All of the above |

## 2. Sharing the engine

`Engine` is not `Clone`. Wrap it in `Arc<Engine>` for Axum state, or in
`actix_web::web::Data<Engine>` (which is an `Arc`) for Actix-web.
