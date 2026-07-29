// tools/src/structure/mod.rs
//
// Project structure contract validation for `anza doctor` / `anza check`.

pub mod defaults;
pub mod manifest;
pub mod semantic;

use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};

use walkdir::WalkDir;

use defaults::{resolve, Resolved};
use manifest::normalize_scope;

pub use defaults::load_slots;
#[allow(unused_imports)]
pub use defaults::Slots;

/// Soft doctor vs strict CI check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
  /// Report errors + warns; exit non-zero only on errors.
  Doctor,
  /// Promote warns to failures; exit non-zero on errors or warns.
  Check,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
  Error,
  Warn,
  Info,
}

#[derive(Debug, Clone)]
pub struct Finding {
  pub level: Level,
  pub message: String,
}

#[derive(Debug, Default)]
pub struct Report {
  pub findings: Vec<Finding>,
}

/// Canonical structure contract doc — appended to doctor/check findings.
pub const DOC: &str = "docs/intro/structure.md";

fn with_doc(msg: &str) -> String {
  if msg.contains(DOC) {
    msg.to_string()
  } else {
    format!("{} — see {}", msg, DOC)
  }
}

impl Report {
  pub fn error(&mut self, msg: impl AsRef<str>) {
    self.findings.push(Finding {
      level: Level::Error,
      message: with_doc(msg.as_ref()),
    });
  }

  pub fn warn(&mut self, msg: impl AsRef<str>) {
    self.findings.push(Finding {
      level: Level::Warn,
      message: with_doc(msg.as_ref()),
    });
  }

  pub fn info(&mut self, msg: impl AsRef<str>) {
    self.findings.push(Finding {
      level: Level::Info,
      message: msg.as_ref().to_string(),
    });
  }

  pub fn error_count(&self) -> usize {
    self
      .findings
      .iter()
      .filter(|f| f.level == Level::Error)
      .count()
  }

  pub fn warn_count(&self) -> usize {
    self
      .findings
      .iter()
      .filter(|f| f.level == Level::Warn)
      .count()
  }

  /// Whether the process should exit non-zero for `mode`.
  pub fn failed(&self, mode: Mode) -> bool {
    if self.error_count() > 0 {
      return true;
    }
    matches!(mode, Mode::Check) && self.warn_count() > 0
  }

  pub fn print(&self) {
    for f in &self.findings {
      match f.level {
        Level::Error => logs::error!("{}", f.message),
        Level::Warn => logs::warn!("{}", f.message),
        Level::Info => logs::info!("{}", f.message),
      }
    }
  }
}

/// Run the structure contract against `project` / `src_hint`.
pub fn check(project: &Path, src_hint: &str, mode: Mode) -> Report {
  let mut report = Report::default();
  let resolved = resolve(project, src_hint);

  if resolved.manifest_present {
    report.info(format!(
      "Loaded anza.json (src={}, entry={})",
      resolved.src.strip_prefix(project).unwrap_or(&resolved.src).display(),
      resolved.entry
    ));
  } else {
    report.info("No anza.json — using convention defaults");
  }

  check_required(project, &resolved, &mut report);
  if !resolved.src.is_dir() {
    // Further checks need a source tree.
    return report;
  }

  check_shell(&resolved, &mut report);
  check_recommended(&resolved, &mut report);
  check_optional_slots(&resolved, &mut report);
  check_index_barrels(&resolved, &mut report);
  check_page_barrel_imports(&resolved, &mut report);
  check_sw(&resolved, &mut report);
  check_legacy(&resolved, &mut report);
  check_pages(&resolved, &mut report);
  semantic::check_via_docks(&resolved, &mut report);

  let _ = mode; // mode only affects exit via Report::failed
  report
}

/// Resolve project directory from a CLI `--src` path (cwd-relative or absolute).
pub fn project_from_src(src_arg: &Path) -> (PathBuf, String) {
  let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
  if src_arg.is_absolute() {
    let project = src_arg
      .parent()
      .map(|p| p.to_path_buf())
      .unwrap_or_else(|| cwd.clone());
    let hint = src_arg
      .file_name()
      .map(|s| s.to_string_lossy().to_string())
      .unwrap_or_else(|| "src".into());
    (project, hint)
  } else {
    // Treat as relative to cwd; project is cwd; hint is the path string.
    (cwd, src_arg.to_string_lossy().to_string())
  }
}

fn check_required(project: &Path, r: &Resolved, report: &mut Report) {
  let pkg = project.join("package.json");
  if !pkg.is_file() {
    report.error(format!(
      "Missing required package.json at {}",
      pkg.display()
    ));
  }

  if !r.src.is_dir() {
    report.error(format!(
      "Missing required source directory: {}",
      r.src.display()
    ));
    return;
  }

  if !r.shell_path().is_file() {
    report.error(format!(
      "Missing required shell: src/{} (expected {})",
      r.shell,
      r.shell_path().display()
    ));
  }

  // Entry: configured entry, or legacy index.js fallback for discovery only.
  let entry = r.entry_path();
  let legacy = r.src.join("index.js");
  if entry.is_file() {
    report.info(format!("Entry found: {}", entry.display()));
  } else if legacy.is_file() {
    report.warn(format!(
      "Configured entry src/{} missing; found legacy src/index.js — prefer app.js",
      r.entry
    ));
  } else {
    report.error(format!(
      "Missing required entry: src/{} (expected {})",
      r.entry,
      entry.display()
    ));
  }
}

fn check_shell(r: &Resolved, report: &mut Report) {
  let path = r.shell_path();
  if !path.is_file() {
    return;
  }
  let html = match std::fs::read_to_string(&path) {
    Ok(h) => h,
    Err(e) => {
      report.error(format!("Cannot read shell {}: {}", path.display(), e));
      return;
    }
  };

  let has_module = html.contains("type=\"module\"") || html.contains("type='module'");
  if !has_module {
    report.error(format!(
      "Shell {} has no <script type=\"module\"> entry",
      path.display()
    ));
  } else {
    // Prefer site-root /app.js (or configured entry).
    let entry_href = format!("/{}", r.entry.trim_start_matches('/'));
    if html.contains(&entry_href) || html.contains(&r.entry) {
      report.info(format!("Shell references module entry ({})", r.entry));
    } else {
      report.warn(format!(
        "Shell module script does not obviously reference /{} — use site-root asset URLs",
        r.entry
      ));
    }
  }

  if !html.contains("/tokens/") && !html.contains(&format!("/{}/", r.tokens)) {
    report.warn("Shell does not link /tokens/ stylesheets (recommended)");
  }
  if !html.contains("/styles/") && !html.contains(&format!("/{}/", r.styles)) {
    report.warn("Shell does not link /styles/ stylesheets (recommended)");
  }
}

fn check_recommended(r: &Resolved, report: &mut Report) {
  if !r.src.join(&r.tokens).is_dir() {
    report.warn(format!("Missing recommended src/{}/", r.tokens));
  }
  if !r.src.join(&r.styles).is_dir() {
    report.warn(format!("Missing recommended src/{}/", r.styles));
  }

  let importmap = r.project.join("importmap.json");
  if importmap.is_file() {
    report.info("importmap.json found");
  } else {
    report.warn("Missing recommended importmap.json (empty {{}} is fine)");
  }
}

fn check_optional_slots(r: &Resolved, report: &mut Report) {
  for (name, rel) in [
    ("docks", r.docks.as_str()),
    ("views", r.views.as_str()),
    ("parts", r.parts.as_str()),
  ] {
    let dir = r.src.join(rel);
    if dir.is_dir() {
      report.info(format!("Optional slot present: src/{}/ ({})", rel, name));
    }
  }
  for page_tree in &r.pages {
    let dir = r.src.join(page_tree);
    if dir.is_dir() {
      report.info(format!("Page tree present: src/{}/", page_tree));
    } else if page_tree == "pages" {
      report.warn("Recommended page tree src/pages/ is missing");
    }
  }
}

fn check_index_barrels(r: &Resolved, report: &mut Report) {
  let mut slots: Vec<String> = vec![r.docks.clone(), r.views.clone(), r.parts.clone()];
  slots.extend(r.pages.iter().cloned());
  let mut seen = HashSet::new();
  for rel in slots {
    if !seen.insert(rel.clone()) {
      continue;
    }
    let dir = r.src.join(&rel);
    if dir.is_dir() && !dir.join("index.js").is_file() {
      report.warn(format!(
        "src/{}/ is present but missing index.js barrel (index-per-folder convention)",
        rel
      ));
    }
  }
}

/// Ensure page module barrels import every child `page(...)` registration stub.
/// Missing imports break soft-nav and hard-refresh router matching even when
/// routes.json and SSG HTML exist.
fn check_page_barrel_imports(r: &Resolved, report: &mut Report) {
  for page_tree in &r.pages {
    let root = r.src.join(page_tree);
    if !root.is_dir() {
      continue;
    }
  for entry in WalkDir::new(&r.src.join(page_tree))
    .min_depth(1)
    .into_iter()
    .filter_map(|e| e.ok())
  {
    let path = entry.path();
    if !path.is_dir() {
      continue;
    }
    let barrel = path.join("index.js");
    if !barrel.is_file() {
      continue;
    }
    let rel_barrel = match barrel.strip_prefix(&r.src) {
      Ok(p) => p,
      Err(_) => continue,
    };
    let barrel_src = match std::fs::read_to_string(&barrel) {
      Ok(s) => s,
      Err(_) => continue,
    };

    for child in std::fs::read_dir(path).into_iter().flatten().flatten() {
      let child_path = child.path();
      if !child_path.is_dir() {
        continue;
      }
      let child_name = match child_path.file_name().and_then(|s| s.to_str()) {
        Some(s) => s,
        None => continue,
      };
      let child_module = child_path.join("index.js");
      if !child_module.is_file() {
        continue;
      }
      let child_src = match std::fs::read_to_string(&child_module) {
        Ok(s) => s,
        Err(_) => continue,
      };
      if !looks_like_page_call(&child_src) {
        continue;
      }
      let import_spec = format!("./{}/index.js", child_name);
      if !barrel_imports_module(&barrel_src, &import_spec) {
        report.error(format!(
          "src/{} is missing import '{}' — page soft-nav will 404 until the barrel imports every page module",
          rel_barrel.display(),
          import_spec
        ));
      }
    }
  }
  }
}

fn barrel_imports_module(barrel_src: &str, import_spec: &str) -> bool {
  let quoted = format!("'{}'", import_spec);
  let dquoted = format!("\"{}\"", import_spec);
  barrel_src.contains(&quoted) || barrel_src.contains(&dquoted)
}

fn check_sw(r: &Resolved, report: &mut Report) {
  if r.sw_explicit {
    let mut paths = HashSet::new();
    let mut scopes = HashMap::<String, String>::new();
    for entry in &r.sw {
      if !paths.insert(entry.path.clone()) {
        report.error(format!(
          "Duplicate sw path in anza.json: {}",
          entry.path
        ));
      }
      let file = r.src.join(&entry.path);
      if !file.is_file() {
        report.error(format!(
          "Declared sw path missing: src/{} (expected {})",
          entry.path,
          file.display()
        ));
      } else {
        report.info(format!("SW entry ok: src/{}", entry.path));
      }
      if let Some(ref scope) = entry.scope {
        let norm = normalize_scope(scope);
        if let Some(prev) = scopes.insert(norm.clone(), entry.path.clone()) {
          report.error(format!(
            "Duplicate sw scope '{}' for '{}' and '{}'",
            norm, prev, entry.path
          ));
        }
      }
    }
    // Overlapping default scopes when multiple entries omit scope.
    let omitted: Vec<_> = r
      .sw
      .iter()
      .filter(|e| e.scope.is_none())
      .map(|e| e.path.as_str())
      .collect();
    if omitted.len() > 1 {
      report.warn(format!(
        "Multiple sw entries without scope ({}) — default scopes may overlap; set explicit scope",
        omitted.join(", ")
      ));
    }
  } else {
    let default_sw = r.src.join("sw.js");
    if default_sw.is_file() {
      report.info("Default SW entry present: src/sw.js");
    } else {
      report.warn("Missing recommended src/sw.js (offline story)");
    }
  }

  let sw_modules = r.src.join("sw");
  if sw_modules.is_dir() {
    report.info(
      "src/sw/ present — shared SW modules only (not auto-registered workers)",
    );
  }
}

fn check_legacy(r: &Resolved, report: &mut Report) {
  let elements = r.src.join("elements");
  let pages = r.src.join("pages");
  // Also treat first declared page tree.
  let has_pages = pages.is_dir()
    || r
      .pages
      .iter()
      .any(|p| r.src.join(p).is_dir());
  if elements.is_dir() && has_pages {
    report.warn(
      "Both src/elements and page trees exist — migrate legacy ui.element definitions to page/dock/view/part",
    );
  }
  // Do NOT warn about missing src/core — library concern.
  if r.src.join("core").is_dir() {
    report.info(
      "src/core/ present (unusual for apps — usually a library concern)",
    );
  }
}

fn check_pages(r: &Resolved, report: &mut Report) {
  let page_files = find_page_files(&r.src);
  if page_files.is_empty() {
    report.error(
      "No page(...) registration found under src/ — at least one page is required",
    );
    return;
  }
  report.info(format!(
    "Found {} file(s) with page(...) registrations",
    page_files.len()
  ));

  let declared: HashSet<&str> = r.pages.iter().map(|s| s.as_str()).collect();
  let skip: HashSet<&str> = [
    r.docks.as_str(),
    r.views.as_str(),
    r.parts.as_str(),
    r.tokens.as_str(),
    r.styles.as_str(),
    "sw",
    "elements",
    "core",
  ]
  .into_iter()
  .collect();

  let mut undeclared: HashSet<String> = HashSet::new();
  for file in &page_files {
    let rel = match file.strip_prefix(&r.src) {
      Ok(rel) => rel,
      Err(_) => continue,
    };
    let first = match rel.components().next() {
      Some(Component::Normal(s)) => s.to_string_lossy().to_string(),
      _ => continue,
    };
    // Root-level modules (app.js co-located page) — ok.
    if rel.components().count() == 1 {
      continue;
    }
    if declared.contains(first.as_str()) || skip.contains(first.as_str()) {
      continue;
    }
    undeclared.insert(first);
  }
  for tree in undeclared {
    report.warn(format!(
      "page() found under src/{}/ which is not listed in anza.json pages[] — declare pages[] or import the tree from a barrel (see Troubleshooting)",
      tree
    ));
  }
}

/// Collect JS files under `src` that appear to call `page(`.
fn find_page_files(src: &Path) -> Vec<PathBuf> {
  let mut out = Vec::new();
  for entry in WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
    if !entry.file_type().is_file() {
      continue;
    }
    let path = entry.path();
    if path.extension().map_or(true, |e| e != "js" && e != "mjs") {
      continue;
    }
    if let Ok(content) = std::fs::read_to_string(path) {
      if looks_like_page_call(&content) {
        out.push(path.to_path_buf());
      }
    }
  }
  out
}

fn looks_like_page_call(src: &str) -> bool {
  // Prefer word-boundary style: page( after non-identifier.
  let bytes = src.as_bytes();
  let needle = b"page(";
  let mut i = 0;
  while i + needle.len() <= bytes.len() {
    if &bytes[i..i + needle.len()] == needle {
      let ok_before = i == 0 || !is_ident_byte(bytes[i - 1]);
      if ok_before {
        return true;
      }
    }
    i += 1;
  }
  false
}

fn is_ident_byte(b: u8) -> bool {
  b.is_ascii_alphanumeric() || b == b'_' || b == b'$'
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;

  fn temp(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
      "anza-struct-{}-{}-{}",
      name,
      std::process::id(),
      std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos()
    ));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
  }

  fn write(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
      fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
  }

  fn minimal_scaffold(project: &Path) {
    write(
      &project.join("package.json"),
      r#"{ "name": "t", "type": "module" }"#,
    );
    write(project.join("importmap.json").as_path(), "{}\n");
    let src = project.join("src");
    write(
      &src.join("index.html"),
      r#"<!DOCTYPE html><html><head>
<script type="importmap" src="/importmap.json"></script>
<link rel="stylesheet" href="/tokens/index.css" />
<link rel="stylesheet" href="/styles/index.css" />
<script type="module" src="/app.js"></script>
</head><body></body></html>"#,
    );
    write(
      &src.join("app.js"),
      r#"import './pages/index.js';
import { dock } from '@adukiorg/anza/ui';
dock('main');
"#,
    );
    write(&src.join("sw.js"), "// sw\n");
    write(
      &src.join("pages/index.js"),
      "import './entry/index.js';\n",
    );
    write(
      &src.join("pages/entry/index.js"),
      "import { page } from '@adukiorg/anza/ui';\npage('/', { tag: 'page-home', via: ['main'] });\n",
    );
    write(&src.join("docks/index.js"), "// docks\n");
    write(&src.join("views/index.js"), "// views\n");
    write(&src.join("parts/index.js"), "// parts\n");
    fs::create_dir_all(src.join("tokens")).unwrap();
    fs::create_dir_all(src.join("styles")).unwrap();
  }

  #[test]
  fn empty_src_fails_check() {
    let project = temp("empty");
    write(
      &project.join("package.json"),
      r#"{ "name": "t", "type": "module" }"#,
    );
    // no src/
    let report = check(&project, "src", Mode::Check);
    assert!(report.failed(Mode::Check));
    assert!(report.error_count() > 0);
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn good_scaffold_passes_check() {
    let project = temp("good");
    minimal_scaffold(&project);
    let report = check(&project, "src", Mode::Check);
    report.print();
    assert_eq!(report.error_count(), 0, "errors: {:?}", report.findings);
    assert!(!report.failed(Mode::Check), "warns: {:?}", report.findings);
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn missing_page_errors() {
    let project = temp("nopage");
    minimal_scaffold(&project);
    fs::remove_file(project.join("src/pages/entry/index.js")).unwrap();
    fs::write(project.join("src/pages/index.js"), "// empty barrel\n").unwrap();
    let report = check(&project, "src", Mode::Check);
    assert!(report.error_count() > 0);
    assert!(report
      .findings
      .iter()
      .any(|f| f.message.contains("No page(")));
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn docs_tree_with_pages_list_ok() {
    let project = temp("docs");
    minimal_scaffold(&project);
    write(
      &project.join("anza.json"),
      r#"{ "pages": ["pages", "docs"] }"#,
    );
    write(
      &project.join("src/docs/index.js"),
      "import './intro/index.js';\n",
    );
    write(
      &project.join("src/docs/intro/index.js"),
      "import { page } from '@adukiorg/anza/ui';\npage('/docs', { tag: 'page-docs' });\n",
    );
    let report = check(&project, "src", Mode::Check);
    assert_eq!(report.error_count(), 0);
    assert!(
      !report
        .findings
        .iter()
        .any(|f| f.message.contains("not listed in anza.json")),
      "should not warn for declared docs tree"
    );
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn undeclared_docs_warns() {
    let project = temp("undecl");
    minimal_scaffold(&project);
    write(
      &project.join("src/docs/index.js"),
      "import './intro/index.js';\n",
    );
    write(
      &project.join("src/docs/intro/index.js"),
      "import { page } from '@adukiorg/anza/ui';\npage('/docs', { tag: 'page-docs' });\n",
    );
    let report = check(&project, "src", Mode::Doctor);
    assert_eq!(report.error_count(), 0);
    assert!(report
      .findings
      .iter()
      .any(|f| f.level == Level::Warn && f.message.contains("src/docs/")));
    // Check promotes warns
    assert!(report.failed(Mode::Check));
    assert!(!report.failed(Mode::Doctor));
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn legacy_elements_warns() {
    let project = temp("legacy");
    minimal_scaffold(&project);
    fs::create_dir_all(project.join("src/elements")).unwrap();
    let report = check(&project, "src", Mode::Doctor);
    assert!(report
      .findings
      .iter()
      .any(|f| f.message.contains("src/elements")));
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn sw_string_and_array() {
    let project = temp("sw");
    minimal_scaffold(&project);
    write(
      &project.join("anza.json"),
      r#"{ "sw": "sw.js" }"#,
    );
    let report = check(&project, "src", Mode::Check);
    assert_eq!(report.error_count(), 0);

    write(
      &project.join("anza.json"),
      r#"{ "sw": ["sw.js", { "path": "admin/sw.js", "scope": "/admin/" }] }"#,
    );
    write(&project.join("src/admin/sw.js"), "// admin sw\n");
    let report = check(&project, "src", Mode::Check);
    assert_eq!(report.error_count(), 0, "{:?}", report.findings);

    // Missing declared path
    write(
      &project.join("anza.json"),
      r#"{ "sw": ["sw.js", "missing.js"] }"#,
    );
    let report = check(&project, "src", Mode::Check);
    assert!(report.error_count() > 0);
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn duplicate_sw_scope_errors() {
    let project = temp("dupscope");
    minimal_scaffold(&project);
    write(&project.join("src/admin/sw.js"), "// a\n");
    write(
      &project.join("anza.json"),
      r#"{ "sw": [
        { "path": "sw.js", "scope": "/admin/" },
        { "path": "admin/sw.js", "scope": "/admin" }
      ] }"#,
    );
    let report = check(&project, "src", Mode::Check);
    assert!(report
      .findings
      .iter()
      .any(|f| f.level == Level::Error && f.message.contains("Duplicate sw scope")));
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn missing_index_barrel_warns() {
    let project = temp("nobarrel");
    minimal_scaffold(&project);
    fs::remove_file(project.join("src/views/index.js")).unwrap();
    let report = check(&project, "src", Mode::Doctor);
    assert!(report
      .findings
      .iter()
      .any(|f| f.message.contains("views") && f.message.contains("index.js")));
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn no_core_required_warn() {
    let project = temp("nocore");
    minimal_scaffold(&project);
    let report = check(&project, "src", Mode::Doctor);
    assert!(
      !report
        .findings
        .iter()
        .any(|f| f.message.contains("src/core") && f.level == Level::Warn),
      "must not warn about missing src/core"
    );
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn mis_via_fails_check() {
    let project = temp("misvia");
    minimal_scaffold(&project);
    write(
      &project.join("src/pages/entry/index.js"),
      "import { page } from '@adukiorg/anza/ui';\npage('/', { tag: 'page-home', via: ['main', 'nope'] });\n",
    );
    let report = check(&project, "src", Mode::Check);
    assert!(
      report
        .findings
        .iter()
        .any(|f| f.level == Level::Error && f.message.contains("via 'nope'")),
      "findings: {:?}",
      report.findings
    );
    assert!(report.failed(Mode::Check));
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn bare_dock_in_app_js_passes() {
    let project = temp("baredock");
    minimal_scaffold(&project);
    // No dock modules under src/docks/ — only dock('main') in app.js (scaffold style).
    write(&project.join("src/docks/index.js"), "// empty barrel\n");
    let report = check(&project, "src", Mode::Check);
    assert_eq!(report.error_count(), 0, "{:?}", report.findings);
    assert!(
      report
        .findings
        .iter()
        .any(|f| f.message.contains("Root dock 'main' is registered")),
      "{:?}",
      report.findings
    );
    assert!(!report.failed(Mode::Check), "{:?}", report.findings);
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn missing_root_dock_warns() {
    let project = temp("norooot");
    minimal_scaffold(&project);
    write(
      &project.join("src/app.js"),
      "import './pages/index.js';\n// no dock('main')\n",
    );
    // Page still vias main — also errors on via
    let report = check(&project, "src", Mode::Doctor);
    assert!(
      report
        .findings
        .iter()
        .any(|f| f.level == Level::Warn && f.message.contains("Root dock 'main'")),
      "{:?}",
      report.findings
    );
    assert!(
      report
        .findings
        .iter()
        .any(|f| f.level == Level::Error && f.message.contains("via 'main'")),
      "{:?}",
      report.findings
    );
    let _ = fs::remove_dir_all(&project);
  }

  #[test]
  fn findings_link_structure_doc() {
    let project = temp("doclink");
    minimal_scaffold(&project);
    write(
      &project.join("src/pages/entry/index.js"),
      "import { page } from '@adukiorg/anza/ui';\npage('/', { tag: 'page-home', via: ['nope'] });\n",
    );
    let report = check(&project, "src", Mode::Check);
    assert!(
      report
        .findings
        .iter()
        .filter(|f| f.level == Level::Error || f.level == Level::Warn)
        .all(|f| f.message.contains(DOC)),
      "every error/warn should link {}: {:?}",
      DOC,
      report.findings
    );
    let _ = fs::remove_dir_all(&project);
  }
}
