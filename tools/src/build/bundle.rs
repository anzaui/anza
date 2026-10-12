// tools/src/build/bundle.rs
//
// Production bundling (DIST step 5, decision D-6). After the unbundled dist
// is complete (graph copy, element inlining, CSS, SSG), `anza build` asks
// Rolldown (its stable JS API, through `library/bin/bundle/index.js` and the
// project's `rolldown` devDependency) to bundle the modules of every HTML
// module script into minified, content-hashed chunks under `dist/assets/`:
//
//   core-<hash>.js        library modules needed by two or more routes
//   route-<group>-<hash>  page modules of one route group (`/`, `/docs`, …)
//                         that not every page loads (the others ride in
//                         the entry chunk)
//   elements-<hash>.js    definitions every route needs (docks, views, …)
//   el-<name>-<hash>.js   one chunk per element the other routes don't need
//   app-<hash>.js         the entry, modules only it imports and the routes
//                         every page loads
//
// Then the HTML module scripts point at the entry chunks, each page
// preloads the chunks its entry imports (instead of the whole module
// closure), the import map is dropped (nothing bare is left), `_headers`
// lists the chunks, and the bundled source modules are removed from dist.
//
// When Node, the bundle script or rolldown is missing, the unbundled output
// stays as it is, with a warning. `anza dev` and `--no-bundle` never bundle.

use std::collections::{BTreeMap, BTreeSet, HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Deserialize;

use super::graph::ModuleGraph;
use super::headers::Hints;

/// Where chunks go, relative to dist.
pub const ASSETS: &str = "assets";

/// What the bundler needs from the earlier build stages.
pub struct Input<'a> {
  pub src_dir: &'a Path,
  pub dist_dir: &'a Path,
  pub graph: &'a ModuleGraph,
  pub definitions: &'a BTreeMap<String, Vec<String>>,
  pub library: &'a BTreeSet<String>,
  pub importmap: &'a BTreeMap<String, String>,
  /// SSG route preloads (`Stats::hints`).
  pub hints: &'a [Hints],
  /// Deploy base path (`""` when none).
  pub base: &'a str,
}

/// Result of a bundling pass.
#[derive(Debug)]
pub enum Outcome {
  /// dist now loads chunks; the list is (file, chunk name), sorted.
  Bundled { chunks: Vec<(String, String)>, rolldown: String },
  /// Left unbundled, with the reason (a warning, not an error).
  Skipped(String),
}

#[derive(Debug, Deserialize)]
struct Manifest {
  #[serde(default)]
  rolldown: String,
  chunks: Vec<Chunk>,
  #[serde(default)]
  warnings: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct Chunk {
  file: String,
  name: String,
  entry: Option<String>,
  modules: Vec<String>,
  imports: Vec<String>,
  #[serde(default)]
  externals: Vec<String>,
}

/// Bundle `dist` in place. `Err` only when the bundler ran and failed (or
/// dist could not be rewritten); a missing toolchain is `Ok(Skipped)`.
pub fn run(input: &Input) -> Result<Outcome, Vec<String>> {
  let dist = input.dist_dir;
  let project = project_dir(input.src_dir);
  let Some(lib) = super::resolve::library(&project) else {
    return Ok(Outcome::Skipped("the @anzaui/anza library was not found".into()));
  };
  let script = lib.join("bin").join("bundle").join("index.js");
  if !script.is_file() {
    return Ok(Outcome::Skipped(format!("{} is missing", script.display())));
  }

  let html_files = html_files(dist);
  let mut inputs: BTreeSet<String> = BTreeSet::new();
  for file in &html_files {
    let text = std::fs::read_to_string(file).map_err(|e| vec![format!("cannot read {}: {}", file.display(), e)])?;
    for script in module_scripts(&text) {
      match script.src {
        Some(src) => {
          let url = strip_base(input.base, &src);
          if url.starts_with('/') && !url.starts_with("//") && dist.join(&url[1..]).is_file() {
            inputs.insert(url);
          }
        }
        None => {
          return Ok(Outcome::Skipped(format!(
            "{} has an inline module script, which needs the import map",
            file.strip_prefix(dist).unwrap_or(file).display()
          )))
        }
      }
    }
  }
  if inputs.is_empty() {
    return Ok(Outcome::Skipped("no HTML module scripts to bundle".into()));
  }

  let routes = route_files(dist);
  let groups = plan_groups(input, &inputs, &routes);

  let tmp = std::env::temp_dir().join(format!("anza-bundle-{}", std::process::id()));
  std::fs::create_dir_all(&tmp).map_err(|e| vec![format!("cannot create {}: {}", tmp.display(), e)])?;
  let plan_path = tmp.join("plan.json");
  let manifest_path = tmp.join("manifest.json");
  let plan = serde_json::json!({
    "dist": dist,
    "project": project,
    "inputs": inputs,
    "importmap": input.importmap,
    "groups": groups,
  });
  let result = (|| {
    std::fs::write(&plan_path, plan.to_string()).map_err(|e| format!("cannot write bundle plan: {}", e))?;
    let output = match Command::new("node").arg(&script).arg(&plan_path).arg(&manifest_path).output() {
      Ok(output) => output,
      Err(err) => return Ok(Err(format!("node is not available ({})", err))),
    };
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    match output.status.code() {
      Some(0) => {}
      Some(3) => return Ok(Err(stderr)),
      _ => return Err(format!("rolldown failed: {}", stderr)),
    }
    let text = std::fs::read_to_string(&manifest_path).map_err(|e| format!("cannot read bundle manifest: {}", e))?;
    serde_json::from_str::<Manifest>(&text)
      .map(Ok)
      .map_err(|e| format!("invalid bundle manifest: {}", e))
  })();
  std::fs::remove_dir_all(&tmp).ok();
  let manifest = match result {
    Ok(Ok(manifest)) => manifest,
    Ok(Err(reason)) => return Ok(Outcome::Skipped(reason)),
    Err(err) => return Err(vec![err]),
  };
  for warning in &manifest.warnings {
    if !warning.contains("INEFFECTIVE_DYNAMIC_IMPORT") && !warning.contains("debugName") {
      anza_logs::warn!("rolldown: {}", warning.trim());
    }
  }

  apply(input, &manifest, &html_files)?;
  let chunks = manifest.chunks.iter().map(|c| (c.file.clone(), c.name.clone())).collect();
  Ok(Outcome::Bundled { chunks, rolldown: manifest.rolldown })
}

/// The project root (the parent of `src`).
fn project_dir(src_dir: &Path) -> PathBuf {
  let src = std::fs::canonicalize(src_dir).unwrap_or_else(|_| src_dir.to_path_buf());
  src.parent().map(Path::to_path_buf).unwrap_or(src)
}

/// Every `.html` file in dist, sorted.
fn html_files(dist: &Path) -> Vec<PathBuf> {
  let mut files: Vec<PathBuf> = walkdir::WalkDir::new(dist)
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.file_type().is_file() && e.path().extension().map_or(false, |x| x == "html"))
    .map(|e| e.into_path())
    .collect();
  files.sort();
  files
}

/// Page module URL -> route path, from `dist/routes.json`.
fn route_files(dist: &Path) -> BTreeMap<String, String> {
  let mut out = BTreeMap::new();
  let Ok(text) = std::fs::read_to_string(dist.join("routes.json")) else {
    return out;
  };
  let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) else {
    return out;
  };
  for route in json["routes"].as_array().into_iter().flatten() {
    let (Some(file), Some(path)) = (route["file"].as_str(), route["path"].as_str()) else {
      continue;
    };
    if path.starts_with('/') {
      out
        .entry(format!("/{}", file.trim_start_matches('/')))
        .or_insert_with(|| path.to_string());
    }
  }
  out
}

/// `route-<first path segment>` (`route-index` for `/`).
fn route_group(path: &str) -> String {
  let first = path.trim_start_matches('/').split('/').next().unwrap_or("");
  if first.is_empty() {
    "route-index".to_string()
  } else {
    format!("route-{}", sanitize(first))
  }
}

fn sanitize(name: &str) -> String {
  let s: String = name
    .chars()
    .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '-' })
    .collect();
  s.trim_matches('-').to_string()
}

/// Chunk name of an element module: the library element's folder
/// (`/elements/primitives/button/index.js` -> `button`), or the project path
/// (`/views/code/index.js` -> `views-code`).
fn element_name(url: &str, library: bool) -> String {
  let trimmed = url.trim_start_matches('/');
  let mut parts: Vec<&str> = trimmed.split('/').collect();
  if parts.len() > 1 && parts.last().map_or(false, |f| f.starts_with("index.")) {
    parts.pop();
  } else if let Some(last) = parts.last_mut() {
    *last = last.trim_end_matches(".mjs").trim_end_matches(".js");
  }
  let name = if library {
    parts.last().copied().unwrap_or("element").to_string()
  } else {
    parts.join("-")
  };
  format!("el-{}", sanitize(&name))
}

/// Module URL -> chunk name. Modules left out are placed by Rolldown (the
/// entry chunk, or a shared/dynamic chunk).
fn plan_groups(
  input: &Input,
  inputs: &BTreeSet<String>,
  routes: &BTreeMap<String, String>,
) -> BTreeMap<String, String> {
  let graph = input.graph;
  // How many SSG routes need each module before they run, and the first one.
  let mut uses: HashMap<&str, (usize, &str)> = HashMap::new();
  for hint in input.hints {
    for module in &hint.modules {
      let entry = uses.entry(module.as_str()).or_insert((0, hint.path.as_str()));
      entry.0 += 1;
    }
  }
  let route_count = input.hints.len();

  // Needed by every SSG route before it runs (always loaded with the entry).
  let everywhere = |url: &str| route_count > 1 && uses.get(url).map_or(false, |u| u.0 == route_count);

  let mut groups: BTreeMap<String, String> = BTreeMap::new();
  for (url, kinds) in input.definitions {
    if inputs.contains(url) {
      continue;
    }
    if let Some(path) = routes.get(url) {
      // A route every page loads anyway (statically imported by the entry)
      // gains nothing from its own chunk: it rides in the entry chunk,
      // which saves a request per route group on every page.
      if !everywhere(url) {
        groups.insert(url.clone(), route_group(path));
      }
    } else if kinds.iter().any(|k| k != "page") {
      let name = if everywhere(url) {
        "elements".to_string()
      } else {
        element_name(url, input.library.contains(url))
      };
      groups.insert(url.clone(), name);
    }
  }

  // A module imported only from one group belongs to that group.
  let mut importers: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
  for (module, deps) in graph {
    for dep in deps {
      importers.entry(dep.as_str()).or_default().push(module.as_str());
    }
  }
  loop {
    let mut changed = false;
    for (module, from) in &importers {
      if groups.contains_key(*module) || inputs.contains(*module) {
        continue;
      }
      let mut owner: Option<&String> = None;
      let mut single = true;
      for importer in from {
        match groups.get(*importer) {
          Some(g) if owner.map_or(true, |o| o == g) => owner = Some(g),
          _ => {
            single = false;
            break;
          }
        }
      }
      if let (true, Some(g)) = (single, owner) {
        let g = g.clone();
        groups.insert(module.to_string(), g);
        changed = true;
      }
    }
    if !changed {
      break;
    }
  }

  // Library modules every page needs: `core`; needed by one route only: its group.
  for url in input.library {
    if groups.contains_key(url) || inputs.contains(url) {
      continue;
    }
    match uses.get(url.as_str()) {
      Some((1, path)) if route_count > 1 => {
        groups.insert(url.clone(), route_group(path));
      }
      Some(_) => {
        groups.insert(url.clone(), "core".to_string());
      }
      None => {}
    }
  }
  groups
}

/// One `<script type="module">` of an HTML file.
struct ModuleScript {
  /// Byte range of the `src` attribute value.
  src_range: Option<(usize, usize)>,
  src: Option<String>,
  /// Byte offset of `<script`.
  start: usize,
}

/// Every module script in `html` (in order).
fn module_scripts(html: &str) -> Vec<ModuleScript> {
  let lower = html.to_ascii_lowercase();
  let mut out = Vec::new();
  let mut at = 0;
  while let Some(pos) = lower[at..].find("<script") {
    let start = at + pos;
    let Some(end) = lower[start..].find('>') else { break };
    let tag_end = start + end;
    let tag = &lower[start..tag_end];
    at = tag_end + 1;
    if !(tag.contains("type=\"module\"") || tag.contains("type='module'") || tag.contains("type=module")) {
      continue;
    }
    let src_range = attr_range(&lower, start, tag_end, "src");
    out.push(ModuleScript {
      src: src_range.map(|(a, b)| html[a..b].to_string()),
      src_range,
      start,
    });
  }
  out
}

/// Byte range of the quoted value of `name` in the tag `lower[start..end]`.
fn attr_range(lower: &str, start: usize, end: usize, name: &str) -> Option<(usize, usize)> {
  let tag = &lower[start..end];
  let mut from = 0;
  while let Some(pos) = tag[from..].find(name) {
    let i = from + pos;
    from = i + name.len();
    let before = tag[..i].chars().last().unwrap_or(' ');
    if !before.is_whitespace() {
      continue;
    }
    let rest = tag[i + name.len()..].trim_start();
    let Some(rest) = rest.strip_prefix('=') else { continue };
    let rest_trim = rest.trim_start();
    let value_start = start + (tag.len() - rest_trim.len());
    let quote = rest_trim.chars().next()?;
    if quote == '"' || quote == '\'' {
      let close = rest_trim[1..].find(quote)?;
      return Some((value_start + 1, value_start + 1 + close));
    }
    let len = rest_trim.find(|c: char| c.is_whitespace() || c == '>').unwrap_or(rest_trim.len());
    return Some((value_start, value_start + len));
  }
  None
}

fn strip_base(base: &str, url: &str) -> String {
  if !base.is_empty() {
    if let Some(rest) = url.strip_prefix(base) {
      if rest.starts_with('/') {
        return rest.to_string();
      }
    }
  }
  url.to_string()
}

/// Static chunk closure of `file` (itself excluded), breadth-first.
fn chunk_closure(chunks: &HashMap<&str, &Chunk>, file: &str) -> Vec<String> {
  let mut seen: BTreeSet<String> = BTreeSet::from([file.to_string()]);
  let mut order = Vec::new();
  let mut queue: VecDeque<String> = VecDeque::from([file.to_string()]);
  while let Some(next) = queue.pop_front() {
    if let Some(chunk) = chunks.get(next.as_str()) {
      for import in &chunk.imports {
        if seen.insert(import.clone()) {
          order.push(import.clone());
          queue.push_back(import.clone());
        }
      }
    }
  }
  order
}

/// Rewrite dist for the chunks: HTML, `_headers`, import map; remove the
/// bundled source modules.
fn apply(input: &Input, manifest: &Manifest, html_files: &[PathBuf]) -> Result<(), Vec<String>> {
  let dist = input.dist_dir;
  let base = input.base;
  let by_file: HashMap<&str, &Chunk> = manifest.chunks.iter().map(|c| (c.file.as_str(), c)).collect();
  let mut chunk_of: HashMap<&str, &str> = HashMap::new();
  for chunk in &manifest.chunks {
    for module in &chunk.modules {
      chunk_of.insert(module.as_str(), chunk.file.as_str());
    }
  }
  let entry_of: HashMap<&str, &str> = manifest
    .chunks
    .iter()
    .filter_map(|c| c.entry.as_deref().map(|e| (e, c.file.as_str())))
    .collect();
  let href = |file: &str| super::base::with_base(base, &format!("/{}", file));

  // Bare specifiers that are still imported (externals) keep the import map.
  let externals: BTreeSet<&str> = manifest.chunks.iter().flat_map(|c| c.externals.iter().map(String::as_str)).collect();
  let kept: BTreeMap<String, String> = input
    .importmap
    .iter()
    .filter(|(k, _)| externals.contains(k.as_str()))
    .map(|(k, v)| (k.clone(), v.clone()))
    .collect();

  let mut errors = Vec::new();
  for file in html_files {
    let text = match std::fs::read_to_string(file) {
      Ok(t) => t,
      Err(e) => {
        errors.push(format!("cannot read {}: {}", file.display(), e));
        continue;
      }
    };
    let rewritten = rewrite_html(&text, base, &entry_of, &by_file, &href, &kept);
    if rewritten != text {
      if let Err(err) = crate::fs_atomic::write(file, rewritten.as_bytes()) {
        errors.push(format!("cannot write {}: {}", file.display(), err));
      }
    }
  }

  // _headers: each route preloads the chunks of its module closure.
  let hints: Vec<Hints> = input
    .hints
    .iter()
    .map(|h| {
      let mut modules: Vec<String> = Vec::new();
      for module in &h.modules {
        if let Some(file) = chunk_of.get(module.as_str()) {
          let url = format!("/{}", file);
          if !modules.contains(&url) {
            modules.push(url);
          }
        }
      }
      Hints { path: h.path.clone(), styles: h.styles.clone(), modules }
    })
    .collect();
  if !hints.is_empty() || dist.join(super::headers::FILE).exists() {
    if let Err(err) = super::headers::emit(dist, base, &hints) {
      errors.push(format!("cannot write _headers: {}", err));
    }
  }

  let importmap_path = dist.join("importmap.json");
  if kept.is_empty() {
    std::fs::remove_file(&importmap_path).ok();
  } else {
    let json = serde_json::json!({ "imports": kept });
    if let Err(err) = crate::fs_atomic::write(&importmap_path, json.to_string().as_bytes()) {
      errors.push(format!("cannot write {}: {}", importmap_path.display(), err));
    }
  }

  // Remove bundled modules, except what the service worker still imports.
  let keep: BTreeSet<String> = super::graph::static_closure(input.graph, ["/sw.js"]).into_iter().collect();
  let mut dirs: BTreeSet<PathBuf> = BTreeSet::new();
  for chunk in &manifest.chunks {
    for module in &chunk.modules {
      if keep.contains(module) {
        continue;
      }
      let path = dist.join(module.trim_start_matches('/'));
      if path.is_file() && std::fs::remove_file(&path).is_ok() {
        if let Some(parent) = path.parent() {
          dirs.insert(parent.to_path_buf());
        }
      }
    }
  }
  // Deepest first; remove_dir only succeeds on empty directories.
  let mut dirs: Vec<PathBuf> = dirs.into_iter().collect();
  dirs.sort_by_key(|d| std::cmp::Reverse(d.components().count()));
  for dir in dirs {
    let mut current = Some(dir.as_path());
    while let Some(d) = current {
      if d == dist || std::fs::remove_dir(d).is_err() {
        break;
      }
      current = d.parent();
    }
  }

  if errors.is_empty() {
    Ok(())
  } else {
    Err(errors)
  }
}

/// Point module scripts at their entry chunks, preload each entry's static
/// chunk imports in place of the per-module preloads, and drop the import map
/// (or keep only `kept`).
fn rewrite_html(
  html: &str,
  base: &str,
  entry_of: &HashMap<&str, &str>,
  chunks: &HashMap<&str, &Chunk>,
  href: &dyn Fn(&str) -> String,
  kept: &BTreeMap<String, String>,
) -> String {
  let mut text = super::html::strip_importmap(html);
  // Per-module preloads of the unbundled output (one per line in SSG heads).
  text = text
    .split_inclusive('\n')
    .filter(|line| !line.contains("rel=\"modulepreload\""))
    .collect();

  let scripts = module_scripts(&text);
  let mut out = String::with_capacity(text.len());
  let mut cursor = 0;
  let mut preloaded: BTreeSet<String> = BTreeSet::new();
  for script in &scripts {
    let (Some(src), Some((a, b))) = (&script.src, script.src_range) else { continue };
    let url = strip_base(base, src);
    let Some(file) = entry_of.get(url.as_str()) else { continue };
    // Line start of the <script> tag, for the indentation of the preloads.
    let line_start = text[..script.start].rfind('\n').map_or(0, |i| i + 1);
    let indent: String = text[line_start..script.start].chars().take_while(|c| c.is_whitespace()).collect();
    let insert_at = if text[line_start..script.start].trim().is_empty() { line_start } else { script.start };
    out.push_str(&text[cursor..insert_at]);
    for import in chunk_closure(chunks, file) {
      if preloaded.insert(import.clone()) {
        out.push_str(&format!("{}<link rel=\"modulepreload\" href=\"{}\" />\n", indent, href(&import)));
      }
    }
    out.push_str(&text[insert_at..a]);
    out.push_str(&href(file));
    cursor = b;
  }
  out.push_str(&text[cursor..]);

  if !kept.is_empty() && super::html::is_document(&out) {
    out = super::html::inject_assets(&out, kept);
  }
  out
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn element_and_route_names() {
    assert_eq!(element_name("/elements/primitives/button/index.js", true), "el-button");
    assert_eq!(element_name("/views/code/index.js", false), "el-views-code");
    assert_eq!(element_name("/parts/card.js", false), "el-parts-card");
    assert_eq!(route_group("/"), "route-index");
    assert_eq!(route_group("/docs/intro/start"), "route-docs");
  }

  #[test]
  fn finds_module_scripts() {
    let html = r#"<script type="importmap">{}</script><script type="module" src="/app.js"></script><script>x</script><script type="module">import 'a'</script>"#;
    let scripts = module_scripts(html);
    assert_eq!(scripts.len(), 2);
    assert_eq!(scripts[0].src.as_deref(), Some("/app.js"));
    assert!(scripts[1].src.is_none());
  }

  fn chunk(file: &str, entry: Option<&str>, modules: &[&str], imports: &[&str]) -> Chunk {
    Chunk {
      file: file.into(),
      name: file.into(),
      entry: entry.map(Into::into),
      modules: modules.iter().map(|s| s.to_string()).collect(),
      imports: imports.iter().map(|s| s.to_string()).collect(),
      externals: vec![],
    }
  }

  #[test]
  fn rewrites_entry_script_and_preloads() {
    let app = chunk("assets/app-1.js", Some("/app.js"), &["/app.js"], &["assets/core-2.js"]);
    let core = chunk("assets/core-2.js", None, &["/core/ui/index.js"], &[]);
    let chunks: HashMap<&str, &Chunk> = [("assets/app-1.js", &app), ("assets/core-2.js", &core)].into_iter().collect();
    let entry_of: HashMap<&str, &str> = [("/app.js", "assets/app-1.js")].into_iter().collect();
    let html = "<!DOCTYPE html>\n<html><head>\n  <script type=\"importmap\">\n{}\n  </script>\n  <link rel=\"modulepreload\" href=\"/base/core/ui/index.js\" />\n  <script type=\"module\" src=\"/base/app.js\"></script>\n</head></html>";
    let href = |f: &str| format!("/base/{}", f);
    let out = rewrite_html(html, "/base", &entry_of, &chunks, &href, &BTreeMap::new());
    assert!(!out.contains("importmap"), "{}", out);
    assert!(!out.contains("/base/core/ui/index.js"), "{}", out);
    assert!(
      out.contains("  <link rel=\"modulepreload\" href=\"/base/assets/core-2.js\" />\n  <script type=\"module\" src=\"/base/assets/app-1.js\"></script>"),
      "{}",
      out
    );
  }

  #[test]
  fn groups_pages_elements_and_core() {
    let mut graph: ModuleGraph = BTreeMap::new();
    let edges = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    graph.insert("/app.js".into(), edges(&["/core/ui/index.js", "/docs/a/index.js", "/home/index.js", "/views/x/index.js", "/elements/p/btn/index.js"]));
    graph.insert("/home/index.js".into(), edges(&["/core/ui/index.js"]));
    graph.insert("/docs/a/index.js".into(), edges(&["/core/ui/index.js", "/docs/a/helper.js"]));
    graph.insert("/docs/a/helper.js".into(), vec![]);
    graph.insert("/views/x/index.js".into(), edges(&["/core/ui/index.js"]));
    graph.insert("/elements/p/btn/index.js".into(), edges(&["/core/ui/index.js"]));
    graph.insert("/core/ui/index.js".into(), vec![]);
    let definitions: BTreeMap<String, Vec<String>> = [
      ("/docs/a/index.js".to_string(), vec!["page".to_string()]),
      ("/home/index.js".to_string(), vec!["page".to_string()]),
      ("/views/x/index.js".to_string(), vec!["view".to_string()]),
      ("/elements/p/btn/index.js".to_string(), vec!["element".to_string()]),
    ]
    .into_iter()
    .collect();
    let library: BTreeSet<String> = ["/core/ui/index.js", "/elements/p/btn/index.js"].iter().map(|s| s.to_string()).collect();
    let all = super::super::graph::static_closure(&graph, ["/app.js"]);
    let only_app = vec![
      "/app.js".to_string(),
      "/core/ui/index.js".to_string(),
      "/home/index.js".to_string(),
      "/elements/p/btn/index.js".to_string(),
    ];
    let hints = vec![
      Hints { path: "/docs/a".into(), styles: vec![], modules: all },
      Hints { path: "/".into(), styles: vec![], modules: only_app },
    ];
    let importmap = BTreeMap::new();
    let dir = std::env::temp_dir();
    let input = Input {
      src_dir: &dir,
      dist_dir: &dir,
      graph: &graph,
      definitions: &definitions,
      library: &library,
      importmap: &importmap,
      hints: &hints,
      base: "",
    };
    let inputs: BTreeSet<String> = ["/app.js".to_string()].into_iter().collect();
    let routes: BTreeMap<String, String> = [
      ("/docs/a/index.js".to_string(), "/docs/a".to_string()),
      ("/home/index.js".to_string(), "/".to_string()),
    ]
    .into_iter()
    .collect();
    let groups = plan_groups(&input, &inputs, &routes);
    assert_eq!(groups["/docs/a/index.js"], "route-docs");
    assert_eq!(groups["/docs/a/helper.js"], "route-docs");
    assert_eq!(groups["/views/x/index.js"], "el-views-x");
    assert_eq!(groups["/elements/p/btn/index.js"], "elements");
    assert_eq!(groups["/core/ui/index.js"], "core");
    assert!(!groups.contains_key("/app.js"));
    // Every route loads the home page module: it stays in the entry chunk.
    assert!(!groups.contains_key("/home/index.js"));
  }
}
