#[cfg(feature = "actix")]
use {
  crate::models::envelope::Envelope,
  actix_web::web::Bytes,
};

#[cfg(feature = "actix")]
pub fn bytes(envelope: &Envelope) -> Bytes {
  let frame = crate::stream::sse::frame::encode(envelope);
  Bytes::from(frame)
}
