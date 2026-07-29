// tools/src/build/graph.rs
//
// Import-graph resolution orchestrator. Walks the ESM import graph from entry
// points and copies only the reachable files into dist, preserving a
// browser-native folder structure. Reports diagnostics for missing imports,
// syntax errors, and unsupported prop types. No bundling.

use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;

use swc_common::{SourceMap, Span};

/// Severity of a build diagnostic.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
  Parse,
  Import,
  Type,
}

#[derive(Debug, Clone)]
pub struct Diagnostic {
  pub kind: Kind,
  pub file: PathBuf,
  pub line: usize,
  pub col: usize,
  pub message: String,
}

/// Result of a successful resolution pass.
#[derive(Debug, Default)]
pub struct Report {
  pub copied: usize,
  pub modules: usize,
  pub warnings: Vec<Diagnostic>,
  #[allow(dead_code)]
  pub importmap: HashMap<String, String>,
}

/// What a specifier resolved to.
pub enum Resolution {
  /// A local file inside the project (path, was-extensionless).
  File(PathBuf, bool),
  /// An external (http/https) target — skipped, never copied.
  External,
  /// Could not be resolved — an error.
  Missing,
}

/// Asset extensions that are referenced as string literals (not ESM imports)
/// and must still be copied so components work at runtime.
const ASSET_EXT: &[&str] = &[
  "css", "html", "json", "svg", "png", "jpg", "jpeg", "webp", "gif", "ico", "woff", "woff2", "ttf",
  "otf",
];

/// Resolve the import graph from `entries` and copy reachable files into `dist`.
///
/// Returns `Ok(Report)` when no error-level diagnostics were produced.
/// Returns `Err(Vec<Diagnostic>)` listing every error otherwise. Warnings are
/// carried inside the report.
pub fn resolve(
  src: &Path,
  dist: &Path,
  entries: &[PathBuf],
  dev: bool,
) -> Result<Report, Vec<Diagnostic>> {
  let src = std::fs::canonicalize(src).unwrap_or_else(|_| src.to_path_buf());
  let dist = std::fs::canonicalize(dist).unwrap_or_else(|_| dist.to_path_buf());
  let src = &src;
  let dist = &dist;

  let project = src
    .parent()
    .map(|p| {
      if p.as_os_str().is_empty() {
        PathBuf::from(".")
      } else {
        p.to_path_buf()
      }
    })
    .unwrap_or_else(|| PathBuf::from("."));
  let project = std::fs::canonicalize(&project).unwrap_or(project);

  let lib_dir = super::resolve::library(&project);
  let lib_src = lib_dir.as_ref().map(|d| d.join("src"));
  let lib_map = lib_dir.as_ref().map(|d| super::resolve::load_map(d)).unwrap_or_default();
  let user_map = super::resolve::load_map(&project);
  let order_slots: super::order::Slots =
    (&crate::structure::load_slots(&project)).into();

  // Load build cache for incremental rebuilds.
  let mut cache = super::cache::load(&project);
  // Bump when emit transforms change (e.g. import-order rewrite) so caches rebuild.
  let version = "1.0.2";

  // Invalidate cache if version or mode mismatch.
  if let Some(ref c) = cache {
    if c.version != version || c.dev != dev {
      cache = None;
    }
  }

  let cm = Arc::new(SourceMap::default());

  let roots = super::entries::collect(src, entries);
  if roots.is_empty() {
    return Err(vec![Diagnostic {
      kind: Kind::Import,
      file: src.to_path_buf(),
      line: 0,
      col: 0,
      message: "no entry points found (expected src/index.js or *.html with a module script)"
        .into(),
    }]);
  }

  let mut errors: Vec<Diagnostic> = Vec::new();
  let mut warnings: Vec<Diagnostic> = Vec::new();

  // Reachable file set (absolute, normalized paths under the project).
  let mut reached: HashSet<PathBuf> = HashSet::new();
  // Queue of JS modules still to parse.
  let mut queue: VecDeque<PathBuf> = VecDeque::new();

  for root in &roots {
    if root.exists() {
      let norm = normalize(root);
      if reached.insert(norm.clone()) {
        if is_js(&norm) {
          queue.push_back(norm);
        }
      }
    } else {
      errors.push(Diagnostic {
        kind: Kind::Import,
        file: root.clone(),
        line: 0,
        col: 0,
        message: format!("entry point does not exist: {}", root.display()),
      });
    }
  }

  let mut modules = 0usize;
  let mut hashes: HashMap<PathBuf, String> = HashMap::new();
  let mut importmap: HashMap<String, String> = HashMap::new();

  while let Some(module) = queue.pop_front() {
    if let Some(hash) = super::cache::hash(&module) {
      hashes.insert(module.clone(), hash);
    }

    modules += 1;
    let parsed = match super::parse::parse(&module, &cm) {
      Ok(p) => p,
      Err(diag) => {
        errors.push(diag);
        continue;
      }
    };

    // Validate dock() definitions for naming ambiguities
    let dock_diagnostics = super::transform::validate(&module, &parsed.ast);
    for diag in dock_diagnostics {
      warnings.push(diag);
    }

    let importer = module.parent().map(|p| p.to_path_buf()).unwrap_or_default();

    // 1. ESM import specifiers -> walked as modules (if JS) or copied (assets).
    for (spec, span) in &parsed.imports {
      match super::resolve::spec(
        spec,
        &importer,
        src,
        &project,
        &user_map,
        &lib_map,
        &lib_src,
      ) {
        Resolution::External => {}
        Resolution::File(path, extless) => {
          let norm = normalize(&path);
          if extless {
            let (l, c) = pos(&cm, *span);
            warnings.push(Diagnostic {
              kind: Kind::Import,
              file: module.clone(),
              line: l,
              col: c,
              message: format!(
                "extensionless import '{}' — browsers need explicit extensions",
                spec
              ),
            });
          }

          if user_map.contains_key(spec) {
            if let Some(target) = user_map.get(spec) {
              importmap.insert(spec.clone(), target.clone());
            }
          } else if lib_map.contains_key(spec) {
            if let Some(target) = lib_map.get(spec) {
              importmap.insert(spec.clone(), target.clone());
            }
          }

          if reached.insert(norm.clone()) && is_js(&norm) {
            queue.push_back(norm);
          }
        }
        Resolution::Missing => {
          let (l, c) = pos(&cm, *span);
          errors.push(Diagnostic {
            kind: Kind::Import,
            file: module.clone(),
            line: l,
            col: c,
            message: format!("unresolved import '{}'", spec),
          });
        }
      }
    }

    // 2. Asset string literals (template/style and other relative assets).
    for (asset, span) in &parsed.assets {
      match super::resolve::spec(
        asset,
        &importer,
        src,
        &project,
        &user_map,
        &lib_map,
        &lib_src,
      ) {
        Resolution::File(path, _extless) => {
          let norm = normalize(&path);
          reached.insert(norm.clone());
          if norm.extension().map_or(false, |e| e == "html") {
            let mut tags = norm.clone();
            tags.set_extension("tags.json");
            if tags.exists() {
              reached.insert(normalize(&tags));
            }
          }
        }
        Resolution::Missing => {
          let (l, c) = pos(&cm, *span);
          errors.push(Diagnostic {
            kind: Kind::Import,
            file: module.clone(),
            line: l,
            col: c,
            message: format!("missing asset '{}'", asset),
          });
        }
        Resolution::External => {}
      }
    }

    // 3. Prop-type diagnostics from ui.element specs.
    for (bad, span) in &parsed.prop_errors {
      let (l, c) = pos(&cm, *span);
      errors.push(Diagnostic {
        kind: Kind::Type,
        file: module.clone(),
        line: l,
        col: c,
        message: format!(
          "unsupported prop type '{}' (use Boolean, Number, or String)",
          bad
        ),
      });
    }
  }

  if !errors.is_empty() {
    for w in &warnings {
      report_line(w);
    }
    return Err(errors);
  }

  // Populate hashes for all reached files (including assets and HTML).
  for file in &reached {
    if let Some(hash) = super::cache::hash(file) {
      hashes.insert(file.clone(), hash);
    }
  }

  // Write generated importmap as a separate JSON file in dist.
  if !importmap.is_empty() {
    let path = dist.join("importmap.json");
    if let Some(parent) = path.parent() {
      std::fs::create_dir_all(parent).ok();
    }
    let imports_json = serde_json::json!({ "imports": importmap });
    if let Ok(json) = serde_json::to_string_pretty(&imports_json) {
      std::fs::write(&path, json).ok();
    }
  }

  // Copy every reachable file into `dist`, mirroring structure.
  let mut copied = 0usize;
  for file in &reached {
    let (_rel, target) = if file.starts_with(src) {
      if let Ok(r) = file.strip_prefix(src) {
        (r, dist.join(r))
      } else {
        continue;
      }
    } else if let Some(ref lib) = lib_src {
      if file.starts_with(lib) {
        if let Ok(r) = file.strip_prefix(lib) {
          (r, dist.join(r))
        } else {
          continue;
        }
      } else {
        continue;
      }
    } else {
      continue;
    };

    if let Some(parent) = target.parent() {
      std::fs::create_dir_all(parent).ok();
    }

    let hash = hashes.get(file);
    let prior = cache.as_ref().and_then(|c| c.hashes.get(file));
    let copy = hash != prior || !target.exists();

    if copy {
      if target.extension().map_or(false, |ext| ext == "html") {
        if let Ok(content) = std::fs::read_to_string(file) {
          let injected = super::html::inject_assets(&content, &importmap, dev);
          if std::fs::write(&target, injected).is_ok() {
            copied += 1;
          }
        }
      } else if is_js(file) {
        // Rewrite static imports into usage order (library → docks → views →
        // parts → pages). Source may import in any order; dist loads correctly.
        if let Ok(content) = std::fs::read_to_string(file) {
          let ordered = super::order::rewrite_with(&content, file, src, &order_slots);
          if std::fs::write(&target, ordered).is_ok() {
            copied += 1;
          }
        }
      } else if std::fs::copy(file, &target).is_ok() {
        copied += 1;
      }
    }
  }

  // Copy entire tokens and styles directories from src to dist (if they exist)
  // so that relative CSS @imports work correctly in the browser.
  let src_tokens = src.join("tokens");
  if src_tokens.is_dir() {
    let _ = crate::create::copy::copy(&src_tokens, &dist.join("tokens"));
  }

  let src_styles = src.join("styles");
  if src_styles.is_dir() {
    let _ = crate::create::copy::copy(&src_styles, &dist.join("styles"));
  }

  let favicon = src.join("favicon.ico");
  if favicon.is_file() {
    let _ = std::fs::copy(&favicon, dist.join("favicon.ico"));
  }

  // Rewrite bare specifiers in dist/sw.js to relative paths.
  // Service Workers do not support import maps.
  super::sw::rewrite_imports(dist, &importmap);

  let cache = super::cache::Cache {
    version: version.to_string(),
    dev,
    hashes,
    timestamp: std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs(),
  };
  super::cache::save(&project, &cache);

  Ok(Report {
    copied,
    modules,
    warnings,
    importmap,
  })
}

/// Print a diagnostic through the colored logger.
pub fn report_line(d: &Diagnostic) {
  let label = match d.kind {
    Kind::Parse => "syntax",
    Kind::Import => "import",
    Kind::Type => "type",
  };
  anza_logs::error!(
    "[{}] {}:{}:{} {}",
    label,
    d.file.display(),
    d.line,
    d.col,
    d.message
  );
}

fn is_js(path: &Path) -> bool {
  path.extension().map_or(false, |e| e == "js" || e == "mjs")
}

/// Normalize a path by resolving `.` and `..` components without touching disk.
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

pub fn pos(cm: &Arc<SourceMap>, span: Span) -> (usize, usize) {
  if span.lo.0 == 0 {
    return (0, 0);
  }
  let loc = cm.lookup_char_pos(span.lo);
  (loc.line, loc.col_display + 1)
}

// Keep the asset extension list referenced so future asset-aware walking can use
// it; silences dead-code while documenting intent.
#[allow(dead_code)]
fn is_asset(path: &Path) -> bool {
  path
    .extension()
    .and_then(|e| e.to_str())
    .map_or(false, |e| ASSET_EXT.contains(&e))
}
