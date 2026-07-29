// tools/src/build/base.rs
//
// Subpath / base-path support for static hosting (e.g. GitHub Pages at /repo/).

use std::path::{Path, PathBuf};

/// Read deploy base from `ssg.json` beside the project root (parent of `dist/`).
pub fn load_deploy_base(dist_dir: &Path) -> String {
  let candidates = [
    dist_dir
      .parent()
      .map(|p| p.join("ssg.json"))
      .unwrap_or_else(|| dist_dir.join("ssg.json")),
    dist_dir.join("ssg.json"),
  ];
  for path in candidates {
    let Ok(content) = std::fs::read_to_string(&path) else {
      continue;
    };
    let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) else {
      continue;
    };
    if let Some(base) = json.get("base").and_then(|v| v.as_str()) {
      let normalized = normalize_base(base);
      if !normalized.is_empty() {
        return normalized;
      }
    }
  }
  if let Ok(env_base) = std::env::var("ANZA_BASE_PATH") {
    let normalized = normalize_base(&env_base);
    if !normalized.is_empty() {
      return normalized;
    }
  }
  String::new()
}

/// Strip a deploy base prefix from an incoming request path (dev server mirror).
pub fn strip_base_prefix(path: &str, base: &str) -> String {
  let base = normalize_base(base);
  if base.is_empty() {
    return path.to_string();
  }
  if path == base {
    return "/".to_string();
  }
  let prefix = format!("{}/", base);
  if path.starts_with(&prefix) {
    let rest = &path[base.len()..];
    return if rest.is_empty() {
      "/".to_string()
    } else {
      rest.to_string()
    };
  }
  path.to_string()
}

/// Normalized deploy base path: `""` for site root, otherwise `/anza` (no trailing slash).
pub fn normalize_base(raw: &str) -> String {
  let mut s = raw.trim().to_string();
  if s.is_empty() || s == "/" {
    return String::new();
  }
  if !s.starts_with('/') {
    s.insert(0, '/');
  }
  while s.ends_with('/') && s.len() > 1 {
    s.pop();
  }
  s
}

/// Prefix a site-root path with the deploy base (idempotent).
pub fn with_base(base: &str, path: &str) -> String {
  let base = normalize_base(base);
  let path = path.trim();
  if base.is_empty() {
    return path.to_string();
  }
  if path.starts_with("http://") || path.starts_with("https://") || path.starts_with("//") {
    return path.to_string();
  }
  if path == base || path.starts_with(&format!("{}/", base)) {
    return path.to_string();
  }
  if path == "/" {
    return format!("{}/", base);
  }
  let suffix = path.trim_start_matches('/');
  format!("{}/{}", base, suffix)
}

/// Inline script that exposes deploy base to the client router (before app.js).
pub fn base_script_tag(base: &str) -> String {
  let base = normalize_base(base);
  if base.is_empty() {
    return String::new();
  }
  format!(
    "  <script>globalThis.__ANZA_BASE__={};</script>\n",
    serde_json::to_string(&base).unwrap_or_else(|_| "\"\"".into())
  )
}

/// Rewrite root-absolute `href`/`src` (and similar) attributes in HTML.
pub fn rewrite_html_urls(html: &str, base: &str) -> String {
  let base = normalize_base(base);
  if base.is_empty() {
    return html.to_string();
  }

  let mut out = String::with_capacity(html.len() + 64);
  let mut i = 0usize;
  let bytes = html.as_bytes();
  let attr_needles: &[&[u8]] = &[
    b"href=\"/",
    b"href='/",
    b"src=\"/",
    b"src='/",
    b"content=\"/",
    b"content='/",
  ];

  while i < bytes.len() {
    let mut earliest: Option<(usize, usize)> = None; // (pos, needle_len)
    for needle in attr_needles {
      if let Some(rel) = html[i..].find(std::str::from_utf8(needle).unwrap_or("")) {
        let pos = i + rel;
        if earliest.map_or(true, |(ep, _)| pos < ep) {
          earliest = Some((pos, needle.len()));
        }
      }
    }

    let Some((pos, needle_len)) = earliest else {
      out.push_str(&html[i..]);
      break;
    };

    out.push_str(&html[i..pos]);
    let prefix = &html[pos..pos + needle_len];
    out.push_str(prefix);

    let value_start = pos + needle_len;
    let quote = if prefix.contains('"') { '"' } else { '\'' };
    let value_end = html[value_start..]
      .find(quote)
      .map(|j| value_start + j)
      .unwrap_or(bytes.len());

    let path = &html[value_start..value_end];
    let rewritten = with_base(&base, &format!("/{}", path.trim_start_matches('/')));
    let trimmed = rewritten.trim_start_matches('/');
    out.push_str(trimmed);
    out.push(quote as char);
    i = value_end + 1;
  }

  out
}

/// Inject the client base-path bootstrap script before the first module script.
pub fn inject_base_script(html: &str, base: &str) -> String {
  let tag = base_script_tag(base);
  if tag.is_empty() {
    return html.to_string();
  }
  if html.contains("globalThis.__ANZA_BASE__") {
    return html.to_string();
  }
  if let Some(pos) = html.find("<script type=\"module\"") {
    let mut out = String::with_capacity(html.len() + tag.len());
    out.push_str(&html[..pos]);
    out.push_str(&tag);
    out.push_str(&html[pos..]);
    return out;
  }
  if let Some(pos) = html.find("</head>") {
    let mut out = String::with_capacity(html.len() + tag.len());
    out.push_str(&html[..pos]);
    out.push_str(&tag);
    out.push_str(&html[pos..]);
    return out;
  }
  format!("{}{}", tag, html)
}

/// Rewrite root-absolute paths inside inline `<script type="importmap">` blocks.
pub fn rewrite_inline_importmaps(html: &str, base: &str) -> String {
  let base = normalize_base(base);
  if base.is_empty() {
    return html.to_string();
  }

  let open = "<script type=\"importmap\">";
  let mut out = String::new();
  let mut rest = html;

  while let Some(start) = rest.find(open) {
    out.push_str(&rest[..start]);
    let after_open = &rest[start..];
    let Some(close_rel) = after_open.find("</script>") else {
      out.push_str(after_open);
      return out;
    };
    let end = start + close_rel + "</script>".len();
    let block = &rest[start..end];
    let inner_start = open.len();
    let inner_end = block.len() - "</script>".len();
    let (open_tag, inner, close_tag) = (
      &block[..inner_start],
      rewrite_importmap_json_paths(&block[inner_start..inner_end], &base),
      &block[inner_end..],
    );
    out.push_str(open_tag);
    out.push_str(&inner);
    out.push_str(close_tag);
    rest = &rest[end..];
  }
  out.push_str(rest);
  out
}

fn rewrite_importmap_json_paths(json: &str, base: &str) -> String {
  let base = normalize_base(base);
  if base.is_empty() {
    return json.to_string();
  }

  let mut out = String::new();
  let mut i = 0usize;
  let value_marker = "\": \"/";

  while i < json.len() {
    let Some(rel) = json[i..].find(value_marker) else {
      out.push_str(&json[i..]);
      break;
    };
    let pos = i + rel;
    out.push_str(&json[i..pos + value_marker.len()]);
    let after = pos + value_marker.len();
    let already = format!("{}/", base.trim_start_matches('/'));
    if json[after..].starts_with(&already) {
      let Some(end_rel) = json[after..].find('"') else {
        out.push_str(&json[after..]);
        break;
      };
      out.push_str(&json[after..after + end_rel]);
      out.push('"');
      i = after + end_rel + 1;
      continue;
    }
    let Some(end_rel) = json[after..].find('"') else {
      out.push_str(&json[after..]);
      break;
    };
    let segment = &json[after..after + end_rel];
    let path = format!("/{}", segment.trim_start_matches('/'));
    let rewritten = with_base(&base, &path);
    out.push_str(rewritten.trim_start_matches('/'));
    out.push('"');
    i = after + end_rel + 1;
  }

  out
}

pub fn rewrite_js_root_literals(source: &str, base: &str) -> String {
  let base = normalize_base(base);
  if base.is_empty() {
    return source.to_string();
  }

  let mut out = source.to_string();
  let replacements = [
    ("'/sw.js'", &format!("'{}/sw.js'", base)),
    ("\"/sw.js\"", &format!("\"{}/sw.js\"", base)),
    ("'/index.html'", &format!("'{}/index.html'", base)),
    ("\"/index.html\"", &format!("\"{}/index.html\"", base)),
    ("'/app.js'", &format!("'{}/app.js'", base)),
    ("\"/app.js\"", &format!("\"{}/app.js\"", base)),
    ("'/tokens/index.css'", &format!("'{}/tokens/index.css'", base)),
    ("\"/tokens/index.css\"", &format!("\"{}/tokens/index.css\"", base)),
    ("'/styles/index.css'", &format!("'{}/styles/index.css'", base)),
    ("\"/styles/index.css\"", &format!("\"{}/styles/index.css\"", base)),
    ("'/favicon.ico'", &format!("'{}/favicon.ico'", base)),
    ("\"/favicon.ico\"", &format!("\"{}/favicon.ico\"", base)),
    ("path === '/favicon.ico'", &format!("path === '{}/favicon.ico'", base)),
  ];
  for (from, to) in replacements {
    out = out.replace(from, to);
  }
  out
}

fn walk_html_files(dir: &Path, out: &mut Vec<PathBuf>) {
  let Ok(entries) = std::fs::read_dir(dir) else {
    return;
  };
  for entry in entries.flatten() {
    let path = entry.path();
    if path.is_dir() {
      if path.file_name().and_then(|n| n.to_str()) == Some("node_modules") {
        continue;
      }
      walk_html_files(&path, out);
    } else if path.file_name().and_then(|n| n.to_str()) == Some("index.html") {
      out.push(path);
    }
  }
}

/// Apply base-path rewrites across dist HTML and selected JS after SSG.
pub fn apply_to_dist(dist_dir: &Path, base: &str) {
  let base = normalize_base(base);
  if base.is_empty() {
    return;
  }

  let mut html_files = Vec::new();
  walk_html_files(dist_dir, &mut html_files);

  for path in &html_files {
    let Ok(content) = std::fs::read_to_string(path) else {
      continue;
    };
    let mut next = rewrite_html_urls(&content, &base);
    next = rewrite_inline_importmaps(&next, &base);
    next = inject_base_script(&next, &base);
    if next != content {
      let _ = std::fs::write(path, next);
    }
  }

  for rel in ["index.html", "app.js", "sw.js"] {
    let path = dist_dir.join(rel);
    let Ok(content) = std::fs::read_to_string(&path) else {
      continue;
    };
    let next = if rel.ends_with(".html") {
      let step = rewrite_html_urls(&content, &base);
      let step = rewrite_inline_importmaps(&step, &base);
      inject_base_script(&step, &base)
    } else {
      rewrite_js_root_literals(&content, &base)
    };
    if next != content {
      let _ = std::fs::write(path, next);
    }
  }

  rewrite_importmap(dist_dir, &base);

  anza_logs::success!(
    "Base path {:?} applied to {}",
    base,
    dist_dir.display()
  );
}

/// Prefix root-absolute values in dist/importmap.json and inline import maps.
fn rewrite_importmap(dist_dir: &Path, base: &str) {
  let path = dist_dir.join("importmap.json");
  let Ok(content) = std::fs::read_to_string(&path) else {
    return;
  };
  let next = rewrite_importmap_json_paths(&content, base);
  if next != content {
    let _ = std::fs::write(&path, next);
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn normalize_base_paths() {
    assert_eq!(normalize_base(""), "");
    assert_eq!(normalize_base("/"), "");
    assert_eq!(normalize_base("/anza/"), "/anza");
    assert_eq!(normalize_base("anza"), "/anza");
  }

  #[test]
  fn with_base_prefixes() {
    assert_eq!(with_base("/anza", "/app.js"), "/anza/app.js");
    assert_eq!(with_base("/anza", "/"), "/anza/");
    assert_eq!(with_base("", "/app.js"), "/app.js");
    assert_eq!(with_base("/anza", "/anza/app.js"), "/anza/app.js");
    assert_eq!(
      with_base("/anza", "https://example.com/x"),
      "https://example.com/x"
    );
  }

  #[test]
  fn rewrite_html_href_src() {
    let html = r#"<link rel="stylesheet" href="/tokens/index.css" />
<a href="/docs">Docs</a>
<script type="module" src="/app.js"></script>"#;
    let out = rewrite_html_urls(html, "/anza");
    assert!(out.contains("href=\"/anza/tokens/index.css\""));
    assert!(out.contains("href=\"/anza/docs\""));
    assert!(out.contains("src=\"/anza/app.js\""));
  }

  #[test]
  fn rewrite_importmap_json_paths_values() {
    let json = r#"{
  "imports": {
    "@adukiorg/anza/ui": "/core/ui/index.js",
    "@adukiorg/anza/sw": "/sw/index.js"
  }
}"#;
    let out = rewrite_importmap_json_paths(json, "/anza");
    assert!(out.contains("\"/anza/core/ui/index.js\""), "got: {out}");
    assert!(out.contains("\"/anza/sw/index.js\""), "got: {out}");
    assert!(!out.contains("@adukiorg/anza/ui\": \"/core/"), "got: {out}");
  }

  #[test]
  fn rewrite_inline_importmap_block() {
    let html = r#"  <script type="importmap">
{
  "imports": {
    "@adukiorg/anza/ui": "/core/ui/index.js"
  }
}
  </script>"#;
    let out = rewrite_inline_importmaps(html, "/anza");
    assert!(out.contains("/anza/core/ui/index.js"), "got: {out}");
  }

  #[test]
  fn rewrite_importmap_is_idempotent() {
    let once = rewrite_importmap_json_paths(
      r#"{ "imports": { "@adukiorg/anza/ui": "/core/ui/index.js" } }"#,
      "/anza",
    );
    let twice = rewrite_importmap_json_paths(&once, "/anza");
    assert_eq!(once, twice);
    assert!(!twice.contains("//anza/"), "got: {twice}");
  }

  #[test]
  fn load_deploy_base_reads_ssg_json() {
    let dist = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web/dist");
    assert_eq!(load_deploy_base(&dist), "/anza");
  }

  #[test]
  fn strip_base_prefix_for_dev_requests() {
    assert_eq!(strip_base_prefix("/docs/start", "/anza"), "/docs/start");
    assert_eq!(strip_base_prefix("/anza/styles/shared.css", "/anza"), "/styles/shared.css");
    assert_eq!(strip_base_prefix("/anza", "/anza"), "/");
    assert_eq!(strip_base_prefix("/anza/", "/anza"), "/");
  }

  #[test]
  fn apply_to_dist_rewrites_importmap_file() {
    let dir = std::env::temp_dir().join("anza-base-test");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
      dir.join("importmap.json"),
      r#"{
  "imports": {
    "@adukiorg/anza/ui": "/core/ui/index.js"
  }
}
"#,
    )
    .unwrap();
    apply_to_dist(&dir, "/anza");
    let out = std::fs::read_to_string(dir.join("importmap.json")).unwrap();
    assert!(out.contains("/anza/core/ui/index.js"), "got: {out}");
    assert!(!out.contains("//anza/"), "got: {out}");
  }
}
