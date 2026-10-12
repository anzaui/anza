use {
  super::{escape, parse::Chunk},
  crate::errors::Result,
  serde::Serialize,
  serde_json::Value,
  std::{borrow::Cow, collections::HashMap, io::Write},
};

/// A source of slot values.
pub trait Params {
  /// The text for slot `key`, or `None` to leave it empty.
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>>;

  /// Convert the source once before a bind. `Data<T>` serializes to a
  /// `Value` here, instead of once per slot.
  fn prepare(&self) -> Option<Value> {
    None
  }

  /// Whether [`Params::fill`] beats one `resolve` per slot (pair lists:
  /// one scan instead of one scan per slot). Default `false`.
  fn indexed(&self) -> bool {
    false
  }

  /// Resolve every key of a template at once (`keys[i]` into `out[i]`).
  /// `index` maps each key to its position. The default calls `resolve`
  /// once per key; pair lists override it to scan themselves once.
  fn fill<'a>(&'a self, keys: &[Box<str>], index: &HashMap<Box<str>, usize>, out: &mut [Option<Cow<'a, str>>]) {
    let _ = index;
    for (slot, key) in out.iter_mut().zip(keys) {
      *slot = self.resolve(key);
    }
  }
}

// 1. Implementation for () (zero overhead empty params)
impl Params for () {
  #[inline(always)]
  fn resolve(&self, _key: &str) -> Option<Cow<'_, str>> {
    None
  }

  fn fill<'a>(&'a self, _keys: &[Box<str>], _index: &HashMap<Box<str>, usize>, _out: &mut [Option<Cow<'a, str>>]) {}
}

// 2. Implementation for &T where T: Params
impl<T: Params + ?Sized> Params for &T {
  #[inline(always)]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    (*self).resolve(key)
  }

  fn prepare(&self) -> Option<Value> {
    (*self).prepare()
  }

  fn indexed(&self) -> bool {
    (*self).indexed()
  }

  fn fill<'a>(&'a self, keys: &[Box<str>], index: &HashMap<Box<str>, usize>, out: &mut [Option<Cow<'a, str>>]) {
    (*self).fill(keys, index, out)
  }
}

/// One pass over a pair list: each pair lands in its slot (first one wins).
fn fill_pairs<'a>(pairs: &'a [(&str, &str)], index: &HashMap<Box<str>, usize>, out: &mut [Option<Cow<'a, str>>]) {
  for (k, v) in pairs {
    if let Some(&i) = index.get(*k) {
      if out[i].is_none() {
        out[i] = Some(Cow::Borrowed(*v));
      }
    }
  }
}

// 3. Zero-Copy Implementation for slices of string pairs (ZERO allocations!)
impl Params for [(&str, &str)] {
  #[inline]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    self.iter().find(|(k, _)| *k == key).map(|(_, v)| Cow::Borrowed(*v))
  }

  fn indexed(&self) -> bool {
    true
  }

  fn fill<'a>(&'a self, _keys: &[Box<str>], index: &HashMap<Box<str>, usize>, out: &mut [Option<Cow<'a, str>>]) {
    fill_pairs(self, index, out)
  }
}

// 4. Zero-Copy Implementation for arrays of string pairs
impl<const N: usize> Params for [(&str, &str); N] {
  #[inline]
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    self.as_slice().resolve(key)
  }

  fn indexed(&self) -> bool {
    true
  }

  fn fill<'a>(&'a self, _keys: &[Box<str>], index: &HashMap<Box<str>, usize>, out: &mut [Option<Cow<'a, str>>]) {
    fill_pairs(self, index, out)
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

/// Wrapper for any `Serialize` type. It is converted to a `Value` once per
/// bind (see [`Params::prepare`]).
pub struct Data<T: Serialize>(pub T);

impl<T: Serialize> Params for Data<T> {
  fn resolve(&self, key: &str) -> Option<Cow<'_, str>> {
    let val = serde_json::to_value(&self.0).ok()?;
    val.resolve(key).map(|c| Cow::Owned(c.into_owned()))
  }

  fn prepare(&self) -> Option<Value> {
    Some(serde_json::to_value(&self.0).unwrap_or(Value::Null))
  }
}

#[derive(Debug, Clone)]
enum Part {
  Static(Box<str>),
  Slot { key: usize, escape: bool },
}

/// A template compiled for binding: static text and slot positions, with
/// each distinct slot name resolved once per bind.
#[derive(Debug, Clone)]
pub struct Plan {
  parts: Vec<Part>,
  keys: Vec<Box<str>>,
  index: HashMap<Box<str>, usize>,
  static_len: usize,
  slot_count: usize,
}

impl Plan {
  /// Compile `chunks`. With `escape`, `{{slot}}` values are HTML-escaped;
  /// `{{{raw}}}` values never are.
  pub fn new(chunks: &[Chunk], escape: bool) -> Self {
    let mut plan = Plan {
      parts: Vec::with_capacity(chunks.len()),
      keys: Vec::new(),
      index: HashMap::new(),
      static_len: 0,
      slot_count: 0,
    };
    for chunk in chunks {
      match chunk {
        Chunk::Static(bytes) => {
          let text: Box<str> = String::from_utf8_lossy(bytes).into();
          plan.static_len += text.len();
          plan.parts.push(Part::Static(text));
        }
        Chunk::Slot(name) | Chunk::Raw(name) => {
          let key = match plan.index.get(name.as_str()) {
            Some(&i) => i,
            None => {
              let name: Box<str> = name.as_str().into();
              plan.keys.push(name.clone());
              plan.index.insert(name, plan.keys.len() - 1);
              plan.keys.len() - 1
            }
          };
          plan.slot_count += 1;
          plan.parts.push(Part::Slot {
            key,
            escape: escape && matches!(chunk, Chunk::Slot(_)),
          });
        }
      }
    }
    plan
  }

  /// The distinct slot names, in first-use order.
  pub fn keys(&self) -> &[Box<str>] {
    &self.keys
  }

  /// Bind `params`.
  pub fn bind<P: Params + ?Sized>(&self, params: &P) -> String {
    match params.prepare() {
      Some(value) => self.bind_resolved(&value),
      None => self.bind_resolved(params),
    }
  }

  fn bind_resolved<P: Params + ?Sized>(&self, params: &P) -> String {
    if !params.indexed() {
      // Maps and objects: one lookup per slot, straight into the output.
      let mut out = String::with_capacity(self.static_len + 16 * self.slot_count);
      for part in &self.parts {
        match part {
          Part::Static(text) => out.push_str(text),
          Part::Slot { key, escape } => {
            if let Some(value) = params.resolve(&self.keys[*key]) {
              if *escape {
                escape::escape_push(&mut out, &value);
              } else {
                out.push_str(&value);
              }
            }
          }
        }
      }
      return out;
    }
    // Pair lists: one pass over the pairs, then one pass over the template.
    let mut values: Vec<Option<Cow<'_, str>>> = vec![None; self.keys.len()];
    params.fill(&self.keys, &self.index, &mut values);
    let len = self.static_len + values.iter().flatten().map(|v| v.len()).sum::<usize>();
    let mut out = String::with_capacity(len);
    for part in &self.parts {
      match part {
        Part::Static(text) => out.push_str(text),
        Part::Slot { key, escape } => {
          if let Some(value) = &values[*key] {
            if *escape {
              escape::escape_push(&mut out, value);
            } else {
              out.push_str(value);
            }
          }
        }
      }
    }
    out
  }
}

/// Write the bound template into `out`, without escaping.
pub fn inject<P: Params + ?Sized, W: Write>(chunks: &[Chunk], params: &P, out: &mut W) -> Result<()> {
  inject_with(chunks, params, false, out)
}

/// Write the bound template into `out`. With `escape`, `{{slot}}` values are
/// HTML-escaped; `{{{raw}}}` values never are.
pub fn inject_with<P: Params + ?Sized, W: Write>(chunks: &[Chunk], params: &P, escape: bool, out: &mut W) -> Result<()> {
  out
    .write_all(string_with(chunks, params, escape)?.as_bytes())
    .map_err(|e| crate::errors::Error::internal(e.to_string()))
}

/// Bind `params` into `chunks`, without escaping.
pub fn string<P: Params + ?Sized>(chunks: &[Chunk], params: &P) -> Result<String> {
  string_with(chunks, params, false)
}

/// Bind `params` into `chunks`; with `escape`, `{{slot}}` values are
/// HTML-escaped and `{{{raw}}}` values are not. Compiles a [`Plan`] each
/// call: keep a `Template` (or a `Plan`) to bind repeatedly.
pub fn string_with<P: Params + ?Sized>(chunks: &[Chunk], params: &P, escape: bool) -> Result<String> {
  Ok(Plan::new(chunks, escape).bind(params))
}
