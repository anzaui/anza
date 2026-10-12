// tools/src/extract/runner.rs

use std::path::Path;
use std::sync::Arc;
use walkdir::WalkDir;

use swc_common::SourceMap;
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
use swc_ecma_visit::{Visit, VisitWith};

use crate::types::{ExtractedSpec, ParamDecl, PropConfig, QueryDecl, SeoDecl, SsgDecl};

/// Consolidated build compilation stage (always strict).
pub fn build(
  src_dir: &Path,
  dist_dir: &Path,
  entries: &[std::path::PathBuf],
) -> Result<(), Vec<String>> {
  compile(src_dir, dist_dir, true, entries)
}

/// Where `anza build` writes generated type declarations by default: a
/// `types/` folder beside dist (`web/dist` -> `web/types`). The browser never
/// needs `.d.ts` files, so they stay out of dist.
pub fn default_types_dir(dist_dir: &Path) -> std::path::PathBuf {
  match dist_dir.parent() {
    Some(parent) if !parent.as_os_str().is_empty() => parent.join("types"),
    _ => std::path::PathBuf::from("types"),
  }
}

/// Run extraction, import-graph resolution and SSG, collecting every error.
/// Type declarations go to [`default_types_dir`].
///
/// `strict` (build mode) starts from a clean dist and removes it again when
/// any stage fails, so a partial dist is never published. In dev mode the
/// last good dist is kept; the caller logs the errors and keeps serving.
pub fn compile(
  src_dir: &Path,
  dist_dir: &Path,
  strict: bool,
  entries: &[std::path::PathBuf],
) -> Result<(), Vec<String>> {
  compile_into(src_dir, dist_dir, &default_types_dir(dist_dir), strict, entries)
}

/// [`compile`] with an explicit type declarations directory.
pub fn compile_into(
  src_dir: &Path,
  dist_dir: &Path,
  types_dir: &Path,
  strict: bool,
  entries: &[std::path::PathBuf],
) -> Result<(), Vec<String>> {
  let mut errors: Vec<String> = Vec::new();
  let mut outputs: Vec<std::path::PathBuf> = Vec::new();

  // Production build: start from a clean slate so deleted source files
  // never linger in the output. Dev mode keeps the old dist alive — the
  // hash cache handles incremental copies and the browser never gets 404s.
  if strict && dist_dir.exists() {
    if let Err(err) = std::fs::remove_dir_all(dist_dir) {
      return Err(vec![format!("cannot clean {}: {}", dist_dir.display(), err)]);
    }
  }
  if let Err(err) = std::fs::create_dir_all(dist_dir) {
    return Err(vec![format!("cannot create {}: {}", dist_dir.display(), err)]);
  }

  // 2. Type/route/tag extraction (writes dist/routes.json, the .d.ts files
  //    into types_dir, and .tags.json siblings in src).
  match run(src_dir, dist_dir, types_dir) {
    Ok(written) => outputs.extend(written),
    Err(errs) => errors.extend(errs),
  }

  // 3. Import-graph resolution -> minimal, browser-native dist.
  match crate::build::resolve(src_dir, dist_dir, entries, !strict) {
    Ok(report) => {
      for w in &report.warnings {
        crate::build::graph::report_line(w);
      }
      anza_logs::success!(
        "Resolved {} modules -> {} files copied into {}",
        report.modules,
        report.copied,
        dist_dir.display()
      );
      outputs.extend(report.outputs);

      // 4. Mode A SSG — contentful HTML with open DSD for public routes.
      //    Runs in build AND dev: otherwise `anza dev` recopies page fragments
      //    over dist/<route>/index.html and soft-nav/CSR fetch nested docs chrome
      //    (stacked dock-docs sidebars). emit() preserves fragments as template.html.
      match crate::build::ssg::emit_with(src_dir, dist_dir, &report.module_graph) {
        Ok(stats) => outputs.extend(stats.outputs),
        Err(errs) => errors.extend(errs),
      }
    }
    Err(diags) => {
      errors.extend(diags.iter().map(|d| d.to_string()));
    }
  }

  if errors.is_empty() {
    if !strict {
      // Dev keeps dist between builds: drop outputs of deleted sources/routes.
      remove_orphans(dist_dir, &outputs);
    }
    return Ok(());
  }
  if strict {
    // Do not publish a partial dist on a failed build.
    std::fs::remove_dir_all(dist_dir).ok();
  }
  Err(errors)
}

/// Delete files under `dist_dir` that the last successful compile did not
/// produce (deleted pages, routes, assets), then any directories left empty.
pub fn remove_orphans(dist_dir: &Path, outputs: &[std::path::PathBuf]) {
  let keep: std::collections::HashSet<&Path> = outputs.iter().map(|p| p.as_path()).collect();
  let mut dirs = Vec::new();
  for entry in WalkDir::new(dist_dir).min_depth(1).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    if entry.file_type().is_dir() {
      dirs.push(path.to_path_buf());
      continue;
    }
    let Ok(rel) = path.strip_prefix(dist_dir) else {
      continue;
    };
    if !keep.contains(rel) {
      match std::fs::remove_file(path) {
        Ok(()) => anza_logs::compiler!("Removed orphan {}", path.display()),
        Err(err) => anza_logs::warn!("cannot remove orphan {}: {}", path.display(), err),
      }
    }
  }
  // Deepest first; remove_dir only succeeds on empty directories.
  dirs.sort_by_key(|d| std::cmp::Reverse(d.components().count()));
  for dir in dirs {
    let _ = std::fs::remove_dir(&dir);
  }
}

/// Log every collected compile error.
pub fn report_errors(errors: &[String]) {
  for err in errors {
    anza_logs::error!("{}", err);
  }
}

/// Dev pipeline: log compile errors and keep serving the last good output.
pub fn compile_dev(src_dir: &Path, dist_dir: &Path, entries: &[std::path::PathBuf]) {
  if let Err(errors) = compile(src_dir, dist_dir, false, entries) {
    report_errors(&errors);
    anza_logs::warn!(
      "Build has {} error(s); still serving the last good output",
      errors.len()
    );
  }
}

/// Extract element specs, write `dist/routes.json`, the type declarations
/// (`index.d.ts`, `routes.d.ts`, one `.d.ts` per definition) into `types_dir`
/// and the `.tags.json` descriptors. Returns every error (unreadable or
/// unparsable files, failed writes) instead of silently dropping pages.
///
/// On success returns the dist files written (relative to dist).
pub fn run(
  src_dir: &Path,
  dist_dir: &Path,
  types_dir: &Path,
) -> Result<Vec<std::path::PathBuf>, Vec<String>> {
  let dist_types_dir = types_dir;
  let mut written_types: Vec<std::path::PathBuf> = Vec::new();
  let mut outputs: Vec<std::path::PathBuf> = Vec::new();
  let mut errors: Vec<String> = Vec::new();

  // Collect all paths to parallelize with Rayon
  let mut paths: Vec<std::path::PathBuf> = Vec::new();
  for entry in WalkDir::new(src_dir).sort_by_file_name() {
    match entry {
      Ok(e) if e.file_type().is_file() => paths.push(e.path().to_path_buf()),
      Ok(_) => {}
      Err(err) => errors.push(format!("cannot walk {}: {}", src_dir.display(), err)),
    }
  }

  let cm = Arc::new(SourceMap::default());

  use rayon::prelude::*;

  // Parallel walk & parse — import graph handles element selection naturally
  let results: Vec<Result<Vec<(std::path::PathBuf, ExtractedSpec)>, String>> = paths
    .par_iter()
    .map(|path| {
      if path.extension().map_or(false, |ext| ext == "js") {
        let file_specs = parse_element_file(path, &cm)?;
        Ok(file_specs.into_iter().map(|spec| (path.clone(), spec)).collect())
      } else if path.extension().map_or(false, |ext| ext == "html") {
        anza_logs::compiler!("Found HTML: {:?}", path);
        super::html::parse_and_emit(path).map_err(|err| {
          format!("cannot generate tags descriptor for {}: {}", path.display(), err)
        })?;
        Ok(Vec::new())
      } else {
        Ok(Vec::new())
      }
    })
    .collect();

  let mut specs = Vec::new();
  for res in results {
    match res {
      Ok(file_specs) => specs.extend(file_specs),
      Err(err) => errors.push(err),
    }
  }

  for (file_path, spec) in &mut specs {
    let relative_path = file_path.strip_prefix(src_dir).unwrap_or(file_path);
    spec.file = Some(relative_path.to_string_lossy().to_string().replace('\\', "/"));
  }

  // Validate params/query contract after all specs have file paths.
  // Emits [WARN] for every undeclared dynamic segment — never aborts compilation.
  for (_, spec) in &specs {
    if spec.kind == "page" || spec.kind == "dock" {
      if let Some(ref file) = spec.file {
        validate_route_contract(spec, file);
      }
    }
  }


  // 2. Write individual .d.ts files and the main index.d.ts
  if let Err(err) = std::fs::create_dir_all(dist_types_dir) {
    errors.push(format!("cannot create {}: {}", dist_types_dir.display(), err));
  }

  let mut global_typings = String::new();
  global_typings.push_str("/* Auto-generated by anza. Do not edit. */\n\n");
  global_typings.push_str("declare global {\n  interface HTMLElementTagNameMap {\n");

  for (file_path, spec) in &specs {
    let relative_path = file_path.strip_prefix(src_dir).unwrap_or(file_path);
    let mut type_path = dist_types_dir.join(relative_path);
    type_path.set_extension("d.ts");
    // Write the custom element interface declaration
    written_types.push(type_path.clone());
    let dts_content = generate_dts_content(spec);
    if let Err(err) = crate::fs_atomic::write(&type_path, dts_content.as_bytes()) {
      errors.push(err);
    }

    // Add to global HTMLElementTagNameMap augmentation
    let element_class_name = to_pascal_case(&spec.tag);
    anza_logs::compiler!(
      "Extracted element metadata: <{}> -> {}Element",
      spec.tag,
      element_class_name
    );

    global_typings.push_str(&format!(
      "    \"{}\": import(\"./{}\").{}Element;\n",
      spec.tag,
      relative_path
        .to_string_lossy()
        .replace('\\', "/")
        .trim_end_matches(".js"),
      element_class_name
    ));
  }

  global_typings.push_str("  }\n}\n\nexport {};\n");
  match crate::fs_atomic::write(&dist_types_dir.join("index.d.ts"), global_typings.as_bytes()) {
    Ok(()) => {
      anza_logs::success!("Type declarations written to {}", dist_types_dir.display())
    }
    Err(err) => errors.push(err),
  }

  // Emit routes.json (dist) and routes.d.ts (types) for every url pattern.
  if let Err(errs) = super::routes::emit(&specs, dist_dir, dist_types_dir, src_dir) {
    errors.extend(errs);
  }

  if errors.is_empty() {
    written_types.push(dist_types_dir.join("index.d.ts"));
    written_types.push(dist_types_dir.join("routes.d.ts"));
    prune_types(dist_types_dir, &written_types);
    outputs.push(std::path::PathBuf::from("routes.json"));
    Ok(outputs)
  } else {
    Err(errors)
  }
}

/// First bytes of every declaration file anza generates. Only files that start
/// with one of these are ever deleted from the types directory.
const GENERATED_MARKERS: [&str; 3] = [
  "/* Auto-generated by anza.",
  "/* Auto-generated definition for <",
  "/**\n * routes.d.ts\n",
];

/// Remove generated `.d.ts` files left in `types_dir` by deleted sources.
/// Hand-written files (no generated header) are never touched.
fn prune_types(types_dir: &Path, written: &[std::path::PathBuf]) {
  let keep: std::collections::HashSet<&Path> = written.iter().map(|p| p.as_path()).collect();
  for entry in WalkDir::new(types_dir).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    if !entry.file_type().is_file()
      || keep.contains(path)
      || !path.to_string_lossy().ends_with(".d.ts")
    {
      continue;
    }
    let generated = std::fs::read_to_string(path)
      .map(|text| GENERATED_MARKERS.iter().any(|m| text.starts_with(m)))
      .unwrap_or(false);
    if generated {
      let _ = std::fs::remove_file(path);
    }
  }
}

/// Parse one JS file for definition calls. Unreadable or unparsable files are
/// errors: silently skipping them used to drop pages from routes.json.
fn parse_element_file(file_path: &Path, cm: &Arc<SourceMap>) -> Result<Vec<ExtractedSpec>, String> {
  let fm = cm
    .load_file(file_path)
    .map_err(|e| format!("cannot read {}: {}", file_path.display(), e))?;

  let lexer = Lexer::new(
    Syntax::Es(Default::default()),
    Default::default(),
    StringInput::from(&*fm),
    None,
  );

  let mut parser = Parser::new_from(lexer);
  let program = match parser.parse_program() {
    Ok(p) => p,
    Err(err) => {
      let (line, col) = crate::build::graph::pos(cm, swc_common::Spanned::span(&err));
      return Err(format!(
        "[syntax] {}:{}:{} {:?}",
        file_path.display(),
        line,
        col,
        err.kind()
      ));
    }
  };

  // Run immutability lint check
  let mut lint_visitor = ImmutabilityVisitor {
    store_vars: std::collections::HashSet::new(),
    file_name: file_path.to_string_lossy().to_string(),
  };
  program.visit_with(&mut lint_visitor);

  let mut visitor = ElementVisitor::default();
  program.visit_with(&mut visitor);

  Ok(visitor.specs)
}

#[derive(Default)]
struct ElementVisitor {
  specs: Vec<ExtractedSpec>,
}

impl Visit for ElementVisitor {
  fn visit_call_expr(&mut self, call: &CallExpr) {

    if let Callee::Expr(expr) = &call.callee {
      match &**expr {
        // Member calls: ui.element(...) / ui.container(...)
        Expr::Member(member) => {
          if let (Expr::Ident(obj), MemberProp::Ident(prop)) = (&*member.obj, &member.prop) {
            if obj.sym == "ui" && (prop.sym == "element" || prop.sym == "container") {
              let kind = if prop.sym == "container" { "container" } else { "element" };
              self.capture(kind, call);
            }
          }
        }
        // Top-level definition calls: page() / dock() / view() / part()
        Expr::Ident(ident) => {
          let kind = match ident.sym.as_ref() {
            "page" => Some("page"),
            "dock" => Some("dock"),
            "view" => Some("view"),
            "part" => Some("part"),
            _ => None,
          };
          if let Some(kind) = kind {
            self.capture(kind, call);
          }
        }
        _ => {}
      }
    }

    call.visit_children_with(self);
  }
}

impl ElementVisitor {
  /// Builds an ExtractedSpec from a definition call of the given kind.
  ///
  /// The first argument and tag source depend on the kind:
  ///   page(route, config)  -> url = route,  tag = config.tag
  ///   dock(name, config)   -> tag = config.tag || "dock-" + name, parent = config.parent
  ///   view(tag, config)    -> tag = first arg
  ///   part(tag, config)    -> tag = first arg
  ///   ui.element(tag, ...) -> tag = first arg
  ///   ui.container(tag,..) -> tag = first arg
  fn capture(&mut self, kind: &str, call: &CallExpr) {
    // dock(name) is valid with only the graph key; other defs need a config object.
    let min_args = if kind == "dock" { 1 } else { 2 };
    if call.args.len() < min_args {
      return;
    }

    // First arg may be a single route string or an array of route strings.
    let route_strings = get_string_or_array_literal(&call.args[0].expr);
    let first = route_strings.first().cloned();

    let mut spec = ExtractedSpec {
      tag: String::new(),
      kind: kind.to_string(),
      props: Default::default(),
      methods: Vec::new(),
      url: None,
      routes: Vec::new(),
      container: None,
      via: Vec::new(),
      parent: None,
      name: None,
      meta: Default::default(),
      seo: None,
      ssg: None,
      params: Vec::new(),
      query_params: Vec::new(),
      ..Default::default()
    };

    // Pages register URL patterns. Docks take a graph name (not a route).
    if kind == "page" {
      spec.routes = route_strings.clone();
      spec.url = first.clone();
    } else if kind == "dock" {
      spec.name = first.clone();
    }

    if call.args.len() >= 2 {
      if let Expr::Object(obj_lit) = &*call.args[1].expr {
        parse_spec_object(obj_lit, &mut spec);
      }
    }

    // A page's render target is the last container in its `via` chain unless an
    // explicit `container` was given.
    if kind == "page" && spec.container.is_none() {
      if let Some(last) = spec.via.last() {
        spec.container = Some(last.clone());
      }
    }

    // Resolve the tag per kind.
    match kind {
      "page" | "dock" | "container" | "element" => {
        // page/dock take tag from config; fall back for dock.
        if spec.tag.is_empty() {
          if kind == "dock" {
            if let Some(name) = &first {
              spec.tag = format!("dock-{}", name);
            }
          } else if kind != "page" {
            // ui.element/ui.container take tag from the first argument.
            if let Some(t) = &first {
              spec.tag = t.clone();
            }
          }
        }
      }
      "view" | "part" => {
        if let Some(t) = &first {
          spec.tag = t.clone();
        }
      }
      _ => {}
    }

    if !spec.tag.is_empty() {
      self.specs.push(spec);
    }
  }
}

fn get_string_literal(expr: &Expr) -> Option<String> {
  match expr {
    Expr::Lit(Lit::Str(s)) => {
      let str_val = s.value.as_str()?;
      Some(str_val.to_string())
    }
    _ => None,
  }
}

/// Returns a vec of route strings from either a string literal or an array of
/// string literals. e.g. `'/blog'` -> `['/blog']`,
/// `['/blog', '/blog/:slug']` -> `["/blog", "/blog/:slug"]`.
fn get_string_or_array_literal(expr: &Expr) -> Vec<String> {
  match expr {
    Expr::Lit(Lit::Str(s)) => {
      if let Some(v) = s.value.as_str() {
        vec![v.to_string()]
      } else {
        vec![]
      }
    }
    Expr::Array(arr) => arr
      .elems
      .iter()
      .flatten()
      .filter_map(|el| get_string_literal(&el.expr))
      .collect(),
    _ => vec![],
  }
}

fn parse_spec_object(obj: &ObjectLit, spec: &mut ExtractedSpec) {
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(key) = &kv.key {
          if key.sym == "props" {
            if let Expr::Object(props_obj) = &*kv.value {
              parse_props(props_obj, spec);
            }
          } else if key.sym == "methods" {
            // `methods` may be an object map (legacy) or, under the new defs,
            // helpers live under `on`. Both forms collect method names.
            if let Expr::Object(methods_obj) = &*kv.value {
              parse_methods(methods_obj, spec);
            }
          } else if key.sym == "on" {
            if let Expr::Object(on_obj) = &*kv.value {
              parse_methods(on_obj, spec);
            }
          } else if key.sym == "tag" {
            if let Some(t) = get_string_literal(&kv.value) {
              spec.tag = t;
            }
          } else if key.sym == "url" {
            spec.url = get_string_literal(&kv.value);
          } else if key.sym == "container" {
            spec.container = get_string_literal(&kv.value);
          } else if key.sym == "via" {
            if let Expr::Array(arr) = &*kv.value {
              for el in arr.elems.iter().flatten() {
                if let Some(name) = get_string_literal(&el.expr) {
                  spec.via.push(name);
                }
              }
            }
          } else if key.sym == "parent" {
            spec.parent = get_string_literal(&kv.value);
          } else if key.sym == "meta" {
            if let Expr::Object(meta_obj) = &*kv.value {
              parse_meta(meta_obj, spec);
            }
          } else if key.sym == "seo" {
            if let Expr::Object(seo_obj) = &*kv.value {
              parse_seo(seo_obj, spec);
            }
          } else if key.sym == "ssg" {
            if let Expr::Object(ssg_obj) = &*kv.value {
              parse_ssg(ssg_obj, spec);
            }
          } else if key.sym == "params" {
            // `params: [{ name: 'slug', type: String }, ...]`
            if let Expr::Array(arr) = &*kv.value {
              parse_params_array(arr, spec);
            }
          } else if key.sym == "query" {
            // `query: [{ name: 'tab', type: String }, ...]`
            // Note: the old scalar query (string array) form is ignored here;
            // the new form is always an array of {name, type} objects.
            if let Expr::Array(arr) = &*kv.value {
              // Distinguish object-array from string-array by inspecting first element.
              let is_obj_array = arr
                .elems
                .first()
                .and_then(|e| e.as_ref())
                .map(|e| matches!(*e.expr, Expr::Object(_)))
                .unwrap_or(false);
              if is_obj_array {
                parse_query_array(arr, spec);
              }
            }
          } else if key.sym == "template" {
            if let Some(t) = get_string_literal(&kv.value) {
              if t.starts_with("./") || t.starts_with("../") || t.ends_with(".html") {
                spec.html = Some(t);
              }
            } else if let Expr::Object(template_obj) = &*kv.value {
              for t_prop in &template_obj.props {
                if let PropOrSpread::Prop(tp) = t_prop {
                  if let Prop::KeyValue(tkv) = &**tp {
                    if let PropName::Ident(tkey) = &tkv.key {
                      if tkey.sym == "html" {
                        spec.html = get_string_literal(&tkv.value);
                      } else if tkey.sym == "css" {
                        spec.css = get_string_or_array_literal(&tkv.value)
                          .into_iter()
                          .filter(|s| s.ends_with(".css") || ((s.starts_with("./") || s.starts_with("../") || s.starts_with('/')) && !s.starts_with("/*") && !s.contains('{')))
                          .collect();
                      }
                    }
                  }
                }
              }
            }
          } else if key.sym == "style" {
            spec.css = get_string_or_array_literal(&kv.value)
              .into_iter()
              .filter(|s| s.ends_with(".css") || ((s.starts_with("./") || s.starts_with("../") || s.starts_with('/')) && !s.starts_with("/*") && !s.contains('{')))
              .collect();
          }
        }
      }
    }
  }
}

/// Parses `params: [{ name: 'slug', type: String }, ...]`.
/// Each entry must have at minimum a `name`. `type` is read as an identifier
/// (String / Number) and normalized to "string" / "number".
fn parse_params_array(arr: &ArrayLit, spec: &mut ExtractedSpec) {
  for elem in arr.elems.iter().flatten() {
    if let Expr::Object(obj) = &*elem.expr {
      let mut decl = ParamDecl {
        name: String::new(),
        cast: "string".to_string(),
      };
      for p in &obj.props {
        if let PropOrSpread::Prop(pp) = p {
          if let Prop::KeyValue(kv) = &**pp {
            if let PropName::Ident(k) = &kv.key {
              if k.sym == "name" {
                if let Some(n) = get_string_literal(&kv.value) {
                  decl.name = n;
                }
              } else if k.sym == "type" {
                if let Expr::Ident(id) = &*kv.value {
                  decl.cast = match id.sym.as_ref() {
                    "Number" => "number".to_string(),
                    _ => "string".to_string(),
                  };
                }
              }
            }
          }
        }
      }
      if !decl.name.is_empty() {
        spec.params.push(decl);
      }
    }
  }
}

/// Parses `query: [{ name: 'tab', type: String }, ...]`.
fn parse_query_array(arr: &ArrayLit, spec: &mut ExtractedSpec) {
  for elem in arr.elems.iter().flatten() {
    if let Expr::Object(obj) = &*elem.expr {
      let mut decl = QueryDecl {
        name: String::new(),
        cast: "string".to_string(),
      };
      for p in &obj.props {
        if let PropOrSpread::Prop(pp) = p {
          if let Prop::KeyValue(kv) = &**pp {
            if let PropName::Ident(k) = &kv.key {
              if k.sym == "name" {
                if let Some(n) = get_string_literal(&kv.value) {
                  decl.name = n;
                }
              } else if k.sym == "type" {
                if let Expr::Ident(id) = &*kv.value {
                  decl.cast = match id.sym.as_ref() {
                    "Number" => "number".to_string(),
                    _ => "string".to_string(),
                  };
                }
              }
            }
          }
        }
      }
      if !decl.name.is_empty() {
        spec.query_params.push(decl);
      }
    }
  }
}

/// Extracts `:name` segment names from a URL pattern string.
/// e.g. "/blog/:slug" -> ["slug"]
fn extract_segment_params(pattern: &str) -> Vec<String> {
  pattern
    .split('/')
    .filter_map(|seg| {
      seg.strip_prefix(':')
        .map(|n| n.trim_end_matches(|c| c == '?' || c == '+' || c == '*').to_string())
    })
    .filter(|n| !n.is_empty())
    .collect()
}

/// Validates the declared `params` contract against the dynamic segments found
/// in the registered route patterns. Emits `[WARN]` (never errors) for any
/// `:name` segment that has no matching entry in `spec.params`.
pub fn validate_route_contract(spec: &ExtractedSpec, file: &str) {
  // Build a set of declared param names for O(1) lookup.
  let declared: std::collections::HashSet<&str> =
    spec.params.iter().map(|p| p.name.as_str()).collect();

  let routes: &[String] = if !spec.routes.is_empty() {
    &spec.routes
  } else if let Some(ref u) = spec.url {
    std::slice::from_ref(u)
  } else {
    return;
  };

  for pattern in routes {
    for seg_name in extract_segment_params(pattern) {
      if !declared.contains(seg_name.as_str()) {
        anza_logs::warn!(
          "[anza] WARN  <{}> in {} — route \"{}\" has dynamic segment \":{}\"\
 but no matching entry in the `params` array. \
 The library will inject it as a String. Add `{{ name: '{}', type: String }}` to silence.",
          spec.tag, file, pattern, seg_name, seg_name
        );
      }
    }
  }
}

fn parse_props(obj: &ObjectLit, spec: &mut ExtractedSpec) {
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(key) = &kv.key {
          let prop_name = key.sym.to_string();
          let mut config = PropConfig::default();

          if let Expr::Object(config_obj) = &*kv.value {
            for c_prop in &config_obj.props {
              if let PropOrSpread::Prop(cp) = c_prop {
                if let Prop::KeyValue(ckv) = &**cp {
                  if let PropName::Ident(ckey) = &ckv.key {
                    if ckey.sym == "type" {
                      if let Expr::Ident(type_ident) = &*ckv.value {
                        config.prop_type = type_ident.sym.to_string();
                      }
                    } else if ckey.sym == "reflect" {
                      if let Expr::Lit(Lit::Bool(b)) = &*ckv.value {
                        config.reflect = b.value;
                      }
                    } else if ckey.sym == "state" {
                      if let Expr::Lit(Lit::Bool(b)) = &*ckv.value {
                        config.state = b.value;
                      }
                    } else if ckey.sym == "default" {
                      config.default = Some("any".to_string());
                    }
                  }
                }
              }
            }
          }

          spec.props.insert(prop_name, config);
        }
      }
    }
  }
}

fn parse_methods(obj: &ObjectLit, spec: &mut ExtractedSpec) {
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      match &**p {
        Prop::KeyValue(kv) => {
          if let PropName::Ident(key) = &kv.key {
            spec.methods.push(key.sym.to_string());
          }
        }
        Prop::Method(m) => {
          if let PropName::Ident(key) = &m.key {
            spec.methods.push(key.sym.to_string());
          }
        }
        _ => {}
      }
    }
  }
}

fn parse_meta(obj: &ObjectLit, spec: &mut ExtractedSpec) {
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(key) = &kv.key {
          if let Some(val) = get_string_literal(&kv.value) {
            spec.meta.insert(key.sym.to_string(), val);
          }
        }
      }
    }
  }
}

/// Parses `seo: { title, description, canonical?, image? }` from page config.
fn parse_seo(obj: &ObjectLit, spec: &mut ExtractedSpec) {
  let mut seo = SeoDecl::default();
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(key) = &kv.key {
          if let Some(val) = get_string_literal(&kv.value) {
            match key.sym.as_ref() {
              "title" => seo.title = Some(val),
              "description" => seo.description = Some(val),
              "canonical" => seo.canonical = Some(val),
              "image" => seo.image = Some(val),
              _ => {}
            }
          }
        }
      }
    }
  }
  spec.seo = Some(seo);
}

/// Parses `ssg: { expand: […] }` — build-time parametric route expansion.
///
/// Expand entries may be:
/// - `{ slug: 'foo' }` object maps
/// - `'foo'` string when the pattern has a single `:param`
/// - `'/docs/…/foo'` full concrete path (matched against the page pattern later)
fn parse_ssg(obj: &ObjectLit, spec: &mut ExtractedSpec) {
  let mut ssg = SsgDecl::default();
  for prop in &obj.props {
    if let PropOrSpread::Prop(p) = prop {
      if let Prop::KeyValue(kv) = &**p {
        if let PropName::Ident(key) = &kv.key {
          if key.sym == "expand" {
            if let Expr::Array(arr) = &*kv.value {
              for elem in arr.elems.iter().flatten() {
                if let Some(entry) = parse_expand_entry(&elem.expr) {
                  ssg.expand.push(entry);
                }
              }
            }
          }
        }
      }
    }
  }
  spec.ssg = Some(ssg);
}

fn parse_expand_entry(expr: &Expr) -> Option<std::collections::BTreeMap<String, String>> {
  match expr {
    Expr::Object(obj) => {
      let mut map = std::collections::BTreeMap::new();
      for prop in &obj.props {
        if let PropOrSpread::Prop(p) = prop {
          if let Prop::KeyValue(kv) = &**p {
            let key = match &kv.key {
              PropName::Ident(id) => id.sym.to_string(),
              PropName::Str(s) => s.value.as_str()?.to_string(),
              _ => continue,
            };
            if let Some(val) = get_string_literal(&kv.value) {
              map.insert(key, val);
            } else if let Expr::Lit(Lit::Num(n)) = &*kv.value {
              map.insert(key, n.value.to_string());
            }
          }
        }
      }
      if map.is_empty() {
        None
      } else {
        Some(map)
      }
    }
    Expr::Lit(Lit::Str(s)) => {
      let v = s.value.as_str()?.to_string();
      // Shorthand: single bare value OR full concrete path (resolved in routes emit).
      let mut map = std::collections::BTreeMap::new();
      map.insert("__path__".to_string(), v);
      Some(map)
    }
    _ => None,
  }
}

fn generate_dts_content(spec: &ExtractedSpec) -> String {
  let mut content = String::new();
  let class_name = to_pascal_case(&spec.tag);

  content.push_str(&format!(
    "/* Auto-generated definition for <{}>. Do not edit. */\n\n",
    spec.tag
  ));
  content.push_str(&format!(
    "export interface {}Element extends HTMLElement {{\n",
    class_name
  ));

  // Properties typing mapping
  for (name, config) in &spec.props {
    let ts_type = match config.prop_type.as_str() {
      "Boolean" => "boolean",
      "Number" => "number",
      "String" => "string",
      _ => "any",
    };
    content.push_str(&format!("  {}: {};\n", name, ts_type));
  }

  // Methods typing mapping
  for method in &spec.methods {
    content.push_str(&format!("  {}(...args: any[]): any;\n", method));
  }

  // A dock exposes the router-driven swap method for content replacement.
  if spec.kind == "dock" {
    content.push_str("  swap(el: HTMLElement, options?: { direction?: string }): Promise<void>;\n");
  }

  content.push_str("}\n");
  content
}

fn to_pascal_case(s: &str) -> String {
  let mut result = String::new();
  let mut capitalize = true;
  for c in s.chars() {
    if c == '-' {
      capitalize = true;
    } else if capitalize {
      result.push(c.to_ascii_uppercase());
      capitalize = false;
    } else {
      result.push(c);
    }
  }
  // Remove "Ui" prefix from start if it starts with "Ui"
  if result.starts_with("Ui") {
    result.split_off(2)
  } else {
    result
  }
}

struct ImmutabilityVisitor {
  store_vars: std::collections::HashSet<String>,
  file_name: String,
}

impl Visit for ImmutabilityVisitor {
  fn visit_var_declarator(&mut self, node: &VarDeclarator) {
    if let Some(init) = &node.init {
      if let Expr::Call(call) = &**init {
        if let Callee::Expr(callee_expr) = &call.callee {
          if let Expr::Member(member) = &**callee_expr {
            if let MemberProp::Ident(prop) = &member.prop {
              if prop.sym == "get" {
                if let Pat::Ident(binding) = &node.name {
                  self.store_vars.insert(binding.id.sym.to_string());
                }
              }
            }
          }
        }
      }
    }
    node.visit_children_with(self);
  }

  fn visit_assign_expr(&mut self, node: &AssignExpr) {
    if let AssignTarget::Simple(simple) = &node.left {
      if let SimpleAssignTarget::Member(member) = simple {
        if let Expr::Ident(obj_ident) = &*member.obj {
          if self.store_vars.contains(&obj_ident.sym.to_string()) {
            anza_logs::warn!(
							"Immutability Violation in {}: mutating property '{}' of store-retrieved variable '{}' directly. Use store.set() instead.",
							self.file_name,
							get_member_prop_name(&member.prop),
							obj_ident.sym
						);
          }
        }
      }
    }
    node.visit_children_with(self);
  }

  fn visit_update_expr(&mut self, node: &UpdateExpr) {
    if let Expr::Member(member) = &*node.arg {
      if let Expr::Ident(obj_ident) = &*member.obj {
        if self.store_vars.contains(&obj_ident.sym.to_string()) {
          anza_logs::warn!(
						"Immutability Violation in {}: updating property '{}' of store-retrieved variable '{}' directly. Use store.set() instead.",
						self.file_name,
						get_member_prop_name(&member.prop),
						obj_ident.sym
					);
        }
      }
    }
    node.visit_children_with(self);
  }
}

fn get_member_prop_name(prop: &MemberProp) -> String {
  match prop {
    MemberProp::Ident(id) => id.sym.to_string(),
    _ => "?".to_string(),
  }
}
