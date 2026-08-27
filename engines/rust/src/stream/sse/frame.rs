use {
  crate::models::envelope::Envelope,
};

pub fn encode(envelope: &Envelope) -> String {
  let json = serde_json::to_string(envelope).unwrap_or_default();
  format!("event: template\ndata: {}\n\n", json)
}
