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

/// A value as slot text (see `docs/engines/contract.md`): strings as-is,
/// `true`/`false`, integers in decimal, integral floats without `.0`, other
/// numbers in their shortest form, `null` as nothing, arrays and objects as
/// compact JSON.
pub fn stringify(value: &Value) -> Option<Cow<'_, str>> {
  match value {
    Value::String(s) => Some(Cow::Borrowed(s.as_str())),
    Value::Number(n) => Some(Cow::Owned(match n.as_f64() {
      Some(f) if n.is_f64() && f.fract() == 0.0 && f.abs() < 9_007_199_254_740_992.0 => (f as i64).to_string(),
      _ => n.to_string(),
    })),
    Value::Bool(b) => Some(Cow::Borrowed(if *b { "true" } else { "false" })),
    Value::Null => None,
    other => Some(Cow::Owned(other.to_string())),
  }
}

// 6. Implementation for serde_json::Value
impl Params for Value {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    match self {
      Value::Object(map) => map.get(key).and_then(stringify),
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

/// Write the bound template into `out`, without escaping.
pub fn inject<P: Params + ?Sized, W: Write>(chunks: &[Chunk], params: &P, out: &mut W) -> Result<()> {
  inject_with(chunks, params, false, out)
}

/// Write the bound template into `out`. With `escape`, `{{slot}}` values are
/// HTML-escaped; `{{{raw}}}` values never are.
pub fn inject_with<P: Params + ?Sized, W: Write>(chunks: &[Chunk], params: &P, escape: bool, out: &mut W) -> Result<()> {
  let mut buf = Vec::new();
  for chunk in chunks {
    let bytes: &[u8] = match chunk {
      Chunk::Static(bytes) => bytes,
      Chunk::Slot(key) | Chunk::Raw(key) => {
        let Some(val) = params.resolve(key) else { continue };
        if escape && matches!(chunk, Chunk::Slot(_)) {
          buf.clear();
          super::escape::escape_into(&mut buf, &val);
          out.write_all(&buf).map_err(|e| crate::errors::Error::internal(e.to_string()))?;
        } else {
          out.write_all(val.as_bytes()).map_err(|e| crate::errors::Error::internal(e.to_string()))?;
        }
        continue;
      }
    };
    out.write_all(bytes).map_err(|e| crate::errors::Error::internal(e.to_string()))?;
  }
  Ok(())
}

/// Bind `params` into `chunks`, without escaping.
pub fn string<P: Params + ?Sized>(chunks: &[Chunk], params: &P) -> Result<String> {
  string_with(chunks, params, false)
}

/// Bind `params` into `chunks`; with `escape`, `{{slot}}` values are
/// HTML-escaped and `{{{raw}}}` values are not.
pub fn string_with<P: Params + ?Sized>(chunks: &[Chunk], params: &P, escape: bool) -> Result<String> {
  let est_size: usize = chunks
    .iter()
    .map(|c| match c {
      Chunk::Static(b) => b.len(),
      Chunk::Slot(_) | Chunk::Raw(_) => 32,
    })
    .sum();

  let mut buf = Vec::with_capacity(est_size);
  inject_with(chunks, params, escape, &mut buf)?;
  String::from_utf8(buf).map_err(|e| crate::errors::Error::template(format!("UTF-8 error: {}", e)))
}
