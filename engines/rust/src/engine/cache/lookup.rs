use {
  super::store::CacheStore,
  crate::{
    engine::file::Template,
    errors::{Error, Result},
  },
};

pub fn get(store: &CacheStore, name: &str) -> Result<Template> {
  let lock = store.templates.read().map_err(|e| Error::internal(e.to_string()))?;
  lock
    .get(name)
    .cloned()
    .ok_or_else(|| Error::not_found(format!("Template '{}' not found in cache", name)))
}
