#[cfg(feature = "axum")]
use {
  crate::models::document::Document,
  axum::response::{Html, IntoResponse, Response},
};

#[cfg(feature = "axum")]
impl IntoResponse for Document {
  fn into_response(self) -> Response {
    Html(self.html).into_response()
  }
}
