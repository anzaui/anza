# Framework Adapters

Adapters are behind Cargo features, so the default build has no web framework.

## 1. Feature flags

```toml
[dependencies]
# Axum 0.8
anza = { version = "0.5", features = ["axum"] }

# Actix-web 4
anza = { version = "0.5", features = ["actix"] }

# Everything
anza = { version = "0.5", features = ["full"] }
```

| Feature | Provides |
|---|---|
| `axum` | `IntoResponse` for `Document` (HTML) and `Envelope` (JSON); `anza::adapters::axum::event` for SSE |
| `actix` | `Responder` for `Document` (HTML) and `Envelope` (JSON); `anza::adapters::actix::bytes` for SSE |
| `tower` | Pulls in `tower`; the `adapters::tower` module is an empty placeholder, there is no `Service` yet |
| `watch` | Starts a `notify` watcher on the template root; changes are not reloaded yet |
| `full` | All of the above |

## 2. Sharing the engine

`Engine` is not `Clone`. Wrap it in `Arc<Engine>` for Axum state, or in
`actix_web::web::Data<Engine>` (which is an `Arc`) for Actix-web.
