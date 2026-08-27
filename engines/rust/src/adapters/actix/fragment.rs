#[cfg(feature = "actix")]
use {
  crate::models::envelope::Envelope,
  actix_web::{body::BoxBody, http::header::ContentType, HttpResponse, Responder},
};

#[cfg(feature = "actix")]
impl Responder for Envelope {
  type Body = BoxBody;

  fn respond_to(self, _req: &actix_web::HttpRequest) -> HttpResponse<Self::Body> {
    HttpResponse::Ok()
      .content_type(ContentType::json())
      .json(self)
  }
}
