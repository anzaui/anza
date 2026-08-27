use {
  crate::models::envelope::Envelope,
};

pub fn encode(envelope: &Envelope) -> String {
  serde_json::to_string(envelope).unwrap_or_default()
}
