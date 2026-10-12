//! HTML escaping, identical in all three engines: `&` `<` `>` `"` `'` become
//! `&amp;` `&lt;` `&gt;` `&quot;` `&#39;`. Safe for element content and
//! quoted attribute values.

use std::borrow::Cow;

#[inline]
fn entity_str(b: u8) -> Option<&'static str> {
  match b {
    b'&' => Some("&amp;"),
    b'<' => Some("&lt;"),
    b'>' => Some("&gt;"),
    b'"' => Some("&quot;"),
    b'\'' => Some("&#39;"),
    _ => None,
  }
}

#[inline]
fn entity(b: u8) -> Option<&'static [u8]> {
  entity_str(b).map(str::as_bytes)
}

/// Append `text` to `out`, HTML-escaped.
pub fn escape_push(out: &mut String, text: &str) {
  let mut last = 0;
  for (i, &b) in text.as_bytes().iter().enumerate() {
    if let Some(rep) = entity_str(b) {
      // `b` is ASCII, so `i` is a char boundary.
      out.push_str(&text[last..i]);
      out.push_str(rep);
      last = i + 1;
    }
  }
  out.push_str(&text[last..]);
}

/// Append `text` to `out`, HTML-escaped.
pub fn escape_into(out: &mut Vec<u8>, text: &str) {
  let bytes = text.as_bytes();
  let mut last = 0;
  for (i, &b) in bytes.iter().enumerate() {
    if let Some(rep) = entity(b) {
      out.extend_from_slice(&bytes[last..i]);
      out.extend_from_slice(rep);
      last = i + 1;
    }
  }
  out.extend_from_slice(&bytes[last..]);
}

/// `text`, HTML-escaped. Borrows when there is nothing to escape.
pub fn escape_html(text: &str) -> Cow<'_, str> {
  if !text.bytes().any(|b| entity(b).is_some()) {
    return Cow::Borrowed(text);
  }
  let mut out = String::with_capacity(text.len() + 16);
  escape_push(&mut out, text);
  Cow::Owned(out)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn escapes() {
    assert_eq!(escape_html("<script>alert('x')</script>"), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    assert_eq!(escape_html("a & \"b\""), "a &amp; &quot;b&quot;");
    assert!(matches!(escape_html("plain café"), Cow::Borrowed(_)));
  }
}
