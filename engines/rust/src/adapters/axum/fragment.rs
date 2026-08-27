#[cfg(feature = "axum")]
use {
  crate::models::envelope::Envelope,
  axum::{
    body::Body,
    response::{IntoResponse, Response},
  },
};

#[cfg(feature = "axum")]
impl IntoResponse for Envelope {
  fn into_response(self) -> Response {
    let json = serde_json::to_string(&self).unwrap_or_default();
    Response::builder()
      .header("Content-Type", "application/json")
      .body(Body::from(json))
      .unwrap()
  }
}
