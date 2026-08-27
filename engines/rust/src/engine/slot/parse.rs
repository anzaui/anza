use {
  crate::errors::{Error, Result},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Chunk {
  Static(Vec<u8>),
  Slot(String),
}

pub fn extract(template: &str) -> Result<Vec<Chunk>> {
  let mut chunks = Vec::new();
  let mut cursor = 0;
  let bytes = template.as_bytes();

  while let Some(open_idx) = template[cursor..].find("{{") {
    let start = cursor + open_idx;
    if start > cursor {
      chunks.push(Chunk::Static(bytes[cursor..start].to_vec()));
    }

    if let Some(close_idx) = template[start..].find("}}") {
      let end = start + close_idx;
      let slot_name = template[start + 2..end].trim().to_string();
      if slot_name.is_empty() {
        return Err(Error::template("Empty slot placeholder {{}} in template"));
      }
      chunks.push(Chunk::Slot(slot_name));
      cursor = end + 2;
    } else {
      return Err(Error::template("Unclosed slot placeholder '{{' in template"));
    }
  }

  if cursor < bytes.len() {
    chunks.push(Chunk::Static(bytes[cursor..].to_vec()));
  }

  Ok(chunks)
}
