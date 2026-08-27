use {
  super::parse::Chunk,
  crate::errors::Result,
  serde::Serialize,
  serde_json::Value,
  std::{
    borrow::Cow,
    collections::HashMap,
    io::Write,
  },
};

pub trait Params {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>>;
}

// 1. Implementation for () (zero overhead empty params)
impl Params for () {
  #[inline(always)]
  fn resolve(&self, _key: &str) -> Option<Cow<'_, str>> {
    None
  }
}

// 2. Implementation for &T where T: Params
impl<T: Params + ?Sized> Params for &T {
  #[inline(always)]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    (*self).resolve(key)
  }
}

// 3. Zero-Copy Implementation for slices of string pairs (ZERO allocations!)
impl Params for [(&str, &str)] {
  #[inline]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    for (k, v) in self {
      if *k == key {
        return Some(Cow::Borrowed(*v));
      }
    }
    None
  }
}

// 4. Zero-Copy Implementation for arrays of string pairs
impl<const N: usize> Params for [(&str, &str); N] {
  #[inline]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    for (k, v) in self {
      if *k == key {
        return Some(Cow::Borrowed(*v));
      }
    }
    None
  }
}

// 5. Implementation for HashMap<String, String>
impl Params for HashMap<String, String> {
  #[inline]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    self.get(key).map(|s| Cow::Borrowed(s.as_str()))
  }
}

// 6. Implementation for serde_json::Value
impl Params for Value {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    match self {
      Value::Object(map) => map.get(key).and_then(|v| match v {
        Value::String(s) => Some(Cow::Borrowed(s.as_str())),
        Value::Number(n) => Some(Cow::Owned(n.to_string())),
        Value::Bool(b) => Some(Cow::Owned(b.to_string())),
        Value::Null => None,
        other => Some(Cow::Owned(other.to_string())),
      }),
      _ => None,
    }
  }
}

// 7. Wrapper for any Serialize struct (fallback)
pub struct Data<T: Serialize>(pub T);

impl<T: Serialize> Params for Data<T> {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    let val = serde_json::to_value(&self.0).ok()?;
    val.resolve(key).map(|c| Cow::Owned(c.into_owned()))
  }
}

/// Zero-copy template injection writing directly into the pre-allocated output buffer
pub fn inject<P: Params + ?Sized, W: Write>(chunks: &[Chunk], params: &P, out: &mut W) -> Result<()> {
  for chunk in chunks {
    match chunk {
      Chunk::Static(bytes) => {
        out.write_all(bytes).map_err(|e| crate::errors::Error::internal(e.to_string()))?;
      }
      Chunk::Slot(key) => {
        if let Some(val) = params.resolve(key) {
          out.write_all(val.as_bytes()).map_err(|e| crate::errors::Error::internal(e.to_string()))?;
        }
      }
    }
  }
  Ok(())
}

/// Zero-copy template string builder with pre-computed initial capacity
pub fn string<P: Params + ?Sized>(chunks: &[Chunk], params: &P) -> Result<String> {
  let est_size: usize = chunks.iter().map(|c| match c {
    Chunk::Static(b) => b.len(),
    Chunk::Slot(_) => 32,
  }).sum();

  let mut buf = Vec::with_capacity(est_size);
  inject(chunks, params, &mut buf)?;
  String::from_utf8(buf).map_err(|e| crate::errors::Error::template(format!("UTF-8 error: {}", e)))
}
