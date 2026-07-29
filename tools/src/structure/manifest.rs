// tools/src/structure/manifest.rs
//
// Optional anza.json — remaps structure slots and declares SW entries.

use serde::Deserialize;

/// Raw manifest as deserialized from anza.json (all keys optional).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnzaManifest {
  #[serde(rename = "$schema")]
  #[allow(dead_code)]
  pub schema: Option<String>,
  pub src: Option<String>,
  pub entry: Option<String>,
  pub shell: Option<String>,
  pub root_dock: Option<String>,
  pub pages: Option<Vec<String>>,
  pub docks: Option<String>,
  pub views: Option<String>,
  pub parts: Option<String>,
  pub tokens: Option<String>,
  pub styles: Option<String>,
  pub sw: Option<SwField>,
}

/// `sw` accepts a string or an array of strings / `{ path, scope? }`.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum SwField {
  One(String),
  Many(Vec<SwItem>),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum SwItem {
  Path(String),
  Obj {
    path: String,
    #[serde(default)]
    scope: Option<String>,
  },
}

/// Normalized SW registration entry.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SwEntry {
  pub path: String,
  pub scope: Option<String>,
}

impl SwField {
  pub fn normalize(&self) -> Vec<SwEntry> {
    match self {
      SwField::One(p) => vec![SwEntry {
        path: p.clone(),
        scope: None,
      }],
      SwField::Many(items) => items
        .iter()
        .map(|item| match item {
          SwItem::Path(p) => SwEntry {
            path: p.clone(),
            scope: None,
          },
          SwItem::Obj { path, scope } => SwEntry {
            path: path.clone(),
            scope: scope.clone(),
          },
        })
        .collect(),
    }
  }
}

/// Normalize a registration scope for duplicate detection (trailing `/`).
pub fn normalize_scope(scope: &str) -> String {
  let mut s = scope.trim().to_string();
  if s.is_empty() {
    return s;
  }
  if !s.starts_with('/') {
    s.insert(0, '/');
  }
  if !s.ends_with('/') {
    s.push('/');
  }
  s
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_string_sw() {
    let m: AnzaManifest = serde_json::from_str(r#"{ "sw": "sw.js" }"#).unwrap();
    let entries = m.sw.unwrap().normalize();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].path, "sw.js");
    assert!(entries[0].scope.is_none());
  }

  #[test]
  fn parses_array_sw() {
    let m: AnzaManifest = serde_json::from_str(
      r#"{ "sw": ["sw.js", { "path": "admin/sw.js", "scope": "/admin/" }] }"#,
    )
    .unwrap();
    let entries = m.sw.unwrap().normalize();
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[1].path, "admin/sw.js");
    assert_eq!(entries[1].scope.as_deref(), Some("/admin/"));
  }

  #[test]
  fn normalize_scope_slash() {
    assert_eq!(normalize_scope("admin"), "/admin/");
    assert_eq!(normalize_scope("/admin/"), "/admin/");
  }
}
