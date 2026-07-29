// tools/src/structure/semantic.rs
//
// Phase 3: via → dock consistency and rootDock presence.
// Scans src/**/*.js for dock()/page() without requiring docks under src/docks/.

use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::Arc;

use swc_common::SourceMap;
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
use swc_ecma_visit::{Visit, VisitWith};
use walkdir::WalkDir;

use super::defaults::Resolved;
use super::Report;

/// Synthetic / non-dock via targets that do not need a `dock()` registration.
const VIA_SKIP: &[&str] = &["body"];

/// Collect dock registry names and page `via` chains, then report mismatches.
pub fn check_via_docks(r: &Resolved, report: &mut Report) {
  let scan = scan_src(&r.src);
  let dock_names: HashSet<&str> = scan.docks.iter().map(|s| s.as_str()).collect();

  if dock_names.is_empty() {
    report.warn(
      "No dock(...) registrations found under src/ — pages that via a dock will fail at runtime",
    );
  } else {
    report.info(format!(
      "Found {} dock(...) registration(s): {}",
      dock_names.len(),
      {
        let mut names: Vec<_> = dock_names.iter().copied().collect();
        names.sort_unstable();
        names.join(", ")
      }
    ));
  }

  let root = r.root_dock.as_str();
  if !dock_names.contains(root) {
    report.warn(format!(
      "Root dock '{}' (anza.json rootDock / default) is not registered via dock('{}') — scaffold style dock() in app.js is fine; folder under src/docks/ is optional",
      root, root
    ));
  } else {
    report.info(format!("Root dock '{}' is registered", root));
  }

  let mut missing: HashMap<String, Vec<String>> = HashMap::new();
  for page in &scan.pages {
    for via_name in &page.via {
      if VIA_SKIP.contains(&via_name.as_str()) {
        continue;
      }
      if dock_names.contains(via_name.as_str()) {
        continue;
      }
      // Also accept via that matches a dock custom-element tag (dock-foo → foo already
      // covered by name; via 'dock-foo' when registry is 'foo').
      if dock_names.iter().any(|d| {
        scan
          .dock_tags
          .get(*d)
          .map(|t| t == via_name)
          .unwrap_or(false)
      }) {
        continue;
      }
      if let Some(stripped) = via_name.strip_prefix("dock-") {
        if dock_names.contains(stripped) {
          continue;
        }
      }
      missing
        .entry(via_name.clone())
        .or_default()
        .push(page.label.clone());
    }
  }

  for (via_name, pages) in missing {
    let mut pages = pages;
    pages.sort();
    pages.dedup();
    let sample: Vec<_> = pages.iter().take(5).cloned().collect();
    let more = if pages.len() > 5 {
      format!(" (+{} more)", pages.len() - 5)
    } else {
      String::new()
    };
    report.error(format!(
      "page via '{}' has no matching dock('{}') registration — referenced by {}{}",
      via_name,
      via_name,
      sample.join(", "),
      more
    ));
  }

  // Explicit container: on pages also needs a dock when set.
  for page in &scan.pages {
    if let Some(ref c) = page.container {
      if VIA_SKIP.contains(&c.as_str()) {
        continue;
      }
      if dock_names.contains(c.as_str()) {
        continue;
      }
      if let Some(stripped) = c.strip_prefix("dock-") {
        if dock_names.contains(stripped) {
          continue;
        }
      }
      report.error(format!(
        "page container '{}' has no matching dock('{}') — {}",
        c, c, page.label
      ));
    }
  }
}

#[derive(Debug, Default)]
struct Scan {
  docks: HashSet<String>,
  /// registry name → resolved tag
  dock_tags: HashMap<String, String>,
  pages: Vec<PageRef>,
}

#[derive(Debug)]
struct PageRef {
  label: String,
  via: Vec<String>,
  container: Option<String>,
}

fn scan_src(src: &Path) -> Scan {
  let mut scan = Scan::default();
  let cm = Arc::new(SourceMap::default());

  for entry in WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
    if !entry.file_type().is_file() {
      continue;
    }
    let path = entry.path();
    if path.extension().map_or(true, |e| e != "js" && e != "mjs") {
      continue;
    }
    let rel = path
      .strip_prefix(src)
      .unwrap_or(path)
      .to_string_lossy()
      .replace('\\', "/");
    parse_file(path, &rel, &cm, &mut scan);
  }
  scan
}

fn parse_file(path: &Path, rel: &str, cm: &Arc<SourceMap>, scan: &mut Scan) {
  let fm = match cm.load_file(path) {
    Ok(f) => f,
    Err(_) => return,
  };
  let lexer = Lexer::new(
    Syntax::Es(Default::default()),
    Default::default(),
    StringInput::from(&*fm),
    None,
  );
  let mut parser = Parser::new_from(lexer);
  let program = match parser.parse_program() {
    Ok(p) => p,
    Err(_) => return,
  };

  let mut visitor = Collector {
    rel: rel.to_string(),
    docks: Vec::new(),
    pages: Vec::new(),
  };
  program.visit_with(&mut visitor);

  for (name, tag) in visitor.docks {
    scan.dock_tags.insert(name.clone(), tag);
    scan.docks.insert(name);
  }
  for page in visitor.pages {
    scan.pages.push(page);
  }
}

struct Collector {
  rel: String,
  docks: Vec<(String, String)>,
  pages: Vec<PageRef>,
}

impl Visit for Collector {
  fn visit_call_expr(&mut self, call: &CallExpr) {
    if let Callee::Expr(expr) = &call.callee {
      if let Expr::Ident(ident) = &**expr {
        match ident.sym.as_ref() {
          "dock" => self.capture_dock(call),
          "page" => self.capture_page(call),
          _ => {}
        }
      }
    }
    call.visit_children_with(self);
  }
}

impl Collector {
  fn capture_dock(&mut self, call: &CallExpr) {
    if call.args.is_empty() {
      return;
    }
    let name = match str_lit(&call.args[0].expr) {
      Some(n) if !n.is_empty() => n,
      _ => return,
    };
    let mut tag = format!("dock-{}", name);
    if call.args.len() >= 2 {
      if let Expr::Object(obj) = &*call.args[1].expr {
        if let Some(t) = object_string(obj, "tag") {
          tag = t;
        }
      }
    }
    self.docks.push((name, tag));
  }

  fn capture_page(&mut self, call: &CallExpr) {
    if call.args.len() < 2 {
      return;
    }
    let route = str_lit(&call.args[0].expr).unwrap_or_else(|| "?".into());
    let mut via = Vec::new();
    let mut container = None;
    let mut tag = String::new();
    if let Expr::Object(obj) = &*call.args[1].expr {
      via = object_string_array(obj, "via");
      container = object_string(obj, "container");
      tag = object_string(obj, "tag").unwrap_or_default();
    }
    // Skip pages with neither via nor container — nothing to validate here.
    if via.is_empty() && container.is_none() {
      return;
    }
    let label = if tag.is_empty() {
      format!("{} ({})", self.rel, route)
    } else {
      format!("{} ({})", tag, route)
    };
    self.pages.push(PageRef {
      label,
      via,
      container,
    });
  }
}

fn str_lit(expr: &Expr) -> Option<String> {
  match expr {
    Expr::Lit(Lit::Str(s)) => s.value.as_str().map(|v| v.to_string()),
    _ => None,
  }
}

fn object_string(obj: &ObjectLit, key: &str) -> Option<String> {
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(id) = &kv.key {
          if id.sym == key {
            return str_lit(&kv.value);
          }
        }
      }
    }
  }
  None
}

fn object_string_array(obj: &ObjectLit, key: &str) -> Vec<String> {
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(id) = &kv.key {
          if id.sym == key {
            if let Expr::Array(arr) = &*kv.value {
              return arr
                .elems
                .iter()
                .flatten()
                .filter_map(|e| str_lit(&e.expr))
                .collect();
            }
          }
        }
      }
    }
  }
  Vec::new()
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;

  fn write(path: &std::path::Path, content: &str) {
    if let Some(parent) = path.parent() {
      fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
  }

  #[test]
  fn scan_finds_dock_in_app_and_via() {
    let dir = std::env::temp_dir().join(format!(
      "anza-sem-{}-{}",
      std::process::id(),
      std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos()
    ));
    let _ = fs::remove_dir_all(&dir);
    write(
      &dir.join("app.js"),
      "import { dock } from '@adukiorg/anza/ui';\ndock('main');\n",
    );
    write(
      &dir.join("pages/x.js"),
      "page('/', { tag: 'page-x', via: ['main', 'missing'] });\n",
    );
    let scan = scan_src(&dir);
    assert!(scan.docks.contains("main"));
    assert_eq!(scan.pages.len(), 1);
    assert!(scan.pages[0].via.contains(&"missing".into()));
    let _ = fs::remove_dir_all(&dir);
  }
}
