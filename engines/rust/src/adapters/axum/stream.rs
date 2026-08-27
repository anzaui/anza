#[cfg(feature = "axum")]
use {
  crate::models::envelope::Envelope,
  axum::response::sse::Event,
};

#[cfg(feature = "axum")]
pub fn event(envelope: Envelope) -> Result<Event, axum::Error> {
  let json = serde_json::to_string(&envelope).map_err(|e| axum::Error::new(e))?;
  Ok(Event::default().event("template").data(json))
}
