// tools/src/build/order.rs
//
// Rewrites static ESM import / export-from declarations into usage order so
// developers may import in any order while dist/ modules evaluate library →
// docks → views → parts → pages → other. Preserves statement text and ESM
// semantics (no bundling, no dynamic-import conversion).

use std::path::{Component, Path, PathBuf};

use std::sync::Arc;

use swc_common::{SourceMap, Span};
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};

/// Evaluation priority for a module request (lower runs first).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Tier {
  Library = 0,
  Dock = 1,
  View = 2,
  Part = 3,
  Page = 4,
  Other = 5,
}

/// Default slot directory names relative to `src/` when no remaps are provided.
const DEFAULT_DOCKS: &str = "docks";
const DEFAULT_VIEWS: &str = "views";
const DEFAULT_PARTS: &str = "parts";
const DEFAULT_PAGE_TREES: &[&str] = &["pages", "docs"];

/// Slot remaps for classification (from anza.json or defaults).
#[derive(Debug, Clone)]
pub struct Slots {
  pub docks: String,
  pub views: String,
  pub parts: String,
  pub pages: Vec<String>,
}

impl Default for Slots {
  fn default() -> Self {
    Self {
      docks: DEFAULT_DOCKS.into(),
      views: DEFAULT_VIEWS.into(),
      parts: DEFAULT_PARTS.into(),
      pages: DEFAULT_PAGE_TREES.iter().map(|s| (*s).to_string()).collect(),
    }
  }
}

impl From<&crate::structure::defaults::Slots> for Slots {
  fn from(s: &crate::structure::defaults::Slots) -> Self {
    Self {
      docks: s.docks.clone(),
      views: s.views.clone(),
      parts: s.parts.clone(),
      pages: s.pages.clone(),
    }
  }
}

/// Rewrite `source` so static import / export-from decls appear at the top of
/// the module in usage order. Returns the original string unchanged when parse
/// fails or ordering is already correct and imports are already leading.
/// Uses remapped slot directory names from `anza.json` when `slots` is set.
pub fn rewrite_with(source: &str, file: &Path, src_root: &Path, slots: &Slots) -> String {
  let cm = Arc::new(SourceMap::default());
  let fm = cm.new_source_file(
    swc_common::FileName::Real(file.to_path_buf()).into(),
    source.to_string(),
  );

  let lexer = Lexer::new(
    Syntax::Es(Default::default()),
    Default::default(),
    StringInput::from(&*fm),
    None,
  );
  let mut parser = Parser::new_from(lexer);
  let program = match parser.parse_program() {
    Ok(Program::Module(m)) => m,
    _ => return source.to_string(),
  };

  let file_start = fm.start_pos.0;
  let importer_dir = file.parent().unwrap_or(file);

  let mut items: Vec<ImportItem> = Vec::new();
  for (idx, item) in program.body.iter().enumerate() {
    if let Some((span, spec)) = module_request(item) {
      let text = slice(source, file_start, span);
      if text.is_empty() {
        continue;
      }
      let tier = classify_with(&spec, importer_dir, src_root, slots);
      items.push(ImportItem {
        idx,
        span,
        text: text.to_string(),
        tier,
        spec,
      });
    }
  }

  if items.is_empty() {
    return source.to_string();
  }

  let mut sorted = items.clone();
  sorted.sort_by(|a, b| a.tier.cmp(&b.tier).then(a.idx.cmp(&b.idx)));

  let already_ordered = items.iter().map(|i| i.idx).eq(sorted.iter().map(|i| i.idx));
  let leading = imports_are_leading(&program.body);
  if already_ordered && leading {
    return source.to_string();
  }

  // Remove import/export-from spans (descending) then prepend sorted block.
  let mut ranges: Vec<(usize, usize)> = items
    .iter()
    .map(|i| byte_range(source, file_start, i.span))
    .collect();
  ranges.sort_by(|a, b| b.0.cmp(&a.0));

  let mut body = source.to_string();
  for (start, end) in ranges {
    let mut end = end;
    // Eat a following newline so we do not leave blank holes mid-file.
    if end < body.len() && body.as_bytes()[end] == b'\n' {
      end += 1;
    } else if end + 1 < body.len() && &body[end..end + 2] == "\r\n" {
      end += 2;
    }
    if start <= body.len() && end <= body.len() && start <= end {
      body.replace_range(start..end, "");
    }
  }

  let mut block = String::new();
  for item in &sorted {
    block.push_str(item.text.trim_end());
    block.push('\n');
  }
  block.push('\n');

  let insert_at = skip_leading_comments(&body);
  body.insert_str(insert_at, &block);
  body
}

/// Classify a specifier into a usage tier relative to `src_root` (default slots).
#[allow(dead_code)]
pub fn classify(spec: &str, importer_dir: &Path, src_root: &Path) -> Tier {
  classify_with(spec, importer_dir, src_root, &Slots::default())
}

/// Classify using remapped slot directory names from `anza.json`.
pub fn classify_with(spec: &str, importer_dir: &Path, src_root: &Path, slots: &Slots) -> Tier {
  if is_external(spec) {
    return Tier::Other;
  }
  if is_bare(spec) {
    return Tier::Library;
  }

  let resolved = resolve_rel(importer_dir, spec);
  let rel = match strip_src(&resolved, src_root) {
    Some(r) => r,
    None => return Tier::Other,
  };

  let mut comps = rel.components();
  let first = match comps.next() {
    Some(Component::Normal(s)) => s.to_string_lossy().to_string(),
    _ => return Tier::Other,
  };

  if first == slots.docks {
    Tier::Dock
  } else if first == slots.views {
    Tier::View
  } else if first == slots.parts {
    Tier::Part
  } else if slots.pages.iter().any(|p| p == &first) {
    Tier::Page
  } else {
    Tier::Other
  }
}

/// Stable sort key used by tests and callers.
#[allow(dead_code)]
pub fn sort_specs(specs: &[(String, Tier)]) -> Vec<String> {
  let mut indexed: Vec<(usize, &str, Tier)> = specs
    .iter()
    .enumerate()
    .map(|(i, (s, t))| (i, s.as_str(), *t))
    .collect();
  indexed.sort_by(|a, b| a.2.cmp(&b.2).then(a.0.cmp(&b.0)));
  indexed.into_iter().map(|(_, s, _)| s.to_string()).collect()
}

#[derive(Clone)]
struct ImportItem {
  idx: usize,
  span: Span,
  text: String,
  tier: Tier,
  #[allow(dead_code)]
  spec: String,
}

fn module_request(item: &ModuleItem) -> Option<(Span, String)> {
  match item {
    ModuleItem::ModuleDecl(ModuleDecl::Import(n)) => {
      str_value(&n.src).map(|s| (n.span, s))
    }
    ModuleItem::ModuleDecl(ModuleDecl::ExportAll(n)) => {
      str_value(&n.src).map(|s| (n.span, s))
    }
    ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(n)) => {
      n.src.as_ref().and_then(|src| str_value(src).map(|s| (n.span, s)))
    }
    _ => None,
  }
}

fn imports_are_leading(body: &[ModuleItem]) -> bool {
  let mut seen_stmt = false;
  for item in body {
    let is_request = matches!(
      item,
      ModuleItem::ModuleDecl(ModuleDecl::Import(_))
        | ModuleItem::ModuleDecl(ModuleDecl::ExportAll(_))
    ) || matches!(
      item,
      ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(n)) if n.src.is_some()
    );
    if is_request {
      if seen_stmt {
        return false;
      }
    } else {
      seen_stmt = true;
    }
  }
  true
}

fn slice<'a>(source: &'a str, file_start: u32, span: Span) -> &'a str {
  let (start, end) = byte_range(source, file_start, span);
  if start <= end && end <= source.len() {
    &source[start..end]
  } else {
    ""
  }
}

fn byte_range(source: &str, file_start: u32, span: Span) -> (usize, usize) {
  let start = (span.lo.0.saturating_sub(file_start)) as usize;
  let end = (span.hi.0.saturating_sub(file_start)) as usize;
  let start = start.min(source.len());
  let end = end.min(source.len()).max(start);
  (start, end)
}

fn skip_leading_comments(source: &str) -> usize {
  let bytes = source.as_bytes();
  let mut i = 0;
  while i < bytes.len() {
    while i < bytes.len() && (bytes[i] == b' ' || bytes[i] == b'\t' || bytes[i] == b'\n' || bytes[i] == b'\r') {
      i += 1;
    }
    if i + 1 < bytes.len() && bytes[i] == b'/' && bytes[i + 1] == b'/' {
      i += 2;
      while i < bytes.len() && bytes[i] != b'\n' {
        i += 1;
      }
      continue;
    }
    if i + 1 < bytes.len() && bytes[i] == b'/' && bytes[i + 1] == b'*' {
      i += 2;
      while i + 1 < bytes.len() && !(bytes[i] == b'*' && bytes[i + 1] == b'/') {
        i += 1;
      }
      if i + 1 < bytes.len() {
        i += 2;
      }
      continue;
    }
    break;
  }
  i
}

fn str_value(s: &Str) -> Option<String> {
  s.value.as_str().map(|v| v.to_string())
}

fn is_bare(spec: &str) -> bool {
  !spec.starts_with("./")
    && !spec.starts_with("../")
    && !spec.starts_with('/')
    && !spec.starts_with("http://")
    && !spec.starts_with("https://")
    && !spec.starts_with("data:")
}

fn is_external(spec: &str) -> bool {
  spec.starts_with("http://") || spec.starts_with("https://") || spec.starts_with("data:")
}

fn resolve_rel(importer_dir: &Path, spec: &str) -> PathBuf {
  let joined = if spec.starts_with('/') {
    // Site-root absolute: treat as under project; caller passes src_root parent typically.
    PathBuf::from(spec.trim_start_matches('/'))
  } else {
    importer_dir.join(spec)
  };
  normalize(&joined)
}

fn strip_src<'a>(resolved: &'a Path, src_root: &Path) -> Option<PathBuf> {
  let src = normalize(src_root);
  let res = normalize(resolved);
  if let Ok(rel) = res.strip_prefix(&src) {
    return Some(rel.to_path_buf());
  }
  // When paths are not absolute / not under src, match by suffix segments.
  let src_name = src.file_name().map(|s| s.to_string_lossy().to_string());
  let comps: Vec<_> = res.components().collect();
  if let Some(name) = src_name {
    let needle = std::ffi::OsStr::new(name.as_str());
    if let Some(pos) = comps
      .iter()
      .position(|c| matches!(c, Component::Normal(s) if *s == needle))
    {
      let after: PathBuf = comps[pos + 1..].iter().map(|c| c.as_os_str()).collect();
      if !after.as_os_str().is_empty() {
        return Some(after);
      }
    }
  }
  Some(res)
}

fn normalize(path: &Path) -> PathBuf {
  let mut out = PathBuf::new();
  for comp in path.components() {
    match comp {
      Component::ParentDir => {
        out.pop();
      }
      Component::CurDir => {}
      other => out.push(other.as_os_str()),
    }
  }
  out
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::path::PathBuf;

  fn src() -> PathBuf {
    PathBuf::from("/app/src")
  }

  #[test]
  fn classify_slots() {
    let importer = PathBuf::from("/app/src");
    assert_eq!(
      classify("@anzaui/anza/ui", &importer, &src()),
      Tier::Library
    );
    assert_eq!(
      classify("./docks/index.js", &importer, &src()),
      Tier::Dock
    );
    assert_eq!(
      classify("./views/code/index.js", &importer, &src()),
      Tier::View
    );
    assert_eq!(
      classify("./parts/button.js", &importer, &src()),
      Tier::Part
    );
    assert_eq!(
      classify("./pages/index.js", &importer, &src()),
      Tier::Page
    );
    assert_eq!(
      classify("./docs/index.js", &importer, &src()),
      Tier::Page
    );
    assert_eq!(
      classify("./utils/help.js", &importer, &src()),
      Tier::Other
    );
  }

  #[test]
  fn classify_respects_remapped_slots() {
    let importer = PathBuf::from("/app/src");
    let slots = Slots {
      docks: "shells".into(),
      views: "components".into(),
      parts: "atoms".into(),
      pages: vec!["routes".into()],
    };
    assert_eq!(
      classify_with("./shells/main.js", &importer, &src(), &slots),
      Tier::Dock
    );
    assert_eq!(
      classify_with("./components/x.js", &importer, &src(), &slots),
      Tier::View
    );
    assert_eq!(
      classify_with("./routes/home.js", &importer, &src(), &slots),
      Tier::Page
    );
    // Default docks path is Other when remapped away
    assert_eq!(
      classify_with("./docks/main.js", &importer, &src(), &slots),
      Tier::Other
    );
  }

  #[test]
  fn sort_pages_before_docks_becomes_docks_first() {
    let specs = vec![
      ("./pages/index.js".into(), Tier::Page),
      ("./docks/index.js".into(), Tier::Dock),
      ("@anzaui/anza/ui".into(), Tier::Library),
    ];
    assert_eq!(
      sort_specs(&specs),
      vec![
        "@anzaui/anza/ui",
        "./docks/index.js",
        "./pages/index.js",
      ]
    );
  }

  #[test]
  fn rewrite_reorders_and_hoists() {
    let file = PathBuf::from("/app/src/app.js");
    let source = r#"/**
 * entry
 */
import './pages/index.js';
import '@anzaui/anza/ui';
import './docks/index.js';

dock('main');
"#;
    let out = rewrite_with(source, &file, &src(), &Slots::default());
    let page = out.find("import './pages/index.js';").expect("pages");
    let dock = out.find("import './docks/index.js';").expect("docks");
    let lib = out.find("import '@anzaui/anza/ui';").expect("lib");
    let body = out.find("dock('main')").expect("body");
    assert!(lib < dock, "library before docks");
    assert!(dock < page, "docks before pages");
    assert!(page < body, "imports before body");
  }

  #[test]
  fn rewrite_mid_file_import_hoisted() {
    let file = PathBuf::from("/app/src/app.js");
    let source = r#"import '@anzaui/anza/ui';
import { dock } from '@anzaui/anza/ui';

dock('main');

import './pages/index.js';
"#;
    let out = rewrite_with(source, &file, &src(), &Slots::default());
    let page = out.find("import './pages/index.js';").expect("pages");
    let body = out.find("dock('main')").expect("body");
    assert!(page < body, "late import must hoist before body");
    // Only one pages import
    assert_eq!(out.matches("import './pages/index.js';").count(), 1);
  }

  #[test]
  fn rewrite_idempotent_when_ordered() {
    let file = PathBuf::from("/app/src/app.js");
    let source = r#"import '@anzaui/anza/ui';
import './docks/index.js';
import './pages/index.js';

dock('main');
"#;
    let once = rewrite_with(source, &file, &src(), &Slots::default());
    let twice = rewrite_with(&once, &file, &src(), &Slots::default());
    assert_eq!(once, twice);
  }

  #[test]
  fn rewrite_preserves_export_from() {
    let file = PathBuf::from("/app/src/pages/index.js");
    let source = r#"export { x } from './entry/index.js';
import './other/index.js';
"#;
    let out = rewrite_with(source, &file, &src(), &Slots::default());
    assert!(out.contains("export { x } from './entry/index.js';"));
    assert!(out.contains("import './other/index.js';"));
  }
}
