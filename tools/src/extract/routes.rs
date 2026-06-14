// tools/src/extract/routes.rs
//
// Emits routes.json and routes.d.ts from all ExtractedSpec entries.
// Warns to stderr when duplicate route patterns are detected.

use std::collections::HashSet;
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

/// A single route record written into routes.json.
#[derive(serde::Serialize)]
struct RouteRecord<'a> {
  tag: &'a str,
  path: &'a str,
  #[serde(skip_serializing_if = "Option::is_none")]
  container: Option<&'a str>,
  /// Ordered container chain (root-to-leaf) a page renders through.
  #[serde(skip_serializing_if = "Vec::is_empty")]
  via: &'a Vec<String>,
  /// Raw extracted segment names (back-compat).
  params: Vec<String>,
  /// Typed cast annotations for path parameters (new contract system).
  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(rename = "paramCast")]
  param_cast: Vec<CastEntry>,
  /// Typed cast annotations for query parameters.
  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(rename = "queryCast")]
  query_cast: Vec<CastEntry>,
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

/// Emits `routes.json` and `routes.d.ts` files to `dist_dir`.
/// Emits `routes.json` and `routes.d.ts` files to `dist_dir`.
pub fn emit(specs: &[(std::path::PathBuf, ExtractedSpec)], dist_dir: &Path) {
  let mut entries: Vec<(RouteRecord, String)> = Vec::new();
  let mut seen: HashSet<String> = HashSet::new();

  let mut tag_to_spec = std::collections::HashMap::new();
  for (_, spec) in specs {
    tag_to_spec.insert(spec.tag.clone(), spec);
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

      if !seen.insert(url.to_string()) {
        eprintln!(
          "[anza] WARNING: Duplicate route pattern \"{}\" defined on <{}>.",
          url, spec.tag
        );
      }

      // Extract raw segment param names (back-compat / trie building).
      let params = extract_params(url);

      let mut layouts = Vec::new();
      let mut templates = Vec::new();
      let mut styles = Vec::new();

      for container_tag in &spec.via {
        if let Some(container_spec) = tag_to_spec.get(container_tag) {
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
            if let Some(ref c) = container_spec.css {
              let resolved = resolve_compile_time_asset_path(f, c);
              if !styles.contains(&resolved) {
                styles.push(resolved);
              }
            }
          }
        }
      }

      // param_cast/query_cast: we move a clone per record (cheap, small Vecs).
      let record = RouteRecord {
        tag: &spec.tag,
        path: url,
        container: spec.container.as_deref(),
        via: &spec.via,
        params,
        param_cast: param_cast.iter().map(|e| CastEntry { name: e.name.clone(), cast: e.cast.clone() }).collect(),
        query_cast: query_cast.iter().map(|e| CastEntry { name: e.name.clone(), cast: e.cast.clone() }).collect(),
        file: spec.file.as_deref(),
        html: spec.html.as_deref(),
        css: spec.css.as_deref(),
        layouts,
        templates,
        styles,
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
    }
  }

  // Sort entries descending by specificity, then descending by path length, then alphabetically
  entries.sort_by(|a, b| {
    let spec_a = specificity(a.0.path);
    let spec_b = specificity(b.0.path);
    if spec_a != spec_b {
      spec_b.cmp(&spec_a)
    } else if a.0.path.len() != b.0.path.len() {
      b.0.path.len().cmp(&a.0.path.len())
    } else {
      a.0.path.cmp(b.0.path)
    }
  });

  // Warn about overlapping route conflicts (excluding exact duplicates which are handled above)
  let mut warned_conflicts = HashSet::new();
  for i in 0..entries.len() {
    for j in i + 1..entries.len() {
      let path_a = entries[i].0.path;
      let path_b = entries[j].0.path;
      if conflict(path_a, path_b) {
        let pair = if path_a < path_b {
          (path_a, path_b)
        } else {
          (path_b, path_a)
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

  std::fs::create_dir_all(dist_dir).ok();
  let dest_json = dist_dir.join("routes.json");

  match serde_json::to_string_pretty(&output) {
    Ok(json) => {
      std::fs::write(&dest_json, json).ok();
      logs::success!("Route manifest written to {}", dest_json.display());
    }
    Err(err) => {
      eprintln!(
        "[anza] ERROR: Failed to serialize routes.json: {}",
        err
      );
    }
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

  let dest_dts = dist_dir.join("routes.d.ts");
  if std::fs::write(&dest_dts, dts_content).is_ok() {
    logs::success!("Route type declarations written to {}", dest_dts.display());
  }
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
      format!("/dist/{}", resolved.to_string_lossy().replace('\\', "/"))
    } else {
      format!("/dist/{}", asset)
    }
  }
}
