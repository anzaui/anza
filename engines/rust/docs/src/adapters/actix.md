# Actix-web Integration

The `actix` feature enables `actix_web::Responder` implementations for all Anza types.

## 1. Handlers in Actix-web

```rust
use actix_web::{get, web, Responder, HttpResponse};
use anza::{engine::cache::engine::Engine, render::page::compile as render_page};

#[get("/")]
async fn index(engine: web::Data<Engine>) -> impl Responder {
  match render_page(engine.get_ref(), "/", &[("title", "Actix STUI")]) {
    Ok(doc) => HttpResponse::Ok().content_type("text/html; charset=utf-8").body(doc.html),
    Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
  }
}
```

## 2. Server Configuration

```rust
use actix_web::{App, HttpServer, web};
use anza::data::r#in::setup::Setup;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
  let engine = Setup::new("templates").run().unwrap();
  let engine_data = web::Data::new(engine);

  HttpServer::new(move || {
    App::new()
      .app_data(engine_data.clone())
      .service(index)
  })
  .bind(("127.0.0.1", 8080))?
  .run()
  .await
}
```
