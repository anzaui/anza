// tools/src/extract/routes.rs
//
// Emits routes.json and routes.d.ts from all ExtractedSpec entries.
// Warns to stderr when duplicate route patterns are detected.
//
// Parametric routes (path params / wildcards) need a build-time expansion
// manifest (`page({ ssg: { expand } })` and/or `ssg.params.json`) to emit SSG
// HTML; without expansion, `ssg` stays false (Mode B or CSR).

use std::collections::{BTreeMap, HashSet};
use std::path::Path;

use crate::types::ExtractedSpec;

/// Cast annotation for a single param or query entry emitted into routes.json.
/// The JS library reads this at navigation time to know whether to run
/// `Number(value)` before setting the property on the element.
#[derive(serde::Serialize)]
struct CastEntry {
  name: String,
  /// "string" | "number"
  cast: String,
}

/// SEO metadata written into each route record for SSG HTML head composition.
#[derive(serde::Serialize, Clone)]
struct SeoRecord {
  title: String,
  description: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  canonical: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  image: Option<String>,
}

/// A single route record written into routes.json.
#[derive(serde::Serialize)]
struct RouteRecord<'a> {
  tag: &'a str,
  path: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  container: Option<&'a str>,
  /// Ordered container chain (root-to-leaf) a page renders through.
  #[serde(skip_serializing_if = "Vec::is_empty")]
  via: &'a Vec<String>,
  /// Raw extracted segment names (back-compat). Empty on expanded concrete paths.
  params: Vec<String>,
  /// Typed cast annotations for path parameters (new contract system).
  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(rename = "paramCast")]
  param_cast: Vec<CastEntry>,
  /// Typed cast annotations for query parameters.
  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(rename = "queryCast")]
  query_cast: Vec<CastEntry>,
  /// Indexable / public URL (v1: `/` and `/docs/**`).
  public: bool,
  /// Eligible for build-time SSG HTML (public + no unexpanded params).
  ssg: bool,
  /// Title/description (and optional canonical/image) for SSG `<head>`.
  seo: SeoRecord,
  /// Concrete param values used to expand this path (SSG HTML interpolation).
  #[serde(skip_serializing_if = "BTreeMap::is_empty")]
  #[serde(rename = "ssgParams")]
  ssg_params: BTreeMap<String, String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  file: Option<&'a str>,
  #[serde(skip_serializing_if = "Option::is_none")]
  html: Option<&'a str>,
  #[serde(skip_serializing_if = "Option::is_none")]
  css: Option<&'a str>,
  #[serde(skip_serializing_if = "Vec::is_empty")]
  layouts: Vec<String>,
  #[serde(skip_serializing_if = "Vec::is_empty")]
  templates: Vec<String>,
  #[serde(skip_serializing_if = "Vec::is_empty")]
  styles: Vec<String>,
}

fn to_pascal_case(s: &str) -> String {
  let mut result = String::new();
  let mut capitalize = true;
  for c in s.chars() {
    if c == '-' || c == '_' || c == ':' {
      capitalize = true;
    } else if capitalize {
      result.extend(c.to_uppercase());
      capitalize = false;
    } else {
      result.push(c);
    }
  }
  result
}

/// v1 public convention: site root and docs tree.
fn is_public_route(path: &str) -> bool {
  path == "/" || path.starts_with("/docs")
}

/// SSG only for public static paths. Parametric routes without a build-time
/// expansion (see `ssg.expand` / `ssg.params.json`) are not emitted as HTML
/// files (`ssg: false`). Expanded concrete paths have empty `params` and qualify.
fn is_ssg_route(path: &str, params: &[String]) -> bool {
  if !is_public_route(path) {
    return false;
  }
  if !params.is_empty() {
    return false;
  }
  // Catch wildcards / `:param` not yet listed in `params`.
  if path.contains('*') || path.contains(':') {
    return false;
  }
  true
}

fn humanize_segment(raw: &str) -> String {
  let trimmed = raw
    .trim_start_matches("page-")
    .trim_start_matches("doc-");
  trimmed
    .split(|c| c == '-' || c == '_')
    .filter(|p| !p.is_empty())
    .map(|p| {
      let mut chars = p.chars();
      match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
      }
    })
    .collect::<Vec<_>>()
    .join(" ")
}

fn derive_title(tag: &str, path: &str) -> String {
  let segment = path.trim_matches('/').rsplit('/').next().unwrap_or("");
  if !segment.is_empty() {
    let title = humanize_segment(segment);
    if !title.is_empty() {
      return title;
    }
  }
  let from_tag = humanize_segment(tag);
  if from_tag.is_empty() {
    path.to_string()
  } else {
    from_tag
  }
}

fn resolve_seo(spec: &ExtractedSpec, path: &str) -> SeoRecord {
  let title = spec
    .seo
    .as_ref()
    .and_then(|s| s.title.clone())
    .or_else(|| spec.meta.get("title").cloned())
    .unwrap_or_else(|| derive_title(&spec.tag, path));

  let description = spec
    .seo
    .as_ref()
    .and_then(|s| s.description.clone())
    .unwrap_or_default();

  let canonical = spec.seo.as_ref().and_then(|s| s.canonical.clone());
  let image = spec.seo.as_ref().and_then(|s| s.image.clone());

  SeoRecord {
    title,
    description,
    canonical,
    image,
  }
}

fn interpolate_seo(seo: SeoRecord, values: &BTreeMap<String, String>) -> SeoRecord {
  SeoRecord {
    title: interpolate_str(&seo.title, values),
    description: interpolate_str(&seo.description, values),
    canonical: seo.canonical.map(|c| interpolate_str(&c, values)),
    image: seo.image.map(|i| interpolate_str(&i, values)),
  }
}

/// Replace `{{name}}` placeholders with expansion values.
fn interpolate_str(input: &str, values: &BTreeMap<String, String>) -> String {
  let mut out = input.to_string();
  for (k, v) in values {
    out = out.replace(&format!("{{{{{}}}}}", k), v);
  }
  out
}

/// Load optional `ssg.params.json` from `src_dir` or its parent (project root).
///
/// Shape: `{ "/docs/guides/:slug": [ { "slug": "foo" }, "bar" ] }`
fn load_ssg_params_manifest(src_dir: &Path) -> BTreeMap<String, Vec<BTreeMap<String, String>>> {
  let candidates = [
    src_dir.join("ssg.params.json"),
    src_dir
      .parent()
      .map(|p| p.join("ssg.params.json"))
      .unwrap_or_else(|| src_dir.join("ssg.params.json")),
  ];
  for path in &candidates {
    let Ok(text) = std::fs::read_to_string(path) else {
      continue;
    };
    let Ok(raw) = serde_json::from_str::<serde_json::Value>(&text) else {
      eprintln!(
        "[anza] WARNING: Invalid ssg.params.json at {} — ignoring.",
        path.display()
      );
      continue;
    };
    let Some(obj) = raw.as_object() else {
      continue;
    };
    let mut out: BTreeMap<String, Vec<BTreeMap<String, String>>> = BTreeMap::new();
    for (pattern, entries) in obj {
      let Some(arr) = entries.as_array() else {
        continue;
      };
      let mut list = Vec::new();
      for entry in arr {
        if let Some(map) = json_expand_entry(entry) {
          list.push(map);
        }
      }
      if !list.is_empty() {
        out.insert(pattern.clone(), list);
      }
    }
    if !out.is_empty() {
      anza_logs::info!("Loaded SSG param expansions from {}", path.display());
      return out;
    }
  }
  BTreeMap::new()
}

fn json_expand_entry(value: &serde_json::Value) -> Option<BTreeMap<String, String>> {
  match value {
    serde_json::Value::Object(obj) => {
      let mut map = BTreeMap::new();
      for (k, v) in obj {
        let s = match v {
          serde_json::Value::String(s) => s.clone(),
          serde_json::Value::Number(n) => n.to_string(),
          serde_json::Value::Bool(b) => b.to_string(),
          _ => continue,
        };
        map.insert(k.clone(), s);
      }
      if map.is_empty() {
        None
      } else {
        Some(map)
      }
    }
    serde_json::Value::String(s) => {
      let mut map = BTreeMap::new();
      map.insert("__path__".to_string(), s.clone());
      Some(map)
    }
    _ => None,
  }
}

/// Normalize an expand entry against a route pattern into concrete param values.
fn resolve_expand_values(
  pattern: &str,
  raw: &BTreeMap<String, String>,
) -> Option<BTreeMap<String, String>> {
  if let Some(path) = raw.get("__path__") {
    if path.starts_with('/') {
      return match match_path_to_pattern(pattern, path) {
        Some(map) => Some(map),
        None => {
          eprintln!(
            "[anza] WARNING: SSG expand path {:?} does not match pattern \"{}\"",
            path, pattern
          );
          None
        }
      };
    }
    // Bare value: fill the sole `:param` in the pattern.
    let params = extract_params(pattern);
    if params.len() == 1 {
      let mut map = BTreeMap::new();
      map.insert(params[0].clone(), path.clone());
      return Some(map);
    }
    eprintln!(
      "[anza] WARNING: SSG expand shorthand {:?} needs exactly one :param in \"{}\"",
      path, pattern
    );
    return None;
  }
  // Object map — require every pattern param to be present.
  let params = extract_params(pattern);
  let mut map = BTreeMap::new();
  for name in &params {
    match raw.get(name) {
      Some(v) if !v.is_empty() && !v.contains('/') => {
        map.insert(name.clone(), v.clone());
      }
      _ => {
        eprintln!(
          "[anza] WARNING: SSG expand for \"{}\" missing param \"{}\"",
          pattern, name
        );
        return None;
      }
    }
  }
  // Allow extra keys (ignored) but must cover all params.
  if map.len() != params.len() {
    return None;
  }
  Some(map)
}

/// SSG param values become path segments of `dist/<route>/index.html`: each
/// must be a plain non-empty name. `.`/`..`, `/`, `\`, `:` and NUL are
/// rejected (they could write outside dist or reach another route).
pub fn check_param_value(name: &str, value: &str) -> Result<(), String> {
  if value.is_empty() || value == "." || value == ".." || value.contains(['/', '\\', ':', '\0']) {
    return Err(format!(
      "param `{}` value {:?} is not allowed (no empty, `.`, `..`, `/`, `\\`, `:` or NUL)",
      name, value
    ));
  }
  Ok(())
}

fn check_param_values(values: &BTreeMap<String, String>) -> Result<(), String> {
  values.iter().try_for_each(|(k, v)| check_param_value(k, v))
}

fn match_path_to_pattern(pattern: &str, concrete: &str) -> Option<BTreeMap<String, String>> {
  let pat_segs: Vec<&str> = pattern.split('/').filter(|s| !s.is_empty()).collect();
  let con_segs: Vec<&str> = concrete.split('/').filter(|s| !s.is_empty()).collect();
  if pat_segs.len() != con_segs.len() {
    return None;
  }
  let mut map = BTreeMap::new();
  for (p, c) in pat_segs.iter().zip(con_segs.iter()) {
    if let Some(name) = p.strip_prefix(':') {
      let clean = name.trim_end_matches(|ch| ch == '?' || ch == '+' || ch == '*');
      if clean.is_empty() || c.is_empty() || c.contains('/') {
        return None;
      }
      map.insert(clean.to_string(), (*c).to_string());
    } else if *p != *c {
      return None;
    }
  }
  Some(map)
}

fn expand_path(pattern: &str, values: &BTreeMap<String, String>) -> Option<String> {
  let mut parts = Vec::new();
  let leading = pattern.starts_with('/');
  for seg in pattern.split('/') {
    if seg.is_empty() {
      continue;
    }
    if let Some(name) = seg.strip_prefix(':') {
      let clean = name.trim_end_matches(|ch| ch == '?' || ch == '+' || ch == '*');
      let val = values.get(clean)?;
      if val.is_empty() || val.contains('/') {
        return None;
      }
      parts.push(val.as_str());
    } else if seg.contains('*') {
      // Wildcard expansion is not supported in v1 — leave Mode B / CSR.
      return None;
    } else {
      parts.push(seg);
    }
  }
  let joined = parts.join("/");
  if leading {
    Some(format!("/{}", joined))
  } else if joined.is_empty() {
    Some("/".to_string())
  } else {
    Some(joined)
  }
}

/// Look up a via-chain container by dock name, tag, or `dock-{name}` fallback.
fn resolve_container<'a>(
  name: &str,
  tag_to_spec: &std::collections::BTreeMap<String, &'a ExtractedSpec>,
  dock_name_to_spec: &std::collections::BTreeMap<String, &'a ExtractedSpec>,
) -> Option<&'a ExtractedSpec> {
  dock_name_to_spec
    .get(name)
    .copied()
    .or_else(|| tag_to_spec.get(name).copied())
    .or_else(|| tag_to_spec.get(&format!("dock-{}", name)).copied())
}

/// Emits `routes.json` to `dist_dir` and `routes.d.ts` to `types_dir`.
///
/// `src_dir` is used to load an optional project-level `ssg.params.json`.
pub fn emit(
  specs: &[(std::path::PathBuf, ExtractedSpec)],
  dist_dir: &Path,
  types_dir: &Path,
  src_dir: &Path,
) -> Result<(), Vec<String>> {
  let mut entries: Vec<(RouteRecord, String)> = Vec::new();
  let mut errors: Vec<String> = Vec::new();
  // Output key (trailing slash ignored) -> who registered it. A second claim
  // on the same key is an error naming both sources.
  let mut seen: BTreeMap<String, String> = BTreeMap::new();
  let file_expansions = load_ssg_params_manifest(src_dir);

  let mut tag_to_spec = std::collections::BTreeMap::new();
  let mut dock_name_to_spec = std::collections::BTreeMap::new();
  for (_, spec) in specs {
    tag_to_spec.insert(spec.tag.clone(), spec);
    if spec.kind == "dock" {
      if let Some(ref name) = spec.name {
        dock_name_to_spec.insert(name.clone(), spec);
      }
    }
  }

  let mut element_interfaces = Vec::new();
  let mut tag_mappings = Vec::new();

  for (_path, spec) in specs {
    // Collect types information for element
    let class_name = format!("{}Element", to_pascal_case(&spec.tag));
    let mut props_decl = Vec::new();
    for (prop_name, prop_config) in &spec.props {
      let ts_type = match prop_config.prop_type.as_str() {
        "boolean" => "boolean",
        "number" => "number",
        "string" => "string",
        _ => "any",
      };
      props_decl.push(format!("  {}: {};", prop_name, ts_type));
    }

    // Add path param types from contract declaration
    for pd in &spec.params {
      let ts_type = if pd.cast == "number" { "number" } else { "string" };
      props_decl.push(format!("  {}: {};", pd.name, ts_type));
    }
    // Add query param types from contract declaration
    for qd in &spec.query_params {
      let ts_type = if qd.cast == "number" { "number" } else { "string" };
      props_decl.push(format!("  {}: {};", qd.name, ts_type));
    }

    let mut methods_decl = Vec::new();
    for method_name in &spec.methods {
      methods_decl.push(format!("  {}(...args: any[]): any;", method_name));
    }

    // A dock exposes the router-driven swap method for content replacement.
    if spec.kind == "dock" {
      methods_decl.push(
        "  swap(el: HTMLElement, options?: { direction?: string }): Promise<void>;".to_string()
      );
    }

    element_interfaces.push(format!(
      "export interface {} extends HTMLElement {{\n{}\n{}\n}}",
      class_name,
      props_decl.join("\n"),
      methods_decl.join("\n")
    ));

    tag_mappings.push(format!("    \"{}\": {};", spec.tag, class_name));

    // Only pages produce navigable route records (docks are layout lookup only).
    if spec.kind != "page" {
      continue;
    }

    // Determine effective route list: multi-route array takes precedence over
    // the legacy single `url` field.
    let effective_routes: Vec<&str> = if !spec.routes.is_empty() {
      spec.routes.iter().map(|s| s.as_str()).collect()
    } else if let Some(ref u) = spec.url {
      vec![u.as_str()]
    } else {
      vec![]
    };

    // Build cast annotation arrays once — shared across all route patterns of
    // this spec (same component, same contract).
    let param_cast: Vec<CastEntry> = spec
      .params
      .iter()
      .map(|p| CastEntry { name: p.name.clone(), cast: p.cast.clone() })
      .collect();
    let query_cast: Vec<CastEntry> = spec
      .query_params
      .iter()
      .map(|q| CastEntry { name: q.name.clone(), cast: q.cast.clone() })
      .collect();

    for url in effective_routes {
      if url.is_empty() {
        continue;
      }

      if let Err(err) = claim_route(&mut seen, url, &route_source(spec, url)) {
        errors.push(err);
        continue;
      }

      // Extract raw segment param names (back-compat / trie building).
      let params = extract_params(url);
      let public = is_public_route(url);
      let ssg = is_ssg_route(url, &params);
      let seo = resolve_seo(spec, url);

      let mut layouts = Vec::new();
      let mut templates = Vec::new();
      let mut styles = Vec::new();

      for container_name in &spec.via {
        if let Some(container_spec) =
          resolve_container(container_name, &tag_to_spec, &dock_name_to_spec)
        {
          if let Some(ref f) = container_spec.file {
            if !layouts.contains(f) {
              layouts.push(f.clone());
            }
            if let Some(ref h) = container_spec.html {
              let resolved = resolve_compile_time_asset_path(f, h);
              if !templates.contains(&resolved) {
                templates.push(resolved);
              }
            }
            for c in &container_spec.css {
              let resolved = resolve_compile_time_asset_path(f, c);
              if !styles.contains(&resolved) {
                styles.push(resolved);
              }
            }
          }
        }
      }

      if let Some(ref f) = spec.file {
        for c in &spec.css {
          let resolved = resolve_compile_time_asset_path(f, c);
          if !styles.contains(&resolved) {
            styles.push(resolved);
          }
        }
      }

      // param_cast/query_cast: we move a clone per record (cheap, small Vecs).
      let record = RouteRecord {
        tag: &spec.tag,
        path: url.to_string(),
        container: spec.container.as_deref(),
        via: &spec.via,
        params: params.clone(),
        param_cast: param_cast.iter().map(|e| CastEntry { name: e.name.clone(), cast: e.cast.clone() }).collect(),
        query_cast: query_cast.iter().map(|e| CastEntry { name: e.name.clone(), cast: e.cast.clone() }).collect(),
        public,
        ssg,
        seo,
        ssg_params: BTreeMap::new(),
        file: spec.file.as_deref(),
        html: spec.html.as_deref(),
        css: spec.css.first().map(|s| s.as_str()),
        layouts: layouts.clone(),
        templates: templates.clone(),
        styles: styles.clone(),
      };

      let container_str = match &spec.container {
        Some(c) => format!("container: \"{}\"", c),
        None => "container?: never".to_string(),
      };

      let mut meta_pairs = Vec::new();
      for (k, v) in &spec.meta {
        if v == "true" || v == "false" {
          meta_pairs.push(format!("\"{}\": {}", k, v));
        } else if v.parse::<f64>().is_ok() {
          meta_pairs.push(format!("\"{}\": {}", k, v));
        } else {
          meta_pairs.push(format!("\"{}\": \"{}\"", k, v));
        }
      }
      let meta_str = if meta_pairs.is_empty() {
        "meta: {}".to_string()
      } else {
        format!("meta: {{ {} }}", meta_pairs.join(", "))
      };

      let route_map_entry = format!(
        "  \"{}\": {{ {}, {} }};",
        url, container_str, meta_str
      );

      entries.push((record, route_map_entry));

      // Phase 5: emit concrete SSG paths from page-level + file expansions.
      if params.is_empty() {
        continue;
      }
      let mut expand_list: Vec<BTreeMap<String, String>> = Vec::new();
      if let Some(ref ssg_decl) = spec.ssg {
        expand_list.extend(ssg_decl.expand.iter().cloned());
      }
      if let Some(file_list) = file_expansions.get(url) {
        expand_list.extend(file_list.iter().cloned());
      }
      for raw in expand_list {
        let Some(values) = resolve_expand_values(url, &raw) else {
          continue;
        };
        if let Err(err) = check_param_values(&values) {
          errors.push(format!("{}: ssg expansion of \"{}\": {}", route_source(spec, url), url, err));
          continue;
        }
        let Some(concrete) = expand_path(url, &values) else {
          continue;
        };
        let source = format!("{} expanded from \"{}\"", route_source(spec, &concrete), url);
        if let Err(err) = claim_route(&mut seen, &concrete, &source) {
          errors.push(err);
          continue;
        }
        let expanded_seo = interpolate_seo(resolve_seo(spec, &concrete), &values);
        let expanded_seo = SeoRecord {
          canonical: expanded_seo.canonical.or_else(|| Some(concrete.clone())),
          ..expanded_seo
        };
        let expanded = RouteRecord {
          tag: &spec.tag,
          path: concrete.clone(),
          container: spec.container.as_deref(),
          via: &spec.via,
          params: Vec::new(),
          param_cast: Vec::new(),
          query_cast: query_cast
            .iter()
            .map(|e| CastEntry {
              name: e.name.clone(),
              cast: e.cast.clone(),
            })
            .collect(),
          public: is_public_route(&concrete),
          ssg: is_ssg_route(&concrete, &[]),
          seo: expanded_seo,
          ssg_params: values,
          file: spec.file.as_deref(),
          html: spec.html.as_deref(),
          css: spec.css.first().map(|s| s.as_str()),
          layouts: layouts.clone(),
          templates: templates.clone(),
          styles: styles.clone(),
        };
        let expanded_map = format!(
          "  \"{}\": {{ {}, {} }};",
          concrete, container_str, meta_str
        );
        entries.push((expanded, expanded_map));
      }
    }
  }

  // Sort entries descending by specificity, then descending by path length, then alphabetically
  entries.sort_by(|a, b| {
    let spec_a = specificity(&a.0.path);
    let spec_b = specificity(&b.0.path);
    if spec_a != spec_b {
      spec_b.cmp(&spec_a)
    } else if a.0.path.len() != b.0.path.len() {
      b.0.path.len().cmp(&a.0.path.len())
    } else {
      a.0.path.cmp(&b.0.path)
    }
  });

  // Warn about overlapping route conflicts (excluding exact duplicates which are handled above).
  // Skip pattern↔expansion pairs — those are intentional (client match + Mode A HTML).
  let mut warned_conflicts = HashSet::new();
  for i in 0..entries.len() {
    for j in i + 1..entries.len() {
      let path_a = entries[i].0.path.as_str();
      let path_b = entries[j].0.path.as_str();
      if is_pattern_expansion_pair(path_a, path_b) {
        continue;
      }
      if conflict(path_a, path_b) {
        let pair = if path_a < path_b {
          (path_a.to_string(), path_b.to_string())
        } else {
          (path_b.to_string(), path_a.to_string())
        };
        if warned_conflicts.insert(pair) {
          eprintln!(
            "[anza] WARNING: Route pattern conflict: \"{}\" overlaps with \"{}\"",
            path_a, path_b
          );
        }
      }
    }
  }

  // Decompose entries back into records and route_map_entries
  let mut records = Vec::new();
  let mut route_map_entries = Vec::new();
  for (rec, entry) in entries {
    records.push(rec);
    route_map_entries.push(entry);
  }

  // Write routes.json
  let output = serde_json::json!({
    "version": 1,
    "routes": records,
  });

  if let Err(err) = std::fs::create_dir_all(dist_dir) {
    errors.push(format!("cannot create {}: {}", dist_dir.display(), err));
  }
  let dest_json = dist_dir.join("routes.json");

  match serde_json::to_string_pretty(&output) {
    Ok(json) => match crate::fs_atomic::write(&dest_json, json) {
      Ok(()) => anza_logs::success!("Route manifest written to {}", dest_json.display()),
      Err(err) => errors.push(err),
    },
    Err(err) => errors.push(format!("cannot serialize routes.json: {}", err)),
  }

  // Write routes.d.ts
  let dts_content = format!(
    r#"/**
 * routes.d.ts
 *
 * Automatically generated by anza. Do not edit manually.
 */

export interface RouteMeta {{
  title?: string;
  auth?: boolean;
  [key: string]: any;
}}

export interface RouteMap {{
{}
}}

{}

declare global {{
  interface HTMLElementTagNameMap {{
{}
  }}
}}
"#,
    route_map_entries.join("\n"),
    element_interfaces.join("\n\n"),
    tag_mappings.join("\n")
  );

  let dest_dts = types_dir.join("routes.d.ts");
  match crate::fs_atomic::write(&dest_dts, dts_content) {
    Ok(()) => anza_logs::success!("Route type declarations written to {}", dest_dts.display()),
    Err(err) => errors.push(err),
  }

  if errors.is_empty() {
    Ok(())
  } else {
    Err(errors)
  }
}

/// Route key used for collision checks: `/x` and `/x/` are the same output.
fn route_key(path: &str) -> String {
  if path.len() > 1 {
    path.trim_end_matches('/').to_string()
  } else {
    path.to_string()
  }
}

fn route_source(spec: &ExtractedSpec, path: &str) -> String {
  format!(
    "\"{}\" on <{}> in {}",
    path,
    spec.tag,
    spec.file.as_deref().unwrap_or("?")
  )
}

/// Register `path` for `source`; a second claim on the same key is an error.
fn claim_route(seen: &mut BTreeMap<String, String>, path: &str, source: &str) -> Result<(), String> {
  let key = route_key(path);
  if let Some(first) = seen.get(&key) {
    return Err(format!("duplicate route {}: {} and {}", key, first, source));
  }
  seen.insert(key, source.to_string());
  Ok(())
}

fn specificity(path: &str) -> u8 {
  if path == "*" {
    return 0;
  }
  let has_wildcard = path.contains('*');
  let has_param = path.contains(':');

  if !has_wildcard && !has_param {
    3 // Static
  } else if !has_wildcard && has_param {
    2 // Parameter
  } else {
    1 // Wildcard
  }
}

fn conflict(path_a: &str, path_b: &str) -> bool {
  if path_a == path_b {
    return false;
  }
  let segs_a: Vec<&str> = path_a.split('/').filter(|s| !s.is_empty()).collect();
  let segs_b: Vec<&str> = path_b.split('/').filter(|s| !s.is_empty()).collect();

  if segs_a.len() != segs_b.len() {
    return false;
  }

  for i in 0..segs_a.len() {
    let sa = segs_a[i];
    let sb = segs_b[i];
    let is_dyn_a = sa.starts_with(':') || sa == "*" || sa.contains('*');
    let is_dyn_b = sb.starts_with(':') || sb == "*" || sb.contains('*');

    if !is_dyn_a && !is_dyn_b && sa != sb {
      return false; // Static mismatch, they do not overlap
    }
  }

  true
}

/// True when one path is a parametric pattern and the other is a concrete expansion of it.
fn is_pattern_expansion_pair(a: &str, b: &str) -> bool {
  let a_params = extract_params(a);
  let b_params = extract_params(b);
  if !a_params.is_empty() && b_params.is_empty() {
    return match_path_to_pattern(a, b).is_some();
  }
  if !b_params.is_empty() && a_params.is_empty() {
    return match_path_to_pattern(b, a).is_some();
  }
  false
}

/// Extracts named URLPattern param names from a path pattern string.
/// e.g. "/members/:member/posts/:post" -> ["member", "post"]
fn extract_params(pattern: &str) -> Vec<String> {
  let mut params = Vec::new();
  for segment in pattern.split('/') {
    if let Some(name) = segment.strip_prefix(':') {
      // Strip any trailing modifier characters like ? + *
      let clean = name.trim_end_matches(|c| c == '?' || c == '+' || c == '*');
      if !clean.is_empty() {
        params.push(clean.to_string());
      }
    }
  }
  params
}

fn resolve_compile_time_asset_path(file: &str, asset: &str) -> String {
  if asset.starts_with('/') {
    asset.to_string()
  } else {
    let path = Path::new(file);
    if let Some(parent) = path.parent() {
      let resolved = parent.join(asset);
      let mut parts = Vec::new();
      for component in resolved.components() {
        match component {
          std::path::Component::ParentDir => {
            parts.pop();
          }
          std::path::Component::CurDir => {}
          std::path::Component::Normal(c) => {
            parts.push(c.to_string_lossy());
          }
          _ => {}
        }
      }
      format!("/{}", parts.join("/"))
    } else {
      format!("/{}", asset)
    }
  }
}


#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn param_values_must_be_plain_names() {
    for bad in ["", ".", "..", "a/b", "..\\x", "C:x", "a\0b"] {
      assert!(check_param_value("slug", bad).is_err(), "{bad:?}");
    }
    for ok in ["foo", "v1.2", "...", "a..b", "<b>"] {
      assert!(check_param_value("slug", ok).is_ok(), "{ok:?}");
    }
  }

  #[test]
  fn expand_path_fills_params() {
    let mut values = BTreeMap::new();
    values.insert("slug".into(), "foo".into());
    assert_eq!(
      expand_path("/docs/ssg/expand/:slug", &values).as_deref(),
      Some("/docs/ssg/expand/foo")
    );
  }

  #[test]
  fn resolve_expand_shorthand_and_path() {
    let mut bare = BTreeMap::new();
    bare.insert("__path__".into(), "foo".into());
    let v = resolve_expand_values("/docs/x/:slug", &bare).unwrap();
    assert_eq!(v.get("slug").map(String::as_str), Some("foo"));

    let mut full = BTreeMap::new();
    full.insert("__path__".into(), "/docs/x/bar".into());
    let v2 = resolve_expand_values("/docs/x/:slug", &full).unwrap();
    assert_eq!(v2.get("slug").map(String::as_str), Some("bar"));
  }

  #[test]
  fn interpolate_seo_placeholders() {
    let mut values = BTreeMap::new();
    values.insert("slug".into(), "foo".into());
    let seo = SeoRecord {
      title: "T {{slug}}".into(),
      description: "D {{slug}}".into(),
      canonical: Some("/p/{{slug}}".into()),
      image: None,
    };
    let out = interpolate_seo(seo, &values);
    assert_eq!(out.title, "T foo");
    assert_eq!(out.description, "D foo");
    assert_eq!(out.canonical.as_deref(), Some("/p/foo"));
  }

  #[test]
  fn pattern_expansion_pair_detected() {
    assert!(is_pattern_expansion_pair(
      "/docs/ssg/expand/:slug",
      "/docs/ssg/expand/foo"
    ));
    assert!(!is_pattern_expansion_pair(
      "/docs/ssg/expand/:slug",
      "/docs/other/foo"
    ));
  }

  #[test]
  fn unexpanded_parametric_not_ssg() {
    assert!(!is_ssg_route("/docs/ssg/expand/:slug", &["slug".into()]));
    assert!(is_ssg_route("/docs/ssg/expand/foo", &[]));
  }
}
