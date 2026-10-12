use {
  super::store::CacheStore,
  crate::{
    engine::file::Template,
    errors::{Error, Result},
  },
  std::sync::Arc,
};

/// Look `name` up in the cache. Malformed names (see [`crate::engine::name`])
/// are a `Validation` error; the filesystem is never touched.
pub fn get(store: &CacheStore, name: &str) -> Result<Arc<Template>> {
  if !crate::engine::name::valid(name) {
    return Err(Error::validation("Invalid template name"));
  }
  let lock = store.templates.read().map_err(|_| Error::internal("Template cache lock poisoned"))?;
  lock
    .get(name)
    .cloned()
    .ok_or_else(|| Error::not_found(format!("Template '{}' not found", name)))
}
