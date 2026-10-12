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
  /// Static import graph of the copied JS modules, keyed by site-root URL
  /// (`/core/ui/index.js`), edges in source order. Dynamic `import()` is
  /// not an edge: it is not needed before the module runs.
  pub module_graph: ModuleGraph,
}

/// Site-root module URL -> its static imports (site-root URLs, source order).
pub type ModuleGraph = BTreeMap<String, Vec<String>>;

/// Every module reachable from `roots` through static imports, breadth-first
/// (shallow modules first, so preload hints start the critical ones early),
/// each URL once. Roots missing from the graph are still listed.
pub fn static_closure<'a, I>(graph: &ModuleGraph, roots: I) -> Vec<String>
where
  I: IntoIterator<Item = &'a str>,
{
  let mut seen: AHashSet<String> = AHashSet::new();
  let mut order: Vec<String> = Vec::new();
  let mut queue: VecDeque<String> = VecDeque::new();
  for root in roots {
    if seen.insert(root.to_string()) {
      queue.push_back(root.to_string());
    }
  }
  while let Some(url) = queue.pop_front() {
    if let Some(edges) = graph.get(&url) {
      for next in edges {
        if seen.insert(next.clone()) {
          queue.push_back(next.clone());
        }
      }
    }
    order.push(url);
  }
  order
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
  let version = "1.0.4";

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
  // Static JS import edges by absolute source path (mapped to URLs later).
  let mut edges: BTreeMap<PathBuf, Vec<PathBuf>> = BTreeMap::new();
  let mut hashes: BTreeMap<PathBuf, String> = BTreeMap::new();
  let mut importmap: BTreeMap<String, String> = BTreeMap::new();
  // Definition modules -> relative style/template assets to inline (production).
  let mut inline: BTreeMap<PathBuf, Vec<(String, PathBuf)>> = BTreeMap::new();

  // Parallel BFS: parse and resolve one frontier (BFS level) at a time, then
  // merge the results in queue order, so reached/diagnostics match a serial walk.
  let ctx = WalkCtx {
    src,
    project: &project,
    user_map: &user_map,
    lib_map: &lib_map,
    lib_src: &lib_src,
    cm: &cm,
  };
  while !queue.is_empty() {
    let frontier: Vec<PathBuf> = queue.drain(..).collect();
    modules += frontier.len();
    let visits: Vec<Visit> = {
      use rayon::prelude::*;
      frontier.par_iter().map(|m| visit_module(m, &ctx)).collect()
    };
    for (module, visit) in frontier.iter().zip(visits) {
      edges.insert(module.clone(), visit.edges);
      if !dev && !visit.inline.is_empty() {
        inline.insert(module.clone(), visit.inline);
      }
      errors.extend(visit.errors);
      warnings.extend(visit.warnings);
      importmap.extend(visit.importmap);
      for (file, follow) in visit.files {
        if reached.insert(file.clone()) && follow && is_js(&file) {
          queue.push_back(file);
        }
      }
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
  // mtime + size are checked first; unchanged files keep their cached hash.
  let mut stats: BTreeMap<PathBuf, super::cache::Stat> = BTreeMap::new();
  {
    use rayon::prelude::*;
    let prior = cache.as_ref();
    let computed: Vec<(PathBuf, String, super::cache::Stat)> = reached
      .par_iter()
      .filter_map(|file| super::cache::hash_cached(file, prior).map(|(h, st)| (file.clone(), h, st)))
      .collect();
    for (file, hash, st) in computed {
      hashes.insert(file.clone(), hash);
      stats.insert(file, st);
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

  // Copy every reachable file into `dist`, mirroring structure. Jobs are
  // sorted so the result never depends on hash-set order; when a project file
  // and a library file map to the same dist path, the project file wins.
  let mut jobs: Vec<(&PathBuf, PathBuf)> = Vec::with_capacity(reached.len());
  for file in &reached {
    let rel = if file.starts_with(src) {
      file.strip_prefix(src).ok()
    } else if let Some(ref lib) = lib_src {
      file.strip_prefix(lib).ok()
    } else {
      None
    };
    if let Some(rel) = rel {
      jobs.push((file, rel.to_path_buf()));
    }
  }
  jobs.sort_by(|a, b| (!a.0.starts_with(src), a.0).cmp(&(!b.0.starts_with(src), b.0)));
  let mut claimed: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();
  jobs.retain(|(_, rel)| claimed.insert(rel.clone()));
  outputs.extend(jobs.iter().map(|(_, rel)| rel.clone()));

  // Import graph in URL space, for modulepreload hints and Link headers.
  let url_of: std::collections::HashMap<&PathBuf, String> = jobs
    .iter()
    .map(|(file, rel)| (*file, format!("/{}", rel.to_string_lossy().replace('\\', "/"))))
    .collect();
  let mut module_graph: ModuleGraph = BTreeMap::new();
  for (module, deps) in &edges {
    let Some(url) = url_of.get(module) else { continue };
    let mut list: Vec<String> = Vec::new();
    for dep in deps {
      if let Some(dep_url) = url_of.get(dep) {
        if !list.contains(dep_url) {
          list.push(dep_url.clone());
        }
      }
    }
    module_graph.insert(url.clone(), list);
  }

  // Serialize the import map once for every HTML file.
  let importmap_tag = super::html::importmap_tag(&importmap);
  let results: Vec<Result<bool, (PathBuf, Diagnostic)>> = {
    use rayon::prelude::*;
    jobs
      .par_iter()
      .map(|(file, rel)| {
        let file: &PathBuf = file;
        let target = dist.join(rel);
        let hash = hashes.get(file);
        let prior = cache.as_ref().and_then(|c| c.hashes.get(file));
        if hash == prior && target.exists() {
          return Ok(false);
        }
        let result = if target.extension().map_or(false, |ext| ext == "html") {
          std::fs::read_to_string(file)
            .map_err(|e| format!("cannot read {}: {}", file.display(), e))
            .and_then(|content| {
              let injected = super::html::inject_assets_with(&content, &importmap_tag);
              crate::fs_atomic::write(&target, injected.as_bytes())
            })
        } else if is_js(file) {
          // Rewrite static imports into usage order (library → docks → views →
          // parts → pages). Source may import in any order; dist loads correctly.
          std::fs::read_to_string(file)
            .map_err(|e| format!("cannot read {}: {}", file.display(), e))
            .and_then(|content| {
              let ordered = super::order::rewrite_with(&content, file, src, &order_slots);
              match inline.get(file) {
                Some(assets) => {
                  let prelude = super::inline::prelude(assets)?;
                  crate::fs_atomic::write(&target, format!("{}{}", prelude, ordered).as_bytes())
                }
                None => crate::fs_atomic::write(&target, ordered.as_bytes()),
              }
            })
        } else {
          crate::fs_atomic::copy(file, &target)
        };
        result
          .map(|()| true)
          .map_err(|err| (file.clone(), Diagnostic::io(&target, err)))
      })
      .collect()
  };
  let mut copied = 0usize;
  for result in results {
    match result {
      Ok(true) => copied += 1,
      Ok(false) => {}
      Err((file, diag)) => {
        // Forget the hash so the next (dev) build retries this file.
        hashes.remove(&file);
        errors.push(diag);
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
    save_cache(&project, version, dev, &config, hashes, stats);
    return Err(errors);
  }

  save_cache(&project, version, dev, &config, hashes, stats);

  Ok(Report {
    copied,
    modules,
    warnings,
    importmap,
    outputs,
    module_graph,
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

/// Shared, read-only inputs of the import-graph walk.
struct WalkCtx<'a> {
  src: &'a Path,
  project: &'a Path,
  user_map: &'a std::collections::HashMap<String, String>,
  lib_map: &'a std::collections::HashMap<String, String>,
  lib_src: &'a Option<PathBuf>,
  cm: &'a Arc<SourceMap>,
}

/// What one module contributes to the graph.
#[derive(Default)]
struct Visit {
  errors: Vec<Diagnostic>,
  warnings: Vec<Diagnostic>,
  importmap: Vec<(String, String)>,
  /// Reached files; `true` = an ESM import (walked further when it is JS).
  files: Vec<(PathBuf, bool)>,
  /// Statically imported JS modules (no dynamic `import()`), source order.
  edges: Vec<PathBuf>,
  /// Relative definition assets to inline: (specifier, resolved file).
  inline: Vec<(String, PathBuf)>,
}

/// Parse one module and resolve its imports and asset literals.
fn visit_module(module: &Path, ctx: &WalkCtx) -> Visit {
  let mut out = Visit::default();
  let cm = ctx.cm;
  let parsed = match super::parse::parse(module, cm) {
    Ok(p) => p,
    Err(diag) => {
      out.errors.push(diag);
      return out;
    }
  };

  // Validate dock() definitions for naming ambiguities
  out.warnings.extend(super::transform::validate(module, &parsed.ast));

  let importer = module.parent().map(|p| p.to_path_buf()).unwrap_or_default();
  let resolve = |spec: &str| {
    super::resolve::spec(
      spec,
      &importer,
      ctx.src,
      ctx.project,
      ctx.user_map,
      ctx.lib_map,
      ctx.lib_src,
    )
  };

  // 1. ESM import specifiers -> walked as modules (if JS) or copied (assets).
  let statics = parsed.imports.iter().map(|i| (i, false));
  for ((spec, span), dynamic) in statics.chain(parsed.dynamic.iter().map(|i| (i, true))) {
    match resolve(spec) {
      Resolution::External => {}
      Resolution::File(path, extless) => {
        let norm = normalize(&path);
        if extless {
          let (l, c) = pos(cm, *span);
          out.warnings.push(Diagnostic {
            kind: Kind::Import,
            file: module.to_path_buf(),
            line: l,
            col: c,
            message: format!(
              "extensionless import '{}' — browsers need explicit extensions",
              spec
            ),
          });
        }

        if let Some(target) = ctx.user_map.get(spec) {
          out.importmap.push((spec.clone(), target.clone()));
        } else if let Some(target) = ctx.lib_map.get(spec) {
          out.importmap.push((spec.clone(), target.clone()));
        }

        if !dynamic && is_js(&norm) {
          out.edges.push(norm.clone());
        }
        out.files.push((norm, true));
      }
      Resolution::Missing => {
        let (l, c) = pos(cm, *span);
        out.errors.push(Diagnostic {
          kind: Kind::Import,
          file: module.to_path_buf(),
          line: l,
          col: c,
          message: format!("unresolved import '{}'", spec),
        });
      }
    }
  }

  // 2. Asset string literals (template/style and other relative assets).
  for (asset, span) in &parsed.assets {
    match resolve(asset) {
      Resolution::File(path, _extless) => {
        let norm = normalize(&path);
        let tags = if norm.extension().map_or(false, |e| e == "html") {
          let mut tags = norm.clone();
          tags.set_extension("tags.json");
          tags.exists().then(|| normalize(&tags))
        } else {
          None
        };
        out.files.push((norm, false));
        if let Some(tags) = tags {
          out.files.push((tags, false));
        }
      }
      Resolution::Missing => {
        let (l, c) = pos(cm, *span);
        out.errors.push(Diagnostic {
          kind: Kind::Import,
          file: module.to_path_buf(),
          line: l,
          col: c,
          message: format!("missing asset '{}'", asset),
        });
      }
      Resolution::External => {}
    }
  }

  // Inlinable assets: resolved files only (a missing one is reported above).
  for spec in &parsed.inline {
    if let Resolution::File(path, _) = resolve(spec) {
      out.inline.push((spec.clone(), normalize(&path)));
    }
  }

  // 3. Prop-type diagnostics from ui.element specs.
  for (bad, span) in &parsed.prop_errors {
    let (l, c) = pos(cm, *span);
    out.errors.push(Diagnostic {
      kind: Kind::Type,
      file: module.to_path_buf(),
      line: l,
      col: c,
      message: format!(
        "unsupported prop type '{}' (use Boolean, Number, or String)",
        bad
      ),
    });
  }
  out
}

fn save_cache(
  project: &Path,
  version: &str,
  dev: bool,
  config: &str,
  hashes: BTreeMap<PathBuf, String>,
  mut stats: BTreeMap<PathBuf, super::cache::Stat>,
) {
  stats.retain(|file, _| hashes.contains_key(file));
  let cache = super::cache::Cache {
    version: version.to_string(),
    dev,
    config: config.to_string(),
    hashes,
    stats,
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
