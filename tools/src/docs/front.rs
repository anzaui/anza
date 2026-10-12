//! Markdown front matter: a leading `---` block of `key: value` lines.
//!
//! Keys: `title` (sidebar label; on a folder's `index.md`, the section title),
//! `order` (sort key in the sidebar; on `index.md`, the section's order),
//! `seo_title` and `description` (the page's `seo` block).
//! Values are bare text, or a JSON / single-quoted string.

#[derive(Debug, Default, Clone, PartialEq)]
pub struct FrontMatter {
  pub title: Option<String>,
  pub order: Option<i64>,
  pub seo_title: Option<String>,
  pub description: Option<String>,
}

fn value(raw: &str) -> String {
  let raw = raw.trim();
  if raw.starts_with('"') {
    if let Ok(s) = serde_json::from_str::<String>(raw) {
      return s;
    }
  }
  if raw.len() >= 2 && raw.starts_with('\'') && raw.ends_with('\'') {
    return raw[1..raw.len() - 1].replace("''", "'");
  }
  raw.to_string()
}

/// Split `raw` into front matter and the markdown body. Without a front
/// matter block the body is `raw` unchanged.
pub fn parse(raw: &str) -> (FrontMatter, String) {
  let mut fm = FrontMatter::default();
  let trimmed = raw.trim_start_matches('\u{feff}');
  let Some(rest) = trimmed.strip_prefix("---\n").or_else(|| trimmed.strip_prefix("---\r\n")) else {
    return (fm, raw.to_string());
  };
  let Some(end) = rest.find("\n---") else {
    return (fm, raw.to_string());
  };
  let block = &rest[..end];
  let after = &rest[end + 4..];
  let body = after.trim_start_matches(['\r', '\n']).to_string();
  for line in block.lines() {
    let Some((key, val)) = line.split_once(':') else {
      continue;
    };
    let val = value(val);
    match key.trim() {
      "title" => fm.title = Some(val),
      "order" => fm.order = val.parse().ok(),
      "seo_title" => fm.seo_title = Some(val),
      "description" => fm.description = Some(val),
      _ => {}
    }
  }
  (fm, body)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_keys_and_body() {
    let (fm, body) = parse(
      "---\ntitle: Getting Started\norder: 2\nseo_title: \"Start — Anza\"\ndescription: 'It''s fast: really'\n---\n\n# Start\n",
    );
    assert_eq!(fm.title.as_deref(), Some("Getting Started"));
    assert_eq!(fm.order, Some(2));
    assert_eq!(fm.seo_title.as_deref(), Some("Start — Anza"));
    assert_eq!(fm.description.as_deref(), Some("It's fast: really"));
    assert_eq!(body, "# Start\n");
  }

  #[test]
  fn no_front_matter_keeps_the_body() {
    let (fm, body) = parse("# Title\n\n---\n\ntext\n");
    assert_eq!(fm, FrontMatter::default());
    assert_eq!(body, "# Title\n\n---\n\ntext\n");
  }
}
