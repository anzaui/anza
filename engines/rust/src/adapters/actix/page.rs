#[cfg(feature = "actix")]
use {
  crate::models::document::Document,
  actix_web::{body::BoxBody, http::header::ContentType, HttpResponse, Responder},
};

#[cfg(feature = "actix")]
impl Responder for Document {
  type Body = BoxBody;

  fn respond_to(self, _req: &actix_web::HttpRequest) -> HttpResponse<Self::Body> {
    HttpResponse::Ok()
      .content_type(ContentType::html())
      .body(self.html)
  }
}
