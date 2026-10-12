# Actix-web Integration

With the `actix` feature, `Document` and `Envelope` implement
`actix_web::Responder` (HTML and JSON).

## 1. Handlers

```rust
use actix_web::{error::ErrorInternalServerError, get, web};
use anza::{Document, Engine, Envelope, Fragment, Page};

#[get("/")]
async fn index(engine: web::Data<Engine>) -> actix_web::Result<Document> {
  Page::new("/")
    .param("title", "Actix STUI")
    .run(&engine)
    .map_err(ErrorInternalServerError)
}

#[get("/card")]
async fn card(engine: web::Data<Engine>) -> actix_web::Result<Envelope> {
  Fragment::new("feed/card.html", "feed")
    .param("title", "Live")
    .run(&engine)
    .map_err(ErrorInternalServerError)
}
```

## 2. Server

```rust
use actix_web::{web, App, HttpServer};
use anza::Setup;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
  let engine = web::Data::new(Setup::new("templates").run().expect("load templates"));

  HttpServer::new(move || {
    App::new()
      .app_data(engine.clone())
      .service(index)
      .service(card)
  })
  .bind(("127.0.0.1", 8080))?
  .run()
  .await
}
```

For SSE bodies, `anza::adapters::actix::bytes(&envelope)` returns the encoded
frame as `actix_web::web::Bytes`.
