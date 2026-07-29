// tools/src/build/resolve.rs
//
// Import specifier resolution: maps bare specifiers through import maps,
// resolves relative paths, and checks the library source directory.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use super::graph::Resolution;

/// Resolve an import specifier against import maps and the filesystem.
pub fn spec(
  spec: &str,
  importer: &Path,
  src: &Path,
  project: &Path,
  user: &HashMap<String, String>,
  lib: &HashMap<String, String>,
  lib_src: &Option<PathBuf>,
) -> Resolution {
  if spec.starts_with("http://") || spec.starts_with("https://") || spec.starts_with("data:") {
    return Resolution::External;
  }

  // Relative / absolute filesystem specifiers.
  if spec.starts_with("./") || spec.starts_with("../") {
    return finalize(importer.join(spec));
  }
  if let Some(stripped) = spec.strip_prefix('/') {
    return finalize(src.join(stripped));
  }

  // 1. Check user import map
  if let Some(target) = user.get(spec) {
    if target.starts_with("http://") || target.starts_with("https://") || target.starts_with("data:") {
      return Resolution::External;
    }
    // Site-root (`/app.js`) or legacy (`/dist/app.js`) → resolve under src / lib_src.
    if let Some(rel) = asset_rel(target) {
      let res = finalize(src.join(rel));
      if !matches!(res, Resolution::Missing) {
        return res;
      }
      if let Some(ref src_dir) = lib_src {
        let res = finalize(src_dir.join(rel));
        if !matches!(res, Resolution::Missing) {
          return res;
        }
      }
    }
    let path = if let Some(stripped) = target.strip_prefix('/') {
      project.join(stripped)
    } else {
      project.join(target)
    };
    return finalize(path);
  }

  // 2. Check library import map
  if let Some(target) = lib.get(spec) {
    if target.starts_with("http://") || target.starts_with("https://") {
      return Resolution::External;
    }
    if let Some(ref src_dir) = lib_src {
      let rel = asset_rel(target).unwrap_or(target);
      let path = src_dir.join(rel);
      return finalize(path);
    }
  }

  Resolution::Missing
}

/// Strip a site-root or legacy `/dist/` prefix from an importmap target.
/// Returns the path relative to the dist/document root (e.g. `core/ui/index.js`).
fn asset_rel(target: &str) -> Option<&str> {
  target
    .strip_prefix("/dist/")
    .or_else(|| target.strip_prefix('/'))
}

fn finalize(candidate: PathBuf) -> Resolution {
  let has_ext = candidate.extension().is_some();

  if candidate.is_file() {
    return Resolution::File(candidate, false);
  }

  if candidate.is_dir() {
    let idx = candidate.join("index.js");
    if idx.is_file() {
      return Resolution::File(idx, true);
    }
  }

  if !has_ext {
    let js = candidate.with_extension("js");
    if js.is_file() {
      return Resolution::File(js, true);
    }
  }

  Resolution::Missing
}

/// Walk upward from the project to find the library directory.
pub fn library(project: &Path) -> Option<PathBuf> {
  let mut current = project.to_path_buf();
  loop {
    let node_modules_path = current.join("node_modules").join("@adukiorg").join("anza");
    if node_modules_path.exists() {
      return Some(node_modules_path);
    }
    let local_path = current.join("library");
    if local_path.exists() {
      return Some(local_path);
    }
    if let Ok(text) = std::fs::read_to_string(current.join("package.json")) {
      if text.contains(r#""name": "@adukiorg/anza""#) {
        return Some(current);
      }
    }
    if let Some(parent) = current.parent() {
      current = parent.to_path_buf();
    } else {
      break;
    }
  }
  None
}

/// Load an importmap.json from a directory, falling back to inline script importmap.
pub fn load_map(dir: &Path) -> HashMap<String, String> {
  let mut map = HashMap::new();
  let path = dir.join("importmap.json");
  if let Ok(text) = std::fs::read_to_string(&path) {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
      if let Some(imports) = json.get("imports").and_then(|v| v.as_object()) {
        for (k, v) in imports {
          if let Some(s) = v.as_str() {
            map.insert(k.clone(), s.to_string());
          }
        }
      }
    }
    return map;
  }

  // Fallback to inline importmap in src/index.html
  let html = dir.join("src").join("index.html");
  if html.is_file() {
    if let Some(parsed) = extract(&html) {
      return parsed;
    }
  }

  // Fallback to inline importmap in index.html
  let html = dir.join("index.html");
  if html.is_file() {
    if let Some(parsed) = extract(&html) {
      return parsed;
    }
  }

  map
}

fn extract(path: &Path) -> Option<HashMap<String, String>> {
  let content = std::fs::read_to_string(path).ok()?;
  // Mask docs `<view-code>` samples so nested `<script type=importmap>` snippets
  // cannot be mistaken for the real shell import map.
  let content = crate::build::html::opaque_view_code(&content);
  let doc = scraper::Html::parse_document(&content);
  let sel = scraper::Selector::parse("script[type=\"importmap\"]").ok()?;
  
  if let Some(el) = doc.select(&sel).next() {
    let text = el.inner_html();
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
      if let Some(imports) = json.get("imports").and_then(|v| v.as_object()) {
        let mut map = HashMap::new();
        for (k, v) in imports {
          if let Some(s) = v.as_str() {
            map.insert(k.clone(), s.to_string());
          }
        }
        return Some(map);
      }
    }
  }
  None
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;

  #[test]
  fn test_load_map_inline() {
    let dir = std::env::temp_dir().join("anza-test-project");
    let src = dir.join("src");
    fs::create_dir_all(&src).ok();

    let html = r#"
      <!DOCTYPE html>
      <html>
        <head>
          <script type="importmap">
            {
              "imports": {
                "@adukiorg/anza": "/index.js",
                "@adukiorg/anza/ui": "/core/ui/index.js"
              }
            }
          </script>
        </head>
      </html>
    "#;
    fs::write(src.join("index.html"), html).unwrap();

    let map = load_map(&dir);
    assert_eq!(map.get("@adukiorg/anza").unwrap(), "/index.js");
    assert_eq!(map.get("@adukiorg/anza/ui").unwrap(), "/core/ui/index.js");

    fs::remove_dir_all(&dir).ok();
  }

  #[test]
  fn test_spec_resolution() {
    let dir = std::env::temp_dir().join("anza-spec-project");
    let src = dir.join("src");
    fs::create_dir_all(&src).ok();

    fs::write(src.join("user.js"), "console.log('user');").unwrap();

    let mut user = HashMap::new();
    user.insert("@adukiorg/anza/ui".to_string(), "/core/ui/index.js".to_string());
    user.insert("my-comp".to_string(), "/user.js".to_string());

    let lib = HashMap::new();
    let lib_src = std::env::temp_dir().join("anza-lib-src");
    fs::create_dir_all(&lib_src).ok();
    fs::create_dir_all(lib_src.join("core").join("ui")).ok();
    fs::write(lib_src.join("core").join("ui").join("index.js"), "console.log('ui');").unwrap();

    let res1 = spec("my-comp", &src, &src, &dir, &user, &lib, &Some(lib_src.clone()));
    if let Resolution::File(p, _) = res1 {
      assert_eq!(p, src.join("user.js"));
    } else {
      panic!("Expected Resolution::File");
    }

    let res2 = spec("@adukiorg/anza/ui", &src, &src, &dir, &user, &lib, &Some(lib_src.clone()));
    if let Resolution::File(p, _) = res2 {
      assert_eq!(p, lib_src.join("core").join("ui").join("index.js"));
    } else {
      panic!("Expected Resolution::File");
    }

    fs::remove_dir_all(&dir).ok();
    fs::remove_dir_all(&lib_src).ok();
  }

  #[test]
  fn test_spec_legacy_dist_prefix() {
    let dir = std::env::temp_dir().join("anza-legacy-dist-project");
    let src = dir.join("src");
    fs::create_dir_all(&src).ok();
    fs::write(src.join("user.js"), "console.log('user');").unwrap();

    let mut user = HashMap::new();
    user.insert("my-comp".to_string(), "/dist/user.js".to_string());

    let lib = HashMap::new();
    let lib_src = std::env::temp_dir().join("anza-legacy-lib-src");
    fs::create_dir_all(lib_src.join("core").join("ui")).ok();
    fs::write(lib_src.join("core").join("ui").join("index.js"), "console.log('ui');").unwrap();

    let mut lib_map = HashMap::new();
    lib_map.insert("@adukiorg/anza/ui".to_string(), "/dist/core/ui/index.js".to_string());

    let res1 = spec("my-comp", &src, &src, &dir, &user, &lib, &Some(lib_src.clone()));
    if let Resolution::File(p, _) = res1 {
      assert_eq!(p, src.join("user.js"));
    } else {
      panic!("Expected Resolution::File for legacy /dist/ user target");
    }

    let res2 = spec("@adukiorg/anza/ui", &src, &src, &dir, &user, &lib_map, &Some(lib_src.clone()));
    if let Resolution::File(p, _) = res2 {
      assert_eq!(p, lib_src.join("core").join("ui").join("index.js"));
    } else {
      panic!("Expected Resolution::File for legacy /dist/ library target");
    }

    fs::remove_dir_all(&dir).ok();
    fs::remove_dir_all(&lib_src).ok();
  }
}
