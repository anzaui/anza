use crate::errors::{Error, Result};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Chunk {
  /// Literal template text.
  Static(Vec<u8>),
  /// `{{name}}`: HTML-escaped when the engine runs with `escape: true`.
  Slot(String),
  /// `{{{name}}}`: always inserted as-is.
  Raw(String),
}

/// Split a template into static text and `{{slot}}` / `{{{raw}}}` chunks.
pub fn extract(template: &str) -> Result<Vec<Chunk>> {
  let mut chunks = Vec::new();
  let mut cursor = 0;
  let bytes = template.as_bytes();

  while let Some(open_idx) = template[cursor..].find("{{") {
    let start = cursor + open_idx;
    if start > cursor {
      chunks.push(Chunk::Static(bytes[cursor..start].to_vec()));
    }

    let raw = bytes.get(start + 2) == Some(&b'{');
    let (open, close) = if raw { (3, "}}}") } else { (2, "}}") };
    let Some(close_idx) = template[start + open..].find(close) else {
      return Err(Error::template(if raw {
        "Unclosed raw slot placeholder '{{{' in template"
      } else {
        "Unclosed slot placeholder '{{' in template"
      }));
    };
    let end = start + open + close_idx;
    let slot_name = template[start + open..end].trim().to_string();
    if slot_name.is_empty() {
      return Err(Error::template("Empty slot placeholder {{}} in template"));
    }
    chunks.push(if raw { Chunk::Raw(slot_name) } else { Chunk::Slot(slot_name) });
    cursor = end + close.len();
  }

  if cursor < bytes.len() {
    chunks.push(Chunk::Static(bytes[cursor..].to_vec()));
  }

  Ok(chunks)
}
