// tools/src/build/graph.rs
//
// Import-graph resolution orchestrator. Walks the ESM import graph from entry
// points and copies only the reachable files into dist, preserving a
// browser-native folder structure. Reports diagnostics for missing imports,
// syntax errors, and unsupported prop types. No bundling.

use ahash::AHashSet;
use std::collections::{BTreeMap, VecDeque};
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;

use swc_common::{SourceMap, Span};

/// Severity of a build diagnostic.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
  Parse,
  Import,
  Type,
  /// Reading sources or writing dist failed.
  Io,
}

#[derive(Debug, Clone)]
pub struct Diagnostic {
  pub kind: Kind,
  pub file: PathBuf,
  pub line: usize,
  pub col: usize,
  pub message: String,
}

impl Diagnostic {
  fn io(file: &Path, message: String) -> Self {
    Diagnostic {
      kind: Kind::Io,
      file: file.to_path_buf(),
      line: 0,
      col: 0,
      message,
    }
  }
}

impl std::fmt::Display for Diagnostic {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let label = match self.kind {
      Kind::Parse => "syntax",
      Kind::Import => "import",
      Kind::Type => "type",
      Kind::Io => "io",
    };
    write!(
      f,
      "[{}] {}:{}:{} {}",
      label,
      self.file.display(),
      self.line,
      self.col,
      self.message
    )
  }
}

/// Result of a successful resolution pass.
#[derive(Debug, Default)]
pub struct Report {
  pub copied: usize,
  pub modules: usize,
  pub warnings: Vec<Diagnostic>,
  #[allow(dead_code)]
  pub importmap: BTreeMap<String, String>,
  /// Every dist file this pass owns, relative to dist (copied or unchanged).
  pub outputs: Vec<PathBuf>,
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
  let mut reached: AHashSet<PathBuf> = AHashSet::new();
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
  let mut hashes: BTreeMap<PathBuf, String> = BTreeMap::new();
  let mut importmap: BTreeMap<String, String> = BTreeMap::new();

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

  // Follow CSS @import chains so nested token/style files land in dist even when
  // only the entry index.css is linked from HTML.
  collect_css_imports(src, &mut reached);

  // Populate hashes for all reached files (including assets and HTML).
  for file in &reached {
    if let Some(hash) = super::cache::hash(file) {
      hashes.insert(file.clone(), hash);
    }
  }

  // Dev cache key: the import map, structure slots and deploy base config are
  // baked into copied HTML/JS. When any of them changes, unchanged sources
  // must still be recopied (stale import maps, doubled base prefixes).
  let config = config_key(src, &project, &importmap, &order_slots);
  if cache.as_ref().map_or(false, |c| c.config != config) {
    cache = None;
  }

  let mut outputs: Vec<PathBuf> = Vec::new();

  // Write generated importmap as a separate JSON file in dist.
  if !importmap.is_empty() {
    let path = dist.join("importmap.json");
    outputs.push(PathBuf::from("importmap.json"));
    let imports_json = serde_json::json!({ "imports": importmap });
    let written = serde_json::to_string_pretty(&imports_json)
      .map_err(|e| e.to_string())
      .and_then(|json| crate::fs_atomic::write(&path, json.as_bytes()));
    if let Err(err) = written {
      errors.push(Diagnostic::io(&path, format!("cannot write: {}", err)));
    }
  }

  // Copy every reachable file into `dist`, mirroring structure.
  let mut copied = 0usize;
  for file in &reached {
    let (rel, target) = if file.starts_with(src) {
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

    outputs.push(rel.to_path_buf());
    let hash = hashes.get(file);
    let prior = cache.as_ref().and_then(|c| c.hashes.get(file));
    let copy = hash != prior || !target.exists();

    if copy {
      let result = if target.extension().map_or(false, |ext| ext == "html") {
        std::fs::read_to_string(file)
          .map_err(|e| format!("cannot read {}: {}", file.display(), e))
          .and_then(|content| {
            let injected = super::html::inject_assets(&content, &importmap, dev);
            crate::fs_atomic::write(&target, injected.as_bytes())
          })
      } else if is_js(file) {
        // Rewrite static imports into usage order (library → docks → views →
        // parts → pages). Source may import in any order; dist loads correctly.
        std::fs::read_to_string(file)
          .map_err(|e| format!("cannot read {}: {}", file.display(), e))
          .and_then(|content| {
            let ordered = super::order::rewrite_with(&content, file, src, &order_slots);
            crate::fs_atomic::write(&target, ordered.as_bytes())
          })
      } else {
        crate::fs_atomic::copy(file, &target)
      };
      match result {
        Ok(()) => copied += 1,
        Err(err) => {
          // Forget the hash so the next (dev) build retries this file.
          hashes.remove(file);
          errors.push(Diagnostic::io(&target, err));
        }
      }
    }
  }

  // Copy entire tokens and styles directories from src to dist (if they exist)
  // so that relative CSS @imports work correctly in the browser.
  for dir in ["tokens", "styles"] {
    let from = src.join(dir);
    if from.is_dir() {
      if let Err(err) = copy_dir(&from, &dist.join(dir), Path::new(dir), &mut outputs) {
        errors.push(Diagnostic::io(&from, err));
      }
    }
  }

  let favicon = src.join("favicon.ico");
  if favicon.is_file() {
    let target = dist.join("favicon.ico");
    outputs.push(PathBuf::from("favicon.ico"));
    if let Err(err) = crate::fs_atomic::copy(&favicon, &target) {
      errors.push(Diagnostic::io(&target, err));
    }
  }

  // Rewrite bare specifiers in dist/sw.js to relative paths.
  // Service Workers do not support import maps.
  if let Err(err) = super::sw::rewrite_imports(dist, &importmap) {
    errors.push(Diagnostic::io(&dist.join("sw.js"), err));
  }

  if !errors.is_empty() {
    // Keep the cache of what did succeed so a dev rebuild retries the rest.
    save_cache(&project, version, dev, &config, hashes);
    return Err(errors);
  }

  save_cache(&project, version, dev, &config, hashes);

  Ok(Report {
    copied,
    modules,
    warnings,
    importmap,
    outputs,
  })
}

/// Hash of the build configuration that is baked into copied files.
fn config_key(
  src: &Path,
  project: &Path,
  importmap: &BTreeMap<String, String>,
  slots: &super::order::Slots,
) -> String {
  use std::hash::{Hash, Hasher};
  let mut h = std::collections::hash_map::DefaultHasher::new();
  format!("{:?}|{:?}", importmap, slots).hash(&mut h);
  for path in [src.join("ssg.json"), project.join("ssg.json")] {
    std::fs::read(path).ok().hash(&mut h);
  }
  std::env::var("ANZA_BASE_PATH").ok().hash(&mut h);
  format!("{:x}", h.finish())
}

fn save_cache(
  project: &Path,
  version: &str,
  dev: bool,
  config: &str,
  hashes: BTreeMap<PathBuf, String>,
) {
  let cache = super::cache::Cache {
    version: version.to_string(),
    dev,
    config: config.to_string(),
    hashes,
    timestamp: std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs(),
  };
  super::cache::save(project, &cache);
}

/// Recursively copy a directory tree, recording each file (relative to dist,
/// `rel` being the dist-relative path of `to`) in `outputs`.
fn copy_dir(from: &Path, to: &Path, rel: &Path, outputs: &mut Vec<PathBuf>) -> Result<(), String> {
  let entries =
    std::fs::read_dir(from).map_err(|e| format!("cannot read {}: {}", from.display(), e))?;
  for entry in entries {
    let entry = entry.map_err(|e| format!("cannot read {}: {}", from.display(), e))?;
    let src = entry.path();
    let dst = to.join(entry.file_name());
    let is_dir = entry
      .file_type()
      .map_err(|e| format!("cannot stat {}: {}", src.display(), e))?
      .is_dir();
    let rel = rel.join(entry.file_name());
    if is_dir {
      copy_dir(&src, &dst, &rel, outputs)?;
    } else {
      outputs.push(rel);
      crate::fs_atomic::copy(&src, &dst)?;
    }
  }
  Ok(())
}

/// Print a diagnostic through the colored logger.
pub fn report_line(d: &Diagnostic) {
  anza_logs::error!("{}", d);
}

fn is_js(path: &Path) -> bool {
  path.extension().map_or(false, |e| e == "js" || e == "mjs")
}

fn is_css(path: &Path) -> bool {
  path.extension().map_or(false, |e| e == "css")
}

/// Walk `@import` url(...) from reachable CSS files under `src`.
fn collect_css_imports(src: &Path, reached: &mut AHashSet<PathBuf>) {
  let css_files: Vec<PathBuf> = reached
    .iter()
    .filter(|p| is_css(p) && p.starts_with(src))
    .cloned()
    .collect();

  let mut queue: VecDeque<PathBuf> = css_files.into();
  while let Some(file) = queue.pop_front() {
    let Ok(content) = std::fs::read_to_string(&file) else {
      continue;
    };
    let parent = file.parent().unwrap_or(src);
    for url in css_import_urls(&content) {
      let resolved = normalize(&parent.join(&url));
      if resolved.starts_with(src) && reached.insert(resolved.clone()) {
        queue.push_back(resolved);
      }
    }
  }
}

/// Extract relative paths from `@import url('./x.css')` / `@import './x.css'`.
fn css_import_urls(content: &str) -> Vec<String> {
  let mut out = Vec::new();
  for line in content.lines() {
    let trimmed = line.trim();
    if !trimmed.starts_with("@import") {
      continue;
    }
    let rest = trimmed.trim_start_matches("@import").trim();
    let path = if let Some(start) = rest.find("url(") {
      let inner = &rest[start + 4..];
      let end = inner.find(')').unwrap_or(inner.len());
      inner[..end]
        .trim()
        .trim_matches(|c| c == '"' || c == '\'' || c == ' ')
    } else {
      rest.trim_end_matches(';').trim()
        .trim_matches(|c| c == '"' || c == '\'' || c == ' ')
    };
    if path.starts_with("./") || path.starts_with("../") {
      out.push(path.to_string());
    }
  }
  out
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

#[cfg(test)]
mod css_import_tests {
  use super::*;

  #[test]
  fn css_import_urls_parses_relative() {
    let css = r#"
@import './layers.css';
@import url("./reset.css");
@import url('../other/x.css');
"#;
    let urls = css_import_urls(css);
    assert!(urls.contains(&"./layers.css".to_string()));
    assert!(urls.contains(&"./reset.css".to_string()));
    assert!(urls.contains(&"../other/x.css".to_string()));
  }

  #[test]
  fn collect_css_imports_follows_chain() {
    let dir = std::env::temp_dir().join("anza-css-import-test");
    let _ = std::fs::remove_dir_all(&dir);
    let src = dir.join("src");
    std::fs::create_dir_all(src.join("tokens")).unwrap();
    std::fs::write(
      src.join("tokens/index.css"),
      "@import './child.css';\n",
    )
    .unwrap();
    std::fs::write(src.join("tokens/child.css"), ":root {}\n").unwrap();

    let mut reached = AHashSet::from([normalize(&src.join("tokens/index.css"))]);
    collect_css_imports(&src, &mut reached);
    assert!(reached.contains(&normalize(&src.join("tokens/child.css"))));
  }
}
