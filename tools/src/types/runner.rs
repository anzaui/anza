// tools/src/types/runner.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ChangeKind {
  Css,
  Js,
  Html,
  Reload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HmrMessage {
  pub kind: ChangeKind,
  pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PropConfig {
  pub prop_type: String,
  pub reflect: bool,
  pub state: bool,
  pub default: Option<String>,
}

/// A single entry in the `params: [...]` array declared on a page/dock.
/// `cast` is either "string" (default, identity) or "number" (Number() at runtime).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ParamDecl {
  pub name: String,
  /// "string" | "number"
  pub cast: String,
}

/// A single entry in the `query: [...]` array declared on a page/dock.
/// `cast` is either "string" (default) or "number".
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct QueryDecl {
  pub name: String,
  /// "string" | "number"
  pub cast: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedSpec {
  pub tag: String,
  /// Definition kind: "page" | "dock" | "view" | "part" | "element" | "container".
  pub kind: String,
  pub props: std::collections::HashMap<String, PropConfig>,
  pub methods: Vec<String>,
  /// Single-route (legacy). For new multi-route pages this will be the first entry.
  pub url: Option<String>,
  /// All route patterns registered by this component. Supersedes `url` for
  /// multi-route pages (e.g. `page(['/blog', '/blog/:slug'], ...)`).
  pub routes: Vec<String>,
  pub container: Option<String>,
  /// Ordered container chain (root-to-leaf) declared by a `page` via `via`.
  pub via: Vec<String>,
  /// Parent dock name declared by a `dock`.
  pub parent: Option<String>,
  pub meta: std::collections::HashMap<String, String>,
  pub file: Option<String>,
  pub html: Option<String>,
  #[serde(default)]
  pub css: Vec<String>,
  /// Declared path parameter bindings (`params: [{ name, type }]`).
  pub params: Vec<ParamDecl>,
  /// Declared query parameter bindings (`query: [{ name, type }]`).
  pub query_params: Vec<QueryDecl>,
}
