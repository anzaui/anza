use {
  crate::{
    engine::cache::Engine,
    errors::Result,
    models::envelope::Envelope,
  },
  std::collections::HashMap,
};

pub fn envelope(engine: &Engine, template: &str, slot: &str, params: &HashMap<String, String>) -> Result<Envelope> {
  engine.render_fragment(template, slot, params)
}
